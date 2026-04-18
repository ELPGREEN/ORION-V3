/**
 * Voice Performance Dashboard - Exposes voice latency metrics to users for manual tuning
 * Provides real-time monitoring and adjustment capabilities
 */

export interface VoicePerformanceMetrics {
  sttLatencyMs: number;
  llmLatencyMs: number;
  ttsLatencyMs: number;
  totalRoundTripMs: number;
  vadDetectionsPerSecond: number;
  droppedSpeechEvents: number;
  confidenceAverage: number;
  confidenceTrend: 'improving' | 'declining' | 'stable';
  grade: 'A+' | 'A' | 'B' | 'C' | 'D';
}

export interface VoicePerformanceDashboardOptions {
  containerId?: string;
  updateIntervalMs?: number;
  showAdvancedMetrics?: boolean;
  enableAutoOptimization: boolean;
}

export class VoicePerformanceDashboard {
  private container: HTMLElement | null = null;
  private options: VoicePerformanceDashboardOptions;
  private updateInterval: number | null = null;
  private isInitialized = false;
  
  constructor(options: Partial<VoicePerformanceDashboardOptions> = {}) {
    this.options = {
      containerId: options.containerId ?? 'orion-voice-performance-dashboard',
      updateIntervalMs: options.updateIntervalMs ?? 2000,
      showAdvancedMetrics: options.showAdvancedMetrics ?? false,
      enableAutoOptimization: options.enableAutoOptimization ?? true
    };
  }
  
  /**
   * Initialize the performance dashboard
   */
  init(): void {
    if (this.isInitialized) return;
    
    // Create container if it doesn't exist
    let container = document.getElementById(this.options.containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = this.options.containerId;
      container.style.position = 'fixed';
      container.style.bottom = '20px';
      container.style.right = '20px';
      container.style.zIndex = '9999';
      container.style.width = '300px';
      container.style.maxHeight = '500px';
      container.style.overflowY = 'auto';
      container.style.background = 'rgba(0, 0, 0, 0.85)';
      container.style.color = 'white';
      container.style.borderRadius = '12px';
      container.style.padding = '16px';
      container.style.fontFamily = 'system-ui, monospace';
      container.style.fontSize = '13px';
      container.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
      container.style.backdropFilter = 'blur(10px)';
      document.body.appendChild(container);
    }
    
    this.container = container;
    this.isInitialized = true;
    
    // Inject CSS styles
    this.injectStyles();
    
    // Start updates
    this.startUpdates();
    
    // Initial render
    this.render();
  }
  
  /**
   * Start periodic updates
   */
  private startUpdates(): void {
    if (this.updateInterval) return;
    
    this.updateInterval = window.setInterval(() => {
      this.render();
    }, this.options.updateIntervalMs);
  }
  
  /**
   * Stop periodic updates
   */
  private stopUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
  
  /**
   * Render the dashboard with current metrics
   */
  render(): void {
    if (!this.container) return;
    
    // Get current metrics from voice manager and latency optimizer
    const metrics = this.collectMetrics();
    
    // Build dashboard HTML
    let html = `
      <div class="dashboard-header">
        <h3>🎤 Voz Performance</h3>
        <div class="dashboard-close" id="voice-dashboard-close">×</div>
      </div>
      
      <div class="dashboard-grade">
        <span>Grade: ${this.getGradeColor(metrics.grade)}</span>
      </div>
      
      <div class="dashboard-section">
        <div class="section-title">Latências (ms)</div>
        <div class="metric-row">
          <span class="metric-label">STT:</span>
          <span class="metric-value ${this.getLatencyClass(metrics.sttLatencyMs)}">${metrics.sttLatencyMs}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">LLM:</span>
          <span class="metric-value ${this.getLatencyClass(metrics.llmLatencyMs)}">${metrics.llmLatencyMs}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">TTS:</span>
          <span class="metric-value ${this.getLatencyClass(metrics.ttsLatencyMs)}">${metrics.ttsLatencyMs}</span>
        </div>
        <div class="metric-row metric-total">
          <span class="metric-label">Total:</span>
          <span class="metric-value ${this.getLatencyClass(metrics.totalRoundTripMs)}">${metrics.totalRoundTripMs}</span>
        </div>
      </div>
    `;
    
    if (this.options.showAdvancedMetrics) {
      html += `
        <div class="dashboard-section">
          <div class="section-title">Detecção de Voz</div>
          <div class="metric-row">
            <span class="metric-label">VAD/s:</span>
            <span class="metric-value">${metrics.vadDetectionsPerSecond.toFixed(1)}</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Eventos Perdidos:</span>
            <span class="metric-value ${metrics.droppedSpeechEvents > 5 ? 'metric-bad' : ''}">${metrics.droppedSpeechEvents}</span>
          </div>
        </div>
        
        <div class="dashboard-section">
          <div class="section-title">Confiança</div>
          <div class="metric-row">
            <span class="metric-label">Média:</span>
            <span class="metric-value ${this.getConfidenceClass(metrics.confidenceAverage)}">${(metrics.confidenceAverage * 100).toFixed(0)}%</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Tendência:</span>
            <span class="metric-value ${this.getTrendClass(metrics.confidenceTrend)}">${this.capitalizeFirstLetter(metrics.confidenceTrend)}</span>
          </div>
        </div>
      `;
    }
    
    html += `
      <div class="dashboard-section">
        <div class="section-title">Sugestões</div>
        <div class="dashboard-suggestions" id="voice-dashboard-suggestions">
          ${this.getOptimizationSuggestions(metrics).map(suggestion => 
            `<div class="suggestion-item">• ${suggestion}</div>`
          ).join('')}
        </div>
      </div>
      
      ${this.options.enableAutoOptimization ? 
        `<div class="dashboard-section">
          <div class="dashboard-toggle">
            <label>
              <input type="checkbox" id="voice-auto-optimize" ${this.options.enableAutoOptimization ? 'checked' : ''}>
              Otimização Automática
            </label>
          </div>
        </div>` : ''
      }
      
      <div class="dashboard-footer">
        <small>Atualizado a cada ${this.options.updateIntervalMs/1000}s</small>
      </div>
    `;
    
    this.container.innerHTML = html;
    
    // Add event listeners
    this.addEventListeners();
  }
  
  /**
   * Collect metrics from various voice subsystems
   */
  private collectMetrics(): VoicePerformanceMetrics {
    // In a real implementation, we'd get these from the voice manager and latency optimizer
    // For now, we'll return mock data showing the structure
    
    // Try to get real data from global instances if available
    let sttLatencyMs = 0;
    let llmLatencyMs = 0;
    let ttsLatencyMs = 0;
    let totalRoundTripMs = 0;
    let vadDetectionsPerSecond = 0;
    let droppedSpeechEvents = 0;
    let confidenceAverage = 0;
    let confidenceTrend: 'improving' | 'declining' | 'stable' = 'stable';
    let grade: 'A+' | 'A' | 'B' | 'C' | 'D' = 'D';
    
    // Try to get from latency optimizer if available
    // @ts-ignore - checking if global exists
    if (typeof getVoiceLatencyOptimizer !== 'undefined') {
      try {
        // @ts-ignore
        const optimizer = getVoiceLatencyOptimizer();
        if (optimizer) {
          const optMetrics = optimizer.getMetrics();
          sttLatencyMs = optMetrics.sttLatencyMs || 0;
          llmLatencyMs = optMetrics.llmLatencyMs || 0;
          ttsLatencyMs = optMetrics.ttsLatencyMs || 0;
          totalRoundTripMs = optMetrics.totalRoundTripMs || 0;
          vadDetectionsPerSecond = optMetrics.vadDetectionsPerSecond || 0;
          droppedSpeechEvents = optMetrics.droppedSpeechEvents || 0;
          grade = optimizer.getGrade();
        }
      } catch (e) {
        // Ignore errors - we'll use defaults
      }
    }
    
    // Try to get confidence stats
    // @ts-ignore
    if (typeof voiceConfidenceFilter !== 'undefined') {
      try {
        // @ts-ignore
        const stats = voiceConfidenceFilter.getConfidenceStats();
        confidenceAverage = stats.average;
        confidenceTrend = stats.trend;
      } catch (e) {
        // Ignore errors
      }
    }
    
    return {
      sttLatencyMs,
      llmLatencyMs,
      ttsLatencyMs,
      totalRoundTripMs,
      vadDetectionsPerSecond,
      droppedSpeechEvents,
      confidenceAverage,
      confidenceTrend,
      grade
    };
  }
  
  /**
   * Get color-coded grade indicator
   */
  private getGradeColor(grade: 'A+' | 'A' | 'B' | 'C' | 'D'): string {
    const gradeColors: Record<'A+' | 'A' | 'B' | 'C' | 'D', string> = {
      'A+': '#4CAF50', // Green
      'A': '#8BC34A',  // Light Green
      'B': '#FFC107',  // Yellow
      'C': '#FF9800',  // Orange
      'D': '#F44336'   // Red
    };
    
    return `<span style="color: ${gradeColors[grade]}; font-weight: bold;">${grade}</span>`;
  }
  
  /**
   * Get CSS class based on latency value
   */
  private getLatencyClass(latencyMs: number): string {
    if (latencyMs < 500) return 'metric-good';
    if (latencyMs < 1000) return 'metric-fair';
    return 'metric-bad';
  }
  
  /**
   * Get CSS class based on confidence value
   */
  private getConfidenceClass(confidence: number): string {
    if (confidence >= 0.8) return 'metric-good';
    if (confidence >= 0.6) return 'metric-fair';
    return 'metric-bad';
  }
  
  /**
   * Get CSS class based on trend value
   */
  private getTrendClass(trend: 'improving' | 'declining' | 'stable'): string {
    const trendClasses: Record<'improving' | 'declining' | 'stable', string> = {
      'improving': 'metric-good',
      'declining': 'metric-bad',
      'stable': 'metric-fair'
    };
    return trendClasses[trend];
  }
  
  /**
   * Capitalize first letter of string
   */
  private capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
  /**
   * Get optimization suggestions based on metrics
   */
  private getOptimizationSuggestions(metrics: VoicePerformanceMetrics): string[] {
    const suggestions: string[] = [];
    
    // STT latency suggestions
    if (metrics.sttLatencyMs > 1000) {
      suggestions.push('Reduza o silêncio do STT para respostas mais rápidas');
    }
    
    // VAD suggestions
    if (metrics.vadDetectionsPerSecond < 2) {
      suggestions.push('Aumente a sensibilidade do VAD para detecção mais rápida');
    } else if (metrics.vadDetectionsPerSecond > 20) {
      suggestions.push('Reduza a sensibilidade do VAD para evitar falsos positivos');
    }
    
    // Confidence suggestions
    if (metrics.confidenceAverage < 0.6) {
      suggestions.push('Melhore a qualidade do áudio ou aproxime-se do microfone');
    }
    
    // Dropped events
    if (metrics.droppedSpeechEvents > 5) {
      suggestions.push('Reduza tarefas concorrentes para evitar perda de eventos de fala');
    }
    
    // Total latency
    if (metrics.totalRoundTripMs > 3000) {
      suggestions.push('Considere usar um provedor de LLM mais rápido ou inferência local');
    }
    
    // Grade-based suggestions
    if (metrics.grade === 'D' || metrics.grade === 'C') {
      suggestions.push('Ative configurações ultra-rápidas para melhoria significativa');
    }
    
    // If no suggestions, show positive feedback
    if (suggestions.length === 0) {
      suggestions.push('Performance excelente! Todas as métricas dentro dos limites ideais.');
    }
    
    return suggestions;
  }
  
  /**
   * Inject CSS styles for the dashboard
   */
  private injectStyles(): void {
    // Check if styles already exist
    if (document.getElementById('orion-voice-performance-dashboard-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'orion-voice-performance-dashboard-styles';
    style.textContent = `
      .dashboard-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }
      
      .dashboard-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      
      .dashboard-close {
        cursor: pointer;
        font-size: 18px;
        font-weight: bold;
        color: rgba(255,255,255,0.7);
        transition: color 0.2s;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
      }
      
      .dashboard-close:hover {
        color: #fff;
        background-color: rgba(255,255,255,0.1);
      }
      
      .dashboard-grade {
        text-align: center;
        margin-bottom: 16px;
        padding: 8px;
        background-color: rgba(255,255,255,0.05);
        border-radius: 6px;
        font-size: 18px;
        font-weight: bold;
      }
      
      .dashboard-section {
        margin-bottom: 12px;
      }
      
      .section-title {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 6px;
        color: rgba(255,255,255,0.7);
      }
      
      .metric-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 4px;
        font-size: 13px;
      }
      
      .metric-label {
        font-weight: 500;
      }
      
      .metric-value {
        font-family: 'Courier New', monospace;
        font-weight: 600;
      }
      
      .metric-good { color: #4CAF50; }
      .metric-fair { color: #FFC107; }
      .metric-bad { color: #F44336; }
      
      .metric-total {
        font-size: 14px;
        font-weight: bold;
        margin-top: 8px;
        padding-top: 4px;
        border-top: 1px solid rgba(255,255,255,0.1);
      }
      
      .dashboard-suggestions {
        max-height: 120px;
        overflow-y: auto;
        margin-bottom: 12px;
      }
      
      .suggestion-item {
        font-size: 12px;
        line-height: 1.4;
        padding: 4px 0;
        border-bottom: 1px solid rgba(255,255,255,0.05);
      }
      
      .suggestion-item:last-child {
        border-bottom: none;
      }
      
      .dashboard-toggle {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid rgba(255,255,255,0.1);
      }
      
      .dashboard-toggle label {
        display: flex;
        align-items: center;
        cursor: pointer;
        font-size: 12px;
      }
      
      .dashboard-toggle input {
        margin-right: 6px;
        width: 14px;
        height: 14px;
      }
      
      .dashboard-footer {
        text-align: center;
        font-size: 11px;
        color: rgba(255,255,255,0.5);
        margin-top: 12px;
        padding-top: 8px;
        border-top: 1px solid rgba(255,255,255,0.1);
      }
    `;
    
    document.head.appendChild(style);
  }
  
  /**
   * Add event listeners for interactive elements
   */
  private addEventListeners(): void {
    if (!this.container) return;
    
    // Close button
    const closeBtn = this.container.querySelector('#voice-dashboard-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.toggleVisibility();
      });
    }
    
    // Auto-optimize checkbox
    if (this.options.enableAutoOptimization) {
      const autoOptCheckbox = this.container.querySelector('#voice-auto-optimize');
      if (autoOptCheckbox) {
        autoOptCheckbox.addEventListener('change', (e) => {
          const enabled = (e.target as HTMLInputElement).checked;
          this.options.enableAutoOptimization = enabled;
          // In a real implementation, this would toggle auto-optimization features
          console.log(`[VoiceDashboard] Auto-optimization ${enabled ? 'enabled' : 'disabled'}`);
        });
      }
    }
  }
  
  /**
   * Toggle dashboard visibility
   */
  toggleVisibility(): void {
    if (!this.container) return;
    this.container.style.display = this.container.style.display === 'none' ? 'block' : 'none';
  }
  
  /**
   * Show the dashboard
   */
  show(): void {
    if (this.container) {
      this.container.style.display = 'block';
    }
  }
  
  /**
   * Hide the dashboard
   */
  hide(): void {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }
  
  /**
   * Destroy the dashboard and clean up resources
   */
  destroy(): void {
    this.stopUpdates();
    
    const styleEl = document.getElementById('orion-voice-performance-dashboard-styles');
    if (styleEl) styleEl.remove();
    
    const containerEl = document.getElementById(this.options.containerId);
    if (containerEl) containerEl.remove();
    
    this.isInitialized = false;
  }
}

// Export singleton instance
export const voicePerformanceDashboard = new VoicePerformanceDashboard({ 
  enableAutoOptimization: true 
});