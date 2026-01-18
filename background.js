/**
 * Loser Alarm - Background Service Worker (MV3)
 * 
 * Core Responsibilities:
 * - Track active tab and window focus
 * - Accumulate time spent on distraction sites
 * - Persist state to chrome.storage.local
 * - Trigger alarms when threshold reached
 * - Manage offscreen document for audio playback
 */

// Define tracked websites with patterns
const TRACKED_SITES = {
  xbox: {
    name: "Xbox Cloud Gaming",
    patterns: ["xbox.com"],
    enabled: true
  },
  netflix: {
    name: "Netflix",
    patterns: ["netflix.com"],
    enabled: true
  },
  prime: {
    name: "Prime Video",
    patterns: ["primevideo.com", "amazon.com/gp/video"],
    enabled: true
  },
  hotstar: {
    name: "Disney+ Hotstar",
    patterns: ["hotstar.com"],
    enabled: true
  }
};

// Default settings
const DEFAULT_SETTINGS = {
  limitMinutes: 180, // 3 hours in minutes
  alarmIntervalSeconds: 30,
  enableTts: true,
  trackedSites: {
    xbox: true,
    netflix: true,
    prime: true,
    hotstar: true
  }
};

// Global state
let currentState = {
  elapsedSeconds: 0,
  isRunning: false,
  isPaused: false,
  currentSite: null,
  lastUpdateTime: null,
  alarmActive: false,
  lastActiveTabId: null,
  lastFocusedWindowId: null,
  offscreenDocumentCreated: false
};

/**
 * Initialize extension on install/update
 */
chrome.runtime.onInstalled.addListener(() => {
  console.log("Loser Alarm installed!");
  initializeStorage();
  createOffscreenDocument();
});

/**
 * Initialize storage with defaults if not set
 */
async function initializeStorage() {
  const { settings, state } = await chrome.storage.local.get(["settings", "state"]);
  
  if (!settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }
  
  if (!state) {
    await chrome.storage.local.set({ state: currentState });
  } else {
    // Load saved state but reset running/paused flags on startup
    currentState = { ...currentState, ...state };
    // Always start fresh - let auto-detect determine state
    currentState.isRunning = false;
    currentState.isPaused = false;
    currentState.elapsedSeconds = 0; // Reset timer on extension startup
    await saveState(); // Save the reset state
  }
}

/**
 * Create offscreen document for audio playback (MV3 requirement)
 */
async function createOffscreenDocument() {
  const hasDocument = await chrome.offscreen.hasDocument();
  
  if (!hasDocument) {
    try {
      await chrome.offscreen.createDocument({
        url: "offscreen.html",
        reasons: ["AUDIO_PLAYBACK"],
        justification: "Play alarm audio for distraction time limit"
      });
      currentState.offscreenDocumentCreated = true;
    } catch (error) {
      console.error("Failed to create offscreen document:", error);
    }
  } else {
    currentState.offscreenDocumentCreated = true;
  }
}

/**
 * Detect which tracked site the URL belongs to
 */
function detectSite(url) {
  const urlLower = url.toLowerCase();
  
  for (const [siteKey, siteInfo] of Object.entries(TRACKED_SITES)) {
    for (const pattern of siteInfo.patterns) {
      if (urlLower.includes(pattern.toLowerCase())) {
        return { key: siteKey, name: siteInfo.name };
      }
    }
  }
  
  return null;
}

/**
 * Check current active tab and window focus status
 */
async function checkActiveTab() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tabs.length === 0) {
      console.log("No active tab found");
      return null;
    }
    
    const activeTab = tabs[0];
    console.log("Active tab URL:", activeTab.url);
    
    // Check window focus
    const currentWindow = await chrome.windows.getCurrent();
    const isWindowFocused = currentWindow.focused;
    
    console.log("Window focused:", isWindowFocused);
    
    // Detect if tab is on a tracked site
    const site = detectSite(activeTab.url);
    console.log("Detected site:", site);
    
    if (!site) {
      // Tab not on a tracked site
      if (currentState.isRunning && !currentState.isPaused) {
        console.log("Tab switched away from tracked site, pausing");
        pauseTracking();
      }
      return null;
    }
    
    // If window not focused, pause tracking
    if (!isWindowFocused) {
      if (currentState.isRunning && !currentState.isPaused) {
        console.log("Window lost focus, pausing");
        pauseTracking();
      }
      return null;
    }
    
    // We have a valid tracked site on an active, focused window
    currentState.lastActiveTabId = activeTab.id;
    return site;
    
  } catch (error) {
    console.error("Error checking active tab:", error);
    return null;
  }
}

/**
 * Start or resume tracking
 */
async function startTracking(tabUrl = null) {
  console.log("Starting tracking... with tabUrl:", tabUrl);
  
  // If tabUrl provided from popup, use it directly
  let site = null;
  if (tabUrl) {
    site = detectSite(tabUrl);
    console.log("Site detected from popup URL:", site);
  }
  
  // Otherwise check current active tab
  if (!site) {
    site = await checkActiveTab();
    console.log("Site detected from active tab:", site);
  }
  
  if (!site) {
    console.log("Not on a tracked site - cannot start");
    return false;
  }
  
  const { settings } = await chrome.storage.local.get(["settings"]);
  const siteEnabled = settings?.trackedSites?.[site.key];
  
  if (!siteEnabled) {
    console.log("Site tracking disabled:", site.name);
    return false;
  }
  
  console.log("Starting tracking for:", site.name);
  
  currentState.isRunning = true;
  currentState.isPaused = false;
  currentState.currentSite = site;
  currentState.lastUpdateTime = Date.now();
  
  await saveState();
  
  // Set up periodic check
  chrome.alarms.create("trackingCheck", { periodInMinutes: 0.1 }); // Check every 6 seconds
  
  // Broadcast update to popup
  notifyPopup();
  
  return true;
}

/**
 * Pause tracking (do NOT reset)
 */
async function pauseTracking() {
  currentState.isRunning = false;
  currentState.isPaused = true;
  currentState.lastUpdateTime = null;
  
  await saveState();
  notifyPopup();
}

/**
 * Resume tracking
 */
async function resumeTracking() {
  if (!currentState.currentSite) {
    await startTracking();
    return;
  }
  
  currentState.isRunning = true;
  currentState.isPaused = false;
  currentState.lastUpdateTime = Date.now();
  
  await saveState();
  
  chrome.alarms.create("trackingCheck", { periodInMinutes: 0.1 });
  notifyPopup();
}

/**
 * Stop and reset everything
 */
async function resetTracking() {
  currentState = {
    elapsedSeconds: 0,
    isRunning: false,
    isPaused: false,
    currentSite: null,
    lastUpdateTime: null,
    alarmActive: false,
    lastActiveTabId: null,
    lastFocusedWindowId: null,
    offscreenDocumentCreated: currentState.offscreenDocumentCreated
  };
  
  chrome.alarms.clear("trackingCheck");
  chrome.alarms.clear("alarmRepeat");
  
  await stopAlarm();
  await saveState();
  notifyPopup();
}

/**
 * Activate alarm (audio + TTS)
 */
async function activateAlarm() {
  if (currentState.alarmActive) {
    return; // Already active
  }
  
  currentState.alarmActive = true;
  await saveState();
  
  // Ensure offscreen document exists
  await createOffscreenDocument();
  
  // Send command to offscreen document to play audio
  try {
    chrome.runtime.sendMessage({
      type: "PLAY_ALARM",
      message: {
        action: "PLAY_LOOP",
        sound: "siren.mp3"
      }
    });
  } catch (error) {
    console.error("Failed to send message to offscreen:", error);
  }
  
  // Set up alarm to repeat TTS and audio reminders
  const { settings } = await chrome.storage.local.get(["settings"]);
  const intervalMinutes = (settings.alarmIntervalSeconds || 30) / 60;
  
  chrome.alarms.create("alarmRepeat", { periodInMinutes: intervalMinutes });
  
  // First TTS immediately
  if (settings.enableTts) {
    chrome.tts.speak("LOSER", { rate: 2.0 });
  }
  
  notifyPopup();
}

/**
 * Stop alarm
 */
async function stopAlarm() {
  currentState.alarmActive = false;
  
  chrome.alarms.clear("alarmRepeat");
  
  // Tell offscreen document to stop
  try {
    chrome.runtime.sendMessage({
      type: "STOP_ALARM",
      message: {
        action: "STOP"
      }
    });
  } catch (error) {
    console.error("Failed to stop alarm:", error);
  }
  
  await saveState();
  notifyPopup();
}

/**
 * Update elapsed time based on actual time delta
 */
async function updateElapsedTime() {
  if (!currentState.isRunning || !currentState.lastUpdateTime) {
    return;
  }
  
  const now = Date.now();
  const deltaSeconds = Math.floor((now - currentState.lastUpdateTime) / 1000);
  
  if (deltaSeconds > 0) {
    currentState.elapsedSeconds += deltaSeconds;
    currentState.lastUpdateTime = now;
    
    // Save state frequently
    await saveState();
    
    // Check if alarm threshold reached
    const { settings } = await chrome.storage.local.get(["settings"]);
    const limitSeconds = settings.limitMinutes * 60;
    
    if (currentState.elapsedSeconds >= limitSeconds && !currentState.alarmActive) {
      await activateAlarm();
    }
  }
}

/**
 * Save current state to storage
 */
async function saveState() {
  await chrome.storage.local.set({ state: currentState });
}

/**
 * Notify popup of state changes
 */
function notifyPopup() {
  chrome.runtime.sendMessage({
    type: "STATE_UPDATE",
    state: currentState
  }).catch(() => {
    // Popup not open, that's okay
  });
}

/**
 * Handle messages from popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background received message:", request.action);
  
  switch (request.action) {
    case "START":
      startTracking(request.tabUrl).then((success) => {
        sendResponse({ success: success, state: currentState });
      });
      return true;
    
    case "PAUSE":
      pauseTracking().then(() => {
        sendResponse({ success: true, state: currentState });
      });
      return true;
    
    case "RESUME":
      resumeTracking().then(() => {
        sendResponse({ success: true, state: currentState });
      });
      return true;
    
    case "RESET":
      resetTracking().then(() => {
        sendResponse({ success: true, state: currentState });
      });
      return true;
    
    case "STOP_ALARM":
      stopAlarm().then(() => {
        sendResponse({ success: true, state: currentState });
      });
      return true;
    
    case "GET_STATE":
      sendResponse({ success: true, state: currentState });
      return false;
    
    case "UPDATE_SETTINGS":
      chrome.storage.local.set({ settings: request.settings }).then(() => {
        sendResponse({ success: true });
      });
      return true;
    
    default:
      sendResponse({ success: false, error: "Unknown action" });
      return false;
  }
});

/**
 * Handle alarm events
 */
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "trackingCheck") {
    // Only update elapsed time if currently tracking
    // Don't pause based on this check - let tab/window events handle that
    if (currentState.isRunning) {
      console.log("Periodic check - updating elapsed time");
      updateElapsedTime();
    }
  }
  
  if (alarm.name === "alarmRepeat") {
    if (currentState.alarmActive) {
      // Re-play audio
      try {
        chrome.runtime.sendMessage({
          type: "PLAY_ALARM",
          message: {
            action: "PLAY_LOOP",
            sound: "siren.mp3"
          }
        });
      } catch (error) {
        console.error("Failed to repeat alarm audio:", error);
      }
      
      // Repeat TTS
      const { settings } = chrome.storage.local.get(["settings"], (result) => {
        if (result.settings.enableTts) {
          chrome.tts.speak("LOSER", { rate: 2.0 });
        }
      });
    }
  }
});

/**
 * Handle window focus changes
 */
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Chrome lost focus
    if (currentState.isRunning && !currentState.isPaused) {
      console.log("Chrome lost focus, pausing");
      await pauseTracking();
    }
  } else {
    // Chrome regained focus - could resume if on tracked site
    const site = await checkActiveTab();
    if (site && currentState.isPaused && currentState.currentSite?.key === site.key) {
      const { settings } = await chrome.storage.local.get(["settings"]);
      if (settings?.trackedSites?.[site.key]) {
        console.log("Chrome regained focus, resuming");
        await resumeTracking();
      }
    }
  }
});

/**
 * Handle tab activation changes
 */
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  console.log("Tab activated:", activeInfo.tabId);
  
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (!tab) return;
    
    console.log("New active tab URL:", tab.url);
    const site = detectSite(tab.url);
    
    if (!site) {
      // Switched to non-tracked site
      if (currentState.isRunning && !currentState.isPaused) {
        console.log("Switched to non-tracked site, pausing");
        await pauseTracking();
      }
      return;
    }
    
    // We're on a tracked site - check settings
    const { settings } = await chrome.storage.local.get(["settings"]);
    const siteEnabled = settings?.trackedSites?.[site.key];
    
    if (!siteEnabled) {
      console.log("Site disabled in settings:", site.name);
      if (currentState.isRunning) {
        await pauseTracking();
      }
      return;
    }
    
    // Auto-start or resume on tracked site
    if (!currentState.isRunning) {
      console.log("Auto-starting tracking for:", site.name);
      await startTracking(tab.url);
    }
  } catch (error) {
    console.error("Error in tab activation:", error);
  }
});

/**
 * Handle tab URL changes
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    console.log("Tab updated:", tab.url);
    const site = detectSite(tab.url);
    
    // Check if this is the active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const isActiveTab = tabs.length > 0 && tabs[0].id === tabId;
    
    if (!isActiveTab) return;
    
    if (!site) {
      // Navigated to non-tracked site
      if (currentState.isRunning && !currentState.isPaused) {
        console.log("Navigated to non-tracked site, pausing");
        await pauseTracking();
      }
      return;
    }
    
    // Navigated to a tracked site
    const { settings } = await chrome.storage.local.get(["settings"]);
    const siteEnabled = settings?.trackedSites?.[site.key];
    
    if (!siteEnabled) {
      console.log("Site disabled in settings:", site.name);
      return;
    }
    
    // Auto-start if not running
    if (!currentState.isRunning) {
      console.log("Navigated to tracked site, auto-starting:", site.name);
      await startTracking(tab.url);
    }
    // Switch if on different tracked site
    else if (currentState.currentSite?.key !== site.key) {
      console.log("Navigated to different tracked site, switching:", site.name);
      await startTracking(tab.url);
    }
  }
});
