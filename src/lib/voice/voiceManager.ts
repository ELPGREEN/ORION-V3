// @ts-nocheck
/**
 * Voice Manager - Centralized coordinator for all voice subsystems
 * Integrates STT, TTS, confidence filtering, feedback indicators, and latency optimization
 */

import { voiceConfidenceFilter } from './voiceConfidenceFilter';
import { voiceFeedbackIndicator } from './voiceFeedbackIndicator';
import { createGCPSTTSession } from './gcpSTT';
import { speakWithGeminiTTS, isGeminiTTSAvailable } from '../tts/geminiTTS';
import { getVoiceLatencyOptimizer, VoiceLatencyMetrics } from './voice-latency-optimizer';
import { connectGeminiLive, GeminiLiveSession } from './geminiLive';
import { Speech, isNativeSpeechAvailable } from './native-speech-plugin';

export interface VoiceManagerOptions {
  // STT settings
  languageCode?: string;
  enableConfidenceFiltering?: boolean;
  minConfidenceThreshold?: number;

  // TTS settings
  ttsVoice?: string;
  ttsLanguage?: string;

  // Feedback settings
  enableVisualFeedback?: boolean;
  feedbackContainerId?: string;

  // Latency optimization
  enableLatencyOptimization?: boolean;
  voiceLatencyConfig?: Partial<import('./voice-latency-optimizer').VoiceLatencyConfig>;

  // Live API settings
  useGeminiLive?: boolean;
  geminiLiveVoice?: string;
  geminiLiveSystemInstruction?: string;
}

export interface VoiceManagerState {
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  confidence: number;
  volumeLevel: number;
  latency: VoiceLatencyMetrics | null;
  error: string | null;
  transcript: string;
  lastResponse: string;
}

export class VoiceManager {
  private options: VoiceManagerOptions;
  private state: VoiceManagerState = {
    isListening: false,
    isProcessing: false,
    isSpeaking: false,
    confidence: 0,
    volumeLevel: 0,
    latency: null,
    error: null,
    transcript: '',
    lastResponse: ''
  };

  // STT components
  private sttSession: any = null;
  private usingGeminiLive: boolean = false;
  private geminiLiveSession: GeminiLiveSession | null = null;

  // TTS components
  private ttsAbortController: AbortController | null = null;

  // Latency optimization
  private latencyOptimizer: any = null;

  // Event handlers
  private onFinalCallback: ((text: string, confidence: number) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onInterimCallback: ((text: string) => void) | null = null;

  constructor(options: Partial<VoiceManagerOptions> = {}) {
    this.options = {
      languageCode: options.languageCode ?? 'pt-BR',
      enableConfidenceFiltering: options.enableConfidenceFiltering ?? true,
      minConfidenceThreshold: options.minConfidenceThreshold ?? 0.7,
      ttsVoice: options.ttsVoice ?? 'Enceladus',
      ttsLanguage: options.ttsLanguage ?? 'pt-BR',
      enableVisualFeedback: options.enableVisualFeedback ?? false,
      feedbackContainerId: options.feedbackContainerId ?? 'orion-voice-feedback',
      enableLatencyOptimization: options.enableLatencyOptimization ?? true,
      voiceLatencyConfig: options.voiceLatencyConfig ?? {},
      useGeminiLive: options.useGeminiLive ?? false,
      geminiLiveVoice: options.geminiLiveVoice ?? 'Algieba',
      geminiLiveSystemInstruction: options.geminiLiveSystemInstruction ?? undefined
    };

    // Initialize subsystems
    this.initSubsystems();
  }

  /**
   * Initialize all voice subsystems
   */
  private initSubsystems(): void {
    // Initialize confidence filter with custom threshold
    if (this.options.enableConfidenceFiltering) {
      // We'll update the global instance's threshold when needed
    }

    // Initialize feedback indicator
    if (this.options.enableVisualFeedback) {
      voiceFeedbackIndicator.init(this.options.feedbackContainerId);
    }

    // Initialize latency optimizer
    if (this.options.enableLatencyOptimization) {
      this.latencyOptimizer = getVoiceLatencyOptimizer();
      if (this.options.voiceLatencyConfig) {
        this.latencyOptimizer.updateConfig(this.options.voiceLatencyConfig);
      }
    }

    // Bind event handlers
    this.bindEventHandlers();
  }

  /**
   * Bind internal event handlers
   */
  private bindEventHandlers(): void {
    this.onFinalCallback = (text: string, confidence: number) => {
      this.handleFinalTranscript(text, confidence);
    };

    this.onErrorCallback = (error: string) => {
      this.handleError(error);
    };

    this.onInterimCallback = (text: string) => {
      this.handleInterimTranscript(text);
    };
  }

  /**
   * Start listening for voice input
   */
  async startListening(): Promise<boolean> {
    if (this.state.isListening) return true;

    try {
      this.updateState({ isListening: true, error: null });

      if (this.options.useGeminiLive) {
        return await this.startGeminiLiveListening();
      } else {
        return await this.startGCPSTTListening();
      }
    } catch (error: any) {
      this.handleError(error.message || 'Unknown error starting voice input');
      return false;
    }
  }

  /**
   * Start GCP STT listening (fallback method)
   */
  private async startGCPSTTListening(): Promise<boolean> {
    this.sttSession = createGCPSTTSession({
      languageCode: this.options.languageCode,
      onInterim: this.onInterimCallback,
      onFinal: this.onFinalCallback,
      onError: this.onErrorCallback
    });

    const success = await this.sttSession.start();
    if (!success) {
      this.handleError('Failed to start STT session');
      return false;
    }

    return true;
  }

  /**
   * Start Gemini Live listening (preferred method)
   */
  private async startGeminiLiveListening(): Promise<boolean> {
    try {
      this.geminiLiveSession = await connectGeminiLive({
        voice: this.options.geminiLiveVoice,
        systemInstruction: this.options.geminiLiveSystemInstruction,
        onAudio: this.handleGeminiLiveAudio.bind(this),
        onText: this.handleGeminiLiveText.bind(this),
        onConnected: () => {
          this.updateState({ isListening: true, error: null });
          console.log('[VoiceManager] Gemini Live connected');
        },
        onDisconnected: (reason: string) => {
          this.handleError(`Gemini Live disconnected: ${reason}`);
        },
        onError: (error: string) => {
          this.handleError(`Gemini Live error: ${error}`);
        }
      });

      this.usingGeminiLive = true;
      return true;
    } catch (error: any) {
      this.handleError(`Failed to connect to Gemini Live: ${error.message}`);
      return false;
    }
  }

  /**
   * Stop listening for voice input
   */
  stopListening(): void {
    if (!this.state.isListening) return;

    this.updateState({ isListening: false });

    if (this.usingGeminiLive && this.geminiLiveSession) {
      this.geminiLiveSession.close();
      this.geminiLiveSession = null;
      this.usingGeminiLive = false;
    } else if (this.sttSession) {
      this.sttSession.stop();
      this.sttSession.destroy();
      this.sttSession = null;
    }
  }

  /**
   * Handle interim transcript from STT
   */
  private handleInterimTranscript(text: string): void {
    this.updateState({ transcript: text });
  }

  /**
   * Handle final transcript from STT
   */
  private async handleFinalTranscript(text: string, confidence: number): void {
    // Update volume level (approximate from confidence for now)
    this.updateState({
      transcript: text,
      confidence: confidence
    });

    // Apply confidence filtering if enabled
    if (this.options.enableConfidenceFiltering) {
      const filterResult = voiceConfidenceFilter.filterResult(text, confidence);

      if (!filterResult.shouldProcess) {
        // Low confidence - show feedback but don't process
        this.updateState({
          confidence: confidence,
          error: filterResult.reason
        });

        // Provide audio feedback for low confidence
        await this.speakFeedback(`Desculpe, não entendi bem. Confiança de ${(confidence * 100).toFixed(0)}%. Pode repetir?`);
        return;
      }

      // Update with filtered result
      this.updateState({
        confidence: confidence,
        error: null
      });
    }

    // Mark as processing
    this.updateState({ isProcessing: true });

    try {
      // Process the command (this would integrate with your command system)
      const response = await this.processVoiceCommand(text);

      // Speak the response
      if (response) {
        await this.speakResponse(response);
        this.updateState({ lastResponse: response });
      }
    } catch (error: any) {
      this.handleError(`Error processing command: ${error.message}`);
      await this.speakFeedback('Desculpe, ocorreu um erro ao processar seu comando.');
    } finally {
      this.updateState({ isProcessing: false });
    }
  }

  /**
   * Handle audio from Gemini Live
   */
  private handleGeminiLiveAudio(audio: ArrayBuffer): void {
    // For Gemini Live, we handle audio differently - it's bidirectional
    // This would be where we send microphone audio to Gemini
    // For simplicity in this example, we're focusing on the STT/TTS flow
  }

  /**
   * Handle text from Gemini Live
   */
  private handleGeminiLiveText(text: string): void {
    // Gemini Live provides both STT and TTS in one stream
    // We would parse this to determine if it's a transcript or response
    // For now, we'll treat incoming text as a transcript to process
    this.handleFinalTranscript(text, 0.85); // Assume good confidence for Gemini Live
  }

  /**
   * Process a voice command (integrate with your command system)
   * This is where you'd connect to your actual command processing logic
   */
  private async processVoiceCommand(command: string): Promise<string | null> {
    // Mark LLM start for latency tracking
    if (this.latencyOptimizer) {
      this.latencyOptimizer.markLLMStart();
    }

    try {
      // Simulate command processing - replace with your actual command handler
      // This would integrate with your navigation, media, vision, etc. systems

      // Simple command recognition for demo
      const lowerCommand = command.toLowerCase().trim();

      if (lowerCommand.includes('olá') || lowerCommand.includes('oi') || lowerCommand.includes('hey orion')) {
        return 'Olá! Como posso ajudá-lo hoje?';
      }

      if (lowerCommand.includes('como você está') || lowerCommand.includes('tudo bem')) {
        return 'Estou muito bem, obrigado! E com você, como está?';
      }

      if (lowerCommand.includes('que horas são')) {
        const now = new Date();
        return `Agora são ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}.`;
      }

      if (lowerCommand.includes('abra') || lowerCommand.includes('abrir')) {
        // Extract what to open
        const words = command.split(' ');
        const openIndex = words.findIndex(w => w.toLowerCase() === 'abra' || w.toLowerCase() === 'abrir');
        if (openIndex !== -1 && openIndex + 1 < words.length) {
          const item = words[openIndex + 1];
          return `Abrindo ${item}...`;
        }
        return 'O que você gostaria de abrir?';
      }

      if (lowerCommand.includes('obrigado') || lowerCommand.includes('valeu')) {
        return 'Por nada! Estou aqui para ajudar sempre que precisar.';
      }

      // Default response for unrecognized commands
      return `Eu ouvi: "${command}". Como posso ajudar com isso?`;
    } finally {
      // Mark LLM complete for latency tracking
      if (this.latencyOptimizer) {
        this.latencyOptimizer.markLLMComplete();
      }
    }
  }

  /**
   * Speak a response using TTS
   */
  private async speakResponse(text: string): Promise<void> {
    this.updateState({ isSpeaking: true });

    // Mark TTS start for latency tracking
    if (this.latencyOptimizer) {
      this.latencyOptimizer.markTTSStart();
    }

    try {
      // Abort any previous TTS
      this.abortCurrentTTS();

      // Create new abort controller for this utterance
      this.ttsAbortController = new AbortController();

      // Speak the text
      const result = await speakWithGeminiTTS(
        text,
        this.options.ttsVoice,
        this.ttsAbortController.signal,
        undefined, // stylePrompt
        this.options.ttsLanguage
      );

      if (!result.played) {
        throw new Error('Failed to play TTS audio');
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('[VoiceManager] TTS error:', error);
        // Don't re-throw here as we don't want to break the voice flow on TTS issues
      }
    } finally {
      // Mark TTS complete for latency tracking
      if (this.latencyOptimizer) {
        this.latencyOptimizer.markTTSComplete();
      }

      this.updateState({ isSpeaking: false });
      this.ttsAbortController = null;
    }
  }

  /**
   * Speak feedback message (for errors, confirmations, etc.)
   */
  private async speakFeedback(text: string): Promise<void> {
    this.updateState({ isSpeaking: true });

    // Mark TTS start for latency tracking
    if (this.latencyOptimizer) {
      this.latencyOptimizer.markTTSStart();
    }

    try {
      // Abort any previous TTS
      this.abortCurrentTTS();

      // Create new abort controller for this utterance
      this.ttsAbortController = new AbortController();

      // Speak the text
      const result = await speakWithGeminiTTS(
        text,
        this.options.ttsVoice,
        this.ttsAbortController.signal,
        undefined, // stylePrompt
        this.options.ttsLanguage
      );

      if (!result.played) {
        throw new Error('Failed to play feedback audio');
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('[VoiceManager] Feedback TTS error:', error);
      }
    } finally {
      // Mark TTS complete for latency tracking
      if (this.latencyOptimizer) {
        this.latencyOptimizer.markTTSComplete();
      }

      this.updateState({ isSpeaking: false });
      this.ttsAbortController = null;
    }
  }

  /**
   * Abort any current TTS operation
   */
  private abortCurrentTTS(): void {
    if (this.ttsAbortController) {
      this.ttsAbortController.abort();
      this.ttsAbortController = null;
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: string): void {
    console.error('[VoiceManager] Error:', error);
    this.updateState({
      error: error,
      isListening: false,
      isProcessing: false,
      isSpeaking: false
    });

    // Provide audio feedback for errors
    this.speakFeedback('Desculpe, ocorreu um erro. Vamos tentar novamente.');
  }

  /**
   * Update internal state and propagate to feedback indicator
   */
  private updateState(newState: Partial<VoiceManagerState>): void {
    this.state = { ...this.state, ...newState };

    // Update latency metrics if optimizer is available
    if (this.latencyOptimizer && this.options.enableLatencyOptimization) {
      this.state.latency = this.latencyOptimizer.getMetrics();
    }

    // Update feedback indicator
    if (this.options.enableVisualFeedback) {
      voiceFeedbackIndicator.updateState({
        isListening: this.state.isListening,
        isProcessing: this.state.isProcessing,
        isSpeaking: this.state.isSpeaking,
        confidence: this.state.confidence,
        volumeLevel: this.state.volumeLevel,
        error: this.state.error,
        transcript: this.state.transcript
      });
    }
  }

  /**
   * Get current voice manager state
   */
  getState(): VoiceManagerState {
    return { ...this.state };
  }

  /**
   * Enable/disable the floating voice performance/feedback panel at runtime.
   * When disabled, the global widget is removed from the DOM. When enabled,
   * it will be re-created on the next state update.
   */
  setVisualFeedbackEnabled(enabled: boolean): void {
    this.options.enableVisualFeedback = enabled;
    if (enabled) {
      voiceFeedbackIndicator.init(this.options.feedbackContainerId);
      // Push current state immediately so the panel reflects reality
      voiceFeedbackIndicator.updateState({
        isListening: this.state.isListening,
        isProcessing: this.state.isProcessing,
        isSpeaking: this.state.isSpeaking,
        confidence: this.state.confidence,
        volumeLevel: this.state.volumeLevel,
        error: this.state.error,
        transcript: this.state.transcript,
      });
    } else {
      voiceFeedbackIndicator.destroy();
    }
  }

  /**
   * Whether the visual feedback panel is currently enabled.
   */
  isVisualFeedbackEnabled(): boolean {
    return Boolean(this.options.enableVisualFeedback);
  }

  /**
   * Get latency optimization suggestions
   */
  getLatencySuggestions(): string[] {
    if (this.latencyOptimizer) {
      return this.latencyOptimizer.suggestOptimizations();
    }
    return [];
  }

  /**
   * Get confidence statistics
   */
  getConfidenceStats(): any {
    return voiceConfidenceFilter.getConfidenceStats();
  }

  /**
   * Destroy the voice manager and clean up resources
   */
  destroy(): void {
    // Stop listening if active
    if (this.state.isListening) {
      this.stopListening();
    }

    // Abort any current TTS
    this.abortCurrentTTS();

    // Destroy feedback indicator
    if (this.options.enableVisualFeedback) {
      voiceFeedbackIndicator.destroy();
    }

    // Clear references
    this.sttSession = null;
    this.geminiLiveSession = null;
    this.ttsAbortController = null;
    this.latencyOptimizer = null;

    this.onFinalCallback = null;
    this.onErrorCallback = null;
    this.onInterimCallback = null;
  }
}

// Export singleton instance
export const voiceManager = new VoiceManager();