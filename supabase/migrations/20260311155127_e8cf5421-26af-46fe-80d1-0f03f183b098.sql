-- Re-create notification triggers (confirmed missing from db-triggers inspection)
CREATE OR REPLACE TRIGGER trigger_notify_client_andamento
  AFTER INSERT ON public.andamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_client_on_andamento();

CREATE OR REPLACE TRIGGER trigger_notify_shared_document
  AFTER INSERT ON public.shared_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_client_on_shared_document();