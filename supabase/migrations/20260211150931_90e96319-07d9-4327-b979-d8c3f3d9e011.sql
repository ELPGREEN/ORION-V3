
-- Add missing updated_at triggers
CREATE TRIGGER update_chat_conversations_updated_at
BEFORE UPDATE ON public.chat_conversations
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER update_escritorio_config_updated_at
BEFORE UPDATE ON public.escritorio_config
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_updated_at();
