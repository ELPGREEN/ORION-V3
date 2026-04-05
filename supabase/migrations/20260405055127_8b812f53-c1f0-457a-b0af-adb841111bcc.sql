
SELECT cron.schedule(
  'auto-ingestion-cron-6h',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://dlwafedtlvbvuoaopvsl.supabase.co/functions/v1/auto-ingestion-cron',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsd2FmZWR0bHZidnVvYW9wdnNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDI0MjEsImV4cCI6MjA4NDQ3ODQyMX0.ohz98f-MO3VNYoR6dth3zYhYqmviFs60ytJAQCwfJNk"}'::jsonb,
    body := concat('{"trigger": "cron", "time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);
