DROP TRIGGER IF EXISTS trigger_notify_client_andamento ON public.andamentos;
CREATE TRIGGER trigger_notify_client_andamento
  AFTER INSERT ON public.andamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_client_on_andamento();

DROP TRIGGER IF EXISTS trigger_notify_shared_document ON public.shared_documents;
CREATE TRIGGER trigger_notify_shared_document
  AFTER INSERT ON public.shared_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_client_on_shared_document();