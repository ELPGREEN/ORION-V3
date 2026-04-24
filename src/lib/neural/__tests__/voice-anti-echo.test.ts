import { describe, it, expect, vi } from 'vitest';
import { useNeuralVoice } from '../../../hooks/useNeuralVoice';

// Mocking external dependencies
vi.mock('@/lib/voice/stt-streamer', () => ({
  STTStreamer: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
  })),
}));

vi.mock('@/lib/tts/geminiTTS', () => ({
  speakWithGeminiTTS: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));

describe('useNeuralVoice Hook', () => {
  it('should define the hook', () => {
    expect(useNeuralVoice).toBeDefined();
  });
});
