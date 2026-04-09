
-- generate-embeddings: 1h → 30min (RAG precisa de embeddings frescos)
SELECT cron.alter_job(3, schedule := '*/30 * * * *');

-- neural-auto-learn: 2h → 1h (RAG precisa aprender regularmente)
SELECT cron.alter_job(1, schedule := '0 * * * *');
