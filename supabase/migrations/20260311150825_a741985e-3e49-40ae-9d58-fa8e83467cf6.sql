-- Recreate notification triggers (they were not applied from previous migration)

-- Trigger: notify client when andamento is created
CREATE OR REPLACE TRIGGER trigger_notify_client_andamento
  AFTER INSERT ON public.andamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_client_on_andamento();

-- Trigger: notify client when document is shared
CREATE OR REPLACE TRIGGER trigger_notify_shared_document
  AFTER INSERT ON public.shared_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_client_on_shared_document();