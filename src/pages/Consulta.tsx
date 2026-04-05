import { MainLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Calendar, Clock, Video, Phone, MapPin, CheckCircle, LayoutDashboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

const areasAtuacao = [
  "Direito Civil",
  "Direito Trabalhista",
  "Direito Penal",
  "Direito de Família",
  "Direito Empresarial",
  "Direito Tributário",
  "Direito Previdenciário",
  "Direito do Consumidor",
  "Direito Imobiliário",
  "Outros",
];

const horarios = [
  "08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"
];

export default function Consulta() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    area: "",
    tipo: "video",
    data: "",
    horario: "",
    descricao: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: "Consulta Agendada!",
      description: "Você receberá um e-mail com os detalhes da sua consulta.",
    });
    
    setStep(3);
    setLoading(false);
  };

  return (
    <MainLayout hideFooterCta>
      {/* Hero */}
      <section className="py-16 bg-gradient-to-b from-secondary to-background">
        <div className="container text-center">
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">
            Consulta <span className="text-primary">Online</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg mb-6">
            Agende sua consulta jurídica online ou presencial com ORION IA
          </p>
          
          {/* Botão de acesso ao painel */}
          {user ? (
            <Button asChild className="btn-gold">
              <Link to="/dashboard">
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Acessar Meu Painel
              </Link>
            </Button>
          ) : (
            <div className="flex gap-3 justify-center">
              <Button asChild variant="outline" className="btn-outline-gold">
                <Link to="/auth">Entrar</Link>
              </Button>
              <Button asChild className="btn-gold">
                <Link to="/cadastro">Criar Conta</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="container max-w-4xl">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Info */}
            <div className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Video className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Videochamada</p>
                        <p className="text-sm text-muted-foreground">Google Meet ou Zoom</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Telefone</p>
                        <p className="text-sm text-muted-foreground">Ligação convencional</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Presencial</p>
                        <p className="text-sm text-muted-foreground">Porto Alegre, RS</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Valores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Consulta Online</span>
                      <span className="font-semibold">R$ 200</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Consulta Presencial</span>
                      <span className="font-semibold">R$ 300</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    *Duração aproximada de 1 hora
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Formulário */}
            <Card className="lg:col-span-2">
              {step === 3 ? (
                <CardContent className="pt-12 pb-12 text-center">
                  <CheckCircle className="h-16 w-16 mx-auto text-primary mb-4" />
                  <h3 className="font-serif text-2xl font-bold mb-2">Consulta Agendada!</h3>
                  <p className="text-muted-foreground mb-6">
                    Enviamos um e-mail para {form.email} com os detalhes da sua consulta.
                  </p>
                  <Button onClick={() => { setStep(1); setForm({ nome: "", email: "", telefone: "", area: "", tipo: "video", data: "", horario: "", descricao: "" }); }}>
                    Agendar Nova Consulta
                  </Button>
                </CardContent>
              ) : (
                <>
                  <CardHeader>
                    <CardTitle className="font-serif text-2xl">Agendar Consulta</CardTitle>
                    <CardDescription>
                      Preencha os dados para agendar sua consulta jurídica
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      {step === 1 && (
                        <>
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Nome completo</label>
                              <Input
                                placeholder="Seu nome"
                                value={form.nome}
                                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">E-mail</label>
                              <Input
                                type="email"
                                placeholder="seu@email.com"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                required
                              />
                            </div>
                          </div>
                          
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Telefone</label>
                              <Input
                                placeholder="(00) 00000-0000"
                                value={form.telefone}
                                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Área do Direito</label>
                              <Select value={form.area} onValueChange={(v) => setForm({ ...form, area: v })}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                  {areasAtuacao.map((area) => (
                                    <SelectItem key={area} value={area}>{area}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <Button type="button" onClick={() => setStep(2)} className="w-full">
                            Continuar
                          </Button>
                        </>
                      )}
                      
                      {step === 2 && (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Tipo de Consulta</label>
                            <div className="grid grid-cols-3 gap-4">
                              {[
                                { value: "video", icon: Video, label: "Vídeo" },
                                { value: "telefone", icon: Phone, label: "Telefone" },
                                { value: "presencial", icon: MapPin, label: "Presencial" },
                              ].map((tipo) => (
                                <button
                                  key={tipo.value}
                                  type="button"
                                  className={`p-4 rounded-lg border-2 transition-colors ${
                                    form.tipo === tipo.value
                                      ? "border-primary bg-primary/10"
                                      : "border-border hover:border-primary/50"
                                  }`}
                                  onClick={() => setForm({ ...form, tipo: tipo.value })}
                                >
                                  <tipo.icon className="h-6 w-6 mx-auto mb-2" />
                                  <span className="text-sm">{tipo.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Data</label>
                              <Input
                                type="date"
                                value={form.data}
                                onChange={(e) => setForm({ ...form, data: e.target.value })}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Horário</label>
                              <Select value={form.horario} onValueChange={(v) => setForm({ ...form, horario: v })}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                  {horarios.map((h) => (
                                    <SelectItem key={h} value={h}>{h}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Descrição do caso (opcional)</label>
                            <Textarea
                              placeholder="Descreva brevemente sua situação..."
                              rows={4}
                              value={form.descricao}
                              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                            />
                          </div>
                          
                          <div className="flex gap-4">
                            <Button type="button" variant="outline" onClick={() => setStep(1)}>
                              Voltar
                            </Button>
                            <Button type="submit" className="flex-1" disabled={loading}>
                              {loading ? "Agendando..." : "Confirmar Agendamento"}
                            </Button>
                          </div>
                        </>
                      )}
                    </form>
                  </CardContent>
                </>
              )}
            </Card>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
