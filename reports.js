/**
 * PyroGuard Cloud - Citizen Fire Accident Reporting Engine
 */

const PyroReports = {
  currentPhotoDataUrl: "assets/sample_report.jpg",

  init() {
    this.setupEventListeners();
  },

  setupEventListeners() {
    const photoUploadInput = document.getElementById('reportPhotoInput');
    const photoUploadZone = document.getElementById('photoUploadZone');
    const previewBox = document.getElementById('photoPreviewBox');
    const previewImg = document.getElementById('photoPreviewImg');
    const reportForm = document.getElementById('fireReportForm');
    const pinMapToggleBtn = document.getElementById('pinMapToggleBtn');

    if (photoUploadZone && photoUploadInput) {
      photoUploadZone.onclick = () => photoUploadInput.click();

      photoUploadInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            this.currentPhotoDataUrl = evt.target.result;
            if (previewImg) previewImg.src = evt.target.result;
            if (previewBox) previewBox.style.display = 'block';
            this.simulateAiPrescreen();
          };
          reader.readAsDataURL(file);
        }
      };
    }

    if (pinMapToggleBtn) {
      pinMapToggleBtn.onclick = () => {
        PyroMap.reportPinMode = !PyroMap.reportPinMode;
        pinMapToggleBtn.classList.toggle('active', PyroMap.reportPinMode);
        if (PyroMap.reportPinMode) {
          PyroApp.switchTab('map');
          alert("📍 CLICK ANYWHERE ON THE MAP to set the fire incident location pin.");
        }
      };
    }

    if (reportForm) {
      reportForm.onsubmit = (e) => {
        e.preventDefault();
        this.submitFireReport();
      };
    }
  },

  simulateAiPrescreen() {
    const aiBadge = document.getElementById('aiPrescreenBadge');
    if (aiBadge) {
      aiBadge.innerHTML = `<span>⏳ Analyzing via Cloud Vision AI...</span>`;
      setTimeout(() => {
        aiBadge.innerHTML = `
          <span>🔥 Flame Detected: 94.2%</span>
          <span style="margin:0 4px;">|</span>
          <span>💨 Smoke Plume: 97.6%</span>
        `;
      }, 900);
    }
  },

  useSamplePhoto() {
    this.currentPhotoDataUrl = "assets/sample_report.jpg";
    const previewBox = document.getElementById('photoPreviewBox');
    const previewImg = document.getElementById('photoPreviewImg');
    if (previewImg) previewImg.src = this.currentPhotoDataUrl;
    if (previewBox) previewBox.style.display = 'block';
    this.simulateAiPrescreen();
  },

  submitFireReport() {
    const locationName = document.getElementById('reportLocationName').value || "Reported Location";
    const lat = parseFloat(document.getElementById('reportLat').value) || 11.6680;
    const lng = parseFloat(document.getElementById('reportLng').value) || 76.2850;
    const fireType = document.getElementById('reportFireType').value;
    const severity = document.getElementById('reportSeverity').value;
    const smokeColor = document.getElementById('reportSmokeColor').value;
    const flameHeight = document.getElementById('reportFlameHeight').value;
    const reporterName = document.getElementById('reportReporterName').value || "Anonymous Field Observer";
    const reporterContact = document.getElementById('reportReporterContact').value || "None provided";
    const description = document.getElementById('reportNotes').value || "Outdoor fire reported by citizen";

    // Auto calculate nearest station
    let nearestStation = PyroState.stations[0];
    let minDistance = 99999;
    PyroState.stations.forEach(st => {
      const dist = Math.hypot(st.coords[0] - lat, st.coords[1] - lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearestStation = st;
      }
    });

    // Correlation with nearest sensor station
    const sensorCorrelation = nearestStation.telemetry.smoke.pm25 > 50 || nearestStation.telemetry.sht31.airTemp > 30 ? 92.5 : 45.0;

    const newReport = {
      id: "INC-" + (9480 + PyroState.reports.length + 1),
      timestamp: "Just now",
      isoTime: new Date().toISOString(),
      locationName: locationName,
      coords: [lat, lng],
      fireType: fireType,
      severity: severity,
      smokeColor: smokeColor,
      flameHeight: flameHeight,
      reporterName: reporterName,
      reporterContact: reporterContact,
      description: description,
      photoUrl: this.currentPhotoDataUrl || "assets/sample_report.jpg",
      aiPreCheck: {
        flameDetected: true,
        smokeDetected: true,
        flameScore: 94.2,
        smokeScore: 97.6,
        summary: `Cloud Vision AI detected surface flame & smoke column. Correlated with Station ${nearestStation.id}.`
      },
      status: "PENDING_VERIFICATION",
      assignedStationId: nearestStation.id,
      sensorCorrelation: sensorCorrelation,
      verifiedBy: null,
      verificationNote: null
    };

    // Add to State
    PyroState.reports.unshift(newReport);
    PyroState.addLog("WARN", "Citizen Report Engine", `New fire accident reported: #${newReport.id} at ${locationName}. Queued for Admin Verification.`);

    PyroState.notify('incident_added', newReport);

    // Show Success Modal
    this.showConfirmationModal(newReport);

    // Reset Form
    document.getElementById('fireReportForm').reset();
    const previewBox = document.getElementById('photoPreviewBox');
    if (previewBox) previewBox.style.display = 'none';
  },

  showConfirmationModal(report) {
    const modal = document.getElementById('reportSuccessModal');
    const detailsElem = document.getElementById('reportSuccessDetails');
    if (detailsElem) {
      detailsElem.innerHTML = `
        <div style="background:#fff7ed; border-left:4px solid #ea580c; padding:10px; border-radius:4px; margin-bottom:12px;">
          <strong>Incident Ticket:</strong> #${report.id}<br>
          <strong>Status:</strong> <span style="color:#d97706; font-weight:700;">PENDING ADMIN VERIFICATION</span><br>
          <strong>Nearest Sensor Node:</strong> ${report.assignedStationId} (${report.sensorCorrelation.toFixed(1)}% Telemetry Match)
        </div>
        <p style="font-size:0.85rem; color:#475569;">
          Emergency responders and forest rangers have been alerted. Stand clear and stay upwind of smoke!
        </p>
      `;
    }
    if (modal) modal.classList.add('open');
  }
};

window.PyroReports = PyroReports;
