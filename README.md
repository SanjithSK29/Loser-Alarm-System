# Loser Alarm - Chrome Extension (MV3)

A powerful Chrome Extension that tracks continuous time spent on distraction websites and triggers an audio + TTS alarm after a configurable time limit (default: 3 hours).

## Features

 **Distraction Tracking** - Monitors time on:
- Xbox Cloud Gaming (xbox.com/play/*)
- Netflix (netflix.com/*)
- Prime Video (primevideo.com/*, amazon.com/gp/video/*)
- Disney+ Hotstar (hotstar.com/*)

 **Smart Time Tracking**
- Only counts time when tab is **active** AND **window is focused**
- Automatically pauses timer when switching tabs or minimizing browser
- Resumes automatically when returning

 **Alarm System**
- Triggers real siren audio + optional TTS ("LOSER") when limit reached
- Repeats every 30 seconds (configurable) until stopped
- Persistent alarm state survives browser restart

 **Beautiful UI**
- Real-time timer display (HH:MM:SS)
- Visual progress bar toward time limit
- Start/Pause/Resume/Reset controls
- Stop Alarm button during active alarm

 **Customizable Settings**
- Per-site tracking toggle
- Configurable time limit (1-1440 minutes)
- Configurable alarm interval (5-300 seconds)
- Enable/disable TTS voice alarm

 **MV3 Compliant**
- Uses Chrome Service Workers
- Offscreen Document for audio playback
- No external dependencies or CDNs
- Secure, efficient implementation

## Installation

### Prerequisites
- Google Chrome 88+
- A siren audio file (see below)

### Quick Start

1. **Download or clone the extension folder**
   ```bash
   git clone <repo-url> ~/Loserr
   ```

2. **Add siren.mp3 audio file**
   - Place a siren/alarm sound file at `/path/to/Loserr/siren.mp3`
   - Can be any MP3 file with an alarm/siren sound
   - Recommended: Use a royalty-free siren from https://freesound.org

3. **Load in Chrome**
   - Open `chrome://extensions` in Chrome
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked"
   - Select the `Loserr` folder
   - Done! Extension now appears in your toolbar

## Usage

### Basic Operation

1. **Click the extension icon** in your toolbar
2. **Click "Start"** to begin tracking on the current distraction website
3. **Timer begins** only when you're on a tracked site with active tab + focused window
4. **After 3 hours** (or custom limit):
   - Siren audio plays in a loop
   - "LOSER" is spoken repeatedly via TTS (if enabled)
   - Alarm repeats every 30 seconds
5. **Click "Stop Alarm"** to silence it
6. **Click "Reset"** to clear timer and alarm

### Testing with Shorter Interval

To test the alarm without waiting 3 hours:

1. Open the extension popup
2. Go to **Settings** section
3. Change **"Time Limit (minutes)"** to `1` (tests 1 minute = 60 seconds)
4. Click "Update"
5. Start tracking on any distraction site
6. Wait 1 minute to see the alarm trigger
7. Change it back to `180` for normal use

### Quick Test (10 seconds)

For rapid testing:

1. In Settings, set **"Time Limit (minutes)"** to `0.167` (approximately 10 seconds)
2. Click "Update"
3. Start tracking
4. Wait ~10 seconds
5. Alarm triggers

## Settings Explained

| Setting | Default | Range | Purpose |
|---------|---------|-------|---------|
| Time Limit | 180 min | 1-1440 | How long before alarm triggers |
| Alarm Interval | 30 sec | 5-300 | How often alarm repeats |
| Enable TTS | ON | Toggle | "LOSER" voice alarm |
| Track Xbox | ON | Toggle | Monitor Xbox.com |
| Track Netflix | ON | Toggle | Monitor Netflix.com |
| Track Prime | ON | Toggle | Monitor Prime Video & Amazon Video |
| Track Hotstar | ON | Toggle | Monitor Hotstar.com |

## State Persistence

The extension saves all state to Chrome's local storage:
- Current elapsed time
- Running/paused status
- Active site
- Alarm state
- User settings
- Last activity timestamp

This means:
- Closing the popup doesn't stop tracking
- Browser restart preserves elapsed time
- All settings survive updates

## Technical Details

### File Structure
```
Loserr/
├── manifest.json          # MV3 extension config
├── background.js          # Service worker (tracking logic)
├── popup.html             # UI popup
├── popup.js               # Popup logic
├── popup.css              # Popup styling
├── offscreen.html         # Offscreen audio document
├── offscreen.js           # Audio playback handler
├── siren.mp3              # Alarm sound file
└── README.md              # This file
```

### How It Works

1. **Background Service Worker** (`background.js`)
   - Listens to `chrome.tabs.onActivated` and `chrome.windows.onFocusChanged`
   - Checks active tab URL against tracked site patterns
   - Accumulates elapsed time when tracking conditions are met
   - Persists state to `chrome.storage.local`
   - Manages offscreen document for audio

2. **Offscreen Document** (`offscreen.html/js`)
   - MV3 requirement for audio playback
   - Receives PLAY_LOOP/STOP commands from background
   - Handles looping siren audio playback
   - Cannot be accessed by user directly

3. **Popup UI** (`popup.html/js/css`)
   - Displays current state and timer
   - Shows progress bar toward limit
   - Provides user controls (Start/Pause/Resume/Reset)
   - Manages settings and site toggles
   - Communicates with background via `chrome.runtime.sendMessage`

### Permissions Used

- `storage` - Persist state and settings
- `tabs` - Check active tab URL
- `offscreen` - Create audio playback document
- `alarms` - Periodic tracking checks
- `tts` - Text-to-speech for "LOSER" alarm
- Host permissions for tracked domains

### No Dangerous Permissions
- No access to browsing history
- No access to all websites
- Only monitors tabs on specific sites
- No network/backend communication
- All processing happens locally

## Troubleshooting

### Audio not playing
- Check that `siren.mp3` exists in the extension folder
- Ensure Chrome has audio permission for your device
- Try testing with a different audio file
- Check Chrome DevTools console (right-click extension → "Inspect background page")

### Timer not advancing
- Verify the tab is **active** (in focus)
- Verify the **Chrome window is focused** (not minimized)
- Verify site is in tracked list and enabled
- Check debug info in popup for current state

### Reset doesn't work
- Close the popup and reopen it
- Try unloading and reloading extension (`chrome://extensions`)

### Settings not saving
- Check that Chrome storage is working
- Try closing and reopening popup
- Check browser console for errors

## Customization

### Add More Websites

Edit `background.js`, modify `TRACKED_SITES`:

```javascript
const TRACKED_SITES = {
  youtube: {
    name: "YouTube",
    patterns: ["youtube.com"],
    enabled: true
  },
  // Add more...
};
```

Then update `popup.html` to add UI toggle for the new site.

### Change Default Time Limit

Edit `background.js`, modify `DEFAULT_SETTINGS`:

```javascript
const DEFAULT_SETTINGS = {
  limitMinutes: 120, // Change to your preference
  // ...
};
```

### Use Different Audio

1. Replace `siren.mp3` with your audio file
2. File must be in the root `Loserr/` folder
3. Supported formats: MP3, WAV, OGG, WebM

## Advanced Features

### Debug Mode

The popup includes a "Debug Info" section showing:
- Current elapsed time
- Running/paused state
- Current site
- Alarm status
- Settings values
- Last update timestamp

Expand the section to see real-time state information.

## Known Limitations

- Audio playback requires audio device/speakers
- Timer accuracy depends on browser being open
- Service worker may temporarily sleep (handled by timestamps)
- TTS quality depends on system TTS engine
- Can only track one site at a time (displays currently active)

## Security & Privacy

-  No data sent to any server
-  No user tracking or analytics
-  All processing local to your browser
-  State stored only in Chrome's local storage
-  Cannot access other extension data
-  Minimal permissions requested

## Future Enhancements

Potential improvements:
- Support tracking multiple simultaneous sites
- Daily/weekly statistics
- Block websites at time limit (with override)
- Custom alarm sounds
- Notification badges
- Integration with calendar
- Cloud sync of settings

## License

MIT License - Free to use and modify

## Support

Issues? Try:
1. Check console for errors (DevTools)
2. Reload extension (`chrome://extensions`)
3. Clear extension storage (Settings → Extensions → Loser Alarm → "Clear browsing data")
4. Verify file structure is correct

## Credits

Created as a productivity tool to encourage healthy browsing habits.

---

**Happy tracking! Stay focused and avoid the "Loser Alarm"! 🎯**
