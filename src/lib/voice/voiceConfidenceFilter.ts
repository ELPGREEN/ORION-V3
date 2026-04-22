/**
 * Voice Confidence Filter - Adds minimum confidence thresholds to STT processing
 * Prevents low-confidence transcriptions from being processed as commands
 */

export interface ConfidenceFilterOptions {
  minConfidence: number; // 0.0 to 1.0
  enableVisualFeedback: boolean;
  enablePersonalization: boolean;
}

export class VoiceConfidenceFilter {
  private minConfidence: number;
  private confidenceHistory: number[] = [];
  private userVoiceProfile: VoiceProfile | null = null;
  
  constructor(options: Partial<ConfidenceFilterOptions> = {}) {
    this.minConfidence = options.minConfidence ?? 0.7; // Default 70% confidence
    this.loadUserProfile();
  }
  
  /**
   * Filter STT results based on confidence
   */
  filterResult(text: string, confidence: number): { 
    shouldProcess: boolean; 
    filteredText: string; 
    reason: string;
  } {
    // Update confidence history for adaptive thresholding
    this.confidenceHistory.push(confidence);
    if (this.confidenceHistory.length > 50) {
      this.confidenceHistory.shift(); // Keep last 50 samples
    }
    
    // Check if confidence meets threshold
    if (confidence >= this.minConfidence) {
      return {
        shouldProcess: true,
        filteredText: text,
        reason: `Confidence ${(confidence * 100).toFixed(1)}% >= threshold ${(this.minConfidence * 100).toFixed(1)}%`
      };
    }
    
    // Low confidence - don't process as command
    return {
      shouldProcess: false,
      filteredText: text,
      reason: `Low confidence ${(confidence * 100).toFixed(1)}% < threshold ${(this.minConfidence * 100).toFixed(1)}%`
    };
  }
  
  /**
   * Adaptive confidence threshold based on recent performance
   */
  getAdaptiveThreshold(): number {
    if (this.confidenceHistory.length < 10) {
      return this.minConfidence;
    }
    
    const recentAvg = this.confidenceHistory.slice(-10).reduce((a, b) => a + b, 0) / 10;
    // If user consistently speaks with high confidence, we can lower threshold slightly
    // If user consistently low, we might need to increase threshold or indicate mic issues
    if (recentAvg > 0.85) {
      return Math.max(0.5, this.minConfidence - 0.1); // Lower threshold for confident speakers
    } else if (recentAvg < 0.5) {
      return Math.min(0.9, this.minConfidence + 0.1); // Raise threshold for unclear audio
    }
    
    return this.minConfidence;
  }
  
  /**
   * Personalize recognition based on user's voice patterns
   */
  async personalizeForUser(userId: string): Promise<void> {
    // In a real implementation, this would:
    // 1. Load user's voice profile from storage
    // 2. Analyze their speech patterns, accent, speaking rate
    // 3. Adjust recognition parameters accordingly
    // For now, we'll simulate this with a simple profile
    
    this.userVoiceProfile = {
      userId,
      averageConfidence: 0.82,
      preferredPhrases: ["Orion", "Painel", "okay", "claro"],
      speakingRate: 1.2, // words per second
      lastUpdated: Date.now()
    };
    
    // Save profile
    try {
      localStorage.setItem(`orion_voice_profile_${userId}`, JSON.stringify(this.userVoiceProfile));
    } catch (e) {
      console.warn("Failed to save voice profile:", e);
    }
  }
  
  /**
   * Load user's voice profile from storage
   */
  private loadUserProfile(): void {
    // In a real app, we'd get the user ID from auth
    const userId = "current_user"; // Placeholder
    try {
      const profileStr = localStorage.getItem(`orion_voice_profile_${userId}`);
      if (profileStr) {
        this.userVoiceProfile = JSON.parse(profileStr);
        // Adjust minConfidence based on user's historical performance
        if (this.userVoiceProfile.averageConfidence > 0) {
          this.minConfidence = Math.max(0.5, this.userVoiceProfile.averageConfidence - 0.15);
        }
      }
    } catch (e) {
      console.warn("Failed to load voice profile:", e);
    }
  }
  
  /**
   * Get confidence statistics for dashboard
   */
  getConfidenceStats(): {
    average: number;
    min: number;
    max: number;
    samples: number;
    trend: 'improving' | 'declining' | 'stable';
  } {
    if (this.confidenceHistory.length === 0) {
      return { average: 0, min: 0, max: 0, samples: 0, trend: 'stable' };
    }
    
    const avg = this.confidenceHistory.reduce((a, b) => a + b, 0) / this.confidenceHistory.length;
    const min = Math.min(...this.confidenceHistory);
    const max = Math.max(...this.confidenceHistory);
    
    // Determine trend
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (this.confidenceHistory.length >= 10) {
      const firstHalf = this.confidenceHistory.slice(0, Math.floor(this.confidenceHistory.length / 2));
      const secondHalf = this.confidenceHistory.slice(Math.floor(this.confidenceHistory.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      if (secondAvg > firstAvg + 0.05) {
        trend = 'improving';
      } else if (secondAvg < firstAvg - 0.05) {
        trend = 'declining';
      }
    }
    
    return {
      average: avg,
      min: min,
      max: max,
      samples: this.confidenceHistory.length,
      trend: trend
    };
  }
}

/**
 * Voice profile for personalization
 */
interface VoiceProfile {
  userId: string;
  averageConfidence: number;
  preferredPhrases: string[];
  speakingRate: number; // words per second
  lastUpdated: number;
}

// Export singleton instance
export const voiceConfidenceFilter = new VoiceConfidenceFilter();