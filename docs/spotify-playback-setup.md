# Spotify Playback Setup — Orion

## 1. Spotify Developer Dashboard

### Redirect URIs
Add these to your Spotify App settings → Edit Settings → Redirect URIs:

```
https://www.iasofthub.com/spotify-callback
http://localhost:5173/spotify-callback
```

### Required Scopes
The OAuth flow must request these scopes:
- `streaming` — Web Playback SDK
- `user-read-playback-state` — Read playback state
- `user-modify-playback-state` — Control playback (play/pause/skip)
- `user-read-currently-playing` — Current track info
- `user-read-email` — User profile
- `user-read-private` — Premium status check
- `user-library-read` — Saved tracks
- `playlist-read-private` — User playlists
- `playlist-modify-public` — Create/modify playlists
- `playlist-modify-private` — Create/modify private playlists

### App Mode
- **Development Mode**: Only users added to the app's user list can use OAuth
- **Extended Quota Mode**: Submit request for public access (up to 25 users during review)

---

## 2. Web Playback SDK (Browser)

The Web Playback SDK loads automatically via `useSpotifyPlayback.ts`. Requirements:
- User must have **Spotify Premium**
- Browser must support **Encrypted Media Extensions (EME)**
- HTTPS required in production

### Key features implemented:
- `enableMediaSession: true` — lockscreen/notification controls
- `activateElement()` — required for mobile autoplay
- `autoplay_failed` listener — prompts user to tap to activate
- `playback_error` listener — surfaces errors
- `disallows` tracking — disables buttons during ads/restrictions
- `repeat_mode` / `shuffle` state tracking
- `next_tracks` / `previous_tracks` from track_window

---

## 3. Android Native (Capacitor Plugin)

### Dependencies

Add to `android/app/build.gradle`:

```gradle
dependencies {
    implementation 'com.spotify.android:auth:2.1.1'
    // App Remote SDK — download from Spotify Developer portal
    implementation files('libs/spotify-app-remote-release-0.8.0.aar')
}
```

### Download Spotify App Remote SDK
1. Go to https://developer.spotify.com/documentation/android/
2. Download the **App Remote SDK** AAR
3. Place it in `android/app/libs/`

### AndroidManifest.xml

Add queries for Spotify app detection:

```xml
<queries>
    <package android:name="com.spotify.music" />
</queries>
```

### SHA-256 Fingerprint

Required for Android auth:

```bash
# Debug
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android

# Release
keytool -list -v -keystore your-release-key.keystore -alias your-alias
```

Add the SHA-256 fingerprint to Spotify Dashboard → Edit Settings → Android Packages:
- Package Name: `app.lovable.fc2105d766374b26bdec2c651f69d311`
- SHA-256 Fingerprint: (from keytool output)

### Register Plugin

In `MainActivity.java`:

```java
import app.lovable.fc2105d766374b26bdec2c651f69d311.SpotifyPlaybackPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SpotifyPlaybackPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
```

### Sync

```bash
npx cap sync android
```

---

## 4. Architecture

```
Browser (Web)                      Android (Native)
┌──────────────────┐               ┌──────────────────┐
│ useSpotifyPlayback│               │ SpotifyPlayback  │
│ (Web Playback SDK)│               │ Plugin (Java)    │
│                  │               │                  │
│ Spotify.Player() │               │ SpotifyAppRemote │
│ EME + DRM        │               │ (native SDK)     │
└──────────────────┘               └──────────────────┘
        ▲                                  ▲
        │                                  │
        └──── capacitor-spotify-plugin.ts ─┘
              (auto-detects platform)
```

- **Web**: `useSpotifyPlayback` hook → Spotify Web Playback SDK
- **Android**: `SpotifyCapacitorBridge` → native Java plugin → Spotify App Remote SDK
- **OrionPlaylistBar**: Uses `useSpotifyPlayback` for Premium users, falls back to 30s preview / YouTube embed

---

## 5. Troubleshooting

| Issue | Solution |
|-------|----------|
| "Premium required" | User needs Spotify Premium subscription |
| Autoplay blocked | Call `activateElement()` after user tap |
| No sound on mobile | Check `enableMediaSession` is true |
| 403 on play | Verify app is in Extended Quota mode or user is added to dev app |
| EME not supported | Use native Capacitor plugin instead of web SDK |
| "Not registered" | Add user email to Spotify app's user management |
