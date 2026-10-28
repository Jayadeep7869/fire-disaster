/**
 * PyroGuard Cloud - Admin Incident Command & Approval Process Engine
 * Features:
 * - Multi-Step Tactical Fire Incident Approval Workflow:
 *   Step 1: Telemetry Sensor Corroboration Checklist (SHT31, DS18B20, PM2.5, Thermal 15km, AI Camera, Wind)
 *   Step 2: Hazard Severity Tier & Threat Direction Classification
 *   Step 3: Tactical Emergency Resource Dispatch Checklist (QRT Tenders, Drone, Siren, SMS Advisory, DDMA)
 *   Step 4: Digital Incident Commander Sign-off & Cryptographic Authorization
 * - Official Dispatch Order & Incident Approval Certificate Generation
 * - Web Audio API Emergency Siren Synthesizer
 * - Real-time Incident Triage & Inspection
 */

const PyroAdmin = {
  selectedReportId: "INC-9481",
  activeApprovalReportId: null,
  audioContext: null,
  sirenOscillator: null,
  sirenGainNode: null,
  isSirenPlaying: false,

  init() {
    this.renderReportsQueue();
    this.inspectReport(this.selectedReportId);
    this.updateAdminMetrics();

    PyroState.subscribe((type) => {
      if (type === 'incident_added' || type === 'incident_verified' || type === 'incident_dismissed') {
        this.renderReportsQueue();
        this.updateAdminMetrics();
        this.inspectReport(this.selectedReportId);
      }
    });
  },

  updateAdminMetrics() {
    const pendingCount = PyroState.reports.filter(r => r.status === 'PENDING_VERIFICATION').length;
    const confirmedCount = PyroState.reports.filter(r => r.status === 'CONFIRMED').length;
    const dismissedCount = PyroState.reports.filter(r => r.status === 'DISMISSED').length;

    const elPending = document.getElementById('metricPendingReports');
    const elConfirmed = document.getElementById('metricConfirmedFires');
    const elStations = document.getElementById('metricActiveStations');
    const elNavBadge = document.getElementById('adminPendingBadge');

    if (elPending) elPending.textContent = pendingCount;
    if (elConfirmed) elConfirmed.textContent = confirmedCount;
    if (elStations) elStations.textContent = `${PyroState.stations.length} / 5 Online`;
    if (elNavBadge) {
      elNavBadge.textContent = pendingCount;
      elNavBadge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
    }
  },

  renderReportsQueue() {
    const queueList = document.getElementById('adminQueueList');
    if (!queueList) return;

    queueList.innerHTML = '';
    PyroState.reports.forEach(report => {
      const isSelected = report.id === this.selectedReportId;
      const item = document.createElement('div');
      item.className = `queue-item ${isSelected ? 'selected' : ''}`;
      item.onclick = () => this.inspectReport(report.id);

      let statusBadge = '';
      if (report.status === 'PENDING_VERIFICATION') {
        statusBadge = `<span class="status-pill warning" style="font-size:0.7rem;">⚠️ APPROVAL REQUIRED</span>`;
      } else if (report.status === 'CONFIRMED') {
        statusBadge = `<span class="status-pill danger" style="font-size:0.7rem;">🔥 APPROVED ACTIVE FIRE</span>`;
      } else {
        statusBadge = `<span class="status-pill" style="font-size:0.7rem; color:#64748b;">✓ DISMISSED</span>`;
      }

      item.innerHTML = `
        <div class="queue-item-top">
          <span class="queue-id">${report.id}</span>
          ${statusBadge}
        </div>
        <div class="queue-item-title">${report.locationName}</div>
        <div class="queue-item-meta">
          <span>🕒 ${report.timestamp}</span>
          <span>•</span>
          <span>${report.fireType}</span>
        </div>
      `;

      queueList.appendChild(item);
    });
  },

  inspectReport(reportId) {
    this.selectedReportId = reportId;
    const report = PyroState.reports.find(r => r.id === reportId);
    if (!report) return;

    const station = PyroState.stations.find(s => s.id === report.assignedStationId) || PyroState.stations[0];

    // Populate inspection UI
    const elTitle = document.getElementById('inspectReportTitle');
    const elStatus = document.getElementById('inspectReportStatus');
    const elLocation = document.getElementById('inspectLocation');
    const elCoords = document.getElementById('inspectCoords');
    const elReporter = document.getElementById('inspectReporter');
    const elNotes = document.getElementById('inspectNotes');
    const elPhoto = document.getElementById('inspectPhoto');
    const elScore = document.getElementById('inspectScore');
    const elScoreFill = document.getElementById('inspectScoreFill');
    const elSensorSummary = document.getElementById('inspectSensorSummary');
    const actionsBar = document.getElementById('inspectActionsBar');

    if (elTitle) elTitle.textContent = `${report.locationName} (${report.id})`;
    if (elStatus) {
      if (report.status === 'PENDING_VERIFICATION') {
        elStatus.innerHTML = `<span class="role-pill admin" style="background:#fef3c7; color:#b45309;">⚠️ APPROVAL REQUIRED</span>`;
      } else if (report.status === 'CONFIRMED') {
        elStatus.innerHTML = `<span class="role-pill admin" style="background:#fee2e2; color:#b91c1c;">🔥 APPROVED & ACTIVE FIRE</span>`;
      } else {
        elStatus.innerHTML = `<span class="role-pill citizen">✓ DISMISSED / CONTROLLED</span>`;
      }
    }

    if (elLocation) elLocation.textContent = report.locationName;
    if (elCoords) elCoords.textContent = `${report.coords[0].toFixed(4)}, ${report.coords[1].toFixed(4)}`;
    if (elReporter) elReporter.textContent = `${report.reporterName} (${report.reporterContact})`;
    if (elNotes) elNotes.textContent = report.description;
    if (elPhoto) elPhoto.src = report.photoUrl;

    if (elScore) elScore.textContent = `${report.sensorCorrelation.toFixed(1)}%`;
    if (elScoreFill) elScoreFill.style.width = `${report.sensorCorrelation}%`;

    if (elSensorSummary) {
      elSensorSummary.innerHTML = `
        <div style="font-size:0.8rem; margin-bottom:6px;"><strong>Nearest Station Telemetry (${station.name}):</strong></div>
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; font-size:0.75rem;">
          <div style="background:#ffffff; padding:6px; border-radius:4px; border:1px solid #e2e8f0;">
            <span style="color:#64748b; display:block;">SHT31 AIR TEMP</span>
            <strong style="color:${station.telemetry.sht31.airTemp > 30 ? '#ea580c' : '#0f172a'}">${station.telemetry.sht31.airTemp.toFixed(1)}°C</strong>
          </div>
          <div style="background:#ffffff; padding:6px; border-radius:4px; border:1px solid #e2e8f0;">
            <span style="color:#64748b; display:block;">DS18B20 SOIL</span>
            <strong style="color:${station.telemetry.ds18b20.soilTemp > 35 ? '#ea580c' : '#0f172a'}">${station.telemetry.ds18b20.soilTemp.toFixed(1)}°C</strong>
          </div>
          <div style="background:#ffffff; padding:6px; border-radius:4px; border:1px solid #e2e8f0;">
            <span style="color:#64748b; display:block;">PM2.5 SMOKE</span>
            <strong style="color:${station.telemetry.smoke.pm25 > 50 ? '#dc2626' : '#16a34a'}">${station.telemetry.smoke.pm25.toFixed(1)} µg/m³</strong>
          </div>
        </div>
      `;
    }

    // Configure Action Buttons
    if (actionsBar) {
      if (report.status === 'PENDING_VERIFICATION') {
        actionsBar.innerHTML = `
          <button class="btn-primary" onclick="PyroAdmin.openApprovalModal('${report.id}')" style="box-shadow: 0 2px 8px rgba(220, 38, 38, 0.35);">
            🚨 Initiate Fire Approval Process
          </button>
          <button class="btn-secondary" onclick="PyroAdmin.dispatchReconDrone('${report.id}')">
            🚁 Dispatch Recon Drone
          </button>
          <button class="btn-secondary" style="color:#dc2626; border-color:#fca5a5;" onclick="PyroAdmin.dismissReport('${report.id}')">
            ❌ Dismiss as False Alarm
          </button>
        `;
      } else if (report.status === 'CONFIRMED') {
        actionsBar.innerHTML = `
          <div style="background:#fee2e2; color:#b91c1c; padding:8px 12px; border-radius:6px; font-size:0.82rem; font-weight:600; width:100%;">
            🚨 FIRE INCIDENT OFFICIALLY APPROVED & ACTIVE: Verified by ${report.verifiedBy || PyroState.currentUser.name} at ${report.timestamp}.
          </div>
          <button class="btn-primary" onclick="PyroAdmin.viewDispatchCertificate('${report.id}')">
            📜 View Dispatch Certificate
          </button>
          <button class="btn-secondary" onclick="PyroAdmin.dispatchReconDrone('${report.id}')">
            🚁 Drone Live Downlink
          </button>
          <button class="btn-secondary" onclick="PyroAdmin.resolveIncident('${report.id}')">
            ✅ Mark Fire Contained
          </button>
        `;
      } else {
        actionsBar.innerHTML = `
          <div style="background:#f1f5f9; color:#475569; padding:8px 12px; border-radius:6px; font-size:0.82rem; width:100%;">
            ✓ DISMISSED: ${report.verificationNote || "Controlled operation or no active ignition verified."}
          </div>
        `;
      }
    }

    this.renderReportsQueue();
  },

  /**
   * Opens the interactive Multi-Step Fire Approval Process Modal
   */
  openApprovalModal(reportId) {
    if (!PyroAuth.requireAdmin("Initiate Fire Incident Approval", () => this.openApprovalModal(reportId))) {
      return;
    }

    this.activeApprovalReportId = reportId;
    const report = PyroState.reports.find(r => r.id === reportId);
    if (!report) return;

    const station = PyroState.stations.find(s => s.id === report.assignedStationId) || PyroState.stations[1];
    const t = station.telemetry;

    const modal = document.getElementById('fireApprovalWorkflowModal');
    if (!modal) return;

    // Populate Modal Content
    const targetTitle = document.getElementById('approvalIncidentTargetName');
    const targetCoords = document.getElementById('approvalIncidentCoords');
    const officerName = document.getElementById('approvalOfficerName');
    const tokenElem = document.getElementById('approvalAuthToken');

    if (targetTitle) targetTitle.textContent = `${report.locationName} (#${report.id})`;
    if (targetCoords) targetCoords.textContent = `${report.coords[0].toFixed(4)}° N, ${report.coords[1].toFixed(4)}° E (Western Ghats Nilgiri Corridor)`;
    if (officerName) officerName.textContent = PyroState.currentUser.name;
    if (tokenElem) tokenElem.textContent = `IAM-AUTH-KL-TN-${Date.now().toString(36).toUpperCase()}`;

    // Populate Live Sensor Corroboration Tags
    const sAir = document.getElementById('chkTelemetryAir');
    const sSoil = document.getElementById('chkTelemetrySoil');
    const sSmoke = document.getElementById('chkTelemetrySmoke');
    const sTherm = document.getElementById('chkTelemetryTherm');
    const sAi = document.getElementById('chkTelemetryAi');
    const sWind = document.getElementById('chkTelemetryWind');

    if (sAir) sAir.textContent = `${t.sht31.airTemp.toFixed(1)}°C (Shielded Ambient Air)`;
    if (sSoil) sSoil.textContent = `${t.ds18b20.soilTemp.toFixed(1)}°C (15cm Subsurface Probe)`;
    if (sSmoke) sSmoke.textContent = `${t.smoke.pm25.toFixed(1)} µg/m³ PM2.5 (Optical Laser Dust)`;
    if (sTherm) sTherm.textContent = `${t.thermal.maxSpotTemp.toFixed(1)}°C Spot (640x512 Radiometric PTZ)`;
    if (sAi) sAi.textContent = `${t.aiVision.flameConfidence.toFixed(0)}% Flame / ${t.aiVision.smokeConfidence.toFixed(0)}% Smoke Column`;
    if (sWind) sWind.textContent = `${t.wind.speed.toFixed(1)} km/h ${t.wind.cardinal} (Spread Vector)`;

    modal.classList.add('open');
  },

  closeApprovalModal() {
    const modal = document.getElementById('fireApprovalWorkflowModal');
    if (modal) modal.classList.remove('open');
  },

  /**
   * Final step: Execute the Official Fire Approval & Issue Dispatch Order
   */
  executeApproval() {
    const reportId = this.activeApprovalReportId || this.selectedReportId;
    const report = PyroState.reports.find(r => r.id === reportId);
    if (!report) return;

    const severityTierSelect = document.getElementById('approvalSeverityTier');
    const severityTier = severityTierSelect ? severityTierSelect.value : "Tier 2: High Hazard - Agro-Forest Border Fire";

    // Mark as confirmed in state
    report.status = 'CONFIRMED';
    report.verifiedBy = `${PyroState.currentUser.name} (Incident Commander / DFO)`;
    report.verificationNote = `Officially approved under ${severityTier}. Corroborated with multi-sensor telemetry & AI plume verification.`;
    report.timestamp = "Just Now";

    // Set simulation state to active red alert
    PyroState.simulation.redAlertBroadcastActive = true;
    PyroState.simulation.alertZone = report.locationName;

    // Trigger Emergency Evacuation Banner
    PyroApp.triggerEmergencyBanner(true, `🚨 APPROVED WILDFIRE: ${report.locationName.toUpperCase()}! IMMEDIATE 600M EVACUATION IN EFFECT.`);

    // Sound siren synthesizer
    this.startEmergencySiren();

    // Log to Google Cloud Audit
    const authCode = `AUTH-DISASTER-IN-${Date.now().toString(36).toUpperCase()}`;
    PyroState.addLog(
      "CRITICAL",
      "Incident Command Cell",
      `FIRE INCIDENT APPROVED: Order #${authCode} issued by ${PyroState.currentUser.email}. 2x Quick Response Tenders & Recon Drone #DR-08 dispatched.`
    );

    this.closeApprovalModal();
    PyroState.notify('incident_verified', report);
    this.inspectReport(reportId);

    // Show the Official Government Dispatch Order Certificate
    this.viewDispatchCertificate(reportId, authCode, severityTier);
  },

  viewDispatchCertificate(reportId, authCode = "AUTH-DISASTER-IN-9481X", severityTier = "Tier 2: High Hazard - Agro-Forest Border Fire") {
    const report = PyroState.reports.find(r => r.id === reportId);
    if (!report) return;

    const certModal = document.getElementById('dispatchOrderCertificateModal');
    if (!certModal) return;

    const elOrderNum = document.getElementById('certOrderNumber');
    const elTarget = document.getElementById('certTargetIncident');
    const elOfficer = document.getElementById('certOfficerSignature');
    const elTime = document.getElementById('certTimestamp');
    const elTier = document.getElementById('certSeverityTier');

    if (elOrderNum) elOrderNum.textContent = authCode;
    if (elTarget) elTarget.textContent = `${report.locationName} [Coords: ${report.coords[0].toFixed(4)}° N, ${report.coords[1].toFixed(4)}° E]`;
    if (elOfficer) elOfficer.textContent = `${PyroState.currentUser.name} (Divisional Forest Officer / Incident Commander)`;
    if (elTime) elTime.textContent = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + " IST";
    if (elTier) elTier.textContent = severityTier;

    certModal.classList.add('open');
  },

  closeDispatchCertificate() {
    const certModal = document.getElementById('dispatchOrderCertificateModal');
    if (certModal) certModal.classList.remove('open');
    PyroApp.switchTab('map');
  },

  dismissReport(reportId) {
    if (!PyroAuth.requireAdmin("Dismiss Report", () => this.dismissReport(reportId))) {
      return;
    }

    const report = PyroState.reports.find(r => r.id === reportId);
    if (!report) return;

    const reason = prompt("Enter verification dismissal reason (e.g. Authorized agricultural burn, dust cloud, false report):", "Authorized controlled brush burn - no danger to public.");
    if (reason === null) return;

    report.status = 'DISMISSED';
    report.verifiedBy = `${PyroState.currentUser.name}`;
    report.verificationNote = reason;

    PyroState.addLog("INFO", "Incident Command Center", `Admin ${PyroState.currentUser.email} DISMISSED Report #${report.id}: "${reason}".`);

    PyroState.notify('incident_dismissed', report);
    this.inspectReport(reportId);
  },

  resolveIncident(reportId) {
    if (!PyroAuth.requireAdmin("Resolve Incident", () => this.resolveIncident(reportId))) {
      return;
    }

    const report = PyroState.reports.find(r => r.id === reportId);
    if (!report) return;

    report.status = 'DISMISSED';
    report.verificationNote = "Fire 100% extinguished and contained by emergency responders.";

    PyroState.simulation.redAlertBroadcastActive = false;
    this.stopEmergencySiren();
    PyroApp.triggerEmergencyBanner(false);

    PyroState.addLog("INFO", "Incident Command Center", `Fire incident #${report.id} marked as 100% CONTAINED and resolved.`);
    PyroState.notify('incident_dismissed', report);
    this.inspectReport(reportId);
  },

  dispatchReconDrone(reportId) {
    if (!PyroAuth.requireAdmin("Dispatch Recon Drone", () => this.dispatchReconDrone(reportId))) {
      return;
    }
    const report = PyroState.reports.find(r => r.id === reportId);
    if (!report) return;

    alert(`🚁 RECON DRONE #DR-08 DISPATCHED!\nDestination: ${report.locationName} [${report.coords[0].toFixed(4)}, ${report.coords[1].toFixed(4)}]\nETA: 75 seconds.\nThermal camera downlink streaming to cloud incident command...`);

    PyroState.addLog("INFO", "Autonomous Drone Fleet", `Recon Drone #DR-08 launched to coordinates [${report.coords[0].toFixed(4)}, ${report.coords[1].toFixed(4)}] for optical & thermal confirmation.`);
  },

  // Web Audio API Synthesizer for Emergency Evacuation Siren
  startEmergencySiren() {
    try {
      if (this.isSirenPlaying) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();

      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0.12, this.audioContext.currentTime);

      // Pitch sweep up and down like a tactical emergency siren
      const now = this.audioContext.currentTime;
      for (let i = 0; i < 20; i++) {
        osc.frequency.setValueAtTime(450, now + i * 1.6);
        osc.frequency.linearRampToValueAtTime(950, now + i * 1.6 + 0.8);
        osc.frequency.linearRampToValueAtTime(450, now + i * 1.6 + 1.6);
      }

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start();
      this.sirenOscillator = osc;
      this.sirenGainNode = gain;
      this.isSirenPlaying = true;
      PyroState.simulation.isAudioAlarmPlaying = true;

      // Automatically taper off after 8 seconds
      setTimeout(() => {
        this.stopEmergencySiren();
      }, 8000);

    } catch (e) {
      console.warn("Web Audio API not supported or user gesture needed:", e);
    }
  },

  stopEmergencySiren() {
    if (this.sirenGainNode && this.audioContext) {
      try {
        this.sirenGainNode.gain.linearRampToValueAtTime(0.0001, this.audioContext.currentTime + 0.5);
        setTimeout(() => {
          if (this.sirenOscillator) {
            this.sirenOscillator.stop();
            this.sirenOscillator.disconnect();
          }
          this.isSirenPlaying = false;
          PyroState.simulation.isAudioAlarmPlaying = false;
        }, 500);
      } catch (e) {
        this.isSirenPlaying = false;
      }
    }
  }
};

window.PyroAdmin = PyroAdmin;
