import { useState, useEffect } from "react";
import { ArrowLeft, Lock, Crown, Mic, Eye, Brain, ShieldCheck, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { isOwnerEmail } from "@/lib/neural/orion-consciousness";
import { useQuery } from "@tanstack/react-query";
import { NeuralVision } from "@/components/dashboard/neural/NeuralVision";
import { AlienCoreBackground } from "@/components/ui/AlienCoreBackground";
import { motion } from "framer-motion";
import logoElp from "@/assets/logo-elp.webp";

function NotClientGate() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="glass-card max-w-lg w-full p-8 text-center space-y-6 border border-destructive/20"
      >
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldCheck className="h-8 w-8 text-destructive" />
        </div>

        <div>
          <h2 className="text-2xl font-serif text-foreground mb-2">
            Área Exclusiva para Clientes
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Esta página é restrita a clientes cadastrados. Se você é advogado, produtor ou afiliado, acesse seu painel dedicado.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Ir para Meu Painel
          </Button>
          <Button variant="ghost" onClick={() => navigate("/")}>
            Voltar ao Início
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function SubscriptionGate() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="glass-card max-w-lg w-full p-8 text-center space-y-6 relative overflow-hidden"
      >
        {/* Shimmer effect */}
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_3s_infinite] bg-gradient-to-r from-transparent via-primary/5 to-transparent" />

        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center relative">
          <Lock className="h-8 w-8 text-primary" />
          <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping opacity-20" />
        </div>

        <div>
          <h2 className="text-2xl font-serif text-foreground mb-2">
            Acesso Exclusivo para Assinantes
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            O assistente Orion com comando de voz e visão computacional é um recurso premium.
            Assine um plano para desbloquear todo o potencial da IA.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Mic, label: "Comando de Voz", desc: "Fale com o Orion" },
            { icon: Eye, label: "Visão IA", desc: "Análise visual" },
            { icon: Brain, label: "IA Avançada", desc: "Raciocínio profundo" },
          ].map(({ icon: Icon, label, desc }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
              className="p-3 rounded-xl bg-muted/30 border border-border/30 hover:border-primary/30 transition-all duration-300 group"
            >
              <Icon className="h-5 w-5 text-primary mx-auto mb-1.5 group-hover:scale-110 transition-transform" />
              <p className="text-[10px] font-medium text-foreground">{label}</p>
              <p className="text-[9px] text-muted-foreground">{desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button className="btn-gold shimmer" onClick={() => navigate("/dashboard/plano")}>
            <Crown className="h-4 w-4 mr-2" />
            Ver Planos
          </Button>
          <Button variant="outline" onClick={() => navigate("/cadastro")}>
            Criar Conta Grátis
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function LoginGate() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-card max-w-lg w-full p-8 text-center space-y-6"
      >
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Lock className="h-8 w-8 text-primary" />
        </div>

        <div>
          <h2 className="text-2xl font-serif text-foreground mb-2">
            Faça Login para Continuar
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Você precisa estar logado como cliente para acessar o assistente Orion IA.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button className="btn-gold" onClick={() => navigate("/auth")}>
            Entrar
          </Button>
          <Button variant="outline" onClick={() => navigate("/cadastro")}>
            Criar Conta de Cliente
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export default function ConsultaIA() {
  const { user } = useAuth();

  // Check user role
  // Parallel gate: fetch role + plan in a single query call
  const { data: gateData, isLoading: gateLoading } = useQuery({
    queryKey: ["consulta-gate", user?.id],
    queryFn: async () => {
      const [roleRes, planRes] = await Promise.all([
        supabase.rpc("get_user_role", { _user_id: user!.id }),
        supabase.from("user_plans").select("plan_type").eq("user_id", user!.id).maybeSingle(),
      ]);
      return {
        role: roleRes.data?.role ?? null,
        plan_type: planRes.data?.plan_type ?? null,
      };
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const isLoading = gateLoading;
  const isOwner = isOwnerEmail(user?.email);
  const isClient = gateData?.role === "cliente" || gateData?.role === null;
  const isSubscriber = !!user && (isOwner || gateData?.plan_type === "professional" || gateData?.plan_type === "business" || gateData?.plan_type === "enterprise");

  // Determine gate content
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground tracking-widest animate-pulse">CARREGANDO ORION...</p>
          </div>
        </div>
      );
    }

    if (!user) return <LoginGate />;
    if (!isOwner && !isClient) return <NotClientGate />;
    if (!isSubscriber) return <SubscriptionGate />;

    return (
      <div className="flex-1 overflow-y-auto p-4">
        <NeuralVision skipWakeWord={true} />
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-background relative">
      <AlienCoreBackground />
      <SEO
        title="Orion IA — Assistente Neural com Voz e Visão | ELP® Green Technology"
        description="Converse com o Orion usando voz e visão computacional. Assistente com motor NeuroCore e Lumen7 Engine. By ELP® Green Technology."
        image="https://www.iasofthub.com/og-images/og-consulta.jpg"
        keywords="assistente IA, voz, visão computacional, NeuroCore, Lumen7, consulta"
      />

      {/* Top Bar */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-border/30 bg-card/30 backdrop-blur-xl flex-shrink-0 relative z-10"
      >
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary transition-colors" asChild>
            <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src={logoElp} alt="ORION" className="h-8 w-8 object-cover rounded-full ring-2 ring-primary/20" />
              <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
            </div>
            <div>
              <h1 className="text-sm font-serif text-foreground tracking-[0.1em]">ORION — ASSISTENTE IA</h1>
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-2.5 w-2.5 text-primary" />
                <p className="text-[9px] text-primary tracking-[0.2em]">COMANDO DE VOZ & VISÃO</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isSubscriber && (
            <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] backdrop-blur-sm">
              <Crown className="h-3 w-3 mr-1" />
              Premium
            </Badge>
          )}
          {user && isClient && (
            <Badge variant="outline" className="text-[9px] border-border/50 text-muted-foreground">
              Cliente
            </Badge>
          )}
        </div>
      </motion.header>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0 relative z-10">
        {renderContent()}
      </div>
    </div>
  );
}
