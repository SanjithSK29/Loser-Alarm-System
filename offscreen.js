/**
 * Loser Alarm - Offscreen Document Script (MV3)
 * 
 * Responsibilities:
 * - Load and play audio file (siren.mp3)
 * - Support loop playback
 * - Handle start/stop commands from background
 * 
 * Why offscreen document?
 * - MV3 service workers cannot use Web Audio API directly
 * - Offscreen documents allow background audio playback
 * - Required for persistent alarm sounds
 */

const audio = document.getElementById("alarmAudio");
let isPlaying = false;

/**
 * Handle messages from background service worker
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Offscreen received message:", message);
  
  if (message.type === "PLAY_ALARM") {
    handlePlayAlarm(message.message);
    sendResponse({ success: true });
  } else if (message.type === "STOP_ALARM") {
    handleStopAlarm(message.message);
    sendResponse({ success: true });
  }
});

/**
 * Play alarm audio in loop
 */
async function handlePlayAlarm(params) {
  try {
    // Reset audio to start
    audio.currentTime = 0;
    audio.loop = true;
    audio.volume = 1.0; // Full volume
    
    // Play audio
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log("Audio playback started");
          isPlaying = true;
        })
        .catch((error) => {
          console.error("Audio playback failed:", error);
          isPlaying = false;
        });
    }
  } catch (error) {
    console.error("Error in handlePlayAlarm:", error);
  }
}

/**
 * Stop alarm audio
 */
async function handleStopAlarm(params) {
  try {
    audio.pause();
    audio.currentTime = 0;
    audio.loop = false;
    isPlaying = false;
    console.log("Audio stopped");
  } catch (error) {
    console.error("Error in handleStopAlarm:", error);
  }
}

/**
 * Handle audio ended (for non-loop scenarios)
 */
audio.addEventListener("ended", () => {
  if (isPlaying) {
    // Restart if still playing
    audio.currentTime = 0;
    audio.play();
  }
});

/**
 * Handle audio errors
 */
audio.addEventListener("error", (error) => {
  console.error("Audio error:", error);
  console.error(
    "Make sure siren.mp3 exists in the extension root directory"
  );
});

console.log("Offscreen document initialized");
