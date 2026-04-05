
-- ═══════════════════════════════════════════
-- Table: iot_devices
-- ═══════════════════════════════════════════
CREATE TABLE public.iot_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'custom',
  topic TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unknown',
  last_value JSONB,
  last_seen_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.iot_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own devices"
  ON public.iot_devices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own devices"
  ON public.iot_devices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own devices"
  ON public.iot_devices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own devices"
  ON public.iot_devices FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_iot_devices_updated_at
  BEFORE UPDATE ON public.iot_devices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ═══════════════════════════════════════════
-- Table: iot_telemetry
-- ═══════════════════════════════════════════
CREATE TABLE public.iot_telemetry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  direction TEXT NOT NULL DEFAULT 'inbound',
  qos SMALLINT NOT NULL DEFAULT 1,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_iot_telemetry_device_time ON public.iot_telemetry (device_id, received_at DESC);
CREATE INDEX idx_iot_telemetry_topic ON public.iot_telemetry (topic);

ALTER TABLE public.iot_telemetry ENABLE ROW LEVEL SECURITY;

-- Users can read telemetry for their own devices
CREATE POLICY "Users can view own device telemetry"
  ON public.iot_telemetry FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.iot_devices d
      WHERE d.device_id = iot_telemetry.device_id
        AND d.user_id = auth.uid()
    )
  );

-- Authenticated users can insert telemetry (Edge Function uses service role for bulk)
CREATE POLICY "Authenticated users can insert telemetry"
  ON public.iot_telemetry FOR INSERT
  TO authenticated
  WITH CHECK (true);
