/**
 * Voice Training System - Coleta e processa amostras de voz para melhorar
 * a precisão do reconhecimento através de treinamento personalizado
 */

export interface VoiceSample {
  id: string;
  text: string;
  audioBlob: Blob;
  timestamp: number;
  confidence: number; // 0.0 to 1.0 - quão bem o sample foi reconhecido
  userId: string;
  phraseType: 'command' | 'wakeword' | 'dictation';
}

export interface VoiceTrainingProgress {
  totalSamples: number;
  samplesByType: Record<string, number>;
  averageConfidence: number;
  lastTrainingSession: number | null;
  isReadyForUse: boolean;
}

export class VoiceTrainingSystem {
  private userId: string;
  private samples: VoiceSample[] = [];
  private isRecording = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  
  constructor(userId: string = 'default_user') {
    this.userId = userId;
    this.loadSamples();
  }
  
  /**
   * Inicia a coleta de uma amostra de voz
   */
  async startRecording(): Promise<void> {
    if (this.isRecording) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.isRecording = false;
        // Notify that recording stopped - caller should process the blob
        this.onRecordingStopped?.(audioBlob);
      };
      
      this.mediaRecorder.start();
      this.isRecording = true;
      
    } catch (error) {
      console.error('[VoiceTraining] Failed to start recording:', error);
      throw error;
    }
  }
  
  /**
   * Para a coleta de áudio e retorna a Blob
   */
  async stopRecording(): Promise<Blob | null> {
    if (!this.isRecording || !this.mediaRecorder) return null;
    
    return new Promise((resolve) => {
      this.onRecordingStopped = (blob: Blob) => {
        resolve(blob);
      };
      
      this.mediaRecorder?.stop();
    });
  }
  
  /**
   * Callback para quando a gravação para
   */
  onRecordingStopped: ((blob: Blob) => void) | null = null;
  
  /**
   * Adiciona uma amostra de voz ao sistema de treinamento
   */
  async addSample(
    text: string,
    audioBlob: Blob,
    phraseType: 'command' | 'wakeword' | 'dictation' = 'command',
    confidence: number = 0.0
  ): Promise<void> {
    const sample: VoiceSample = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: text.trim(),
      audioBlob,
      timestamp: Date.now(),
      confidence,
      userId: this.userId,
      phraseType
    };
    
    this.samples.push(sample);
    await this.saveSamples();
    
    // Atualizar perfil de voz se tivermos amostras suficientes
    if (this.samples.length >= 10) {
      await this.updateVoiceProfile();
    }
  }
  
  /**
   * Treina o modelo de reconhecimento com as amostras coletadas
   * Nota: Esta é uma implementação simplificada. Em produção, isso
   * enviaria os dados para um serviço de treinamento ou usaria
   * técnicas de aprendizado federado.
   */
  async trainModel(): Promise<boolean> {
    if (this.samples.length < 5) {
      console.warn('[VoiceTraining] Insufficient samples for training (minimum 5 required)');
      return false;
    }
    
    try {
      // Em uma implementação real, aqui enviariamos as amostras para um serviço
      // de treinamento que retornaria um modelo personalizado
      console.log(`[VoiceTraining] Training model with ${this.samples.length} samples`);
      
      // Simular processo de treinamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Atualizar timestamp do último treinamento
      await this.saveTrainingTimestamp();
      
      console.log('[VoiceTraining] ✅ Model training completed');
      return true;
    } catch (error) {
      console.error('[VoiceTraining] Model training failed:', error);
      return false;
    }
  }
  
  /**
   * Obtém o progresso atual do treinamento
   */
  getTrainingProgress(): VoiceTrainingProgress {
    const samplesByType: Record<string, number> = {};
    let totalConfidence = 0;
    let confidentSamples = 0;
    
    this.samples.forEach(sample => {
      samplesByType[sample.phraseType] = (samplesByType[sample.phraseType] || 0) + 1;
      if (sample.confidence > 0) {
        totalConfidence += sample.confidence;
        confidentSamples++;
      }
    });
    
    return {
      totalSamples: this.samples.length,
      samplesByType,
      averageConfidence: confidentSamples > 0 ? totalConfidence / confidentSamples : 0,
      lastTrainingSession: this.getLastTrainingTimestamp(),
      isReadyForUse: this.samples.length >= 5
    };
  }
  
  /**
   * Obtém amostras para um tipo específico de frase
   */
  getSamplesByType(phraseType: 'command' | 'wakeword' | 'dictation'): VoiceSample[] {
    return this.samples.filter(sample => sample.phraseType === phraseType);
  }
  
  /**
   * Remove uma amostra pelo ID
   */
  removeSample(sampleId: string): void {
    this.samples = this.samples.filter(sample => sample.id !== sampleId);
    this.saveSamples();
  }
  
  /**
   * Limpa todas as amostras
   */
  clearSamples(): void {
    this.samples = [];
    this.saveSamples();
    this.clearTrainingTimestamp();
  }
  
  /**
   * Salva as amostras no localStorage
   */
  private async saveSamples(): Promise<void> {
    try {
      // Não podemos armazenar Blobs diretamente no localStorage,
      // então armazenamos apenas os metadados e mantemos referência aos Blobs
      // Em uma implementação real, usaríamos IndexedDB ou enviariamos para servidor
      
      const samplesMetadata = this.samples.map(sample => ({
        id: sample.id,
        text: sample.text,
        timestamp: sample.timestamp,
        confidence: sample.confidence,
        userId: sample.userId,
        phraseType: sample.phraseType
        // Nota: audioBlob não é armazenado aqui por limitações do localStorage
      }));
      
      localStorage.setItem(`voice_samples_${this.userId}`, JSON.stringify(samplesMetadata));
    } catch (error) {
      console.error('[VoiceTraining] Failed to save samples:', error);
    }
  }
  
  /**
   * Carrega as amostras do localStorage
   */
  private loadSamples(): void {
    try {
      const samplesData = localStorage.getItem(`voice_samples_${this.userId}`);
      if (samplesData) {
        const parsed = JSON.parse(samplesData);
        // Nota: Os Blobs de áudio seriam recarregados de um serviço ou IndexedDB
        // Por enquanto, apenas mantemos a estrutura - em produção isso seria mais complexo
        console.log(`[VoiceTraining] Loaded ${parsed.length} sample metadata entries`);
        // Não estamos reconstruindo os samples completos aqui devido à complexidade
        // de armazenamento de Blobs, mas em produção isso seria feito
      }
    } catch (error) {
      console.error('[VoiceTraining] Failed to load samples:', error);
    }
  }
  
  /**
   * Salva o timestamp do último treinamento
   */
  private async saveTrainingTimestamp(): Promise<void> {
    try {
      localStorage.setItem(`voice_last_training_${this.userId}`, Date.now().toString());
    } catch (error) {
      console.error('[VoiceTraining] Failed to save training timestamp:', error);
    }
  }
  
  /**
   * Obtém o timestamp do último treinamento
   */
  private getLastTrainingTimestamp(): number | null {
    try {
      const timestampStr = localStorage.getItem(`voice_last_training_${this.userId}`);
      return timestampStr ? parseInt(timestampStr, 10) : null;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Limpa o timestamp do último treinamento
   */
  private clearTrainingTimestamp(): void {
    try {
      localStorage.removeItem(`voice_last_training_${this.userId}`);
    } catch (error) {
      // Ignore errors
    }
  }
  
  /**
   * Atualiza o perfil de voz baseado nas amostras coletadas
   * Esta seria uma simplificação - em produção seria mais sofisticado
   */
  private async updateVoiceProfile(): Promise<void> {
    try {
      // Calcular estatísticas das amostras
      const recentSamples = this.samples.slice(-20); // Últimas 20 amostras
      const avgConfidence = recentSamples.reduce((sum, sample) => sum + sample.confidence, 0) / recentSamples.length;
      
      // Atualizar o filtro de confiança global com base no desempenho do usuário
      // @ts-ignore - accessing global voiceConfidenceFilter
      if (typeof voiceConfidenceFilter !== 'undefined') {
        // Ajustar threshold baseado no desempenho histórico do usuário
        const newThreshold = Math.max(0.5, Math.min(0.9, avgConfidence - 0.1));
        voiceConfidenceFilter.minConfidence = newThreshold;
        
        console.log(`[VoiceTraining] Updated voice profile: avg confidence ${avgConfidence.toFixed(2)}, new threshold ${newThreshold.toFixed(2)}`);
      }
    } catch (error) {
      console.error('[VoiceTraining] Failed to update voice profile:', error);
    }
  }
}

// Exportar instância singleton
export const voiceTrainingSystem = new VoiceTrainingSystem();