/**
 * PyroGuard Cloud - Map Controller (South India Western Ghats / Nilgiri Biosphere)
 * Supported Map Modes:
 * 1. Google Satellite Hybrid (Ultra-HD Aerial Imagery + Roads + Boundaries + Labels)
 * 2. Outdoor Terrain Mode (Google 3D Elevation Topography, Hills, Drainage Basins & Contours)
 */

const PyroMap = {
  map: null,
  markersLayer: null,
  incidentLayer: null,
  windVectorLayer: null,
  evacuationLayer: null,
  tileLayers: {},
  currentTileKey: 'google_satellite',
  reportPinMode: false,
  tempReportMarker: null,
  activeCheckingStationId: null,

  init() {
    if (this.map) return;

    // Centered over South India (Nilgiri Biosphere: Bandipur - Wayanad - Mudumalai Tri-junction)
    const center = [11.6200, 76.5000];
    const zoom = 11;

    this.map = L.map('fireMap', {
      center: center,
      zoom: zoom,
      zoomControl: false
    });

    // Custom high-definition Google Satellite & Outdoor Terrain tile layers
    this.tileLayers = {
      // 1. Google Satellite Hybrid (Aerial photography + Roads + Reserve Boundaries + Village Labels)
      google_satellite: L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        subdomains: ['0', '1', '2', '3'],
        attribution: '&copy; Google Satellite Hybrid Imagery | CNES / Airbus / Maxar',
        maxZoom: 20
      }),
      // 2. Google Outdoor Terrain 3D Topography (Western Ghats contour elevation, ridges, sholas, valleys)
      google_terrain: L.tileLayer('https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
        subdomains: ['0', '1', '2', '3'],
        attribution: '&copy; Google Outdoor Terrain 3D Topography | South India Relief',
        maxZoom: 18
      })
    };

    // Add default tile layer (Satellite Hybrid)
    this.tileLayers[this.currentTileKey].addTo(this.map);

    // Zoom control in bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    // Layer groups
    this.markersLayer = L.layerGroup().addTo(this.map);
    this.incidentLayer = L.layerGroup().addTo(this.map);
    this.windVectorLayer = L.layerGroup().addTo(this.map);
    this.evacuationLayer = L.layerGroup().addTo(this.map);

    // Render layers
    this.renderStations();
    this.renderIncidents();
    this.renderWindVectors();
    this.renderEvacuationZones();

    // Map Click Listener (for reporting fires or coordinates)
    this.map.on('click', (e) => {
      this.handleMapClick(e);
    });

    // Reactive listener for state changes
    PyroState.subscribe((type, payload) => {
      if (type === 'telemetry_updated' || type === 'scenario_changed') {
        this.renderStations();
        this.renderWindVectors();
        this.renderEvacuationZones();
        if (this.activeCheckingStationId) {
          this.updateCheckingHud(this.activeCheckingStationId);
        }
      }
      if (type === 'incident_added' || type === 'incident_verified' || type === 'incident_dismissed') {
        this.renderIncidents();
        this.renderEvacuationZones();
      }
    });

    // Fix map container size upon window resize or tab switch
    window.addEventListener('resize', () => {
      if (this.map) this.map.invalidateSize();
    });
  },

  // Switch between Google Satellite Hybrid and Outdoor Terrain 3D
  switchTileStyle(styleKey) {
    if (this.currentTileKey === styleKey) return;

    if (this.tileLayers[this.currentTileKey]) {
      this.map.removeLayer(this.tileLayers[this.currentTileKey]);
    }
    if (this.tileLayers[styleKey]) {
      this.tileLayers[styleKey].addTo(this.map);
      this.currentTileKey = styleKey;
    }

    // Synchronize UI buttons
    document.querySelectorAll('.map-style-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.style === styleKey);
    });
  },

  // Check any sensor station directly on the South India map
  checkStationOnMap(stationId) {
    this.activeCheckingStationId = stationId;
    const station = PyroState.stations.find(s => s.id === stationId);
    if (!station) return;

    // Smoothly fly to the station
    this.map.flyTo(station.coords, 13, {
      duration: 1.2,
      easeLinearity: 0.25
    });

    // Highlight active quick check button
    document.querySelectorAll('.quick-check-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.stationId === stationId);
    });

    // Select in sensor store
    PyroSensors.selectStation(stationId);

    // Display Live Checking HUD
    this.updateCheckingHud(stationId);
  },

  // Check an incident directly on the map
  checkIncidentOnMap(incidentId) {
    const report = PyroState.reports.find(r => r.id === incidentId);
    if (!report) return;

    this.map.flyTo(report.coords, 14, {
      duration: 1.2,
      easeLinearity: 0.25
    });

    document.querySelectorAll('.quick-check-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.incidentId === incidentId);
    });

    // Show incident summary HUD
    const hud = document.getElementById('mapLiveCheckingHud');
    if (hud) {
      hud.style.display = 'flex';
      hud.innerHTML = `
        <div class="hud-header">
          <div class="hud-title-group">
            <h3>🔥 Incident: ${report.locationName}</h3>
            <p>ID: ${report.id} • Status: <strong style="color:${report.status === 'CONFIRMED' ? 'var(--fire-red)' : '#d97706'}">${report.status.replace('_', ' ')}</strong></p>
          </div>
          <button class="hud-close-btn" onclick="PyroMap.closeCheckingHud()">✕</button>
        </div>

        <div style="font-size:0.8rem; color:var(--text-secondary);">
          ${report.description}
        </div>

        <div style="background:#fff7ed; padding:8px; border-radius:6px; border-left:3px solid #ea580c; font-size:0.75rem;">
          <strong>AI Vision Pre-Check:</strong> Flame ${report.aiPreCheck.flameScore}% | Smoke ${report.aiPreCheck.smokeScore}%
        </div>

        <div class="hud-actions-row">
          <button class="btn-primary" style="flex:1; padding:6px; font-size:0.78rem;" onclick="PyroAdmin.openApprovalModal('${report.id}');">
            🚨 Approve Fire Incident
          </button>
          <button class="btn-secondary" style="padding:6px 8px; font-size:0.78rem;" onclick="PyroAdmin.inspectReport('${report.id}'); PyroApp.switchTab('admin');">
            Queue Triage
          </button>
          <button class="btn-secondary" style="padding:6px 10px; font-size:0.78rem;" onclick="PyroMap.closeCheckingHud()">
            Close
          </button>
        </div>
      `;
    }
  },

  updateCheckingHud(stationId) {
    const station = PyroState.stations.find(s => s.id === stationId);
    if (!station) return;

    const hud = document.getElementById('mapLiveCheckingHud');
    if (!hud) return;

    hud.style.display = 'flex';
    const t = station.telemetry;

    hud.innerHTML = `
      <div class="hud-header">
        <div class="hud-title-group">
          <h3>📡 ${station.name}</h3>
          <p>${station.zone} • Elevation: ${station.elevation}</p>
        </div>
        <button class="hud-close-btn" onclick="PyroMap.closeCheckingHud()" title="Close Live HUD">✕</button>
      </div>

      <div class="hud-metrics-grid">
        <div class="hud-metric-box">
          <span class="hud-metric-label">SHT31 Air Temp</span>
          <div class="hud-metric-val ${t.sht31.airTemp > 35 ? 'danger' : t.sht31.airTemp > 30 ? 'warning' : ''}">
            ${t.sht31.airTemp.toFixed(1)}°C
          </div>
          <span style="font-size:0.68rem; color:var(--text-muted);">${t.sht31.humidity.toFixed(0)}% RH • Shielded</span>
        </div>

        <div class="hud-metric-box">
          <span class="hud-metric-label">DS18B20 Soil Probe</span>
          <div class="hud-metric-val ${t.ds18b20.soilTemp > 40 ? 'danger' : t.ds18b20.soilTemp > 32 ? 'warning' : ''}">
            ${t.ds18b20.soilTemp.toFixed(1)}°C
          </div>
          <span style="font-size:0.68rem; color:var(--text-muted);">15cm Subsurface</span>
        </div>

        <div class="hud-metric-box">
          <span class="hud-metric-label">Smoke (PM2.5)</span>
          <div class="hud-metric-val ${t.smoke.pm25 > 60 ? 'danger' : t.smoke.pm25 > 35 ? 'warning' : ''}">
            ${t.smoke.pm25.toFixed(1)}
          </div>
          <span style="font-size:0.68rem; color:var(--text-muted);">µg/m³ • AQI: ${t.smoke.aqi}</span>
        </div>

        <div class="hud-metric-box">
          <span class="hud-metric-label">WS68 Anemometer</span>
          <div class="hud-metric-val">
            ${t.wind.speed.toFixed(1)} <span style="font-size:0.75rem; font-weight:600;">km/h</span>
          </div>
          <span style="font-size:0.68rem; color:var(--text-muted);">${t.wind.cardinal} (${t.wind.directionDeg.toFixed(0)}°)</span>
        </div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.72rem; color:var(--text-muted); background:#f8fafc; padding:4px 8px; border-radius:4px; border:1px solid #e2e8f0;">
        <span>🔋 Battery: <strong>${station.battery}%</strong></span>
        <span>☀️ Solar: <strong>${station.solarPower}W</strong></span>
        <span>📶 Signal: <strong>${station.loraRssi} dBm</strong></span>
      </div>

      <div class="hud-actions-row">
        <button class="btn-primary" style="flex:1; padding:6px; font-size:0.78rem;" onclick="PyroApp.switchTab('simulation')">
          📊 Full Sensor Simulation
        </button>
        <button class="btn-secondary" style="padding:6px 10px; font-size:0.78rem;" onclick="PyroMap.triggerQuickSimHazard('${station.id}')" title="Simulate Fire at this Location">
          ⚡ Hazard Test
        </button>
      </div>
    `;
  },

  closeCheckingHud() {
    this.activeCheckingStationId = null;
    const hud = document.getElementById('mapLiveCheckingHud');
    if (hud) hud.style.display = 'none';

    document.querySelectorAll('.quick-check-btn').forEach(btn => {
      btn.classList.remove('active');
    });
  },

  triggerQuickSimHazard(stationId) {
    PyroSensors.selectStation(stationId);
    PyroSensors.applyPreset('wildfire');
    this.checkStationOnMap(stationId);
  },

  renderStations() {
    this.markersLayer.clearLayers();

    PyroState.stations.forEach(station => {
      const isDangerous = station.status === 'warning' || station.status === 'critical';
      const iconHtml = `
        <div class="custom-station-pin ${isDangerous ? 'danger' : ''}" title="${station.name}">
          ${isDangerous ? '🔥' : '📡'}
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-leaflet-div-icon',
        html: iconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker(station.coords, { icon: customIcon }).addTo(this.markersLayer);

      // Popup Content with Live Sensor Telemetry
      const popupHtml = `
        <div class="map-popup-inner">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <strong style="font-size:0.95rem; color:#0f172a;">${station.name}</strong>
            <span class="status-pill" style="font-size:0.68rem; padding:2px 6px;">
              ${station.id}
            </span>
          </div>
          <div style="font-size:0.75rem; color:#64748b; margin-bottom:8px;">${station.zone} (${station.elevation})</div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:0.75rem; margin-bottom:10px;">
            <div style="background:#f8fafc; padding:4px 6px; border-radius:4px; border:1px solid #e2e8f0;">
              <span style="color:#64748b; display:block; font-size:0.65rem;">SHT31 AIR TEMP</span>
              <strong style="color:${station.telemetry.sht31.airTemp > 30 ? '#ea580c' : '#0f172a'}">
                ${station.telemetry.sht31.airTemp.toFixed(1)}°C (${station.telemetry.sht31.humidity.toFixed(0)}% RH)
              </strong>
            </div>
            <div style="background:#f8fafc; padding:4px 6px; border-radius:4px; border:1px solid #e2e8f0;">
              <span style="color:#64748b; display:block; font-size:0.65rem;">DS18B20 SOIL TEMP</span>
              <strong style="color:${station.telemetry.ds18b20.soilTemp > 35 ? '#ea580c' : '#0f172a'}">
                ${station.telemetry.ds18b20.soilTemp.toFixed(1)}°C
              </strong>
            </div>
            <div style="background:#f8fafc; padding:4px 6px; border-radius:4px; border:1px solid #e2e8f0;">
              <span style="color:#64748b; display:block; font-size:0.65rem;">SMOKE (PM2.5)</span>
              <strong style="color:${station.telemetry.smoke.pm25 > 50 ? '#dc2626' : '#16a34a'}">
                ${station.telemetry.smoke.pm25.toFixed(1)} µg/m³
              </strong>
            </div>
            <div style="background:#f8fafc; padding:4px 6px; border-radius:4px; border:1px solid #e2e8f0;">
              <span style="color:#64748b; display:block; font-size:0.65rem;">ANEMOMETER WIND</span>
              <strong>${station.telemetry.wind.speed.toFixed(1)} km/h ${station.telemetry.wind.cardinal}</strong>
            </div>
          </div>

          <div style="display:flex; gap:6px;">
            <button onclick="PyroMap.checkStationOnMap('${station.id}')" style="flex:1; background:#ea580c; color:white; border:none; padding:5px; border-radius:4px; font-size:0.75rem; font-weight:600; cursor:pointer;">
              Check Telemetry
            </button>
            <button onclick="PyroMap.centerOnCoords(${station.coords[0]}, ${station.coords[1]})" style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; padding:5px 8px; border-radius:4px; font-size:0.75rem; cursor:pointer;">
              Focus
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on('click', () => {
        PyroMap.checkStationOnMap(station.id);
      });
    });
  },

  renderIncidents() {
    this.incidentLayer.clearLayers();

    PyroState.reports.forEach(report => {
      let iconHtml = '';
      if (report.status === 'CONFIRMED') {
        iconHtml = `<div class="custom-fire-pin" title="CONFIRMED FIRE: ${report.locationName}">🔥</div>`;
      } else if (report.status === 'PENDING_VERIFICATION') {
        iconHtml = `<div class="custom-fire-pin" style="background:#f59e0b;" title="PENDING VERIFICATION: ${report.locationName}">⚠️</div>`;
      } else {
        iconHtml = `<div class="custom-station-pin" style="border-color:#64748b; opacity:0.6;" title="DISMISSED: ${report.locationName}">✓</div>`;
      }

      const customIcon = L.divIcon({
        className: 'custom-leaflet-div-icon',
        html: iconHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const marker = L.marker(report.coords, { icon: customIcon }).addTo(this.incidentLayer);

      const popupHtml = `
        <div class="map-popup-inner">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <strong style="color:#dc2626;">${report.id} - ${report.status.replace('_', ' ')}</strong>
            <span style="font-size:0.7rem; color:#64748b;">${report.timestamp}</span>
          </div>
          <h4 style="font-size:0.9rem; margin-bottom:4px;">${report.locationName}</h4>
          <p style="font-size:0.78rem; color:#475569; margin-bottom:8px;">${report.description}</p>
          
          <div style="background:#fff7ed; border-left:3px solid #ea580c; padding:4px 6px; font-size:0.75rem; margin-bottom:8px;">
            <strong>AI Pre-Check:</strong> Flame ${report.aiPreCheck.flameScore}% | Smoke ${report.aiPreCheck.smokeScore}%
          </div>

          <div style="display:flex; gap:6px;">
            <button onclick="PyroAdmin.openApprovalModal('${report.id}');" style="flex:1; background:#dc2626; color:white; border:none; padding:5px; border-radius:4px; font-size:0.75rem; font-weight:600; cursor:pointer;">
              🚨 Approve Fire
            </button>
            <button onclick="PyroAdmin.inspectReport('${report.id}'); PyroApp.switchTab('admin');" style="flex:1; background:#2563eb; color:white; border:none; padding:5px; border-radius:4px; font-size:0.75rem; font-weight:600; cursor:pointer;">
              Inspect
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on('click', () => {
        PyroMap.checkIncidentOnMap(report.id);
      });
    });
  },

  renderWindVectors() {
    this.windVectorLayer.clearLayers();

    // Find any station with warning or active fire
    PyroState.stations.forEach(station => {
      const wind = station.telemetry.wind;
      const origin = station.coords;

      // Calculate endpoint vector from wind direction and speed
      // Wind directionDeg is where wind is coming from; spread travels in the opposite (+180 deg)
      const spreadDirRad = ((wind.directionDeg + 180) % 360) * (Math.PI / 180);
      const vectorLength = 0.008 * (wind.speed / 15); // proportional km scale

      const targetLat = origin[0] + vectorLength * Math.cos(spreadDirRad);
      const targetLng = origin[1] + vectorLength * Math.sin(spreadDirRad);

      // Draw arrow / cone
      if (station.status !== 'normal' || wind.speed > 20) {
        // Danger propagation polygon cone
        const leftConeRad = spreadDirRad - 0.25;
        const rightConeRad = spreadDirRad + 0.25;
        const leftLat = origin[0] + (vectorLength * 0.9) * Math.cos(leftConeRad);
        const leftLng = origin[1] + (vectorLength * 0.9) * Math.sin(leftConeRad);
        const rightLat = origin[0] + (vectorLength * 0.9) * Math.cos(rightConeRad);
        const rightLng = origin[1] + (vectorLength * 0.9) * Math.sin(rightConeRad);

        L.polygon([
          origin,
          [leftLat, leftLng],
          [targetLat, targetLng],
          [rightLat, rightLng]
        ], {
          color: '#ea580c',
          weight: 1,
          fillColor: '#ea580c',
          fillOpacity: 0.25,
          dashArray: '4, 4'
        }).addTo(this.windVectorLayer)
          .bindTooltip(`Fire Spread Vector: ${wind.cardinal} @ ${wind.speed.toFixed(1)} km/h`);
      }
    });
  },

  renderEvacuationZones() {
    this.evacuationLayer.clearLayers();

    // Check confirmed or critical reports/stations
    PyroState.reports.filter(r => r.status === 'CONFIRMED').forEach(report => {
      // 600m Red Evacuation Perimeter
      L.circle(report.coords, {
        radius: 600,
        color: '#dc2626',
        weight: 2,
        fillColor: '#ef4444',
        fillOpacity: 0.2,
        dashArray: '6, 6'
      }).addTo(this.evacuationLayer).bindTooltip("RED ZONE: Mandatory Evacuation (600m)");

      // 1.5km Warning Perimeter
      L.circle(report.coords, {
        radius: 1500,
        color: '#f59e0b',
        weight: 1.5,
        fillColor: '#f59e0b',
        fillOpacity: 0.08,
        dashArray: '8, 8'
      }).addTo(this.evacuationLayer).bindTooltip("AMBER ZONE: Pre-Evacuation Readiness (1.5km)");
    });
  },

  handleMapClick(e) {
    if (this.reportPinMode) {
      const lat = e.latlng.lat.toFixed(4);
      const lng = e.latlng.lng.toFixed(4);

      if (this.tempReportMarker) {
        this.map.removeLayer(this.tempReportMarker);
      }

      this.tempReportMarker = L.marker(e.latlng, {
        icon: L.divIcon({
          className: 'custom-leaflet-div-icon',
          html: '<div class="custom-fire-pin" style="background:#2563eb;">📍</div>',
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        })
      }).addTo(this.map);

      // Autofill reporting form
      const latInput = document.getElementById('reportLat');
      const lngInput = document.getElementById('reportLng');
      if (latInput && lngInput) {
        latInput.value = lat;
        lngInput.value = lng;
      }

      const noteElem = document.getElementById('reportLocationNote');
      if (noteElem) {
        noteElem.textContent = `Selected on South India Map: [${lat}° N, ${lng}° E]`;
        noteElem.style.color = '#2563eb';
      }

      this.reportPinMode = false;
      const toggleBtn = document.getElementById('pinMapToggleBtn');
      if (toggleBtn) toggleBtn.classList.remove('active');
    }
  },

  centerOnCoords(lat, lng, zoomLevel = 13) {
    if (this.map) {
      this.map.setView([lat, lng], zoomLevel, { animate: true });
    }
  },

  toggleLayer(layerKey, isVisible) {
    if (layerKey === 'stations') {
      isVisible ? this.map.addLayer(this.markersLayer) : this.map.removeLayer(this.markersLayer);
    } else if (layerKey === 'incidents') {
      isVisible ? this.map.addLayer(this.incidentLayer) : this.map.removeLayer(this.incidentLayer);
    } else if (layerKey === 'wind') {
      isVisible ? this.map.addLayer(this.windVectorLayer) : this.map.removeLayer(this.windVectorLayer);
    } else if (layerKey === 'evacuation') {
      isVisible ? this.map.addLayer(this.evacuationLayer) : this.map.removeLayer(this.evacuationLayer);
    }
  }
};

window.PyroMap = PyroMap;
