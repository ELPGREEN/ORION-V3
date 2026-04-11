-- Clean up duplicate activity rows, keep only the newest one
DELETE FROM public.api_cache 
WHERE query_hash = 'orion-vm-last-activity'
  AND id NOT IN (
    SELECT id FROM public.api_cache 
    WHERE query_hash = 'orion-vm-last-activity' 
    ORDER BY created_at DESC 
    LIMIT 1
  );

-- Change auto-stop cron from every 5 min to every 15 min
SELECT cron.unschedule(7);

SELECT cron.schedule(
  'orion-vm-auto-stop',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://dlwafedtlvbvuoaopvsl.supabase.co/functions/v1/orion-vm-control',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsd2FmZWR0bHZidnVvYW9wdnNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDI0MjEsImV4cCI6MjA4NDQ3ODQyMX0.ohz98f-MO3VNYoR6dth3zYhYqmviFs60ytJAQCwfJNk"}'::jsonb,
    body := '{"command": "auto-stop-check"}'::jsonb
  ) AS request_id;
  $$
);