/**
 * RotaStellar Compute - Thermal Simulation
 *
 * Model heat rejection in vacuum for space-based compute systems.
 *
 * subhadipmitra@: Thermal management is THE critical constraint for space computing.
 * In vacuum, heat rejection is radiation-only (Stefan-Boltzmann: P = εσAT⁴).
 *
 * Key insight: radiator area scales with 4th root of power, so doubling compute
 * only needs ~19% more radiator area. This is why orbital compute can be power-dense.
 *
 * The model accounts for solar input, Earth albedo, Earth IR, and eclipse cycling.
 */

import { RotaStellarClient, ClientOptions } from "@rotastellar/sdk";

// Physical constants
// NOTE(subhadipmitra): Stefan-Boltzmann constant in SI units
const STEFAN_BOLTZMANN = 5.67e-8; // W/(m²·K⁴)
// Solar irradiance at 1 AU (varies ~3% over year due to Earth's eccentricity)
const SOLAR_CONSTANT = 1361.0; // W/m² at 1 AU

// TODO(subhadipmitra): Add transient analysis for eclipse crossings
// TODO: Model deployable radiators

/**
 * Types of orbits affecting thermal environment.
 */
export enum OrbitType {
  LEO = "leo",
  MEO = "meo",
  GEO = "geo",
  SSO = "sso",
  POLAR = "polar",
}

/**
 * Orbital thermal environment parameters.
 */
export interface ThermalEnvironment {
  orbitType?: OrbitType;
  altitudeKm?: number;
  betaAngleDeg?: number;
  eclipseFraction?: number;
  albedoFactor?: number;
  earthIrWm2?: number;
}

/**
 * Thermal system configuration.
 */
export interface ThermalConfig {
  powerWatts: number;
  radiatorAreaM2?: number;
  radiatorEmissivity?: number;
  solarAbsorptivity?: number;
  massKg?: number;
  specificHeatJKgK?: number;
}

/**
 * Result of thermal simulation.
 */
export interface ThermalResult {
  equilibriumTempC: number;
  maxTempC: number;
  minTempC: number;
  tempSwingC: number;
  powerDissipatedW: number;
  thermalMarginC: number;
  warnings: string[];
  timeSeries?: Array<{
    timeMinutes: number;
    temperatureC: number;
    inEclipse: boolean;
  }>;
}

/**
 * Simulate thermal conditions for orbital compute systems.
 *
 * @example
 * import { ThermalSimulator } from "@rotastellar/compute";
 *
 * const simulator = new ThermalSimulator({ apiKey: "rs_live_xxx" });
 * const result = simulator.simulate({ powerWatts: 500, radiatorAreaM2: 2.0 });
 * console.log(`Equilibrium: ${result.equilibriumTempC.toFixed(1)}°C`);
 */
export class ThermalSimulator {
  private _client: RotaStellarClient;

  static readonly MAX_OPERATING_TEMP = 85.0;
  static readonly MIN_OPERATING_TEMP = -40.0;
  static readonly OPTIMAL_TEMP = 25.0;

  constructor(options?: ClientOptions) {
    this._client = new RotaStellarClient(options);
  }

  get client(): RotaStellarClient {
    return this._client;
  }

  /**
   * Simulate thermal behavior.
   */
  simulate(
    config: ThermalConfig,
    environment?: ThermalEnvironment,
    options?: {
      durationHours?: number;
      timeStepMinutes?: number;
      includeTimeSeries?: boolean;
    }
  ): ThermalResult {
    const env: Required<ThermalEnvironment> = {
      orbitType: environment?.orbitType ?? OrbitType.LEO,
      altitudeKm: environment?.altitudeKm ?? 550,
      betaAngleDeg: environment?.betaAngleDeg ?? 0,
      eclipseFraction: environment?.eclipseFraction ?? 0.35,
      albedoFactor: environment?.albedoFactor ?? 0.3,
      earthIrWm2: environment?.earthIrWm2 ?? 237,
    };

    const cfg: Required<ThermalConfig> = {
      powerWatts: config.powerWatts,
      radiatorAreaM2: config.radiatorAreaM2 ?? 2.0,
      radiatorEmissivity: config.radiatorEmissivity ?? 0.85,
      solarAbsorptivity: config.solarAbsorptivity ?? 0.2,
      massKg: config.massKg ?? 100,
      specificHeatJKgK: config.specificHeatJKgK ?? 900,
    };

    const durationHours = options?.durationHours ?? 24;
    const timeStepMinutes = options?.timeStepMinutes ?? 1;
    const includeTimeSeries = options?.includeTimeSeries ?? false;

    // Calculate heat inputs
    const solarInput = this.calcSolarInput(cfg, env);
    const earthIrInput = this.calcEarthIrInput(cfg, env);
    const albedoInput = this.calcAlbedoInput(cfg, env);
    const internalHeat = cfg.powerWatts;

    // Calculate equilibrium temperatures
    const totalInputSunlit = internalHeat + solarInput + earthIrInput + albedoInput;
    const totalInputEclipse = internalHeat + earthIrInput;

    const eqTempSunlit = this.calcEquilibriumTemp(
      totalInputSunlit,
      cfg.radiatorAreaM2,
      cfg.radiatorEmissivity
    );
    const eqTempEclipse = this.calcEquilibriumTemp(
      totalInputEclipse,
      cfg.radiatorAreaM2,
      cfg.radiatorEmissivity
    );

    let maxTemp: number;
    let minTemp: number;
    let timeSeries: ThermalResult["timeSeries"];

    if (includeTimeSeries) {
      const orbitalPeriod = this.calcOrbitalPeriod(env.altitudeKm);
      timeSeries = this.simulateTimeSeries(
        cfg,
        env,
        durationHours,
        timeStepMinutes,
        orbitalPeriod
      );
      const temps = timeSeries.map((t) => t.temperatureC);
      maxTemp = Math.max(...temps);
      minTemp = Math.min(...temps);
    } else {
      maxTemp = eqTempSunlit;
      minTemp = eqTempEclipse;
    }

    // Weight equilibrium by sunlit/eclipse fraction
    const equilibrium =
      eqTempSunlit * (1 - env.eclipseFraction) + eqTempEclipse * env.eclipseFraction;

    // Calculate power dissipated
    const eqTempK = equilibrium + 273.15;
    const powerDissipated =
      cfg.radiatorEmissivity * STEFAN_BOLTZMANN * cfg.radiatorAreaM2 * Math.pow(eqTempK, 4);

    // Generate warnings
    const warnings: string[] = [];
    if (maxTemp > ThermalSimulator.MAX_OPERATING_TEMP) {
      warnings.push(`Max temperature (${maxTemp.toFixed(1)}°C) exceeds safe limit`);
    }
    if (minTemp < ThermalSimulator.MIN_OPERATING_TEMP) {
      warnings.push(`Min temperature (${minTemp.toFixed(1)}°C) below safe limit`);
    }
    if (maxTemp - minTemp > 60) {
      warnings.push("High thermal cycling may reduce component lifetime");
    }

    const thermalMargin = ThermalSimulator.MAX_OPERATING_TEMP - maxTemp;

    return {
      equilibriumTempC: Math.round(equilibrium * 100) / 100,
      maxTempC: Math.round(maxTemp * 100) / 100,
      minTempC: Math.round(minTemp * 100) / 100,
      tempSwingC: Math.round((maxTemp - minTemp) * 100) / 100,
      powerDissipatedW: Math.round(powerDissipated * 100) / 100,
      thermalMarginC: Math.round(thermalMargin * 100) / 100,
      warnings,
      timeSeries: includeTimeSeries ? timeSeries : undefined,
    };
  }

  /**
   * Design radiator for given power and target temperature.
   */
  designRadiator(
    powerWatts: number,
    targetTempC: number = 50,
    environment?: ThermalEnvironment
  ): {
    requiredAreaM2: number;
    powerWatts: number;
    targetTempC: number;
    recommendedEmissivity: number;
    designMargin: number;
  } {
    const targetK = targetTempC + 273.15;
    const environmentalFraction = 0.2;
    const totalHeat = powerWatts * (1 + environmentalFraction);

    const emissivity = 0.85;
    let requiredArea = totalHeat / (emissivity * STEFAN_BOLTZMANN * Math.pow(targetK, 4));
    requiredArea *= 1.25; // Margin

    return {
      requiredAreaM2: Math.round(requiredArea * 1000) / 1000,
      powerWatts,
      targetTempC,
      recommendedEmissivity: emissivity,
      designMargin: 0.25,
    };
  }

  private calcSolarInput(cfg: Required<ThermalConfig>, env: Required<ThermalEnvironment>): number {
    const solarArea = cfg.radiatorAreaM2 * 0.25;
    return SOLAR_CONSTANT * cfg.solarAbsorptivity * solarArea;
  }

  private calcEarthIrInput(cfg: Required<ThermalConfig>, env: Required<ThermalEnvironment>): number {
    const viewFactor = this.earthViewFactor(env.altitudeKm);
    const irArea = cfg.radiatorAreaM2 * 0.5;
    return env.earthIrWm2 * viewFactor * irArea * cfg.radiatorEmissivity;
  }

  private calcAlbedoInput(cfg: Required<ThermalConfig>, env: Required<ThermalEnvironment>): number {
    const viewFactor = this.earthViewFactor(env.altitudeKm);
    const albedoArea = cfg.radiatorAreaM2 * 0.25;
    return SOLAR_CONSTANT * env.albedoFactor * viewFactor * albedoArea * cfg.solarAbsorptivity;
  }

  private earthViewFactor(altitudeKm: number): number {
    const earthRadius = 6371;
    const r = earthRadius + altitudeKm;
    return Math.pow(earthRadius / r, 2);
  }

  private calcEquilibriumTemp(heatInputW: number, areaM2: number, emissivity: number): number {
    if (areaM2 <= 0 || emissivity <= 0) return Infinity;
    const tempK = Math.pow(heatInputW / (emissivity * STEFAN_BOLTZMANN * areaM2), 0.25);
    return tempK - 273.15;
  }

  private calcOrbitalPeriod(altitudeKm: number): number {
    const earthRadius = 6371;
    const earthMu = 398600.4418;
    const a = earthRadius + altitudeKm;
    const periodS = 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / earthMu);
    return periodS / 60;
  }

  private simulateTimeSeries(
    cfg: Required<ThermalConfig>,
    env: Required<ThermalEnvironment>,
    durationHours: number,
    timeStepMinutes: number,
    orbitalPeriodMin: number
  ): Array<{ timeMinutes: number; temperatureC: number; inEclipse: boolean }> {
    const results: Array<{ timeMinutes: number; temperatureC: number; inEclipse: boolean }> = [];
    const steps = Math.floor((durationHours * 60) / timeStepMinutes);

    let tempC = ThermalSimulator.OPTIMAL_TEMP;
    let tempK = tempC + 273.15;

    const internal = cfg.powerWatts;
    const earthIr = this.calcEarthIrInput(cfg, env);

    for (let i = 0; i < steps; i++) {
      const timeMin = i * timeStepMinutes;
      const orbitPhase = (timeMin % orbitalPeriodMin) / orbitalPeriodMin;
      const inEclipse = orbitPhase > 1 - env.eclipseFraction;

      let heatIn: number;
      if (inEclipse) {
        heatIn = internal + earthIr;
      } else {
        const solar = this.calcSolarInput(cfg, env);
        const albedo = this.calcAlbedoInput(cfg, env);
        heatIn = internal + solar + earthIr + albedo;
      }

      const heatOut =
        cfg.radiatorEmissivity * STEFAN_BOLTZMANN * cfg.radiatorAreaM2 * Math.pow(tempK, 4);
      const netHeat = heatIn - heatOut;
      const thermalMass = cfg.massKg * cfg.specificHeatJKgK;
      const dtK = (netHeat * timeStepMinutes * 60) / thermalMass;

      tempK += dtK;
      tempC = tempK - 273.15;

      results.push({
        timeMinutes: timeMin,
        temperatureC: Math.round(tempC * 100) / 100,
        inEclipse,
      });
    }

    return results;
  }
}
