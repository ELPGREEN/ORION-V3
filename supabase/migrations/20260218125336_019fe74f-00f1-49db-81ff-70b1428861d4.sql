
-- Retroactively link existing client_documents to processes
-- This inserts missing processo_documents records for existing client-process pairs
INSERT INTO processo_documents (processo_id, file_name, storage_path, file_type, file_size, user_id, notas, categoria)
SELECT 
  p.id as processo_id,
  cd.file_name,
  cd.storage_path,
  cd.file_type,
  cd.file_size,
  p.user_id,
  'Documento vinculado automaticamente' as notas,
  CONCAT('pessoal_', COALESCE(cd.categoria, 'documento')) as categoria
FROM processos p
JOIN client_documents cd ON cd.client_profile_id = p.client_profile_id
WHERE p.client_profile_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM processo_documents pd
    WHERE pd.processo_id = p.id
    AND pd.storage_path = cd.storage_path
  );
