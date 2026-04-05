import { useUserRole } from "@/hooks/useUserRole";
import { ChatIAProvider } from "@/contexts/ChatIAContext";
import ChatIAAdvogado from "./ChatIAAdvogado";
import ChatJuridicoCliente from "./ChatJuridico";

export default function ChatIARouter() {
  const { isAdvogado } = useUserRole();

  return (
    <ChatIAProvider>
      {isAdvogado ? <ChatIAAdvogado /> : <ChatJuridicoCliente />}
    </ChatIAProvider>
  );
}
