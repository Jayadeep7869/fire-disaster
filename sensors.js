/**
 * PyroGuard Cloud - Sensor Fleet Simulation Engine
 * Explicitly simulates the 6 outdoor sensors:
 * 1. SHT31 - Weatherproof Air Temp & Humidity inside Radiation Shield
 * 2. DS18B20 - Waterproof Subsurface Soil / Ground Probe
 * 3. Outdoor Smoke / Particulate (PM2.5 / PM10) Optical Dust Sensor
 * 4. Radiometric PTZ Thermal Camera (640x512, 15km detection)
 * 5. Outdoor AI Vision Camera (Smoke & Visible Flame Deep Learning)
 * 6. WS68 Wireless Solar Anemometer (Wind Speed & Direction)
 *
 * Dynamic Visual Engine:
 * - When wind is high (>= 32 km/h): swaps camera feed to high wind storm visuals with gale warning and swaying turbulence.
 * - When fire is huge: swaps camera feed to roaring 20m wildfire conflagration.
 * - When fire is mild: swaps camera feed to small ground mulch crawl (< 1m, less fire).
 * - Immediate visual changes for every slider adjustment (air temp, humidity, soil temp, smoke PM2.5, wind).
 */

const PyroSensors = {
  currentStationId: "ST-204",

  init() {
    this.renderStationCards();
    this.updateActiveTelemetryDisplay();
    this.setupSliderListeners();

    // Periodic slight jitter to simulate live outdoor micro-fluctuations
    setInterval(() => {
      this.tickEnvironmentalMicroNoise();
    }, 3500);
  },

  selectStation(stationId) {
    this.currentStationId = stationId;
    PyroState.simulation.selectedStationId = stationId;
    this.updateActiveTelemetryDisplay();
    this.renderStationCards();

    const station = PyroState.stations.find(s => s.id === stationId);
    if (station && window.PyroMap) {
      window.PyroMap.centerOnCoords(station.coords[0], station.coords[1], 15);
    }
  },

  updateActiveTelemetryDisplay() {
    const station = PyroState.stations.find(s => s.id === this.currentStationId);
    if (!station) return;

    const t = station.telemetry;

    // 1. SHT31 Temp & Humidity
    const sht31TempElem = document.getElementById('val-sht31-temp');
    const sht31HumElem = document.getElementById('val-sht31-hum');
    const sht31HeatIdxElem = document.getElementById('val-sht31-heatidx');
    if (sht31TempElem) {
      sht31TempElem.textContent = t.sht31.airTemp.toFixed(1);
      sht31TempElem.className = 'big-stat-number ' + (t.sht31.airTemp > 38 ? 'danger' : t.sht31.airTemp > 30 ? 'warning' : '');
    }
    if (sht31HumElem) sht31HumElem.textContent = `${t.sht31.humidity.toFixed(1)}% RH`;
    if (sht31HeatIdxElem) sht31HeatIdxElem.textContent = `${t.sht31.heatIndex.toFixed(1)}°C`;

    // 2. DS18B20 Waterproof Soil Probe
    const ds18TempElem = document.getElementById('val-ds18-temp');
    const ds18StatusElem = document.getElementById('val-ds18-status');
    if (ds18TempElem) {
      ds18TempElem.textContent = t.ds18b20.soilTemp.toFixed(1);
      ds18TempElem.className = 'big-stat-number ' + (t.ds18b20.soilTemp > 45 ? 'danger' : t.ds18b20.soilTemp > 32 ? 'warning' : '');
    }
    if (ds18StatusElem) {
      if (t.ds18b20.soilTemp > 50) {
        ds18StatusElem.textContent = "CRITICAL: Subsurface Peat / Ground Fire";
        ds18StatusElem.style.color = "var(--fire-red)";
      } else if (t.ds18b20.soilTemp > 35) {
        ds18StatusElem.textContent = "ELEVATED: Dry Mulch / Sun-Baked Soil";
        ds18StatusElem.style.color = "var(--fire-orange)";
      } else {
        ds18StatusElem.textContent = "NOMINAL: Moist Organic Soil Layer";
        ds18StatusElem.style.color = "var(--safe-green)";
      }
    }

    // 3. Smoke / Particulate (PM2.5 & PM10)
    const pm25Elem = document.getElementById('val-smoke-pm25');
    const pm10Elem = document.getElementById('val-smoke-pm10');
    const aqiElem = document.getElementById('val-smoke-aqi');
    if (pm25Elem) {
      pm25Elem.textContent = t.smoke.pm25.toFixed(1);
      pm25Elem.className = 'big-stat-number ' + (t.smoke.pm25 > 100 ? 'danger' : t.smoke.pm25 > 55 ? 'warning' : 'safe');
    }
    if (pm10Elem) pm10Elem.textContent = `${t.smoke.pm10.toFixed(1)} µg/m³`;
    if (aqiElem) {
      aqiElem.textContent = `AQI: ${t.smoke.aqi} (${t.smoke.status})`;
      aqiElem.className = 'meta-pill ' + (t.smoke.aqi > 150 ? 'danger' : t.smoke.aqi > 100 ? 'warning' : '');
    }

    // 4. Thermal Camera (Radiometric 640x512)
    const thermalSpotElem = document.getElementById('val-thermal-spot');
    const thermalStatusElem = document.getElementById('val-thermal-status');
    if (thermalSpotElem) {
      thermalSpotElem.textContent = t.thermal.maxSpotTemp.toFixed(1);
      thermalSpotElem.className = 'big-stat-number ' + (t.thermal.maxSpotTemp > 100 ? 'danger' : t.thermal.maxSpotTemp > 45 ? 'warning' : '');
    }
    if (thermalStatusElem) {
      thermalStatusElem.textContent = t.thermal.hotSpotDetected ? "HOTSPOT ALARM: Radiometric Spike" : "SURFACE SCAN: Nominal";
      thermalStatusElem.style.color = t.thermal.hotSpotDetected ? "var(--fire-red)" : "var(--safe-green)";
    }

    // 5. AI Vision Camera
    const aiFlameScore = document.getElementById('val-ai-flame');
    const aiSmokeScore = document.getElementById('val-ai-smoke');
    if (aiFlameScore) aiFlameScore.textContent = `${t.aiVision.flameConfidence.toFixed(1)}%`;
    if (aiSmokeScore) aiSmokeScore.textContent = `${t.aiVision.smokeConfidence.toFixed(1)}%`;

    // 6. Wind Speed & Direction Anemometer (WS68)
    const windSpeedElem = document.getElementById('val-wind-speed');
    const windDirElem = document.getElementById('val-wind-dir');
    const windGustElem = document.getElementById('val-wind-gust');
    const compassNeedle = document.getElementById('anemometerNeedle');
    if (windSpeedElem) windSpeedElem.textContent = t.wind.speed.toFixed(1);
    if (windDirElem) windDirElem.textContent = `${t.wind.cardinal} (${t.wind.directionDeg.toFixed(0)}°)`;
    if (windGustElem) windGustElem.textContent = `${t.wind.gust.toFixed(1)} km/h`;
    if (compassNeedle) {
      compassNeedle.style.transform = `rotate(${t.wind.directionDeg}deg)`;
    }

    // Synchronize slider handles and tags
    this.syncSlidersWithTelemetry(t);

    // Apply all rich dynamic visual changes to camera feeds, thermal view, overlays and soil strata
    this.updateDynamicVisuals(station);
  },

  /**
   * Core Visual Engine:
   * Dynamic image switching, thermal shaders, high wind motion, smoke opacity, and heat shimmer
   */
  updateDynamicVisuals(station) {
    const t = station.telemetry;
    const aiImg = document.getElementById('aiVisionCameraImg');
    const cameraBadge = document.getElementById('cameraDynamicStatusBadge');
    const aiBoundingBox = document.getElementById('aiVisionBoundingBox');
    const cameraContainer = document.getElementById('aiCameraContainer');
    const smokeHazeOverlay = document.getElementById('cameraSmokeHaze');
    const windStreaksOverlay = document.getElementById('cameraWindStreaks');
    const heatShimmerOverlay = document.getElementById('cameraHeatShimmer');
    const thermalImg = document.getElementById('thermalCameraImg');
    const soilStrata = document.getElementById('subsurfaceSoilStrata');
    const soilLayerText = document.getElementById('soilLayerStatusText');
    const activeVisualStateIndicator = document.getElementById('activeVisualStateIndicator');

    // 1. CAMERA IMAGE & VISUAL CONDITION SELECTION
    // Rule A: If wind speed is severe (>= 32 km/h) -> Show High Wind Pics of the place
    if (t.wind.speed >= 32) {
      if (aiImg) aiImg.src = 'assets/high_wind_gale.jpg';
      if (cameraBadge) {
        cameraBadge.className = 'camera-dynamic-badge gale';
        cameraBadge.innerHTML = `💨 GALE-FORCE WIND WARNING: ${t.wind.speed.toFixed(1)} km/h | RAPID HORIZONTAL SMOKE PROPAGATION`;
      }
      if (activeVisualStateIndicator) {
        activeVisualStateIndicator.innerHTML = `<strong>Active Visual:</strong> High-Wind Gale Storm (${t.wind.speed.toFixed(1)} km/h)`;
        activeVisualStateIndicator.className = 'visual-state-tag gale';
      }
      if (cameraContainer) cameraContainer.classList.add('camera-shaking-wind');
      if (windStreaksOverlay) {
        windStreaksOverlay.style.display = 'block';
        windStreaksOverlay.style.opacity = Math.min(0.9, (t.wind.speed / 60)).toFixed(2);
      }
      if (aiBoundingBox) {
        aiBoundingBox.style.display = 'block';
        aiBoundingBox.style.top = '30px';
        aiBoundingBox.style.right = '40px';
        aiBoundingBox.style.width = '240px';
        aiBoundingBox.style.height = '140px';
        aiBoundingBox.innerHTML = `<span class="ai-tag warning">WIND GALE: ${t.wind.speed.toFixed(1)} km/h - FLAME ACCELERATION</span>`;
      }
    }
    // Rule B: If fire is Huge / Catastrophic -> Show Huge Wildfire Picture (20m roaring flames)
    else if (t.smoke.pm25 >= 180 || t.sht31.airTemp >= 50 || t.thermal.maxSpotTemp >= 250) {
      if (aiImg) aiImg.src = 'assets/huge_wildfire.jpg';
      if (cameraBadge) {
        cameraBadge.className = 'camera-dynamic-badge danger';
        cameraBadge.innerHTML = `🔥 CATASTROPHIC WILDFIRE CONFLAGRATION | 20M CANOPY FLAMES ENGULFING RIDGE`;
      }
      if (activeVisualStateIndicator) {
        activeVisualStateIndicator.innerHTML = `<strong>Active Visual:</strong> Huge Wildfire Outbreak (20m Flames)`;
        activeVisualStateIndicator.className = 'visual-state-tag danger';
      }
      if (cameraContainer) cameraContainer.classList.remove('camera-shaking-wind');
      if (windStreaksOverlay) windStreaksOverlay.style.display = 'none';
      if (aiBoundingBox) {
        aiBoundingBox.style.display = 'block';
        aiBoundingBox.style.top = '15px';
        aiBoundingBox.style.right = '120px';
        aiBoundingBox.style.width = '260px';
        aiBoundingBox.style.height = '160px';
        aiBoundingBox.innerHTML = `<span class="ai-tag danger">🔥 WILDFIRE 99.8% | CRITICAL CONFLAGRATION</span>`;
      }
    }
    // Rule C: If fire is Moderate / Agricultural Brush Fire -> Show active smoke and brush flames
    else if (t.smoke.pm25 >= 50 || t.sht31.airTemp >= 35) {
      if (aiImg) aiImg.src = 'assets/ai_vision_cam.jpg';
      if (cameraBadge) {
        cameraBadge.className = 'camera-dynamic-badge warning';
        cameraBadge.innerHTML = `⚠️ ACTIVE BRUSH & LEAF LITTER FLAME | BILLOWING SMOKE COLUMN`;
      }
      if (activeVisualStateIndicator) {
        activeVisualStateIndicator.innerHTML = `<strong>Active Visual:</strong> Moderate Agricultural Brush Fire`;
        activeVisualStateIndicator.className = 'visual-state-tag warning';
      }
      if (cameraContainer) cameraContainer.classList.remove('camera-shaking-wind');
      if (windStreaksOverlay) windStreaksOverlay.style.display = 'none';
      if (aiBoundingBox) {
        aiBoundingBox.style.display = 'block';
        aiBoundingBox.style.top = '25px';
        aiBoundingBox.style.right = '160px';
        aiBoundingBox.style.width = '130px';
        aiBoundingBox.style.height = '120px';
        aiBoundingBox.innerHTML = `<span class="ai-tag warning">SMOKE 91.2% | FLAME 84.5%</span>`;
      }
    }
    // Rule D: If fire is Small / Mild Surface Crawl -> Show Mild Brush Fire (Less Fire!)
    else if (t.ds18b20.soilTemp >= 34 || t.smoke.pm25 >= 20 || t.sht31.airTemp >= 29) {
      if (aiImg) aiImg.src = 'assets/mild_brush_fire.jpg';
      if (cameraBadge) {
        cameraBadge.className = 'camera-dynamic-badge mild';
        cameraBadge.innerHTML = `🟡 MILD SURFACE CRAWL / LESS FIRE (< 1M) IN TEA/COFFEE BORDER`;
      }
      if (activeVisualStateIndicator) {
        activeVisualStateIndicator.innerHTML = `<strong>Active Visual:</strong> Mild Ground Crawl (Less Fire / < 1m)`;
        activeVisualStateIndicator.className = 'visual-state-tag mild';
      }
      if (cameraContainer) cameraContainer.classList.remove('camera-shaking-wind');
      if (windStreaksOverlay) windStreaksOverlay.style.display = 'none';
      if (aiBoundingBox) {
        aiBoundingBox.style.display = 'block';
        aiBoundingBox.style.top = '110px';
        aiBoundingBox.style.right = '280px';
        aiBoundingBox.style.width = '120px';
        aiBoundingBox.style.height = '80px';
        aiBoundingBox.innerHTML = `<span class="ai-tag" style="background:#f59e0b; color:#fff;">MILD FLAME 42% (<1m)</span>`;
      }
    }
    // Rule E: Clear / Pristine baseline
    else {
      if (aiImg) aiImg.src = 'assets/mild_brush_fire.jpg';
      if (cameraBadge) {
        cameraBadge.className = 'camera-dynamic-badge nominal';
        cameraBadge.innerHTML = `✓ CLEAR CANOPY HORIZON | AIR QUALITY NOMINAL`;
      }
      if (activeVisualStateIndicator) {
        activeVisualStateIndicator.innerHTML = `<strong>Active Visual:</strong> Clear Daylight (Nominal Baseline)`;
        activeVisualStateIndicator.className = 'visual-state-tag nominal';
      }
      if (cameraContainer) cameraContainer.classList.remove('camera-shaking-wind');
      if (windStreaksOverlay) windStreaksOverlay.style.display = 'none';
      if (aiBoundingBox) aiBoundingBox.style.display = 'none';
    }

    // 2. DYNAMIC SMOKE HAZE OVERLAY
    if (smokeHazeOverlay) {
      const hazeOpacity = Math.min(0.85, (t.smoke.pm25 / 380) * 0.85);
      smokeHazeOverlay.style.opacity = hazeOpacity.toFixed(2);
      smokeHazeOverlay.style.backgroundColor = t.smoke.pm25 > 200 ? 'rgba(30, 20, 15, 0.65)' : 'rgba(100, 116, 139, 0.4)';
    }

    // 3. HEATWAVE ATMOSPHERIC SHIMMER OVERLAY
    if (heatShimmerOverlay) {
      if (t.sht31.airTemp > 34) {
        heatShimmerOverlay.style.display = 'block';
        heatShimmerOverlay.style.opacity = Math.min(0.7, (t.sht31.airTemp - 30) / 25).toFixed(2);
      } else {
        heatShimmerOverlay.style.display = 'none';
      }
    }

    // 4. THERMAL CAMERA RADIOMETRIC SHADER
    if (thermalImg) {
      const spot = t.thermal.maxSpotTemp;
      if (spot >= 250) {
        thermalImg.style.filter = 'saturate(3.2) contrast(1.85) brightness(1.25) drop-shadow(0 0 18px rgba(220, 38, 38, 0.85))';
      } else if (spot >= 90) {
        thermalImg.style.filter = 'hue-rotate(0deg) saturate(2.4) contrast(1.6) brightness(1.15)';
      } else if (spot >= 42) {
        thermalImg.style.filter = 'hue-rotate(35deg) saturate(1.8) contrast(1.35)';
      } else {
        thermalImg.style.filter = 'hue-rotate(155deg) saturate(0.95) contrast(1.1)';
      }
    }

    // 5. SUBSURFACE SOIL STRATA CROSS-SECTION
    if (soilStrata) {
      const soilT = t.ds18b20.soilTemp;
      if (soilT > 50) {
        soilStrata.className = 'soil-strata-crosssection smoldering';
        if (soilLayerText) soilLayerText.innerHTML = `🔥 <strong>15cm Probe: ${soilT.toFixed(1)}°C</strong> — Glowing Subsurface Root Smolder / High Fuel Ignition`;
      } else if (soilT > 34) {
        soilStrata.className = 'soil-strata-crosssection dry';
        if (soilLayerText) soilLayerText.innerHTML = `🟡 <strong>15cm Probe: ${soilT.toFixed(1)}°C</strong> — Baked Dry Organic Mulch / Desiccation`;
      } else {
        soilStrata.className = 'soil-strata-crosssection moist';
        if (soilLayerText) soilLayerText.innerHTML = `🟢 <strong>15cm Probe: ${soilT.toFixed(1)}°C</strong> — Moist Loam Layer / Zero Subsurface Burn`;
      }
    }
  },

  syncSlidersWithTelemetry(t) {
    const slAir = document.getElementById('sliderAirTemp');
    const slHum = document.getElementById('sliderHumidity');
    const slSoil = document.getElementById('sliderSoilTemp');
    const slSmoke = document.getElementById('sliderSmoke');
    const slWind = document.getElementById('sliderWindSpeed');

    if (slAir) slAir.value = t.sht31.airTemp;
    if (slHum) slHum.value = t.sht31.humidity;
    if (slSoil) slSoil.value = t.ds18b20.soilTemp;
    if (slSmoke) slSmoke.value = t.smoke.pm25;
    if (slWind) slWind.value = t.wind.speed;

    const tagAir = document.getElementById('tagAirTemp');
    const tagHum = document.getElementById('tagHumidity');
    const tagSoil = document.getElementById('tagSoilTemp');
    const tagSmoke = document.getElementById('tagSmoke');
    const tagWind = document.getElementById('tagWindSpeed');

    if (tagAir) tagAir.textContent = `${t.sht31.airTemp.toFixed(1)}°C`;
    if (tagHum) tagHum.textContent = `${t.sht31.humidity.toFixed(0)}%`;
    if (tagSoil) tagSoil.textContent = `${t.ds18b20.soilTemp.toFixed(1)}°C`;
    if (tagSmoke) tagSmoke.textContent = `${t.smoke.pm25.toFixed(1)} µg/m³`;
    if (tagWind) tagWind.textContent = `${t.wind.speed.toFixed(1)} km/h`;
  },

  setupSliderListeners() {
    const slAir = document.getElementById('sliderAirTemp');
    const slHum = document.getElementById('sliderHumidity');
    const slSoil = document.getElementById('sliderSoilTemp');
    const slSmoke = document.getElementById('sliderSmoke');
    const slWind = document.getElementById('sliderWindSpeed');

    const updateFromSliders = () => {
      const station = PyroState.stations.find(s => s.id === this.currentStationId);
      if (!station) return;

      const airT = parseFloat(slAir.value);
      const hum = parseFloat(slHum.value);
      const soilT = parseFloat(slSoil.value);
      const pm25 = parseFloat(slSmoke.value);
      const windS = parseFloat(slWind.value);

      station.telemetry.sht31.airTemp = airT;
      station.telemetry.sht31.humidity = hum;
      station.telemetry.sht31.heatIndex = airT + (hum > 50 ? 2.5 : -1.2);
      station.telemetry.ds18b20.soilTemp = soilT;
      station.telemetry.smoke.pm25 = pm25;
      station.telemetry.smoke.pm10 = pm25 * 1.6;
      station.telemetry.smoke.aqi = Math.min(500, Math.round(pm25 * 1.7));
      station.telemetry.wind.speed = windS;
      station.telemetry.wind.gust = windS * 1.35;

      // Derived Thermal & AI Vision responses
      if (airT > 40 || soilT > 50 || pm25 > 100) {
        station.telemetry.thermal.maxSpotTemp = Math.max(airT, soilT * 1.8, 140);
        station.telemetry.thermal.hotSpotDetected = true;
        station.telemetry.aiVision.flameConfidence = Math.min(99.4, (pm25 / 150) * 80 + 20);
        station.telemetry.aiVision.smokeConfidence = Math.min(98.9, (pm25 / 100) * 85);
        station.status = pm25 > 150 || airT > 45 ? 'critical' : 'warning';
      } else {
        station.telemetry.thermal.maxSpotTemp = airT + 3.5;
        station.telemetry.thermal.hotSpotDetected = false;
        station.telemetry.aiVision.flameConfidence = 0.0;
        station.telemetry.aiVision.smokeConfidence = Math.min(15, pm25 * 0.4);
        station.status = 'normal';
      }

      this.updateActiveTelemetryDisplay();
      PyroState.notify('telemetry_updated', station);
    };

    [slAir, slHum, slSoil, slSmoke, slWind].forEach(sl => {
      if (sl) sl.addEventListener('input', updateFromSliders);
    });
  },

  applyPreset(presetKey) {
    const station = PyroState.stations.find(s => s.id === this.currentStationId);
    if (!station) return;

    if (presetKey === 'normal') {
      station.telemetry.sht31.airTemp = 23.5;
      station.telemetry.sht31.humidity = 62.0;
      station.telemetry.sht31.heatIndex = 23.4;
      station.telemetry.ds18b20.soilTemp = 18.4;
      station.telemetry.smoke.pm25 = 12.0;
      station.telemetry.smoke.pm10 = 18.5;
      station.telemetry.smoke.aqi = 28;
      station.telemetry.smoke.status = "Clean Air";
      station.telemetry.thermal.maxSpotTemp = 26.2;
      station.telemetry.thermal.hotSpotDetected = false;
      station.telemetry.aiVision.flameConfidence = 0.0;
      station.telemetry.aiVision.smokeConfidence = 0.8;
      station.telemetry.wind.speed = 7.5;
      station.telemetry.wind.directionDeg = 240;
      station.telemetry.wind.cardinal = "WSW";
      station.status = "normal";

      PyroState.addLog("INFO", `Station ${station.id}`, "Normal ambient conditions restored.");
    } 
    else if (presetKey === 'heatwave') {
      station.telemetry.sht31.airTemp = 39.8;
      station.telemetry.sht31.humidity = 16.0;
      station.telemetry.sht31.heatIndex = 41.5;
      station.telemetry.ds18b20.soilTemp = 42.5;
      station.telemetry.smoke.pm25 = 38.0;
      station.telemetry.smoke.pm10 = 62.0;
      station.telemetry.smoke.aqi = 95;
      station.telemetry.smoke.status = "Moderate / High Fire Risk";
      station.telemetry.thermal.maxSpotTemp = 48.0;
      station.telemetry.thermal.hotSpotDetected = false;
      station.telemetry.aiVision.flameConfidence = 2.0;
      station.telemetry.aiVision.smokeConfidence = 12.0;
      station.telemetry.wind.speed = 22.0;
      station.telemetry.wind.directionDeg = 180;
      station.telemetry.wind.cardinal = "S";
      station.status = "warning";

      PyroState.addLog("WARN", `Station ${station.id}`, "SHT31 Air Temp 39.8°C with 16% Humidity: RED FLAG Fire Warning.");
    }
    else if (presetKey === 'smoldering') {
      station.telemetry.sht31.airTemp = 32.5;
      station.telemetry.sht31.humidity = 35.0;
      station.telemetry.sht31.heatIndex = 33.0;
      station.telemetry.ds18b20.soilTemp = 74.2; // Subsurface burn!
      station.telemetry.smoke.pm25 = 145.0;
      station.telemetry.smoke.pm10 = 230.0;
      station.telemetry.smoke.aqi = 195;
      station.telemetry.smoke.status = "Unhealthy Smoke Plume";
      station.telemetry.thermal.maxSpotTemp = 98.0;
      station.telemetry.thermal.hotSpotDetected = true;
      station.telemetry.aiVision.flameConfidence = 15.0;
      station.telemetry.aiVision.smokeConfidence = 89.4;
      station.telemetry.wind.speed = 12.5;
      station.telemetry.wind.directionDeg = 210;
      station.telemetry.wind.cardinal = "SSW";
      station.status = "warning";

      PyroState.addLog("WARN", `Station ${station.id}`, "DS18B20 Soil Probe spiked to 74.2°C; Subsurface root/mulch smolder detected.");
    }
    else if (presetKey === 'wildfire') {
      station.telemetry.sht31.airTemp = 64.0;
      station.telemetry.sht31.humidity = 9.0;
      station.telemetry.sht31.heatIndex = 68.0;
      station.telemetry.ds18b20.soilTemp = 86.0;
      station.telemetry.smoke.pm25 = 390.0;
      station.telemetry.smoke.pm10 = 620.0;
      station.telemetry.smoke.aqi = 450;
      station.telemetry.smoke.status = "HAZARDOUS WILDFIRE INFERNO";
      station.telemetry.thermal.maxSpotTemp = 485.0;
      station.telemetry.thermal.hotSpotDetected = true;
      station.telemetry.aiVision.flameConfidence = 99.4;
      station.telemetry.aiVision.smokeConfidence = 98.7;
      station.telemetry.wind.speed = 46.5;
      station.telemetry.wind.directionDeg = 205;
      station.telemetry.wind.cardinal = "SSW";
      station.status = "critical";

      PyroState.addLog("CRITICAL", `Station ${station.id}`, "THERMAL RADIOMETRIC SPIKE 485°C & SHT31 64°C: WILDFIRE CONFLAGRATION!");
      PyroApp.triggerEmergencyBanner(true, `WILDFIRE OUTBREAK AT ${station.name}! EVACUATION PROTOCOL INITIATED.`);
    }

    // Update active preset button highlight
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === presetKey);
    });

    this.updateActiveTelemetryDisplay();
    this.renderStationCards();
    PyroState.notify('scenario_changed', { station, presetKey });
  },

  renderStationCards() {
    const listContainer = document.getElementById('sidebarStationList');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    PyroState.stations.forEach(station => {
      const isSelected = station.id === this.currentStationId;
      const t = station.telemetry;

      const card = document.createElement('div');
      card.className = `sensor-station-card ${isSelected ? 'selected' : ''}`;
      card.onclick = () => this.selectStation(station.id);

      card.innerHTML = `
        <div class="station-card-header">
          <div>
            <div class="station-title">${station.name}</div>
            <div class="station-location">${station.zone}</div>
          </div>
          <span class="status-pill ${station.status === 'critical' ? 'danger' : station.status === 'warning' ? 'warning' : ''}">
            <span class="status-dot ${station.status === 'critical' ? 'danger' : station.status === 'warning' ? 'warning' : ''}"></span>
            ${station.status.toUpperCase()}
          </span>
        </div>

        <div class="station-telemetry-grid">
          <div class="telemetry-item">
            <span class="telemetry-label">SHT31 Air</span>
            <span class="telemetry-value ${t.sht31.airTemp > 35 ? 'danger' : ''}">${t.sht31.airTemp.toFixed(1)}°C</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-label">DS18 Soil</span>
            <span class="telemetry-value ${t.ds18b20.soilTemp > 40 ? 'danger' : ''}">${t.ds18b20.soilTemp.toFixed(1)}°C</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-label">PM2.5 Smoke</span>
            <span class="telemetry-value ${t.smoke.pm25 > 60 ? 'danger' : ''}">${t.smoke.pm25.toFixed(1)}</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-label">Wind</span>
            <span class="telemetry-value">${t.wind.speed.toFixed(0)} km/h ${t.wind.cardinal}</span>
          </div>
        </div>
      `;

      listContainer.appendChild(card);
    });
  },

  tickEnvironmentalMicroNoise() {
    // Add minute realistic fluctuations (e.g. ±0.1°C, ±0.2 km/h)
    PyroState.stations.forEach(station => {
      const dTemp = (Math.random() - 0.49) * 0.15;
      station.telemetry.sht31.airTemp = Math.max(10, station.telemetry.sht31.airTemp + dTemp);
      station.telemetry.wind.speed = Math.max(2, station.telemetry.wind.speed + (Math.random() - 0.5) * 0.3);
    });
    this.updateActiveTelemetryDisplay();
  }
};

window.PyroSensors = PyroSensors;
