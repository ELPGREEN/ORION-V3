
-- Add conversation mode tracking to chat_conversations
ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS conversation_mode text NOT NULL DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS lawyer_instructions text DEFAULT NULL;

-- conversation_mode values:
-- 'direct' = lawyer handles directly (default)
-- 'ai_autonomous' = AI secretary handles without lawyer input
-- 'ai_guided' = AI secretary follows lawyer instructions
