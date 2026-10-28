/**
 * PyroGuard Cloud - Main Application Coordinator
 */

const PyroApp = {
  currentTab: 'map',

  init() {
    console.log("Initializing PyroGuard Cloud Prototype...");

    // Initialize Subsystems
    PyroMap.init();
    PyroSensors.init();
    PyroReports.init();
    PyroAdmin.init();
    PyroAuth.init();

    // Tab Navigation Setup
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetTab = btn.dataset.tab;
        if (targetTab) {
          this.switchTab(targetTab);
        }
      });
    });

    // Preset button listeners in Simulation view
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.preset;
        if (preset) {
          PyroSensors.applyPreset(preset);
        }
      });
    });

    // Map style selector buttons
    document.querySelectorAll('.map-style-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.map-style-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const style = btn.dataset.style;
        PyroMap.switchTileStyle(style);
      });
    });

    // Layer checkboxes
    document.querySelectorAll('.layer-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const layer = pill.dataset.layer;
        const isActive = pill.classList.toggle('active');
        PyroMap.toggleLayer(layer, isActive);
      });
    });
  },

  switchTab(tabId) {
    this.currentTab = tabId;

    // Update Tab Buttons
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // Update Tab Panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.remove('active');
    });

    const activePane = document.getElementById(`tabPane-${tabId}`);
    if (activePane) {
      activePane.classList.add('active');
    }

    // Refresh map if switching to map tab
    if (tabId === 'map' && PyroMap && PyroMap.map) {
      setTimeout(() => {
        PyroMap.map.invalidateSize();
      }, 100);
    }
  },

  triggerEmergencyBanner(show, message = "") {
    const banner = document.getElementById('emergencyBanner');
    const msgElem = document.getElementById('emergencyBannerText');

    if (banner) {
      if (show) {
        banner.classList.remove('hidden');
        if (msgElem) msgElem.textContent = message;
      } else {
        banner.classList.add('hidden');
      }
    }
  },

  triggerInstantFireDemo() {
    // 1-Click test demonstrating the complete cloud workflow
    if (!PyroState.currentUser.authenticated) {
      PyroAuth.loginViaGatekeeper('admin');
    }
    PyroSensors.applyPreset('wildfire');
    PyroApp.switchTab('map');
    PyroAdmin.startEmergencySiren();
    alert("🚨 DEMO TRIGGERED: Catastrophic Wildfire outbreak simulated! SHT31, PM2.5, and Thermal camera telemetry spiked. Check the Map and Admin Verification queue.");
  }
};

window.addEventListener('DOMContentLoaded', () => {
  PyroApp.init();
});

window.PyroApp = PyroApp;
