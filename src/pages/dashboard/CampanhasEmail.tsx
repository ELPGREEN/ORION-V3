import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Mail, Plus, Send, FileText, Loader2, BarChart3, Zap,
  Trash2, Edit, Eye, Clock, CheckCircle, Users, TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import CampaignDialog from '@/components/dashboard/email/CampaignDialog';

export default function CampanhasEmail() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any>(null);

  // Fetch campaigns
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['email-campaigns', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_campaigns' as any)
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  // Fetch contacts for recipient selection
  const { data: contacts } = useQuery({
    queryKey: ['campaign-contacts', user?.id],
    queryFn: async () => {
      const { data: clientProfiles } = await supabase
        .from('client_profiles')
        .select('email, nome')
        .eq('advogado_id', user!.id);

      const { data: contactList } = await supabase
        .from('contacts')
        .select('email, name')
        .eq('user_id', user!.id);

      const emails: { email: string; name: string; source: string }[] = [];
      
      (clientProfiles || []).forEach(p => {
        if (p.email) emails.push({ email: p.email, name: p.nome || p.email, source: 'cliente' });
      });
      (contactList || []).forEach(c => {
        if (c.email && !emails.find(e => e.email === c.email)) {
          emails.push({ email: c.email, name: c.name || c.email, source: 'contato' });
        }
      });

      return emails;
    },
    enabled: !!user,
  });

  // Fetch automation rules
  const { data: automations } = useQuery({
    queryKey: ['email-automations', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_automation_rules' as any)
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const saveCampaign = useMutation({
    mutationFn: async (data: any) => {
      if (editingCampaign) {
        const { error } = await supabase
          .from('email_campaigns' as any)
          .update({
            name: data.name,
            subject: data.subject,
            html_content: data.html_content,
            text_content: data.text_content,
            recipients: data.recipients,
            total_recipients: data.recipients.length,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', editingCampaign.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('email_campaigns' as any)
          .insert({
            user_id: user!.id,
            name: data.name,
            subject: data.subject,
            html_content: data.html_content,
            text_content: data.text_content,
            recipients: data.recipients,
            total_recipients: data.recipients.length,
            status: 'draft',
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      toast.success('Campanha salva!');
      setEditingCampaign(null);
    },
    onError: (err: any) => toast.error('Erro ao salvar: ' + err.message),
  });

  const sendCampaign = useMutation({
    mutationFn: async (data: any) => {
      // Save first
      const { data: campaign, error } = await supabase
        .from('email_campaigns' as any)
        .insert({
          user_id: user!.id,
          name: data.name,
          subject: data.subject,
          html_content: data.html_content,
          text_content: data.text_content,
          recipients: data.recipients,
          total_recipients: data.recipients.length,
          status: 'sent',
          sent_at: new Date().toISOString(),
          sent_count: data.recipients.length,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      toast.success('Campanha enviada com sucesso!');
      setEditingCampaign(null);
    },
    onError: (err: any) => toast.error('Erro ao enviar: ' + err.message),
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('email_campaigns' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      toast.success('Campanha removida');
    },
  });

  const statusColors: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    scheduled: 'bg-blue-500/20 text-blue-400',
    sending: 'bg-amber-500/20 text-amber-400',
    sent: 'bg-emerald-500/20 text-emerald-400',
    cancelled: 'bg-destructive/20 text-destructive',
  };

  const statusLabels: Record<string, string> = {
    draft: 'Rascunho',
    scheduled: 'Agendada',
    sending: 'Enviando',
    sent: 'Enviada',
    cancelled: 'Cancelada',
  };

  const triggerLabels: Record<string, string> = {
    purchase: 'Após Compra',
    signup: 'Novo Cadastro',
    abandoned_cart: 'Carrinho Abandonado',
    post_purchase: 'Pós-Compra',
    upsell: 'Upsell',
    welcome: 'Boas-vindas',
  };

  // Stats
  const totalSent = (campaigns || []).reduce((acc, c) => acc + (c.sent_count || 0), 0);
  const totalOpens = (campaigns || []).reduce((acc, c) => acc + (c.open_count || 0), 0);
  const totalClicks = (campaigns || []).reduce((acc, c) => acc + (c.click_count || 0), 0);
  const draftCount = (campaigns || []).filter(c => c.status === 'draft').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Email Marketing</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">Campanhas, automações e funis de email estilo Hotmart</p>
        </div>
        <Button onClick={() => { setEditingCampaign(null); setDialogOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Nova Campanha
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Send className="w-5 h-5 text-primary" />
            </div>
            <div><p className="text-2xl font-bold text-foreground">{totalSent}</p><p className="text-xs text-muted-foreground">Emails Enviados</p></div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Eye className="w-5 h-5 text-emerald-500" />
            </div>
            <div><p className="text-2xl font-bold text-foreground">{totalOpens}</p><p className="text-xs text-muted-foreground">Aberturas</p></div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <div><p className="text-2xl font-bold text-foreground">{totalClicks}</p><p className="text-xs text-muted-foreground">Cliques</p></div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-500" />
            </div>
            <div><p className="text-2xl font-bold text-foreground">{draftCount}</p><p className="text-xs text-muted-foreground">Rascunhos</p></div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="campaigns" className="w-full">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="campaigns" className="gap-2"><Mail className="w-4 h-4" />Campanhas</TabsTrigger>
          <TabsTrigger value="automations" className="gap-2"><Zap className="w-4 h-4" />Automações</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="mt-4">
          {!campaigns?.length ? (
            <Card className="border-dashed border-2 border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                <Mail className="h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">Nenhuma campanha criada</p>
                <Button onClick={() => { setEditingCampaign(null); setDialogOpen(true); }} variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" /> Criar Primeira Campanha
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {campaigns.map((campaign: any) => (
                <Card key={campaign.id} className="border-border/50 hover:border-primary/30 transition-all">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-foreground truncate">{campaign.name}</p>
                        <Badge className={statusColors[campaign.status] || ''}>{statusLabels[campaign.status] || campaign.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">Assunto: {campaign.subject}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{campaign.total_recipients || 0}</span>
                        <span className="flex items-center gap-1"><Send className="w-3 h-3" />{campaign.sent_count || 0} enviados</span>
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{campaign.open_count || 0} aberturas</span>
                        {campaign.sent_at && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(campaign.sent_at).toLocaleDateString('pt-BR')}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingCampaign(campaign); setDialogOpen(true); }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteCampaign.mutate(campaign.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="automations" className="mt-4">
          {!automations?.length ? (
            <Card className="border-dashed border-2 border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                <Zap className="h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">Nenhuma automação configurada</p>
                <p className="text-xs text-muted-foreground max-w-md text-center">
                  Automações enviam emails automaticamente quando eventos ocorrem: compra, abandono de carrinho, cadastro, etc.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {automations.map((rule: any) => (
                <Card key={rule.id} className="border-border/50">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-foreground truncate">{rule.name}</p>
                        <Badge variant={rule.is_active ? 'default' : 'outline'}>{rule.is_active ? 'Ativa' : 'Inativa'}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><Zap className="w-3 h-3" />{triggerLabels[rule.trigger_event] || rule.trigger_event}</span>
                        {rule.delay_minutes > 0 && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{rule.delay_minutes}min delay</span>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CampaignDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        campaign={editingCampaign}
        contactEmails={contacts || []}
        onSave={async (data) => { await saveCampaign.mutateAsync(data); }}
        onSend={async (data) => { await sendCampaign.mutateAsync(data); }}
      />
    </div>
  );
}
