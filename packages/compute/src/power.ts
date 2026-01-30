/**
 * RotaStellar Compute - Power Analysis
 *
 * Solar panel and battery sizing for orbital compute systems.
 *
 * subhadipmitra@: Power is tightly coupled with thermal (they're related constraints).
 * Solar constant ~1361 W/m² at 1 AU, but effective collection depends on:
 * - Cell efficiency (20-30% for modern cells)
 * - Incidence angle (cos loss)
 * - Temperature degradation (~0.5%/°C above 25°C)
 * - Radiation damage (few % per year in LEO)
 * - Eclipse fraction (~35% for ISS orbit)
 *
 * Rule of thumb: 1kW average needs ~5m² solar panel and ~500Wh battery.
 */

// TODO(subhadipmitra): Add radiation degradation model for long missions
// TODO: Model seasonal variation in eclipse fraction

import { RotaStellarClient, ClientOptions } from "@rotastellar/sdk";

// Physical constants
// NOTE(subhadipmitra): Varies ~3% over year due to Earth's orbital eccentricity
const SOLAR_CONSTANT = 1361.0; // W/m² at 1 AU

/**
 * Types of solar cells.
 */
export enum SolarCellType {
  SILICON = "silicon",
  TRIPLE_JUNCTION = "triple_junction",
  PEROVSKITE = "perovskite",
}

/**
 * Battery chemistry types.
 */
export enum BatteryChemistry {
  LITHIUM_ION = "lithium_ion",
  LITHIUM_POLYMER = "lithium_polymer",
  NICKEL_HYDROGEN = "nickel_hydrogen",
}

/**
 * Power consumption profile.
 */
export interface PowerProfile {
  averagePowerW: number;
  peakPowerW?: number;
  idlePowerW?: number;
  dutyCycle?: number;
}

/**
 * Solar panel configuration.
 */
export interface SolarConfig {
  cellType?: SolarCellType;
  efficiency?: number;
  degradationPerYear?: number;
  panelAreaM2?: number;
  tracking?: boolean;
}

/**
 * Battery configuration.
 */
export interface BatteryConfig {
  chemistry?: BatteryChemistry;
  capacityWh?: number;
  depthOfDischarge?: number;
  cycleEfficiency?: number;
  specificEnergyWhKg?: number;
}

/**
 * Complete power budget analysis.
 */
export interface PowerBudget {
  powerRequiredW: number;
  solarPowerGeneratedW: number;
  batteryCapacityWh: number;
  solarPanelAreaM2: number;
  batteryMassKg: number;
  solarPanelMassKg: number;
  eclipseDurationMin: number;
  positiveMargin: boolean;
  marginPercent: number;
  warnings: string[];
}

/**
 * Analyze power requirements for orbital compute systems.
 *
 * @example
 * import { PowerAnalyzer } from "@rotastellar/compute";
 *
 * const analyzer = new PowerAnalyzer({ apiKey: "rs_live_xxx" });
 * const budget = analyzer.analyze({ averagePowerW: 500, peakPowerW: 800 });
 * console.log(`Solar panel area: ${budget.solarPanelAreaM2.toFixed(2)} m²`);
 */
export class PowerAnalyzer {
  private _client: RotaStellarClient;
  private _orbitAltitudeKm: number;

  static readonly SOLAR_PANEL_SPECIFIC_POWER = 100.0; // W/kg
  static readonly DESIGN_MARGIN = 0.2;

  constructor(options?: ClientOptions, orbitAltitudeKm: number = 550) {
    this._client = new RotaStellarClient(options);
    this._orbitAltitudeKm = orbitAltitudeKm;
  }

  get client(): RotaStellarClient {
    return this._client;
  }

  /**
   * Analyze power budget for a mission.
   */
  analyze(
    profile: PowerProfile,
    options?: {
      solarConfig?: SolarConfig;
      batteryConfig?: BatteryConfig;
      orbitAltitudeKm?: number;
      missionDurationYears?: number;
    }
  ): PowerBudget {
    const altitude = options?.orbitAltitudeKm ?? this._orbitAltitudeKm;
    const missionYears = options?.missionDurationYears ?? 5;

    const solar: Required<SolarConfig> = {
      cellType: options?.solarConfig?.cellType ?? SolarCellType.TRIPLE_JUNCTION,
      efficiency: options?.solarConfig?.efficiency ?? 0.3,
      degradationPerYear: options?.solarConfig?.degradationPerYear ?? 0.02,
      panelAreaM2: options?.solarConfig?.panelAreaM2 ?? 0,
      tracking: options?.solarConfig?.tracking ?? false,
    };

    const battery: Required<BatteryConfig> = {
      chemistry: options?.batteryConfig?.chemistry ?? BatteryChemistry.LITHIUM_ION,
      capacityWh: options?.batteryConfig?.capacityWh ?? 0,
      depthOfDischarge: options?.batteryConfig?.depthOfDischarge ?? 0.8,
      cycleEfficiency: options?.batteryConfig?.cycleEfficiency ?? 0.95,
      specificEnergyWhKg: options?.batteryConfig?.specificEnergyWhKg ?? 200,
    };

    // Calculate orbital parameters
    const orbitalPeriodMin = this.orbitalPeriod(altitude);
    const eclipseFraction = this.eclipseFraction(altitude);
    const eclipseDuration = orbitalPeriodMin * eclipseFraction;
    const sunlightDuration = orbitalPeriodMin * (1 - eclipseFraction);

    // Power required with margin
    const powerRequired = profile.averagePowerW * (1 + PowerAnalyzer.DESIGN_MARGIN);

    // Account for degradation at EOL
    const eolEfficiency = solar.efficiency * (1 - solar.degradationPerYear * missionYears);

    // Required solar panel area
    let panelArea: number;
    if (solar.panelAreaM2 > 0) {
      panelArea = solar.panelAreaM2;
    } else {
      const orbitEnergyWh = (powerRequired * orbitalPeriodMin) / 60;
      const cosineFactor = solar.tracking ? 0.9 : 0.7;
      const solarPowerNeeded = orbitEnergyWh / (sunlightDuration / 60);
      panelArea = solarPowerNeeded / (SOLAR_CONSTANT * eolEfficiency * cosineFactor);
    }

    // Calculate actual solar power generated
    const cosineFactor = solar.tracking ? 0.9 : 0.7;
    const solarPower = SOLAR_CONSTANT * panelArea * eolEfficiency * cosineFactor;

    // Battery sizing
    const eclipseEnergyWh = (powerRequired * eclipseDuration) / 60;
    let batteryCapacity = eclipseEnergyWh / (battery.depthOfDischarge * battery.cycleEfficiency);
    batteryCapacity *= 1 + PowerAnalyzer.DESIGN_MARGIN;

    if (battery.capacityWh > 0) {
      batteryCapacity = Math.max(batteryCapacity, battery.capacityWh);
    }

    // Mass estimates
    const batteryMass = batteryCapacity / battery.specificEnergyWhKg;
    const solarMass = solarPower / PowerAnalyzer.SOLAR_PANEL_SPECIFIC_POWER;

    // Check margin
    const availablePower = solarPower * (sunlightDuration / orbitalPeriodMin);
    const marginPercent = ((availablePower - powerRequired) / powerRequired) * 100;
    const positiveMargin = marginPercent > 0;

    // Generate warnings
    const warnings: string[] = [];
    if (!positiveMargin) {
      warnings.push("Negative power margin - increase solar panel area");
    }
    if (batteryCapacity > 1000) {
      warnings.push("Large battery capacity may impact mass budget");
    }
    if (eolEfficiency < 0.2) {
      warnings.push("Significant solar cell degradation expected over mission life");
    }
    if (eclipseDuration > 40) {
      warnings.push("Long eclipse duration - ensure adequate battery capacity");
    }

    return {
      powerRequiredW: Math.round(powerRequired * 10) / 10,
      solarPowerGeneratedW: Math.round(solarPower * 10) / 10,
      batteryCapacityWh: Math.round(batteryCapacity * 10) / 10,
      solarPanelAreaM2: Math.round(panelArea * 1000) / 1000,
      batteryMassKg: Math.round(batteryMass * 100) / 100,
      solarPanelMassKg: Math.round(solarMass * 100) / 100,
      eclipseDurationMin: Math.round(eclipseDuration * 10) / 10,
      positiveMargin,
      marginPercent: Math.round(marginPercent * 10) / 10,
      warnings,
    };
  }

  /**
   * Size solar panels for power requirement.
   */
  sizeSolarPanels(
    powerRequiredW: number,
    options?: {
      orbitAltitudeKm?: number;
      cellType?: SolarCellType;
      missionYears?: number;
    }
  ): {
    panelAreaM2: number;
    cellType: string;
    bolEfficiency: number;
    eolEfficiency: number;
    solarPowerW: number;
    massEstimateKg: number;
  } {
    const altitude = options?.orbitAltitudeKm ?? this._orbitAltitudeKm;
    const cellType = options?.cellType ?? SolarCellType.TRIPLE_JUNCTION;
    const missionYears = options?.missionYears ?? 5;

    const efficiencies: Record<SolarCellType, number> = {
      [SolarCellType.SILICON]: 0.2,
      [SolarCellType.TRIPLE_JUNCTION]: 0.3,
      [SolarCellType.PEROVSKITE]: 0.25,
    };
    const efficiency = efficiencies[cellType];
    const degradation = 0.02;

    const eolEfficiency = efficiency * (1 - degradation * missionYears);
    const eclipseFraction = this.eclipseFraction(altitude);
    const sunlightFraction = 1 - eclipseFraction;

    const requiredSolar = (powerRequiredW / sunlightFraction) * (1 + PowerAnalyzer.DESIGN_MARGIN);
    const cosineFactor = 0.7;
    const panelArea = requiredSolar / (SOLAR_CONSTANT * eolEfficiency * cosineFactor);

    return {
      panelAreaM2: Math.round(panelArea * 1000) / 1000,
      cellType,
      bolEfficiency: efficiency,
      eolEfficiency: Math.round(eolEfficiency * 1000) / 1000,
      solarPowerW: Math.round(requiredSolar * 10) / 10,
      massEstimateKg: Math.round((requiredSolar / PowerAnalyzer.SOLAR_PANEL_SPECIFIC_POWER) * 100) / 100,
    };
  }

  /**
   * Size battery for eclipse power.
   */
  sizeBattery(
    powerRequiredW: number,
    options?: {
      orbitAltitudeKm?: number;
      chemistry?: BatteryChemistry;
    }
  ): {
    capacityWh: number;
    chemistry: string;
    massKg: number;
    eclipseDurationMin: number;
    depthOfDischarge: number;
    cyclesPerYear: number;
    expectedLifeYears: number;
  } {
    const altitude = options?.orbitAltitudeKm ?? this._orbitAltitudeKm;
    const chemistry = options?.chemistry ?? BatteryChemistry.LITHIUM_ION;

    const characteristics: Record<
      BatteryChemistry,
      { specificEnergy: number; dod: number; efficiency: number; cycleLife: number }
    > = {
      [BatteryChemistry.LITHIUM_ION]: {
        specificEnergy: 200,
        dod: 0.8,
        efficiency: 0.95,
        cycleLife: 5000,
      },
      [BatteryChemistry.LITHIUM_POLYMER]: {
        specificEnergy: 180,
        dod: 0.7,
        efficiency: 0.93,
        cycleLife: 3000,
      },
      [BatteryChemistry.NICKEL_HYDROGEN]: {
        specificEnergy: 60,
        dod: 0.8,
        efficiency: 0.85,
        cycleLife: 50000,
      },
    };
    const chars = characteristics[chemistry];

    const orbitalPeriod = this.orbitalPeriod(altitude);
    const eclipseFraction = this.eclipseFraction(altitude);
    const eclipseMin = orbitalPeriod * eclipseFraction;

    const eclipseEnergy = (powerRequiredW * eclipseMin) / 60;
    let capacity = eclipseEnergy / (chars.dod * chars.efficiency);
    capacity *= 1 + PowerAnalyzer.DESIGN_MARGIN;

    const mass = capacity / chars.specificEnergy;
    const orbitsPerDay = (24 * 60) / orbitalPeriod;
    const cyclesPerYear = orbitsPerDay * 365;

    return {
      capacityWh: Math.round(capacity * 10) / 10,
      chemistry,
      massKg: Math.round(mass * 100) / 100,
      eclipseDurationMin: Math.round(eclipseMin * 10) / 10,
      depthOfDischarge: chars.dod,
      cyclesPerYear: Math.round(cyclesPerYear),
      expectedLifeYears: Math.round((chars.cycleLife / cyclesPerYear) * 10) / 10,
    };
  }

  private orbitalPeriod(altitudeKm: number): number {
    const earthRadius = 6371;
    const earthMu = 398600.4418;
    const a = earthRadius + altitudeKm;
    const periodS = 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / earthMu);
    return periodS / 60;
  }

  private eclipseFraction(altitudeKm: number): number {
    const earthRadius = 6371;
    const r = earthRadius + altitudeKm;
    const sinRho = earthRadius / r;
    const eclipseHalfAngle = Math.asin(sinRho);
    return eclipseHalfAngle / Math.PI;
  }
}
