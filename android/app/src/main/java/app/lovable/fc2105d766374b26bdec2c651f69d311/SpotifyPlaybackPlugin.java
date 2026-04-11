package app.lovable.fc2105d766374b26bdec2c651f69d311;

import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.spotify.android.appremote.api.ConnectionParams;
import com.spotify.android.appremote.api.Connector;
import com.spotify.android.appremote.api.SpotifyAppRemote;
import com.spotify.protocol.types.PlayerState;
import com.spotify.protocol.types.Track;
import com.spotify.protocol.types.ImageUri;

/**
 * Capacitor Native Plugin for Spotify App Remote SDK (Android)
 * Bridges Web → Native playback for full-track streaming
 */
@CapacitorPlugin(name = "SpotifyPlayback")
public class SpotifyPlaybackPlugin extends Plugin {

    private static final String TAG = "SpotifyPlayback";
    private SpotifyAppRemote appRemote;

    @PluginMethod
    public void connect(PluginCall call) {
        String clientId = call.getString("clientId");
        String redirectUri = call.getString("redirectUri");

        if (clientId == null || redirectUri == null) {
            call.reject("clientId and redirectUri are required");
            return;
        }

        ConnectionParams params = new ConnectionParams.Builder(clientId)
                .setRedirectUri(redirectUri)
                .showAuthView(true)
                .build();

        SpotifyAppRemote.connect(getContext(), params, new Connector.ConnectionListener() {
            @Override
            public void onConnected(SpotifyAppRemote remote) {
                appRemote = remote;
                Log.i(TAG, "Connected to Spotify App Remote");
                JSObject result = new JSObject();
                result.put("connected", true);
                call.resolve(result);
            }

            @Override
            public void onFailure(Throwable error) {
                Log.e(TAG, "Connection failed: " + error.getMessage());
                JSObject result = new JSObject();
                result.put("connected", false);
                call.resolve(result);
            }
        });
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        if (appRemote != null) {
            SpotifyAppRemote.disconnect(appRemote);
            appRemote = null;
        }
        call.resolve();
    }

    @PluginMethod
    public void play(PluginCall call) {
        if (!ensureConnected(call)) return;
        String uri = call.getString("uri");
        if (uri == null) { call.reject("uri is required"); return; }

        appRemote.getPlayerApi().play(uri)
                .setResultCallback(empty -> call.resolve())
                .setErrorCallback(error -> call.reject("Play failed: " + error.getMessage()));
    }

    @PluginMethod
    public void pause(PluginCall call) {
        if (!ensureConnected(call)) return;
        appRemote.getPlayerApi().pause()
                .setResultCallback(empty -> call.resolve())
                .setErrorCallback(error -> call.reject("Pause failed: " + error.getMessage()));
    }

    @PluginMethod
    public void resume(PluginCall call) {
        if (!ensureConnected(call)) return;
        appRemote.getPlayerApi().resume()
                .setResultCallback(empty -> call.resolve())
                .setErrorCallback(error -> call.reject("Resume failed: " + error.getMessage()));
    }

    @PluginMethod
    public void seek(PluginCall call) {
        if (!ensureConnected(call)) return;
        Integer positionMs = call.getInt("positionMs");
        if (positionMs == null) { call.reject("positionMs is required"); return; }

        appRemote.getPlayerApi().seekTo(positionMs.longValue())
                .setResultCallback(empty -> call.resolve())
                .setErrorCallback(error -> call.reject("Seek failed: " + error.getMessage()));
    }

    @PluginMethod
    public void nextTrack(PluginCall call) {
        if (!ensureConnected(call)) return;
        appRemote.getPlayerApi().skipNext()
                .setResultCallback(empty -> call.resolve())
                .setErrorCallback(error -> call.reject("Next failed: " + error.getMessage()));
    }

    @PluginMethod
    public void previousTrack(PluginCall call) {
        if (!ensureConnected(call)) return;
        appRemote.getPlayerApi().skipPrevious()
                .setResultCallback(empty -> call.resolve())
                .setErrorCallback(error -> call.reject("Previous failed: " + error.getMessage()));
    }

    @PluginMethod
    public void setVolume(PluginCall call) {
        if (!ensureConnected(call)) return;
        // App Remote SDK doesn't expose volume control directly
        // Volume is controlled by device system volume
        call.resolve();
    }

    @PluginMethod
    public void getPlayerState(PluginCall call) {
        if (!ensureConnected(call)) return;

        appRemote.getPlayerApi().getPlayerState()
                .setResultCallback(playerState -> {
                    JSObject result = new JSObject();
                    result.put("isPlaying", !playerState.isPaused);
                    result.put("positionMs", playerState.playbackPosition);

                    Track track = playerState.track;
                    if (track != null) {
                        result.put("trackUri", track.uri);
                        result.put("trackName", track.name);
                        result.put("artistName", track.artist.name);
                        result.put("albumName", track.album.name);
                        result.put("durationMs", track.duration);
                        // Album art requires async image fetch — return URI only
                        ImageUri imageUri = track.imageUri;
                        result.put("albumArtUrl", imageUri != null ? imageUri.raw : null);
                    } else {
                        result.put("trackUri", null);
                        result.put("trackName", null);
                        result.put("artistName", null);
                        result.put("albumName", null);
                        result.put("durationMs", 0);
                        result.put("albumArtUrl", null);
                    }

                    result.put("volume", 1.0); // System volume — not available via App Remote
                    call.resolve(result);
                })
                .setErrorCallback(error -> call.reject("getPlayerState failed: " + error.getMessage()));
    }

    private boolean ensureConnected(PluginCall call) {
        if (appRemote == null || !appRemote.isConnected()) {
            call.reject("Spotify not connected. Call connect() first.");
            return false;
        }
        return true;
    }
}
