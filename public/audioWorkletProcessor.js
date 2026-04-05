/**
 * Orion AudioWorklet Processor — Off-Thread Audio Pipeline
 * 
 * Inspired by echo-albertina's architecture:
 * Runs audio capture and basic analysis in a dedicated audio thread,
 * keeping the main thread free for UI rendering.
 * 
 * Features:
 * - Real-time RMS energy calculation (for VAD fallback)
 * - Audio buffer accumulation for chunked processing
 * - Configurable chunk size and sample rate
 * - Zero-copy Float32Array transfer to main thread
 * 
 * This file must be loaded as a Worklet module via:
 *   audioContext.audioWorklet.addModule('/audioWorkletProcessor.js')
 */

class OrionAudioProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    
    // Configuration
    const opts = options?.processorOptions || {};
    this._chunkSize = opts.chunkSize || 4096;    // samples per chunk
    this._energySmoothing = opts.energySmoothing || 0.95;
    this._silenceThreshold = opts.silenceThreshold || 0.01;
    
    // State
    this._buffer = new Float32Array(this._chunkSize);
    this._bufferOffset = 0;
    this._smoothedEnergy = 0;
    this._frameCount = 0;
    this._isActive = true;
    this._ducking = false;  // Reduce sensitivity during TTS playback
    
    // Listen for control messages from main thread
    this.port.onmessage = (event) => {
      const { type, data } = event.data;
      switch (type) {
        case 'set_active':
          this._isActive = data;
          break;
        case 'set_ducking':
          this._ducking = data;
          break;
        case 'set_chunk_size':
          this._chunkSize = data;
          this._buffer = new Float32Array(this._chunkSize);
          this._bufferOffset = 0;
          break;
        case 'set_silence_threshold':
          this._silenceThreshold = data;
          break;
      }
    };
  }

  process(inputs, outputs, parameters) {
    if (!this._isActive) return true;
    
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    
    const channelData = input[0]; // Mono channel
    if (!channelData) return true;
    
    // Calculate RMS energy for this frame (128 samples)
    let sumSquares = 0;
    for (let i = 0; i < channelData.length; i++) {
      sumSquares += channelData[i] * channelData[i];
    }
    const rms = Math.sqrt(sumSquares / channelData.length);
    
    // Exponential smoothing
    this._smoothedEnergy = 
      this._energySmoothing * this._smoothedEnergy + 
      (1 - this._energySmoothing) * rms;
    
    // Apply ducking threshold during TTS
    const effectiveThreshold = this._ducking 
      ? this._silenceThreshold * 6  // Much higher threshold during TTS
      : this._silenceThreshold;
    
    const isSpeech = this._smoothedEnergy > effectiveThreshold;
    
    // Send energy updates at ~30Hz (every ~4 frames at 128 samples/frame)
    this._frameCount++;
    if (this._frameCount % 4 === 0) {
      this.port.postMessage({
        type: 'energy',
        energy: this._smoothedEnergy,
        isSpeech,
        ducking: this._ducking,
      });
    }
    
    // Accumulate audio into chunk buffer
    const remaining = this._chunkSize - this._bufferOffset;
    const toCopy = Math.min(channelData.length, remaining);
    
    this._buffer.set(channelData.subarray(0, toCopy), this._bufferOffset);
    this._bufferOffset += toCopy;
    
    // When chunk is full, send it to main thread
    if (this._bufferOffset >= this._chunkSize) {
      // Transfer the buffer (zero-copy)
      const chunk = this._buffer.slice();
      this.port.postMessage(
        { type: 'audio_chunk', chunk: chunk.buffer, samples: this._chunkSize },
        [chunk.buffer]
      );
      
      // Reset buffer
      this._buffer = new Float32Array(this._chunkSize);
      this._bufferOffset = 0;
      
      // Copy overflow if any
      if (toCopy < channelData.length) {
        const overflow = channelData.subarray(toCopy);
        this._buffer.set(overflow, 0);
        this._bufferOffset = overflow.length;
      }
    }
    
    return true; // Keep processor alive
  }
}

registerProcessor('orion-audio-processor', OrionAudioProcessor);
