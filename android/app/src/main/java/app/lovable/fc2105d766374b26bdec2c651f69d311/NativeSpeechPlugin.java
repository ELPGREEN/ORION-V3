package app.lovable.fc2105d766374b26bdec2c651f69d311;

import android.Manifest;
import android.content.Intent;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;

import com.getcapacitor.*;
import com.getcapacitor.annotation.*;

import java.util.ArrayList;
import java.util.Locale;
import java.util.UUID;

@CapacitorPlugin(
    name = "NativeSpeechPlugin",
    permissions = {
        @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = "microphone")
    }
)
public class NativeSpeechPlugin extends Plugin {

    private TextToSpeech tts;
    private SpeechRecognizer recognizer;
    private boolean isTTSReady = false;
    private boolean isListening = false;

    @Override
    public void load() {
        tts = new TextToSpeech(getContext(), status -> {
            if (status == TextToSpeech.SUCCESS) {
                tts.setLanguage(new Locale("pt", "BR"));
                isTTSReady = true;
            }
        });
    }

    @PluginMethod
    public void speak(PluginCall call) {
        if (!isTTSReady) {
            call.reject("TTS not initialized");
            return;
        }

        String text = call.getString("text", "");
        String lang = call.getString("lang", "pt-BR");
        float rate = call.getFloat("rate", 1.0f);
        float pitch = call.getFloat("pitch", 1.0f);

        if (text.isEmpty()) {
            call.reject("Text is required");
            return;
        }

        // Set language
        String[] parts = lang.split("-");
        Locale locale = parts.length > 1
            ? new Locale(parts[0], parts[1])
            : new Locale(parts[0]);
        tts.setLanguage(locale);
        tts.setSpeechRate(rate);
        tts.setPitch(pitch);

        String utteranceId = UUID.randomUUID().toString();
        tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
            @Override public void onStart(String id) {}
            @Override public void onDone(String id) {
                JSObject result = new JSObject();
                result.put("success", true);
                call.resolve(result);
            }
            @Override public void onError(String id) {
                JSObject result = new JSObject();
                result.put("success", false);
                call.resolve(result);
            }
        });

        tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, utteranceId);
    }

    @PluginMethod
    public void stopSpeaking(PluginCall call) {
        if (tts != null) tts.stop();
        call.resolve();
    }

    @PluginMethod
    public void isSpeaking(PluginCall call) {
        JSObject result = new JSObject();
        result.put("speaking", tts != null && tts.isSpeaking());
        call.resolve(result);
    }

    @PluginMethod
    public void startListening(PluginCall call) {
        if (!getPermissionState("microphone").equals("granted")) {
            requestPermissionForAlias("microphone", call, "handleMicPermission");
            return;
        }

        startRecognition(call);
    }

    @PluginMethod
    public void stopListening(PluginCall call) {
        if (recognizer != null) {
            recognizer.stopListening();
            recognizer.destroy();
            recognizer = null;
        }
        isListening = false;
        call.resolve();
    }

    @PluginMethod
    public void isListening(PluginCall call) {
        JSObject result = new JSObject();
        result.put("listening", isListening);
        call.resolve(result);
    }

    @PluginMethod
    public void getAvailableVoices(PluginCall call) {
        JSArray voices = new JSArray();
        if (tts != null) {
            for (Locale locale : Locale.getAvailableLocales()) {
                int availability = tts.isLanguageAvailable(locale);
                if (availability >= TextToSpeech.LANG_AVAILABLE) {
                    JSObject voice = new JSObject();
                    voice.put("name", locale.getDisplayName());
                    voice.put("locale", locale.toLanguageTag());
                    voices.put(voice);
                }
            }
        }
        JSObject result = new JSObject();
        result.put("voices", voices);
        call.resolve(result);
    }

    @PermissionCallback
    private void handleMicPermission(PluginCall call) {
        if (getPermissionState("microphone").equals("granted")) {
            startRecognition(call);
        } else {
            call.reject("Microphone permission denied");
        }
    }

    private void startRecognition(PluginCall call) {
        String lang = call.getString("lang", "pt-BR");
        boolean continuous = call.getBoolean("continuous", false);

        getActivity().runOnUiThread(() -> {
            recognizer = SpeechRecognizer.createSpeechRecognizer(getContext());

            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang);
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);

            recognizer.setRecognitionListener(new RecognitionListener() {
                @Override public void onReadyForSpeech(Bundle params) { isListening = true; }
                @Override public void onBeginningOfSpeech() {}
                @Override public void onRmsChanged(float rmsdB) {}
                @Override public void onBufferReceived(byte[] buffer) {}
                @Override public void onEndOfSpeech() { isListening = false; }

                @Override
                public void onResults(Bundle results) {
                    isListening = false;
                    ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                    float[] confidences = results.getFloatArray(SpeechRecognizer.CONFIDENCE_SCORES);
                    if (matches != null && !matches.isEmpty()) {
                        JSObject data = new JSObject();
                        data.put("text", matches.get(0));
                        data.put("confidence", confidences != null ? confidences[0] : 0.9);
                        data.put("isFinal", true);
                        JSArray alts = new JSArray();
                        for (int i = 1; i < matches.size(); i++) alts.put(matches.get(i));
                        data.put("alternatives", alts);
                        notifyListeners("speechResult", data);
                    }

                    if (continuous) {
                        recognizer.startListening(intent);
                    }
                }

                @Override
                public void onPartialResults(Bundle partialResults) {
                    ArrayList<String> partial = partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                    if (partial != null && !partial.isEmpty()) {
                        JSObject data = new JSObject();
                        data.put("text", partial.get(0));
                        data.put("confidence", 0.5);
                        data.put("isFinal", false);
                        notifyListeners("speechResult", data);
                    }
                }

                @Override
                public void onError(int error) {
                    isListening = false;
                    JSObject data = new JSObject();
                    data.put("code", error);
                    data.put("message", getErrorMessage(error));
                    notifyListeners("speechError", data);
                }

                @Override public void onEvent(int eventType, Bundle params) {}
            });

            recognizer.startListening(intent);
            call.resolve();
        });
    }

    private String getErrorMessage(int error) {
        switch (error) {
            case SpeechRecognizer.ERROR_AUDIO: return "Audio recording error";
            case SpeechRecognizer.ERROR_CLIENT: return "Client side error";
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS: return "Insufficient permissions";
            case SpeechRecognizer.ERROR_NETWORK: return "Network error";
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT: return "Network timeout";
            case SpeechRecognizer.ERROR_NO_MATCH: return "No match found";
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY: return "Recognizer busy";
            case SpeechRecognizer.ERROR_SERVER: return "Server error";
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT: return "Speech timeout";
            default: return "Unknown error: " + error;
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (tts != null) { tts.stop(); tts.shutdown(); }
        if (recognizer != null) { recognizer.destroy(); }
        super.handleOnDestroy();
    }
}
