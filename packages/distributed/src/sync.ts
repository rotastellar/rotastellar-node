/**
 * RotaStellar Distributed - Sync Scheduler
 *
 * Schedule data synchronization across ground station passes.
 *
 * subhadipmitra@: Ground station contact is the bottleneck for LEO data transfer.
 * Typical LEO satellite contacts:
 * - 10-15 minute windows per pass
 * - 4-6 passes per day per ground station
 * - ~100-200 Mbps (varies with elevation angle)
 *
 * This priority queue ensures critical gradient updates get transmitted first.
 * Lower-priority data (telemetry, logs) can wait for the next pass.
 *
 * For production, integrate with AWS Ground Station or Azure Orbital APIs.
 */

// TODO(subhadipmitra): Add pass prediction using satellite.js
// TODO: Implement bandwidth estimation based on link budget

/**
 * Priority level for sync operations.
 */
export enum Priority {
  CRITICAL = 0,
  HIGH = 1,
  NORMAL = 2,
  LOW = 3,
}

/**
 * Configuration for a ground station.
 */
export interface GroundStation {
  name: string;
  latitude: number;
  longitude: number;
  elevationM: number;
  bandwidthMbps: number;
  minElevationDeg: number;
}

/**
 * Create a ground station with common defaults.
 */
export function createGroundStation(
  name: string,
  latitude: number,
  longitude: number,
  options: {
    elevationM?: number;
    bandwidthMbps?: number;
    minElevationDeg?: number;
  } = {}
): GroundStation {
  return {
    name,
    latitude,
    longitude,
    elevationM: options.elevationM ?? 0,
    bandwidthMbps: options.bandwidthMbps ?? 100,
    minElevationDeg: options.minElevationDeg ?? 5,
  };
}

/**
 * Common ground stations.
 */
export const GroundStations = {
  svalbard: (): GroundStation =>
    createGroundStation("Svalbard", 78.2306, 15.3894, {
      elevationM: 450,
      bandwidthMbps: 200,
    }),
  kourou: (): GroundStation =>
    createGroundStation("Kourou", 5.2378, -52.7683, { bandwidthMbps: 150 }),
  perth: (): GroundStation =>
    createGroundStation("Perth", -31.9474, 115.8648, { elevationM: 30 }),
  fairbanks: (): GroundStation =>
    createGroundStation("Fairbanks", 64.8401, -147.72, {
      elevationM: 135,
      bandwidthMbps: 150,
    }),
  defaultNetwork: (): GroundStation[] => [
    GroundStations.svalbard(),
    GroundStations.kourou(),
    GroundStations.perth(),
    GroundStations.fairbanks(),
  ],
};

/**
 * A scheduled contact window with a ground station.
 */
export interface ContactWindow {
  station: GroundStation;
  startTime: Date;
  endTime: Date;
  maxElevationDeg: number;
  availableBandwidthMbps: number;
}

export function getContactWindowDurationSeconds(window: ContactWindow): number {
  return (window.endTime.getTime() - window.startTime.getTime()) / 1000;
}

export function getContactWindowCapacityMb(window: ContactWindow): number {
  const durationS = getContactWindowDurationSeconds(window);
  return (window.availableBandwidthMbps * durationS) / 8;
}

/**
 * A task queued for synchronization.
 */
export interface SyncTask {
  priority: Priority;
  deadline: Date;
  nodeId: string;
  dataSizeBytes: number;
  taskId: string;
  description: string;
  createdAt: Date;
}

/**
 * Priority queue for bandwidth-aware sync operations.
 */
export class PriorityQueue {
  private heap: SyncTask[] = [];
  private taskCounter: number = 0;

  addTask(
    nodeId: string,
    dataSizeBytes: number,
    priority: Priority = Priority.NORMAL,
    description: string = "",
    deadline?: Date
  ): string {
    this.taskCounter++;
    const taskId = `task_${this.taskCounter}`;

    if (!deadline) {
      const hoursMap: Record<Priority, number> = {
        [Priority.CRITICAL]: 1,
        [Priority.HIGH]: 4,
        [Priority.NORMAL]: 12,
        [Priority.LOW]: 48,
      };
      deadline = new Date(Date.now() + hoursMap[priority] * 60 * 60 * 1000);
    }

    const task: SyncTask = {
      priority,
      deadline,
      nodeId,
      dataSizeBytes,
      taskId,
      description,
      createdAt: new Date(),
    };

    this.heap.push(task);
    this.heap.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.deadline.getTime() - b.deadline.getTime();
    });

    return taskId;
  }

  popTask(): SyncTask | undefined {
    return this.heap.shift();
  }

  peekTask(): SyncTask | undefined {
    return this.heap[0];
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  get size(): number {
    return this.heap.length;
  }

  get totalBytesPending(): number {
    return this.heap.reduce((sum, t) => sum + t.dataSizeBytes, 0);
  }

  getTasksForWindow(capacityBytes: number): SyncTask[] {
    const tasks: SyncTask[] = [];
    let remaining = capacityBytes;

    const candidates = [...this.heap].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.deadline.getTime() - b.deadline.getTime();
    });

    for (const task of candidates) {
      if (task.dataSizeBytes <= remaining) {
        tasks.push(task);
        remaining -= task.dataSizeBytes;
      }
    }

    // Remove selected tasks
    for (const task of tasks) {
      const idx = this.heap.findIndex((t) => t.taskId === task.taskId);
      if (idx >= 0) this.heap.splice(idx, 1);
    }

    return tasks;
  }
}

/**
 * Schedule data synchronization across ground station passes.
 */
export class SyncScheduler {
  private static readonly EARTH_RADIUS_KM = 6371;
  private static readonly EARTH_MU = 398600.4418;

  readonly groundStations: GroundStation[];
  readonly orbitAltitudeKm: number;
  readonly orbitInclinationDeg: number;
  readonly queue: PriorityQueue;
  private schedule: Array<{ window: ContactWindow; tasks: SyncTask[] }> = [];

  constructor(options: {
    groundStations?: GroundStation[];
    orbitAltitudeKm?: number;
    orbitInclinationDeg?: number;
  } = {}) {
    this.groundStations = options.groundStations ?? GroundStations.defaultNetwork();
    this.orbitAltitudeKm = options.orbitAltitudeKm ?? 550;
    this.orbitInclinationDeg = options.orbitInclinationDeg ?? 51.6;
    this.queue = new PriorityQueue();
  }

  get orbitalPeriodMinutes(): number {
    const a = SyncScheduler.EARTH_RADIUS_KM + this.orbitAltitudeKm;
    const periodS = 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / SyncScheduler.EARTH_MU);
    return periodS / 60;
  }

  get orbitsPerDay(): number {
    return (24 * 60) / this.orbitalPeriodMinutes;
  }

  getContactWindows(options: { startTime?: Date; hours?: number } = {}): ContactWindow[] {
    const start = options.startTime ?? new Date();
    const hours = options.hours ?? 24;
    const end = new Date(start.getTime() + hours * 60 * 60 * 1000);

    const windows: ContactWindow[] = [];

    for (const station of this.groundStations) {
      const passesPerDay = this.estimatePassesPerDay(station.latitude);
      const passDurationMin = this.estimatePassDuration(station.latitude);

      if (passesPerDay === 0) continue;

      const intervalMs = (24 * 60 * 60 * 1000) / passesPerDay;
      let current = new Date(start);

      while (current < end) {
        const windowStart = new Date(current);
        const windowEnd = new Date(current.getTime() + passDurationMin * 60 * 1000);
        const maxElevation = this.estimateMaxElevation(station.latitude);

        if (maxElevation > station.minElevationDeg) {
          windows.push({
            station,
            startTime: windowStart,
            endTime: windowEnd,
            maxElevationDeg: maxElevation,
            availableBandwidthMbps: station.bandwidthMbps,
          });
        }

        current = new Date(current.getTime() + intervalMs);
      }
    }

    windows.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    return windows;
  }

  scheduleSync(
    nodeId: string,
    dataSizeBytes: number,
    priority: Priority = Priority.NORMAL,
    description: string = "",
    deadline?: Date
  ): string {
    return this.queue.addTask(nodeId, dataSizeBytes, priority, description, deadline);
  }

  optimize(hours: number = 24): Array<{ window: ContactWindow; tasks: SyncTask[] }> {
    const windows = this.getContactWindows({ hours });
    const schedule: Array<{ window: ContactWindow; tasks: SyncTask[] }> = [];

    for (const window of windows) {
      const capacityBytes = Math.floor(getContactWindowCapacityMb(window) * 1024 * 1024);
      const tasks = this.queue.getTasksForWindow(capacityBytes);

      if (tasks.length > 0) {
        schedule.push({ window, tasks });
      }
    }

    this.schedule = schedule;
    return schedule;
  }

  getScheduleSummary(): Record<string, unknown> {
    const totalData = this.schedule.reduce(
      (sum, s) => sum + s.tasks.reduce((ts, t) => ts + t.dataSizeBytes, 0),
      0
    );
    const totalTasks = this.schedule.reduce((sum, s) => sum + s.tasks.length, 0);

    return {
      scheduledWindows: this.schedule.length,
      totalTasksScheduled: totalTasks,
      totalDataMb: Math.round((totalData / (1024 * 1024)) * 100) / 100,
      pendingTasks: this.queue.size,
      pendingDataMb: Math.round((this.queue.totalBytesPending / (1024 * 1024)) * 100) / 100,
    };
  }

  private estimatePassesPerDay(stationLat: number): number {
    const absLat = Math.abs(stationLat);
    if (absLat > this.orbitInclinationDeg + 10) return 0;
    if (absLat > this.orbitInclinationDeg - 10) return this.orbitsPerDay * 0.3;
    return this.orbitsPerDay * 0.15;
  }

  private estimatePassDuration(stationLat: number): number {
    const baseDuration = 8;
    if (Math.abs(stationLat) > this.orbitInclinationDeg - 5) return baseDuration * 1.2;
    return baseDuration;
  }

  private estimateMaxElevation(stationLat: number): number {
    const latDiff = Math.abs(Math.abs(stationLat) - this.orbitInclinationDeg);
    if (latDiff < 5) return 70;
    if (latDiff < 15) return 45;
    if (latDiff < 25) return 25;
    return 10;
  }
}
