import { useState } from "react";
import { PageHero } from "@/components/ui/PageHero";
import { ParticleBackground } from "@/components/ui/ParticleBackground";
import { MainLayout } from "@/components/layout/MainLayout";
import { TechLine, GlassCard, TechGridOverlay, TechSectionLabel } from "@/components/ui/TechElements";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Heart,
  Scale,
  Users,
  CheckCircle,
  FileText,
  Send,
  Shield,
  Globe,
} from "lucide-react";

export default function ProBono() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    situacao_financeira: "",
    descricao_caso: "",
  });

  const criteria = [
    {
      icon: Users,
      title: t.proBono.criteria.vulnerability.title,
      description: t.proBono.criteria.vulnerability.desc,
    },
    {
      icon: Scale,
      title: t.proBono.criteria.merit.title,
      description: t.proBono.criteria.merit.desc,
    },
    {
      icon: Shield,
      title: t.proBono.criteria.humanRights.title,
      description: t.proBono.criteria.humanRights.desc,
    },
    {
      icon: Globe,
      title: t.proBono.criteria.impact.title,
      description: t.proBono.criteria.impact.desc,
    },
  ];

  const impactStats = [
    { number: "50+", label: t.proBono.familiesHelped },
    { number: "100%", label: t.proBono.free },
    { number: "5", label: t.proBono.yearsProject },
  ];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Save to database
      const { data: inserted, error } = await supabase.from("pro_bono_requests").insert({
        nome: form.nome,
        email: form.email,
        telefone: form.telefone || null,
        situacao_financeira: form.situacao_financeira,
        descricao_caso: form.descricao_caso,
      }).select("id").single();

      if (error) throw error;

      // Notification is created server-side by send-email-notification edge function

      // 3. Send email notification
      try {
        await supabase.functions.invoke("notifications", {
          body: {
            type: "pro_bono_request",
            to: "info@elpgreen.com",
            data: {
              nome: form.nome,
              email: form.email,
              telefone: form.telefone,
              situacao: form.situacao_financeira,
              descricao: form.descricao_caso,
            },
          },
        });
      } catch (emailErr) {
        // Non-blocking - continue even if email fails
      }

      setSubmitted(true);
      toast({
        title: t.proBono.requestReceived,
        description: t.proBono.requestReceivedMessage,
      });
    } catch (error) {
      toast({
        title: t.common.error,
        description: t.common.error,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout hideFooterCta>
      <SEO 
        title="ORION Social | Programa de Acesso Gratuito" 
        description="Programa ORION Social — acesso gratuito à plataforma para pessoas e organizações em situação de vulnerabilidade."
        image="https://www.elpgreen.com/og-images/og-pro-bono.jpg"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "ORION Social - Acesso Gratuito",
          "url": "https://www.elpgreen.com/pro-bono",
          "description": "Programa de acesso gratuito à plataforma ORION para organizações e pessoas em vulnerabilidade",
          "isPartOf": { "@type": "WebSite", "name": "ORION IA by ELP Green Technology", "url": "https://www.elpgreen.com" }
        }}
      />
      <PageHero
        label={t.proBono.sectionTitle}
        labelIcon={<Heart className="h-4 w-4" />}
        title={t.proBono.heroTitle}
        highlightLastWord
        subtitle={t.proBono.heroDescription}
        minHeight="55vh"
      >
        <div className="grid grid-cols-3 gap-4 sm:gap-8 mt-10 max-w-lg mx-auto">
          {impactStats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl sm:text-3xl font-serif text-primary">{stat.number}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </PageHero>

      {/* Criteria Section */}
      <section className="py-16 sm:py-20 bg-background relative overflow-hidden">
        <ParticleBackground />
        <TechGridOverlay variant="dots" />
        <div className="container px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-serif text-foreground mb-4">
              {t.proBono.criteriaTitle.split(' ').slice(0, -1).join(' ')} <span className="text-primary">{t.proBono.criteriaTitle.split(' ').slice(-1)}</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-center">
              {t.proBono.criteriaDescription}
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {criteria.map((item) => (
              <div
                key={item.title}
                className="bg-card border border-border p-6 text-center hover:border-primary/30 transition-colors"
              >
                <div className="h-12 w-12 bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 mx-auto">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-serif text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground text-center">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <TechLine />

      {/* Form Section */}
      <section className="py-16 sm:py-20 bg-secondary relative overflow-hidden">
        <TechGridOverlay />
        <div className="container max-w-2xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif text-foreground mb-4">
              {t.proBono.requestTitle.split(' ').slice(0, -1).join(' ')} <span className="text-primary">{t.proBono.requestTitle.split(' ').slice(-1)}</span>
            </h2>
            <p className="text-muted-foreground">
              {t.proBono.requestDescription}
            </p>
          </div>

          {submitted ? (
            <div className="bg-card border border-primary/30 p-12 text-center">
              <CheckCircle className="h-16 w-16 text-primary mx-auto mb-6" />
              <h3 className="text-2xl font-serif text-foreground mb-4">
                {t.proBono.requestReceived}
              </h3>
              <p className="text-muted-foreground mb-6">
                {t.proBono.requestReceivedMessage}
              </p>
              <Button onClick={() => setSubmitted(false)} className="btn-outline-gold">
                {t.proBono.sendNewRequest}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-card border border-border p-8 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nome">{t.proBono.form.fullName} *</Label>
                  <Input
                    id="nome"
                    name="nome"
                    value={form.nome}
                    onChange={handleChange}
                    required
                    placeholder={t.proBono.form.fullName}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t.proBono.form.email} *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">{t.proBono.form.phone}</Label>
                <Input
                  id="telefone"
                  name="telefone"
                  value={form.telefone}
                  onChange={handleChange}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="situacao_financeira">
                  {t.proBono.form.financialSituation} * 
                  <span className="text-xs text-muted-foreground ml-2">
                    ({t.proBono.form.financialSituationHint})
                  </span>
                </Label>
                <Textarea
                  id="situacao_financeira"
                  name="situacao_financeira"
                  value={form.situacao_financeira}
                  onChange={handleChange}
                  required
                  rows={3}
                  placeholder={t.proBono.form.financialSituationPlaceholder}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao_caso">
                  {t.proBono.form.caseDescription} *
                  <span className="text-xs text-muted-foreground ml-2">
                    ({t.proBono.form.caseDescriptionHint})
                  </span>
                </Label>
                <Textarea
                  id="descricao_caso"
                  name="descricao_caso"
                  value={form.descricao_caso}
                  onChange={handleChange}
                  required
                  rows={5}
                  placeholder={t.proBono.form.caseDescriptionPlaceholder}
                />
              </div>

              <div className="bg-muted/50 border border-border p-4 text-xs text-muted-foreground">
                <FileText className="h-4 w-4 inline mr-2" />
                {t.proBono.documentsNote}
              </div>

              <Button 
                type="submit" 
                className="w-full btn-gold" 
                disabled={loading}
              >
                {loading ? (
                  t.common.sending
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {t.proBono.sendRequest}
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </section>

      {/* Disclaimer */}
      <section className="py-12 bg-background border-t border-border">
        <div className="container max-w-3xl text-center">
          <p className="text-xs text-muted-foreground">
            {t.proBono.disclaimer}
          </p>
        </div>
      </section>
    </MainLayout>
  );
}
