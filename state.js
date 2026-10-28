/**
 * PyroGuard Cloud - Global State & Data Store
 * Regional Deployment: South India Western Ghats & Nilgiri Biosphere Fire Operations
 * (Bandipur, Wayanad, Mudumalai, Nilgiris & Moyar Valley Corridor)
 */

const PyroState = {
  // Sensor stations deployed across South India forest, tea/coffee estates, and sanctuary boundaries
  stations: [
    {
      id: "ST-101",
      name: "Bandipur National Forest Station",
      zone: "Zone A - Bandipur Dry Deciduous Canopy (Karnataka)",
      coords: [11.6850, 76.6100],
      elevation: "880m MSL",
      status: "normal", // normal, warning, critical
      battery: 98,
      solarPower: 14.8, // Watts
      loraRssi: -70, // dBm
      telemetry: {
        sht31: { airTemp: 28.4, humidity: 46.2, heatIndex: 28.5, shielded: true },
        ds18b20: { soilTemp: 24.2, depth: "15cm Subsurface" },
        smoke: { pm25: 16.5, pm10: 24.8, aqi: 35, status: "Clean Air" },
        thermal: { maxSpotTemp: 31.0, hotSpotDetected: false, fov: "55° Wide PTZ" },
        aiVision: { flameConfidence: 0.0, smokeConfidence: 1.5, status: "Clear Horizon" },
        wind: { speed: 9.8, directionDeg: 110, cardinal: "ESE", gust: 14.2 }
      }
    },
    {
      id: "ST-204",
      name: "Wayanad Agro Plantation & Coffee Estate",
      zone: "Zone B - Sulthan Bathery Agro-Forest Border (Kerala)",
      coords: [11.6650, 76.2800],
      elevation: "920m MSL",
      status: "warning",
      battery: 95,
      solarPower: 18.2,
      loraRssi: -66,
      telemetry: {
        sht31: { airTemp: 35.6, humidity: 21.0, heatIndex: 36.4, shielded: true },
        ds18b20: { soilTemp: 39.8, depth: "15cm Subsurface" },
        smoke: { pm25: 92.4, pm10: 148.0, aqi: 142, status: "Elevated Agricultural Smoke" },
        thermal: { maxSpotTemp: 172.0, hotSpotDetected: true, fov: "640x512 Radiometric" },
        aiVision: { flameConfidence: 86.2, smokeConfidence: 93.4, status: "Smoke Column Over Plantation" },
        wind: { speed: 29.5, directionDeg: 85, cardinal: "E", gust: 38.0 }
      }
    },
    {
      id: "ST-309",
      name: "Mudumalai Tiger Reserve Station",
      zone: "Zone C - Theppakadu Riverine & Teak Reserve (Tamil Nadu)",
      coords: [11.5800, 76.5350],
      elevation: "960m MSL",
      status: "normal",
      battery: 100,
      solarPower: 16.0,
      loraRssi: -62,
      telemetry: {
        sht31: { airTemp: 26.2, humidity: 55.4, heatIndex: 26.1, shielded: true },
        ds18b20: { soilTemp: 22.0, depth: "15cm Subsurface" },
        smoke: { pm25: 11.2, pm10: 18.0, aqi: 27, status: "Optimal Sanctuary Air" },
        thermal: { maxSpotTemp: 28.5, hotSpotDetected: false, fov: "Wide Dual-Spectrum" },
        aiVision: { flameConfidence: 0.0, smokeConfidence: 0.2, status: "Clear" },
        wind: { speed: 8.0, directionDeg: 120, cardinal: "ESE", gust: 11.5 }
      }
    },
    {
      id: "ST-412",
      name: "Nilgiri Foothills & Tea Garden Outpost",
      zone: "Zone D - Gudalur Valley & Shola Slopes (Tamil Nadu)",
      coords: [11.5100, 76.4950],
      elevation: "1180m MSL",
      status: "normal",
      battery: 92,
      solarPower: 13.5,
      loraRssi: -78,
      telemetry: {
        sht31: { airTemp: 23.8, humidity: 64.0, heatIndex: 23.8, shielded: true },
        ds18b20: { soilTemp: 19.5, depth: "15cm Subsurface" },
        smoke: { pm25: 14.0, pm10: 22.0, aqi: 31, status: "Good" },
        thermal: { maxSpotTemp: 25.4, hotSpotDetected: false, fov: "Thermal 15km PTZ" },
        aiVision: { flameConfidence: 0.0, smokeConfidence: 0.8, status: "Clear" },
        wind: { speed: 12.4, directionDeg: 95, cardinal: "E", gust: 17.5 }
      }
    },
    {
      id: "ST-505",
      name: "Moyar River Gorge & Scrubland Outpost",
      zone: "Zone E - Eastern Moyar Valley Scrub (Karnataka-TN Border)",
      coords: [11.6050, 76.7200],
      elevation: "650m MSL",
      status: "normal",
      battery: 97,
      solarPower: 17.1,
      loraRssi: -69,
      telemetry: {
        sht31: { airTemp: 31.0, humidity: 38.0, heatIndex: 31.2, shielded: true },
        ds18b20: { soilTemp: 28.4, depth: "15cm Subsurface" },
        smoke: { pm25: 18.6, pm10: 29.4, aqi: 42, status: "Clean" },
        thermal: { maxSpotTemp: 33.2, hotSpotDetected: false, fov: "Optical / Thermal" },
        aiVision: { flameConfidence: 0.0, smokeConfidence: 0.0, status: "Clear" },
        wind: { speed: 15.2, directionDeg: 75, cardinal: "ENE", gust: 21.0 }
      }
    }
  ],

  // Citizen Incident Reports
  reports: [
    {
      id: "INC-9481",
      timestamp: "12 mins ago",
      isoTime: new Date(Date.now() - 12 * 60000).toISOString(),
      locationName: "Sulthan Bathery Coffee Estate & Forest Border (Wayanad, Kerala)",
      coords: [11.6680, 76.2850],
      fireType: "Agricultural Estate & Forest Border",
      severity: "High Hazard",
      smokeColor: "Grey / Billowing Leaf Litter Smoke",
      flameHeight: "1.5m to 2.5m active flame",
      reporterName: "Ramesh Kumar (Estate Plantation Supervisor)",
      reporterContact: "+91 98450 12839",
      description: "Dry coffee pruning mulch and forest boundary trench brush caught fire near the Cheeral road border. Easterly wind is pushing heavy smoke toward plantation worker quarters.",
      photoUrl: "assets/sample_report.jpg",
      aiPreCheck: {
        flameDetected: true,
        smokeDetected: true,
        flameScore: 94.2,
        smokeScore: 97.6,
        summary: "Cloud Vision AI Confirms surface brush combustion & dense rising smoke"
      },
      status: "PENDING_VERIFICATION", // PENDING_VERIFICATION, CONFIRMED, DISMISSED
      assignedStationId: "ST-204",
      sensorCorrelation: 94.6, // %
      verifiedBy: null,
      verificationNote: null
    },
    {
      id: "INC-8204",
      timestamp: "3 hours ago",
      isoTime: new Date(Date.now() - 180 * 60000).toISOString(),
      locationName: "Theppakadu Forest Range Camp (Mudumalai, Tamil Nadu)",
      coords: [11.5820, 76.5320],
      fireType: "Controlled Camp Compost",
      severity: "Low",
      smokeColor: "Thin White Steam",
      flameHeight: "Smoldering mulch only",
      reporterName: "Selvam M. (Forest Watcher)",
      reporterContact: "+91 94432 88120",
      description: "Controlled pit burning of organic camp leaf waste cleared by Range Forest Officer.",
      photoUrl: "assets/sample_report.jpg",
      aiPreCheck: {
        flameDetected: false,
        smokeDetected: true,
        flameScore: 8.5,
        smokeScore: 32.0,
        summary: "Low danger moisture / organic compost plume"
      },
      status: "DISMISSED",
      assignedStationId: "ST-309",
      sensorCorrelation: 14.0,
      verifiedBy: "Ranger Ananya Rao (DFO)",
      verificationNote: "Inspected in person. Authorized controlled department leaf pit burn."
    }
  ],

  // Current active logged in user with Google Authentication
  currentUser: {
    authenticated: false, // Must authenticate through dedicated Login Page
    authMethod: "Google OAuth 2.0 (South India Ops)",
    googleId: "109382109481920831092",
    name: "DFO Ananya Rao",
    email: "a.rao@forest.gov.in",
    role: "admin", // 'admin' (Divisional Forest Officer) or 'citizen' (Field Observer)
    avatar: "AR",
    googleApiKey: "AIzaSyD-SouthIndia-WesternGhats2026",
    sessionStarted: null
  },

  // Simulation Controller State
  simulation: {
    activeScenario: "heatwave_brush", // 'normal', 'heatwave_brush', 'smoldering_soil', 'catastrophic_wildfire'
    isAudioAlarmPlaying: false,
    selectedStationId: "ST-204",
    redAlertBroadcastActive: false,
    alertZone: "Zone B - Wayanad Agro Plantation & Forest Border"
  },

  // Cloud Audit Logs
  cloudLogs: [
    {
      id: "LOG-1001",
      timestamp: new Date(Date.now() - 28 * 60000).toLocaleTimeString(),
      source: "Google Cloud Identity (India Region)",
      user: "a.rao@forest.gov.in",
      severity: "AUDIT",
      event: "DFO Ananya Rao authenticated via Google OAuth 2.0 (Role: Incident Commander / DFO)"
    },
    {
      id: "LOG-1002",
      timestamp: new Date(Date.now() - 24 * 60000).toLocaleTimeString(),
      source: "Google Maps Platform",
      user: "System Daemon",
      severity: "INFO",
      event: "Loaded Google Satellite Hybrid & 3D Outdoor Terrain for South India Nilgiri Biosphere [AIzaSy...2026]"
    },
    {
      id: "LOG-1003",
      timestamp: new Date(Date.now() - 15 * 60000).toLocaleTimeString(),
      source: "Station ST-204 (Wayanad ESP32 Gateway)",
      user: "IoT Telemetry",
      severity: "WARN",
      event: "SHT31 Ambient Air 35.6°C; DS18B20 Soil Probe 39.8°C; PM2.5 spike: 92.4µg/m³; Wind 29.5 km/h E"
    },
    {
      id: "LOG-1004",
      timestamp: new Date(Date.now() - 12 * 60000).toLocaleTimeString(),
      source: "Citizen Report Portal",
      user: "Ramesh Kumar",
      severity: "WARN",
      event: "New incident report #INC-9481 logged in Wayanad Agro-Forest border. Enqueued for Admin Verification."
    }
  ],

  // Listeners for reactive updates
  listeners: [],
  subscribe(fn) {
    this.listeners.push(fn);
  },
  notify(changeType, payload) {
    this.listeners.forEach(fn => fn(changeType, payload));
  },

  addLog(severity, source, event) {
    const entry = {
      id: "LOG-" + (1000 + this.cloudLogs.length + 1),
      timestamp: new Date().toLocaleTimeString(),
      source: source,
      user: this.currentUser.email,
      severity: severity, // 'INFO', 'WARN', 'CRITICAL', 'AUDIT'
      event: event
    };
    this.cloudLogs.unshift(entry);
    this.notify("log_added", entry);
  }
};

window.PyroState = PyroState;
