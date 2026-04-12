import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getQualityPreset, type QualityLevel, QUALITY_PRESETS } from '@/lib/neural/quality-presets';
import { toast } from 'sonner';

export interface ScreenRecording {
  url: string;
  storagePath: string;
  duration: number;
  size: number;
  createdAt: string;
}

export function useScreenRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const frameCountRef = useRef(0);

  const startRecording = useCallback(async (qualityLevel?: QualityLevel) => {
    try {
      const preset = qualityLevel ? QUALITY_PRESETS[qualityLevel] : getQualityPreset();

      // Try getDisplayMedia first, fall back to canvas capture
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: preset.resolution.width * 2 },
            height: { ideal: preset.resolution.height * 2 },
            frameRate: { ideal: preset.fpsCap },
          },
          audio: false,
        });
      } catch {
        // Fallback: capture from a canvas if available
        const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
        if (!canvas) {
          toast.error('Nenhuma fonte de captura disponível');
          return;
        }
        stream = canvas.captureStream(preset.fpsCap);
      }

      streamRef.current = stream;
      chunksRef.current = [];
      frameCountRef.current = 0;

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm;codecs=vp8';

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: preset.videoBitrate,
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          // Frame skip logic: only keep every N+1 frames
          if (preset.frameSkip === 0 || frameCountRef.current % (preset.frameSkip + 1) === 0) {
            chunksRef.current.push(e.data);
          }
          frameCountRef.current++;
        }
      };

      recorder.onstop = () => handleRecordingStop();

      // Handle stream ending (user clicks "Stop sharing")
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (recorderRef.current?.state !== 'inactive') {
          recorderRef.current?.stop();
        }
      });

      recorder.start(1000); // 1s chunks
      recorderRef.current = recorder;
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      toast.success('Gravação iniciada');
    } catch (err) {
      console.error('[ScreenRecorder] Error starting:', err);
      toast.error('Erro ao iniciar gravação');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state !== 'inactive') {
      recorderRef.current?.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setIsRecording(false);
    setIsPaused(false);
  }, []);

  const togglePause = useCallback(() => {
    if (!recorderRef.current) return;
    if (recorderRef.current.state === 'recording') {
      recorderRef.current.pause();
      setIsPaused(true);
    } else if (recorderRef.current.state === 'paused') {
      recorderRef.current.resume();
      setIsPaused(false);
    }
  }, []);

  const handleRecordingStop = useCallback(async () => {
    const blob = new Blob(chunksRef.current, { type: 'video/webm' });
    if (blob.size < 1000) {
      toast.warning('Gravação muito curta, descartada');
      return;
    }

    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Offer local download if not authenticated
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rec_${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        toast.info('Gravação baixada localmente (login necessário para upload)');
        return;
      }

      const timestamp = Date.now();
      const path = `recordings/${user.id}/rec_${timestamp}.webm`;

      const { error } = await supabase.storage
        .from('documents')
        .upload(path, blob, { contentType: 'video/webm', upsert: false });

      if (error) throw error;

      toast.success(`Gravação salva (${(blob.size / 1024 / 1024).toFixed(1)} MB)`);
    } catch (err) {
      console.error('[ScreenRecorder] Upload error:', err);
      // Fallback: local download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rec_${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      toast.warning('Upload falhou — gravação baixada localmente');
    } finally {
      setIsUploading(false);
      chunksRef.current = [];
    }
  }, []);

  return {
    isRecording,
    isPaused,
    duration,
    isUploading,
    startRecording,
    stopRecording,
    togglePause,
  };
}
