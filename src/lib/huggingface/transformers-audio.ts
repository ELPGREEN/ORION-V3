/**
 * Transformers.js — Audio no Browser (100% grátis, offline)
 * 
 * - Whisper STT (tiny ~40MB, small ~250MB) — transcrição de fala
 * - Audio Classification (AST) ~85MB — classificar sons
 * 
 * Ideal como fallback grátis quando Groq Whisper está em rate-limit.
 */

let transformersModule: typeof import("@huggingface/transformers") | null = null;
const pipelineCache = new Map<string, unknown>();

async function getTransformers() {
  if (!transformersModule) {
    transformersModule = await import("@huggingface/transformers");
  }
  return transformersModule;
}

async function getAudioPipeline(task: string, model: string) {
  const key = `${task}:${model}`;
  if (pipelineCache.has(key)) return pipelineCache.get(key);

  const { pipeline } = await getTransformers();
  console.log(`[TJS-Audio] Loading ${task} (${model})...`);
  const pipe = await pipeline(task as any, model);
  pipelineCache.set(key, pipe);
  console.log(`[TJS-Audio] Ready: ${task}`);
  return pipe;
}

// ─── Types ───

export interface TranscriptionResult {
  text: string;
  chunks?: Array<{ text: string; timestamp: [number, number] }>;
}

export interface AudioClassification {
  label: string;
  score: number;
}

// ─── Speech-to-Text (Whisper) ───

/**
 * Transcreve áudio usando Whisper no browser.
 * @param audio Float32Array de áudio (16kHz mono) ou URL/Blob
 * @param model "Xenova/whisper-tiny" (~40MB) ou "Xenova/whisper-small" (~250MB)
 * @param language "pt" para português, null para auto-detect
 */
export async function transcribeAudio(
  audio: Float32Array | string | Blob,
  model = "Xenova/whisper-tiny",
  language: string | null = "pt"
): Promise<TranscriptionResult> {
  const pipe = await getAudioPipeline("automatic-speech-recognition", model) as any;
  
  let input: Float32Array | string;
  if (audio instanceof Blob) {
    input = await blobToFloat32(audio);
  } else {
    input = audio;
  }

  const options: Record<string, unknown> = {
    return_timestamps: true,
    chunk_length_s: 30,
    stride_length_s: 5,
  };
  if (language) {
    options.language = language;
    options.task = "transcribe";
  }

  const result = await pipe(input, options);
  return result as TranscriptionResult;
}

// ─── Audio Classification ───

export async function classifyAudio(
  audio: Float32Array | string | Blob,
  model = "Xenova/ast-finetuned-audioset-10-10-0.4593",
  topK = 5
): Promise<AudioClassification[]> {
  const pipe = await getAudioPipeline("audio-classification", model) as any;
  
  let input: Float32Array | string;
  if (audio instanceof Blob) {
    input = await blobToFloat32(audio);
  } else {
    input = audio;
  }

  const results = await pipe(input, { topk: topK });
  return results as AudioClassification[];
}

// ─── Record from Microphone ───

export async function recordMicrophoneAudio(
  durationMs = 5000
): Promise<Float32Array> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audioContext = new AudioContext({ sampleRate: 16000 });
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  
  const chunks: Float32Array[] = [];
  
  return new Promise((resolve) => {
    processor.onaudioprocess = (e) => {
      chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    };
    source.connect(processor);
    processor.connect(audioContext.destination);

    setTimeout(() => {
      processor.disconnect();
      source.disconnect();
      stream.getTracks().forEach(t => t.stop());
      audioContext.close();

      // Merge chunks
      const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
      const merged = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      resolve(merged);
    }, durationMs);
  });
}

// ─── Helpers ───

async function blobToFloat32(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContext({ sampleRate: 16000 });
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const float32 = audioBuffer.getChannelData(0);
  audioContext.close();
  return float32;
}

export function clearAudioCache(): void {
  pipelineCache.clear();
  console.log("[TJS-Audio] Cache cleared");
}

export function getLoadedAudioModels(): string[] {
  return Array.from(pipelineCache.keys());
}
