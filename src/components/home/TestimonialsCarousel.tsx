import { useState, useEffect } from "react";
import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface Avaliacao {
  id: string;
  nome: string;
  foto_url: string | null;
  nota: number;
  depoimento: string;
}

export function TestimonialsCarousel() {
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("avaliacoes")
        .select("id, nome, foto_url, nota, depoimento")
        .eq("aprovado", true)
        .order("created_at", { ascending: false })
        .limit(10);
      setAvaliacoes(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  useEffect(() => {
    if (avaliacoes.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % avaliacoes.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [avaliacoes.length]);

  if (loading || avaliacoes.length === 0) return null;

  const prev = () => setCurrent((c) => (c - 1 + avaliacoes.length) % avaliacoes.length);
  const next = () => setCurrent((c) => (c + 1) % avaliacoes.length);
  const av = avaliacoes[current];

  return (
    <section className="py-16 sm:py-24 bg-secondary relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div className="container px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-14">
          <ScrollReveal direction="fade">
            <p className="text-primary uppercase tracking-[0.3em] text-xs font-medium mb-4 sm:mb-6">
              Depoimentos
            </p>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.1}>
            <h2 className="text-3xl md:text-4xl font-serif text-foreground tracking-wide mb-4">
              O que nossos clientes dizem
            </h2>
          </ScrollReveal>
          <ScrollReveal direction="fade" delay={0.2}>
            <div className="gold-line w-20 mx-auto" />
          </ScrollReveal>
        </div>

        <ScrollReveal direction="up" delay={0.3}>
          <div className="max-w-3xl mx-auto relative">
            {/* Quote card */}
            <div className="bg-card border border-border p-8 sm:p-12 text-center relative min-h-[260px] flex flex-col items-center justify-center">
              <Quote className="h-8 w-8 text-primary/20 mb-6" />

              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed italic mb-8 max-w-2xl transition-opacity duration-500">
                "{av.depoimento}"
              </p>

              {/* Avatar + name */}
              <div className="flex items-center gap-3">
                <img
                  src={av.foto_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(av.nome)}&background=random&color=fff&size=80&bold=true&format=svg`}
                  alt={av.nome}
                  className="h-10 w-10 rounded-full object-cover border border-primary/30"
                />
                <div className="text-left">
                  <p className="font-medium text-foreground text-sm">{av.nome}</p>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3 w-3 ${
                          s <= av.nota ? "text-primary fill-primary" : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Dots */}
              {avaliacoes.length > 1 && (
                <div className="flex gap-2 mt-8">
                  {avaliacoes.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrent(i)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === current
                          ? "w-6 bg-primary"
                          : "w-1.5 bg-muted-foreground/20 hover:bg-muted-foreground/40"
                      }`}
                      aria-label={`Depoimento ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Nav arrows */}
            {avaliacoes.length > 1 && (
              <>
                <button
                  onClick={prev}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 sm:-translate-x-12 h-10 w-10 border border-border bg-card flex items-center justify-center hover:border-primary/40 transition-colors active:scale-95"
                  aria-label="Anterior"
                >
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                </button>
                <button
                  onClick={next}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 sm:translate-x-12 h-10 w-10 border border-border bg-card flex items-center justify-center hover:border-primary/40 transition-colors active:scale-95"
                  aria-label="Próximo"
                >
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </>
            )}
          </div>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.4}>
          <div className="text-center mt-10">
            <Button className="btn-outline-gold" asChild>
              <Link to="/depoimentos">
                Ver todos os depoimentos
                <Star className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
