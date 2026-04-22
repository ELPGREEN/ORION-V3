/**
 * Voice Feedback Indicator - Provides visual cues for voice processing states
 * Shows listening, processing, and response states with animations
 */

export interface VoiceFeedbackState {
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  confidence: number; // 0.0 to 1.0
  volumeLevel: number; // 0.0 to 1.0
  error: string | null;
  transcript: string;
}

export class VoiceFeedbackIndicator {
  private container: HTMLElement | null = null;
  private state: VoiceFeedbackState = {
    isListening: false,
    isProcessing: false,
    isSpeaking: false,
    confidence: 0,
    volumeLevel: 0,
    error: null,
    transcript: ''
  };
  
  private animationFrame: number | null = null;
  private isInitialized = false;
  
  /**
   * Initialize the feedback indicator in the DOM
   */
  init(containerId: string = 'orion-voice-feedback'): void {
    if (this.isInitialized) return;
    
    // Create container if it doesn't exist
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      container.style.position = 'fixed';
      container.style.top = '20px';
      container.style.left = '50%';
      container.style.transform = 'translateX(-50%)';
      container.style.zIndex = '10000';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      container.style.gap = '8px';
      container.style.padding = '12px 16px';
      container.style.background = 'rgba(0, 0, 0, 0.8)';
      container.style.color = 'white';
      container.style.borderRadius = '12px';
      container.style.fontFamily = 'system-ui, sans-serif';
      container.style.fontSize = '14px';
      container.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
      container.style.backdropFilter = 'blur(10px)';
      document.body.appendChild(container);
    }
    
    this.container = container;
    this.isInitialized = true;
    
    // Inject CSS styles
    this.injectStyles();
    
    // Start animation loop
    this.animate();
  }
  
  /**
   * Update the current state
   */
  updateState(newState: Partial<VoiceFeedbackState>): void {
    this.state = { ...this.state, ...newState };
    this.render();
  }
  
  /**
   * Set listening state
   */
  setListening(isListening: boolean): void {
    this.updateState({ isListening });
  }
  
  /**
   * Set processing state
   */
  setProcessing(isProcessing: boolean): void {
    this.updateState({ isProcessing });
  }
  
  /**
   * Set speaking state
   */
  setSpeaking(isSpeaking: boolean): void {
    this.updateState({ isSpeaking });
  }
  
  /**
   * Update confidence level
   */
  setConfidence(confidence: number): void {
    this.updateState({ confidence: Math.max(0, Math.min(1, confidence)) });
  }
  
  /**
   * Update volume level
   */
  setVolumeLevel(volume: number): void {
    this.updateState({ volumeLevel: Math.max(0, Math.min(1, volume)) });
  }
  
  /**
   * Set error message
   */
  setError(error: string | null): void {
    this.updateState({ error });
  }
  
  /**
   * Update transcript
   */
  setTranscript(transcript: string): void {
    this.updateState({ transcript });
  }
  
  /**
   * Render the current state to the DOM
   */
  private render(): void {
    if (!this.container) return;
    
    // Clear container
    this.container.innerHTML = '';
    
    // Build status indicators
    const statusContainer = document.createElement('div');
    statusContainer.style.display = 'flex';
    statusContainer.style.flexDirection = 'column';
    statusContainer.style.alignItems = 'center';
    statusContainer.style.gap = '4px';
    statusContainer.style.width = '180px';
    
    // Listening/Processing/Speaking indicators
    const statusItems = [
      { label: this.state.isListening ? 'Ouvindo...' : 'Pronto', 
        active: this.state.isListening, 
        color: this.state.isListening ? '#4CAF50' : 
               this.state.isProcessing ? '#2196F3' : 
               this.state.isSpeaking ? '#9C27B0' : '#666' },
      { label: 'Processando...', 
        active: this.state.isProcessing, 
        color: this.state.isProcessing ? '#2196F3' : '#666' },
      { label: 'Falando...', 
        active: this.state.isSpeaking, 
        color: this.state.isSpeaking ? '#9C27B0' : '#666' }
    ];
    
    statusItems.forEach(item => {
      const statusDiv = document.createElement('div');
      statusDiv.style.display = 'flex';
      statusDiv.style.alignItems = 'center';
      statusDiv.style.gap = '6px';
      statusDiv.style.fontSize = '13px';
      
      const dot = document.createElement('div');
      dot.style.width = '8px';
      dot.style.height = '8px';
      dot.style.borderRadius = '50%';
      dot.style.backgroundColor = item.color;
      
      // Add pulse animation to active indicators
      if (item.active) {
        dot.style.animation = 'pulse 1.5s infinite';
      }
      
      const label = document.createElement('span');
      label.textContent = item.label;
      
      statusDiv.appendChild(dot);
      statusDiv.appendChild(label);
      statusContainer.appendChild(statusDiv);
    });
    
    // Confidence indicator
    const confidenceContainer = document.createElement('div');
    confidenceContainer.style.display = 'flex';
    confidenceContainer.style.flexDirection = 'column';
    confidenceContainer.style.alignItems = 'stretch';
    confidenceContainer.style.width = '180px';
    confidenceContainer.style.marginTop = '4px';
    
    const confidenceLabel = document.createElement('div');
    confidenceLabel.textContent = 'Confiança:';
    confidenceLabel.style.fontSize = '11px';
    confidenceLabel.style.marginBottom = '2px';
    confidenceLabel.style.textTransform = 'uppercase';
    confidenceLabel.style.letterSpacing = '0.5px';
    
    const confidenceBar = document.createElement('div');
    confidenceBar.style.width = '100%';
    confidenceBar.style.height = '6px';
    confidenceBar.style.backgroundColor = 'rgba(255,255,255,0.2)';
    confidenceBar.style.borderRadius = '3px';
    confidenceBar.style.overflow = 'hidden';
    
    const confidenceFill = document.createElement('div');
    confidenceFill.style.height = '100%';
    confidenceFill.style.width = `${this.state.confidence * 100}%`;
    confidenceFill.style.backgroundColor = this.getConfidenceColor(this.state.confidence);
    confidenceFill.style.transition = 'width 0.2s ease';
    
    const confidenceText = document.createElement('div');
    confidenceText.textContent = `${(this.state.confidence * 100).toFixed(0)}%`;
    confidenceText.style.marginTop = '4px';
    confidenceText.style.fontSize = '12px';
    confidenceText.style.fontWeight = 'bold';
    confidenceText.style.textAlign = 'center';
    
    confidenceBar.appendChild(confidenceFill);
    confidenceContainer.appendChild(confidenceLabel);
    confidenceContainer.appendChild(confidenceBar);
    confidenceContainer.appendChild(confidenceText);
    
    // Volume indicator
    const volumeContainer = document.createElement('div');
    volumeContainer.style.display = 'flex';
    volumeContainer.style.flexDirection = 'column';
    volumeContainer.style.alignItems = 'stretch';
    volumeContainer.style.width = '180px';
    volumeContainer.style.marginTop = '4px';
    
    const volumeLabel = document.createElement('div');
    volumeLabel.textContent = 'Volume:';
    volumeLabel.style.fontSize = '11px';
    volumeLabel.style.marginBottom = '2px';
    volumeLabel.style.textTransform = 'uppercase';
    volumeLabel.style.letterSpacing = '0.5px';
    
    const volumeBar = document.createElement('div');
    volumeBar.style.width = '100%';
    volumeBar.style.height = '6px';
    volumeBar.style.backgroundColor = 'rgba(255,255,255,0.2)';
    volumeBar.style.borderRadius = '3px';
    volumeBar.style.overflow = 'hidden';
    
    const volumeFill = document.createElement('div');
    volumeFill.style.height = '100%';
    volumeFill.style.width = `${this.state.volumeLevel * 100}%`;
    volumeFill.style.backgroundColor = '#2196F3';
    volumeFill.style.transition = 'width 0.2s ease';
    
    volumeBar.appendChild(volumeFill);
    volumeContainer.appendChild(volumeLabel);
    volumeContainer.appendChild(volumeBar);
    
    // Error display
    if (this.state.error) {
      const errorDiv = document.createElement('div');
      errorDiv.textContent = `⚠️ ${this.state.error}`;
      errorDiv.style.backgroundColor = 'rgba(244, 67, 54, 0.2)';
      errorDiv.style.border = '1px solid rgba(244, 67, 54, 0.3)';
      errorDiv.style.color = '#F44336';
      errorDiv.style.padding = '6px 10px';
      errorDiv.style.borderRadius = '6px';
      errorDiv.style.fontSize = '12px';
      errorDiv.style.marginTop = '4px';
      errorDiv.style.width = '180px';
      errorDiv.style.textAlign = 'center';
      statusContainer.appendChild(errorDiv);
    }
    
    // Transcript display
    if (this.state.transcript.trim()) {
      const transcriptContainer = document.createElement('div');
      transcriptContainer.style.marginTop = '4px';
      transcriptContainer.style.width = '180px';
      transcriptContainer.style.textAlign = 'center';
      
      const transcriptLabel = document.createElement('div');
      transcriptLabel.textContent = 'Você disse:';
      transcriptLabel.style.fontSize = '11px';
      transcriptLabel.style.color = '#bbb';
      transcriptLabel.style.marginBottom = '2px';
      
      const transcriptText = document.createElement('div');
      transcriptText.textContent = `“${this.state.transcript}”`;
      transcriptText.style.backgroundColor = 'rgba(255,255,255,0.1)';
      transcriptText.style.padding = '4px 8px';
      transcriptText.style.borderRadius = '4px';
      transcriptText.style.fontSize = '13px';
      transcriptText.style.minHeight = '20px';
      transcriptText.style.display = 'flex';
      transcriptText.style.alignItems = 'center';
      transcriptText.style.justifyContent = 'center';
      
      transcriptContainer.appendChild(transcriptLabel);
      transcriptContainer.appendChild(transcriptText);
      statusContainer.appendChild(transcriptContainer);
    }
    
    // Add all containers to main container
    this.container.appendChild(statusContainer);
    this.container.appendChild(confidenceContainer);
    this.container.appendChild(volumeContainer);
  }
  
  /**
   * Get color based on confidence level
   */
  private getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return '#4CAF50'; // Green
    if (confidence >= 0.6) return '#FFC107'; // Yellow
    if (confidence >= 0.4) return '#FF9800'; // Orange
    return '#F44336'; // Red
  }
  
  /**
   * Inject CSS styles for the indicator
   */
  private injectStyles(): void {
    // Check if styles already exist
    if (document.getElementById('orion-voice-feedback-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'orion-voice-feedback-styles';
    style.textContent = `
      @keyframes pulse {
        0% { opacity: 0.6; }
        50% { opacity: 1; }
        100% { opacity: 0.6; }
      }
    `;
    
    document.head.appendChild(style);
  }
  
  /**
   * Animation loop for pulsing effects
   */
  private animate(): void {
    this.animationFrame = requestAnimationFrame(() => {
      this.render();
      this.animate();
    });
  }
  
  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    
    const styleEl = document.getElementById('orion-voice-feedback-styles');
    if (styleEl) styleEl.remove();
    
    const containerEl = document.getElementById('orion-voice-feedback');
    if (containerEl) containerEl.remove();
    
    this.isInitialized = false;
  }
}

// Export singleton instance
export const voiceFeedbackIndicator = new VoiceFeedbackIndicator();

// Auto-cleanup: remove any leftover global voice feedback widget on load.
// The widget should ONLY be visible when explicitly enabled (e.g. Orion chat page).
if (typeof window !== 'undefined') {
  const removeLeftover = () => {
    const el = document.getElementById('orion-voice-feedback');
    if (el) el.remove();
    const styleEl = document.getElementById('orion-voice-feedback-styles');
    if (styleEl) styleEl.remove();
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', removeLeftover, { once: true });
  } else {
    removeLeftover();
  }
}