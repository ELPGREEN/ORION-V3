/**
 * STT Audio Processor - High performance audio capture with VAD
 */
class STTProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._bufferSize = 16000 * 2; // 2 seconds buffer at 16kHz
    this._buffer = new Float32Array(this._bufferSize);
    this._offset = 0;
    this._isRecording = false;
    this._silenceFrames = 0;
    this._threshold = 0.01;
    this._silenceThreshold = 50; // frames of silence before flushing
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const channelData = input[0];

    // Simple VAD
    let sum = 0;
    for (let i = 0; i < channelData.length; i++) {
      sum += channelData[i] * channelData[i];
    }
    const rms = Math.sqrt(sum / channelData.length);

    if (rms > this._threshold) {
      this._isRecording = true;
      this._silenceFrames = 0;
    } else if (this._isRecording) {
      this._silenceFrames++;
    }

    if (this._isRecording) {
      for (let i = 0; i < channelData.length; i++) {
        if (this._offset < this._bufferSize) {
          this._buffer[this._offset++] = channelData[i];
        }
      }

      if (this._silenceFrames > this._silenceThreshold || this._offset >= this._bufferSize) {
        // Flush utterance
        this.port.postMessage({
          type: 'audio',
          buffer: this._buffer.slice(0, this._offset)
        });
        this._offset = 0;
        this._isRecording = false;
        this._silenceFrames = 0;
      }
    }

    return true;
  }
}

registerProcessor('stt-processor', STTProcessor);
