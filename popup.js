/**
 * Loser Alarm - Popup UI Script
 * 
 * Handles:
 * - Displaying current state
 * - User interactions (buttons)
 * - Real-time state updates
 * - Settings management
 */

let currentState = {};
let currentSettings = {};

// DOM Elements
const timerDisplay = document.getElementById("timer");
const siteName = document.getElementById("siteName");
const siteIcon = document.getElementById("siteIcon");
const progressFill = document.getElementById("progressFill");
const progressPercent = document.getElementById("progressPercent");
const timeLimitDisplay = document.getElementById("timeLimitDisplay");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const debugInfo = document.getElementById("debugInfo");

// Buttons
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resumeBtn = document.getElementById("resumeBtn");
const resetBtn = document.getElementById("resetBtn");
const stopAlarmBtn = document.getElementById("stopAlarmBtn");
const alarmButtonGroup = document.getElementById("alarmButtonGroup");
const alarmStatusContainer = document.getElementById("alarmStatusContainer");

// Settings Inputs
const limitInput = document.getElementById("limitInput");
const alarmIntervalInput = document.getElementById("alarmIntervalInput");
const updateLimitBtn = document.getElementById("updateLimitBtn");
const updateIntervalBtn = document.getElementById("updateIntervalBtn");
const enableTtsToggle = document.getElementById("enableTtsToggle");

// Site Toggles
const trackXbox = document.getElementById("trackXbox");
const trackNetflix = document.getElementById("trackNetflix");
const trackPrime = document.getElementById("trackPrime");
const trackHotstar = document.getElementById("trackHotstar");

/**
 * Initialize popup
 */
document.addEventListener("DOMContentLoaded", async () => {
  // Load saved state and settings
  await loadState();
  await loadSettings();
  
  // Set up event listeners
  setupEventListeners();
  
  // Update display
  updateDisplay();
  
  // Listen for state updates from background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "STATE_UPDATE") {
      currentState = { ...currentState, ...request.state };
      updateDisplay();
    }
  });
  
  // Continuously sync state from storage every 1 second
  setInterval(async () => {
    await loadState();
    updateDisplay();
  }, 1000);
});

/**
 * Load state from storage directly
 */
async function loadState() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["state"], (result) => {
      if (result.state) {
        currentState = { ...currentState, ...result.state };
      }
      resolve();
    });
  });
}

/**
 * Load settings from storage
 */
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["settings"], (result) => {
      if (result.settings) {
        currentSettings = result.settings;
        
        // Update UI with settings
        limitInput.value = currentSettings.limitMinutes || 180;
        alarmIntervalInput.value = currentSettings.alarmIntervalSeconds || 30;
        enableTtsToggle.checked = currentSettings.enableTts !== false;
        
        trackXbox.checked = currentSettings.trackedSites?.xbox !== false;
        trackNetflix.checked = currentSettings.trackedSites?.netflix !== false;
        trackPrime.checked = currentSettings.trackedSites?.prime !== false;
        trackHotstar.checked = currentSettings.trackedSites?.hotstar !== false;
      }
      resolve();
    });
  });
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  startBtn.addEventListener("click", () => {
    // Get the current tab that the popup is open in
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        alert("Error: Could not find active tab");
        return;
      }
      
      const currentTab = tabs[0];
      console.log("Popup opened in tab:", currentTab.url);
      
      chrome.runtime.sendMessage(
        { action: "START", tabUrl: currentTab.url }, 
        (response) => {
          if (!response?.success) {
            alert("Could not start tracking. Make sure you're on a tracked website.");
          }
          loadState().then(updateDisplay);
        }
      );
    });
  });
  
  pauseBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "PAUSE" }, () => {
      loadState().then(updateDisplay);
    });
  });
  
  resumeBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "RESUME" }, () => {
      loadState().then(updateDisplay);
    });
  });
  
  resetBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to reset? This cannot be undone.")) {
      chrome.runtime.sendMessage({ action: "RESET" }, () => {
        loadState().then(updateDisplay);
      });
    }
  });
  
  stopAlarmBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "STOP_ALARM" }, () => {
      loadState().then(updateDisplay);
    });
  });
  
  updateLimitBtn.addEventListener("click", () => {
    const newLimit = parseInt(limitInput.value);
    if (newLimit > 0 && newLimit <= 1440) {
      currentSettings.limitMinutes = newLimit;
      saveSettings();
    }
  });
  
  updateIntervalBtn.addEventListener("click", () => {
    const newInterval = parseInt(alarmIntervalInput.value);
    if (newInterval >= 5 && newInterval <= 300) {
      currentSettings.alarmIntervalSeconds = newInterval;
      saveSettings();
    }
  });
  
  enableTtsToggle.addEventListener("change", () => {
    currentSettings.enableTts = enableTtsToggle.checked;
    saveSettings();
  });
  
  trackXbox.addEventListener("change", () => {
    if (!currentSettings.trackedSites) currentSettings.trackedSites = {};
    currentSettings.trackedSites.xbox = trackXbox.checked;
    saveSettings();
  });
  
  trackNetflix.addEventListener("change", () => {
    if (!currentSettings.trackedSites) currentSettings.trackedSites = {};
    currentSettings.trackedSites.netflix = trackNetflix.checked;
    saveSettings();
  });
  
  trackPrime.addEventListener("change", () => {
    if (!currentSettings.trackedSites) currentSettings.trackedSites = {};
    currentSettings.trackedSites.prime = trackPrime.checked;
    saveSettings();
  });
  
  trackHotstar.addEventListener("change", () => {
    if (!currentSettings.trackedSites) currentSettings.trackedSites = {};
    currentSettings.trackedSites.hotstar = trackHotstar.checked;
    saveSettings();
  });
}

/**
 * Save settings to storage
 */
function saveSettings() {
  chrome.runtime.sendMessage(
    { action: "UPDATE_SETTINGS", settings: currentSettings },
    () => {
      console.log("Settings updated");
    }
  );
}

/**
 * Format seconds to HH:MM:SS
 */
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * Format time for display
 */
function formatMinutes(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

/**
 * Get site emoji icon
 */
function getSiteIcon(siteKey) {
  const icons = {
    xbox: "🎮",
    netflix: "🍿",
    prime: "📺",
    hotstar: "⭐"
  };
  return icons[siteKey] || "🎬";
}

/**
 * Calculate current elapsed time (accounting for time since last update)
 */
function getCurrentElapsedTime() {
  if (!currentState.isRunning || !currentState.lastUpdateTime) {
    return currentState.elapsedSeconds || 0;
  }
  
  const now = Date.now();
  const deltaSeconds = Math.floor((now - currentState.lastUpdateTime) / 1000);
  return (currentState.elapsedSeconds || 0) + deltaSeconds;
}

/**
 * Update UI display
 */
function updateDisplay() {
  // Update timer - calculate in real-time
  const displaySeconds = getCurrentElapsedTime();
  timerDisplay.textContent = formatTime(displaySeconds);
  
  // Update site display
  if (currentState.currentSite) {
    siteName.textContent = currentState.currentSite.name;
    siteIcon.textContent = getSiteIcon(currentState.currentSite.key);
  } else {
    siteName.textContent = "No site tracked";
    siteIcon.textContent = "—";
  }
  
  // Update progress
  const limitSeconds = (currentSettings.limitMinutes || 180) * 60;
  const progress = Math.min(100, (displaySeconds / limitSeconds) * 100);
  progressFill.style.width = `${progress}%`;
  progressPercent.textContent = `${Math.round(progress)}%`;
  timeLimitDisplay.textContent = `/ ${formatMinutes(currentSettings.limitMinutes || 180)}`;
  
  // Update status
  if (currentState.alarmActive) {
    statusDot.className = "status-dot alarm";
    statusText.textContent = "🚨 ALARM ACTIVE";
  } else if (currentState.isRunning) {
    statusDot.className = "status-dot active";
    statusText.textContent = "⏱️ Tracking";
  } else if (currentState.isPaused) {
    statusDot.className = "status-dot paused";
    statusText.textContent = "⏸️ Paused";
  } else {
    statusDot.className = "status-dot idle";
    statusText.textContent = "Idle";
  }
  
  // Update button states
  startBtn.disabled = currentState.isRunning;
  pauseBtn.disabled = !currentState.isRunning;
  resumeBtn.disabled = !currentState.isPaused;
  
  // Update alarm section visibility
  if (currentState.alarmActive) {
    alarmStatusContainer.style.display = "block";
    alarmButtonGroup.style.display = "flex";
  } else {
    alarmStatusContainer.style.display = "none";
    alarmButtonGroup.style.display = "none";
  }
  
  // Update debug info
  updateDebugInfo();
}

/**
 * Update debug info display
 */
function updateDebugInfo() {
  const info = {
    "Elapsed Time": formatTime(currentState.elapsedSeconds || 0),
    "Running": currentState.isRunning ? "Yes" : "No",
    "Paused": currentState.isPaused ? "Yes" : "No",
    "Current Site": currentState.currentSite?.name || "None",
    "Alarm Active": currentState.alarmActive ? "Yes" : "No",
    "Limit": `${currentSettings.limitMinutes} minutes`,
    "Alarm Interval": `${currentSettings.alarmIntervalSeconds} seconds`,
    "TTS Enabled": currentSettings.enableTts ? "Yes" : "No",
    "Last Update": new Date().toLocaleTimeString()
  };
  
  debugInfo.textContent = JSON.stringify(info, null, 2);
}
