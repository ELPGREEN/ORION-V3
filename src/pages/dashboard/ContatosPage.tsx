import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
// [REMOVED] import { useNeuralFeedback } from "@/hooks/useNeuralFeedback";
import { useRefreshOnFocus } from "@/hooks/useRefreshOnFocus";
import { BookUser, Search, Mail, Send, Building, Eye, MessageCircle, Trash2, Download, Loader2, Plus, CloudDownload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import ContactDetailsDialog from "@/components/dashboard/contacts/ContactDetailsDialog";
import NewContactDialog from "@/components/dashboard/contacts/NewContactDialog";

interface Contact {
  id: string;
  nome: string;
  email: string;
  empresa: string | null;
  telefone: string | null;
  notas: string | null;
}

const contatosPreCarregados = [
  { nome: "H. Montes", email: "h_montes@elbrocal.com.pe", empresa: "El Brocal" },
  { nome: "G. Alvarez", email: "g_alvarez@elbrocal.com.pe", empresa: "El Brocal" },
  { nome: "J. Lopez", email: "j_lopez@elbrocal.com.pe", empresa: "El Brocal" },
  { nome: "Y. Cruz", email: "y_cruz@elbrocal.com.pe", empresa: "El Brocal" },
  { nome: "K. Santos", email: "k_santos@elbrocal.com.pe", empresa: "El Brocal" },
  { nome: "R. Ponce", email: "r_ponce@elbrocal.com.pe", empresa: "El Brocal" },
  { nome: "M. Chevarria", email: "mchevarria@volcan.com.pe", empresa: "Volcan" },
  { nome: "Johny Orihuela", email: "johny.orihuela@trafigura.com", empresa: "Trafigura" },
  { nome: "Leslie Scogings", email: "leslie.scogings@trafigura.com", empresa: "Trafigura" },
  { nome: "Operations", email: "ooperations@buenaventura.com", empresa: "Buenaventura" },
  { nome: "Logística", email: "logistica@buenaventura.com", empresa: "Buenaventura" },
  { nome: "A. Hermoza", email: "ahermoza@buenaventura.com.pe", empresa: "Buenaventura" },
  { nome: "J. Rojas", email: "jrojas@buenaventura.com.pe", empresa: "Buenaventura" },
  { nome: "L. Banda", email: "lbanda@austriaduvaz.com", empresa: "Austria Duvaz" },
  { nome: "R. Flores", email: "rflores@casapalca.com.pe", empresa: "Casapalca" },
  { nome: "J. Bellido", email: "jbellido@casapalca.com.pe", empresa: "Casapalca" },
  { nome: "C. Gubbins", email: "cgubbins@casapalca.com.pe", empresa: "Casapalca" },
  { nome: "V. Cordova", email: "vcordova@casapalca.com.pe", empresa: "Casapalca" },
  { nome: "S. Robles", email: "srobles@caudalosa.com.pe", empresa: "Caudalosa" },
  { nome: "Greg Hellin", email: "greghellin@caudalosa.com.pe", empresa: "Caudalosa" },
  { nome: "P. Zuniga", email: "pzuniga@caudalosa.com.pe", empresa: "Caudalosa" },
  { nome: "M. Espinoza", email: "mespinoza@caudalosa.com.pe", empresa: "Caudalosa" },
  { nome: "J. Crespo", email: "jcrespo@passac.com.pe", empresa: "Passac" },
  { nome: "J. Ugarte", email: "jugarte@passac.com.pe", empresa: "Passac" },
  { nome: "P. Morales", email: "pmorales@santa-luisa.com", empresa: "Santa Luisa" },
  { nome: "M. Morales", email: "mmorales@santa-luisa.com", empresa: "Santa Luisa" },
  { nome: "J. Albino", email: "jalbino@minsur.com.pe", empresa: "Minsur" },
  { nome: "M. Kalinaj", email: "mkalinaj@minsur.com.pe", empresa: "Minsur" },
  { nome: "J. Saez", email: "jsaez@minsur.com.pe", empresa: "Minsur" },
  { nome: "E. Roca", email: "eroca@minsur.com.pe", empresa: "Minsur" },
  { nome: "J. Kruger", email: "jkruger@minsur.com", empresa: "Minsur" },
];

export default function ContatosPage() {
  const [searchParams] = useSearchParams();
  const [busca, setBusca] = useState("");
  const [contatos, setContatos] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [importingGoogle, setImportingGoogle] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { logNeural } = useNeuralFeedback();

  const importFromGoogle = async () => {
    if (!user) return;
    setImportingGoogle(true);
    try {
      // Use server-side service account — no per-user OAuth needed
      const { data, error } = await supabase.functions.invoke("firebase-admin", {
        body: { action: "google.contacts.list", pageSize: 200 },
      });

      if (error) throw error;
      const contactsData = data?.data || data;
      if (!contactsData?.contacts?.length) {
        toast({ title: "Nenhum contato encontrado", description: "A conta do Orion não retornou contatos com e-mail." });
        setImportingGoogle(false);
        return;
      }

      // Get existing emails to avoid duplicates
      const { data: existing } = await supabase
        .from("contacts")
        .select("email")
        .eq("user_id", user.id);
      const existingEmails = new Set((existing || []).map((c) => c.email.toLowerCase()));

      const toInsert = contactsData.contacts
        .filter((c: any) => c.email && !existingEmails.has(c.email.toLowerCase()))
        .map((c: any) => ({
          user_id: user.id,
          nome: c.name || c.email.split("@")[0],
          email: c.email,
          telefone: c.phone || null,
          empresa: c.company || null,
        }));

      if (toInsert.length === 0) {
        toast({ title: "Todos já importados", description: "Todos os contatos do Google já estão na sua lista." });
      } else {
        const { error: insertError } = await supabase.from("contacts").insert(toInsert);
        if (insertError) throw insertError;
        toast({ title: "Contatos importados!", description: `${toInsert.length} contatos do Google adicionados.` });
        loadContacts();

        // 🧠 Neural: importação Google = sinal de integração ativa
        logNeural({
          interaction_type: "crm_client_event",
          input_text: `Importação de contatos Google: ${toInsert.length} contatos`,
          output_text: toInsert.map((c: any) => `${c.nome} <${c.email}>`).slice(0, 5).join(", "),
          quality_score: 0.8,
          user_id: user?.id,
          metadata: { module: "contatos_google", count: toInsert.length, status_novo: "em_atendimento" },
        });
      }
    } catch (e: any) {
      toast({ title: "Erro ao importar", description: e.message || "Tente novamente.", variant: "destructive" });
    }
    setImportingGoogle(false);
  };

  useEffect(() => {
    loadContacts();
  }, [user]);

  useEffect(() => {
    const searchFromUrl = searchParams.get("search");
    if (searchFromUrl !== null) {
      setBusca(searchFromUrl);
    }
  }, [searchParams]);

  useRefreshOnFocus(useCallback(() => { loadContacts(); }, [user]));

  const loadContacts = async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    const dbContacts = (!error && data ? data : [])
      .filter((c: any) => !!c.email)
      .map((c: any) => ({
        id: c.id,
        nome: c.name || "",
        email: c.email.toLowerCase(),
        empresa: c.company || null,
        telefone: null,
        notas: c.message || null,
      } as Contact));

    const existingEmails = new Set(dbContacts.map((c) => c.email.toLowerCase()));

    const preContacts: Contact[] = contatosPreCarregados
      .filter((c) => !existingEmails.has(c.email.toLowerCase()))
      .map((c, i) => ({
        id: `pre-${i}`,
        nome: c.nome,
        email: c.email,
        empresa: c.empresa,
        telefone: null,
        notas: null,
      }));

    if (error) {
    }

    setContatos([...dbContacts, ...preContacts]);
    setLoading(false);
  };

  const importarTodos = async () => {
    if (!user) return;

    const { data: existing } = await supabase
      .from("contacts")
      .select("email")
      .eq("user_id", user.id);

    const existingEmails = new Set((existing || []).map((c) => c.email.toLowerCase()));

    const toInsert = contatosPreCarregados
      .filter((c) => !existingEmails.has(c.email.toLowerCase()))
      .map((c) => ({
        user_id: user.id,
        name: c.nome,
        email: c.email,
        company: c.empresa,
        message: "",
      }));

    if (toInsert.length === 0) {
      toast({ title: "Nada para importar", description: "Todos os contatos já foram importados." });
      return;
    }

    const { error } = await supabase.from("contacts").insert(toInsert);
    if (error) {
      toast({ title: "Erro", description: "Erro ao importar contatos.", variant: "destructive" });
    } else {
      toast({ title: "Contatos importados!", description: `${toInsert.length} contatos adicionados.` });
      loadContacts();
    }
  };

  const importarUnico = async (contact: Contact) => {
    if (!user || !contact.id.startsWith("pre-")) return;
    setImporting(contact.id);

    const { error } = await supabase.from("contacts").insert({
      user_id: user.id,
      name: contact.nome,
      email: contact.email,
      company: contact.empresa,
      message: contact.notas || "",
    });

    setImporting(null);

    if (error) {
      toast({ title: "Erro", description: "Erro ao importar contato.", variant: "destructive" });
    } else {
      toast({ title: "Importado!", description: `${contact.nome} foi salvo.` });
      loadContacts();
    }
  };

  const deleteContact = async (contactId: string) => {
    if (contactId.startsWith("pre-")) {
      // Just remove from local state
      setContatos((prev) => prev.filter((c) => c.id !== contactId));
      toast({ title: "Contato removido da lista" });
      return;
    }

    // Delete associated documents first
    const { data: docs } = await supabase
      .from("contact_documents")
      .select("id, storage_path")
      .eq("contact_id", contactId);

    if (docs && docs.length > 0) {
      const paths = docs.map((d) => d.storage_path).filter(Boolean);
      if (paths.length) {
        await supabase.storage.from("documents").remove(paths);
      }
      await supabase.from("contact_documents").delete().eq("contact_id", contactId);
    }

    const { error } = await supabase.from("contacts").delete().eq("id", contactId);
    if (error) {
      toast({ title: "Erro", description: "Erro ao excluir contato.", variant: "destructive" });
    } else {
      toast({ title: "Contato excluído" });
      loadContacts();
    }
  };

  const openDetails = (contact: Contact) => {
    setSelectedContact(contact);
    setDetailsOpen(true);
  };

  const filtrados = contatos.filter(
    (c) =>
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.email.toLowerCase().includes(busca.toLowerCase()) ||
      (c.empresa && c.empresa.toLowerCase().includes(busca.toLowerCase()))
  );

  const porEmpresa: Record<string, Contact[]> = {};
  filtrados.forEach((c) => {
    const key = c.empresa || "Outros";
    if (!porEmpresa[key]) porEmpresa[key] = [];
    porEmpresa[key].push(c);
  });

  const totalPre = contatos.filter((c) => c.id.startsWith("pre-")).length;
  const totalSalvos = contatos.filter((c) => !c.id.startsWith("pre-")).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-serif text-foreground flex items-center gap-3">
            <BookUser className="h-6 w-6 text-primary" />
            Contatos & Envios
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalSalvos} salvos • {totalPre} pré-carregados (clique em + para importar)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="btn-outline-gold text-[10px] h-9"
            onClick={importFromGoogle}
            disabled={importingGoogle}
          >
            {importingGoogle ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <CloudDownload className="h-3.5 w-3.5 mr-1" />
            )}
            Importar do Google
          </Button>
          {totalPre > 0 && (
            <Button
              variant="outline"
              className="btn-outline-gold text-[10px] h-9"
              onClick={importarTodos}
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              Importar Todos ({totalPre})
            </Button>
          )}
          <NewContactDialog onCreated={loadContacts} />
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, e-mail ou empresa..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-10 bg-card border-border h-10"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        Object.entries(porEmpresa).sort().map(([empresa, contacts]) => (
          <div key={empresa}>
            <div className="flex items-center gap-2 mb-2">
              <Building className="h-3.5 w-3.5 text-primary" />
              <h3 className="text-xs font-medium text-primary tracking-wider uppercase">{empresa}</h3>
              <span className="text-[10px] text-muted-foreground">({contacts.length})</span>
            </div>
            <div className="space-y-1 mb-4">
              {contacts.map((c) => {
                const isPre = c.id.startsWith("pre-");
                return (
                  <div
                    key={c.id}
                    className="bg-card border border-border px-4 py-2.5 flex items-center justify-between hover-gold-glow transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-8 w-8 bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 cursor-pointer hover:bg-primary/20 transition-colors"
                        onClick={() => openDetails(c)}
                        title="Ver detalhes"
                      >
                        <span className="text-xs font-serif text-primary">{c.nome.charAt(0)}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium text-foreground">{c.nome}</p>
                          {isPre && (
                            <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 border-primary/30 text-primary">
                              Pré-carregado
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">{c.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {isPre ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[10px] text-primary hover:bg-primary/10"
                          onClick={() => importarUnico(c)}
                          disabled={importing === c.id}
                        >
                          {importing === c.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <Plus className="h-3 w-3 mr-1" />
                              Importar
                            </>
                          )}
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            title="Ver/Editar"
                            onClick={() => openDetails(c)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            title="Enviar e-mail"
                            onClick={() => window.location.href = `mailto:${c.email}`}
                          >
                            <Mail className="h-3.5 w-3.5" />
                          </Button>
                          {c.telefone && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                              title="WhatsApp"
                              onClick={() => window.open(`https://wa.me/55${c.telefone?.replace(/\D/g, "")}`, "_blank")}
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            title="Documentos"
                            onClick={() => openDetails(c)}
                          >
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title={isPre ? "Remover da lista" : "Excluir contato"}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {isPre ? "Remover da lista?" : "Excluir contato?"}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {isPre
                                ? "Este contato será removido da visualização atual. Ele reaparecerá ao recarregar a página."
                                : "Isso excluirá permanentemente o contato e todos os documentos associados."}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteContact(c.id)}>
                              {isPre ? "Remover" : "Excluir"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      <ContactDetailsDialog
        contact={selectedContact}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onUpdate={loadContacts}
      />
    </div>
  );
}
