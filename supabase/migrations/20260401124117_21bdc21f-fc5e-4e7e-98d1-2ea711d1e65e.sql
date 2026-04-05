SELECT cron.schedule(
  'queue-worker-30s',
  '*/1 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://dlwafedtlvbvuoaopvsl.supabase.co/functions/v1/queue-worker',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsd2FmZWR0bHZidnVvYW9wdnNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDI0MjEsImV4cCI6MjA4NDQ3ODQyMX0.ohz98f-MO3VNYoR6dth3zYhYqmviFs60ytJAQCwfJNk"}'::jsonb,
    body := '{"trigger": "cron"}'::jsonb
  ) AS request_id;
  $$
);