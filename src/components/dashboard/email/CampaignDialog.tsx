import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, FileText, Paintbrush, Layout, Eye, Code,
  Users, UserPlus, X, Mail, Sparkles, Check, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import EmailTemplateLibrary from './EmailTemplateLibrary';
import type { EmailTemplate } from './EmailTemplateLibrary';
import EmailEditor from './EmailEditor';
import AITipCard from './AITipCard';

interface ContactEmail {
  email: string;
  name: string;
  source: string;
}

interface CampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign?: {
    id: string;
    name: string;
    subject: string;
    html_content: string;
    text_content: string | null;
    esp_id: string | null;
  } | null;
  contactEmails: ContactEmail[];
  onSave: (data: {
    name: string;
    subject: string;
    html_content: string;
    text_content: string;
    recipients: string[];
  }) => Promise<void>;
  onSend: (data: {
    name: string;
    subject: string;
    html_content: string;
    text_content: string;
    recipients: string[];
  }) => Promise<void>;
}

const STEPS = [
  { id: 'details', label: 'Detalhes', icon: FileText },
  { id: 'content', label: 'Conteúdo', icon: Paintbrush },
  { id: 'recipients', label: 'Destinatários', icon: Users },
  { id: 'review', label: 'Revisar', icon: Eye },
];

const CampaignDialog = ({ 
  open, 
  onOpenChange, 
  campaign, 
  contactEmails,
  onSave,
  onSend 
}: CampaignDialogProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [editorMode, setEditorMode] = useState<'code' | 'visual' | 'template'>('template');
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [manualEmails, setManualEmails] = useState<string[]>([]);
  const [newManualEmail, setNewManualEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    html_content: '',
    text_content: '',
  });

  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name,
        subject: campaign.subject,
        html_content: campaign.html_content,
        text_content: campaign.text_content || '',
      });
      setEditorMode('code');
    } else {
      setFormData({ name: '', subject: '', html_content: '', text_content: '' });
      setEditorMode('template');
    }
    setCurrentStep(0);
    setSelectedEmails([]);
    setManualEmails([]);
  }, [campaign, open]);

  const handleTemplateSelect = (template: EmailTemplate) => {
    setFormData({ ...formData, subject: template.subject, html_content: template.html_content });
    setEditorMode('code');
    toast.success(`Template "${template.name}" aplicado!`);
  };

  const handleEditorSave = (html: string) => {
    setFormData({ ...formData, html_content: html });
  };

  const handleAddManualEmail = () => {
    const email = newManualEmail.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error('Email inválido'); return; }
    if (manualEmails.includes(email) || selectedEmails.includes(email)) { toast.error('Email já adicionado'); return; }
    setManualEmails([...manualEmails, email]);
    setNewManualEmail('');
  };

  const toggleEmailSelection = (email: string) => {
    setSelectedEmails(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]);
  };

  const getTotalRecipients = () => selectedEmails.length + manualEmails.length;

  const canProceed = () => {
    switch (currentStep) {
      case 0: return formData.name && formData.subject;
      case 1: return formData.html_content;
      case 2: return getTotalRecipients() > 0;
      default: return true;
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onSave({ ...formData, recipients: [...selectedEmails, ...manualEmails] });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    setIsLoading(true);
    try {
      await onSend({ ...formData, recipients: [...selectedEmails, ...manualEmails] });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <div className="border-b border-border p-6 pb-0">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl font-bold text-foreground">
              {campaign ? 'Editar Campanha' : 'Nova Campanha'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 pb-6">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => index <= currentStep && setCurrentStep(index)}
                  disabled={index > currentStep}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    index === currentStep ? 'bg-primary text-primary-foreground' :
                    index < currentStep ? 'bg-primary/20 text-primary hover:bg-primary/30' :
                    'bg-muted/50 text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  <step.icon className="w-4 h-4" />
                  <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
                </button>
                {index < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground mx-1" />}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="max-w-2xl space-y-4">
                  <div className="space-y-2">
                    <Label className="text-foreground">Nome da Campanha</Label>
                    <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Newsletter Dezembro 2024" className="bg-muted/50 border-border h-12 text-lg" />
                    <p className="text-xs text-muted-foreground">Este nome é apenas para organização interna</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Assunto do E-mail</Label>
                    <Input value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} placeholder="Ex: 🎉 Novidades especiais para você!" className="bg-muted/50 border-border h-12 text-lg" />
                    <p className="text-xs text-muted-foreground">Seja criativo! O assunto é crucial para a taxa de abertura</p>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 1 && (
              <motion.div key="content" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <Tabs value={editorMode} onValueChange={v => setEditorMode(v as any)}>
                  <TabsList className="bg-muted/50 p-1">
                    <TabsTrigger value="template" className="gap-2"><Layout className="w-4 h-4" />Templates</TabsTrigger>
                    <TabsTrigger value="visual" className="gap-2"><Paintbrush className="w-4 h-4" />Editor Visual</TabsTrigger>
                    <TabsTrigger value="code" className="gap-2"><Code className="w-4 h-4" />HTML</TabsTrigger>
                  </TabsList>
                  <TabsContent value="template" className="mt-4">
                    <EmailTemplateLibrary onSelectTemplate={handleTemplateSelect} />
                  </TabsContent>
                  <TabsContent value="visual" className="mt-4">
                    <EmailEditor initialHtml={formData.html_content} onSave={handleEditorSave} />
                  </TabsContent>
                  <TabsContent value="code" className="mt-4">
                    <div className="space-y-4">
                      <Textarea value={formData.html_content} onChange={e => setFormData({ ...formData, html_content: e.target.value })} placeholder="Cole ou digite o HTML do seu e-mail..." className="bg-muted/50 border-border min-h-[400px] font-mono text-sm" />
                      {formData.html_content && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Check className="w-4 h-4 text-emerald-400" />HTML detectado ({formData.html_content.length} caracteres)</div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div key="recipients" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-foreground">Contatos Existentes</Label>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedEmails(contactEmails.map(c => c.email))}>Selecionar todos</Button>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedEmails([])}>Limpar</Button>
                      </div>
                    </div>
                    <ScrollArea className="h-[300px] rounded-lg border border-border bg-muted/20 p-3">
                      {contactEmails.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground"><Users className="w-8 h-8 mb-2" /><p className="text-sm">Nenhum contato encontrado</p></div>
                      ) : (
                        <div className="space-y-1">
                          {contactEmails.map(contact => (
                            <label key={contact.email} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedEmails.includes(contact.email) ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50'}`}>
                              <Checkbox checked={selectedEmails.includes(contact.email)} onCheckedChange={() => toggleEmailSelection(contact.email)} />
                              <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground truncate">{contact.name}</p><p className="text-xs text-muted-foreground truncate">{contact.email}</p></div>
                              <Badge variant="outline" className="text-[10px]">{contact.source}</Badge>
                            </label>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                  <div className="space-y-4">
                    <Label className="text-foreground">Adicionar Manualmente</Label>
                    <div className="flex gap-2">
                      <Input value={newManualEmail} onChange={e => setNewManualEmail(e.target.value)} placeholder="email@exemplo.com" className="bg-muted/50 border-border" onKeyDown={e => e.key === 'Enter' && handleAddManualEmail()} />
                      <Button onClick={handleAddManualEmail} variant="secondary"><UserPlus className="w-4 h-4" /></Button>
                    </div>
                    <ScrollArea className="h-[250px] rounded-lg border border-border bg-muted/20 p-3">
                      {manualEmails.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground"><Mail className="w-8 h-8 mb-2" /><p className="text-sm">Nenhum email adicionado</p></div>
                      ) : (
                        <div className="space-y-1">
                          {manualEmails.map(email => (
                            <div key={email} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                              <span className="text-sm text-foreground">{email}</span>
                              <Button variant="ghost" size="sm" onClick={() => setManualEmails(prev => prev.filter(e => e !== email))}><X className="w-4 h-4" /></Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </div>
                <div className="flex items-center justify-center p-4 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
                  <Users className="w-5 h-5 text-primary mr-3" />
                  <span className="text-lg font-semibold text-foreground">{getTotalRecipients()} destinatário(s) selecionado(s)</span>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground">Resumo da Campanha</h3>
                    <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border">
                      <div className="flex justify-between"><span className="text-muted-foreground">Nome:</span><span className="text-foreground font-medium">{formData.name}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Assunto:</span><span className="text-foreground font-medium truncate max-w-[200px]">{formData.subject}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Destinatários:</span><span className="text-foreground font-medium">{getTotalRecipients()}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Conteúdo:</span><span className="text-emerald-400 font-medium flex items-center gap-1"><Check className="w-4 h-4" />Configurado</span></div>
                    </div>
                    <AITipCard subject={formData.subject} htmlContent={formData.html_content} recipientCount={getTotalRecipients()} />
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground">Pré-visualização</h3>
                    <div className="rounded-lg border border-border overflow-hidden bg-background">
                      <div className="h-[300px] overflow-y-auto">
                        {formData.html_content ? <iframe srcDoc={formData.html_content} className="w-full h-full border-0" title="Email Preview" /> : <div className="flex items-center justify-center h-full text-muted-foreground"><p>Nenhum conteúdo para visualizar</p></div>}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="border-t border-border p-6">
          <div className="flex items-center justify-between w-full">
            <Button variant="outline" onClick={() => currentStep > 0 && setCurrentStep(currentStep - 1)} disabled={currentStep === 0}>Voltar</Button>
            <div className="flex gap-3">
              {currentStep === STEPS.length - 1 ? (
                <>
                  <Button variant="outline" onClick={handleSave} disabled={isLoading}><FileText className="w-4 h-4 mr-2" />Salvar Rascunho</Button>
                  <Button onClick={handleSend} disabled={isLoading || getTotalRecipients() === 0} className="bg-gradient-to-r from-primary to-primary/80 hover:opacity-90"><Send className="w-4 h-4 mr-2" />Enviar ({getTotalRecipients()})</Button>
                </>
              ) : (
                <Button onClick={() => currentStep < STEPS.length - 1 && setCurrentStep(currentStep + 1)} disabled={!canProceed()}>Próximo<ChevronRight className="w-4 h-4 ml-2" /></Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CampaignDialog;
