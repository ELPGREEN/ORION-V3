import { MainLayout } from "@/components/layout";
import { ParticleBackground } from "@/components/ui/ParticleBackground";
import { TechLine, GlassCard, TechGridOverlay, TechSectionLabel, HeroGeometry } from "@/components/ui/TechElements";
import { SEO } from "@/components/SEO";
import { Scale, Globe, Users, Award, BookOpen, Shield, ArrowRight, Heart, GraduationCap, Briefcase, Building2, Gavel } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/LanguageContext";
import { PageHero } from "@/components/ui/PageHero";
import bgCarbonCard from "@/assets/bg-carbon-card.jpg";
export default function Sobre() {
  const {
    t
  } = useTranslation();
  const ap = t.aboutPage;
  const formacaoAcademica = [{
    instituicao: ap.education.univates.institution,
    curso: ap.education.univates.course,
    descricao: ap.education.univates.description
  }, {
    instituicao: ap.education.pucrs.institution,
    curso: ap.education.pucrs.course,
    descricao: ap.education.pucrs.description
  }, {
    instituicao: ap.education.harvard.institution,
    curso: ap.education.harvard.course,
    descricao: ap.education.harvard.description
  }, {
    instituicao: ap.education.berkeley.institution,
    curso: ap.education.berkeley.course,
    descricao: ap.education.berkeley.description
  }];
  const experienciaProfissional = [{
    icon: Building2,
    cargo: ap.experience.defensoria.title,
    descricao: ap.experience.defensoria.description
  }, {
    icon: Gavel,
    cargo: ap.experience.tribunal.title,
    descricao: ap.experience.tribunal.description
  }, {
    icon: Globe,
    cargo: ap.experience.elp.title,
    descricao: ap.experience.elp.description
  }, {
    icon: Briefcase,
    cargo: ap.experience.miami.title,
    descricao: ap.experience.miami.description
  }];
  const areasProBono = [ap.proBono.areas.humanRights, ap.proBono.areas.vulnerability, ap.proBono.areas.homeless, ap.proBono.areas.violence, ap.proBono.areas.review, ap.proBono.areas.collective];
  return <MainLayout>
      <SEO 
        title="Sobre | ORION IA by ELP® Green Technology" 
        description="Conheça a ORION — plataforma de IA empresarial criada por Ericson Piccoli, fundador da ELP® Green Technology (CNPJ 42.501.190/0001-70). NeuroCore, Lumen7 e AquaMonkey®."
        image="https://www.iasofthub.com/og-images/og-sobre.jpg"
        keywords="ELP Green Technology, Ericson Piccoli, ORION IA, sobre, empresa, fundador"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "ELP® Green Technology",
          "legalName": "ELP Green Technology S.R.L.",
          "description": "Empresa de tecnologia especializada em IA empresarial, LegalTech e soluções sustentáveis.",
          "url": "https://www.iasofthub.com",
          "email": "info@iasofthub.com",
          "taxID": "42.501.190/0001-70",
          "founder": {
            "@type": "Person",
            "name": "Ericson Piccoli",
            "jobTitle": "General Director & Founder, Systems Engineer"
          },
          "brand": [
            { "@type": "Brand", "name": "ORION IA" },
            { "@type": "Brand", "name": "Lumen7 Engine" },
            { "@type": "Brand", "name": "AquaMonkey®" },
            { "@type": "Brand", "name": "NeuroCore" }
          ]
        }}
      />
      <PageHero
        label={ap.heroSubtitle}
        labelIcon={<Scale className="h-4 w-4" />}
        title={ap.heroTitle}
        subtitle={ap.heroDescription}
        align="left"
        minHeight="60vh"
      />

      {/* Divisor dourado */}
      <TechLine />

      {/* Apresentação Principal com Foto - Layout em 2 colunas */}
      <section className="py-16 sm:py-24 bg-background relative overflow-hidden">
        <ParticleBackground />
        <TechGridOverlay variant="dots" />
        <div className="container px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            {/* Coluna Esquerda - Foto */}
            <div className="animate-slide-right delay-100">
              <div className="relative">
                <div className="absolute -top-3 -left-3 w-full h-full border border-primary/30" />
                <div className="relative bg-card border border-border">
                  <div className="aspect-square overflow-hidden">
                    <img alt="Mr. Ericson Piccoli - General Director & Founder, ELP Green Technology" loading="lazy" decoding="async" className="w-full h-full object-cover object-[center_50%]" src="/lovable-uploads/98b93bd2-01cc-4086-b53a-83853e58b171.jpg" />
                  </div>
                  <div className="p-6">
                    <h2 className="text-xl font-serif text-foreground tracking-wide mb-1">
                      {ap.heroTitle}
                    </h2>
                    <p className="text-primary text-xs tracking-[0.15em] uppercase">
                      {ap.heroSubtitle}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna Direita - Texto */}
            <div className="space-y-6 animate-slide-left delay-200">
              <h3 className="text-3xl md:text-4xl font-serif text-foreground">
                {ap.title.split(' ')[0]} <span className="text-gold-shine">{ap.title.split(' ').slice(1).join(' ')}</span>
              </h3>
              
              <div className="gold-line w-20" />
              
              <div className="space-y-5 text-muted-foreground leading-relaxed text-justify">
                <p>{ap.intro1}</p>
                <p>{ap.intro2}</p>
                <p>{ap.intro3}</p>
              </div>

              <Button asChild className="btn-gold mt-6">
                <a href="https://wa.me/5554999700575" target="_blank" rel="noopener noreferrer">
                  {ap.whatsappButton}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          {/* Stats Grid - 4 colunas preenchendo a largura */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16">
            {[{
            icon: Scale,
            label: ap.stats.yearsExp,
            value: "8+"
          }, {
            icon: Globe,
            label: ap.stats.countries,
            value: "8+"
          }, {
            icon: Award,
            label: ap.stats.harvardBerkeley,
            value: "✓"
          }, {
            icon: Heart,
            label: ap.stats.proBono,
            value: "✓"
          }].map((stat, index) => <div key={stat.label} className="group text-center p-6 glass-card-subtle animate-fade-in-up" style={{
            animationDelay: `${(index + 2) * 100}ms`
          }}>
                <div className="w-12 h-12 mx-auto mb-4 border border-primary/20 flex items-center justify-center group-hover:border-primary/40 transition-colors duration-500">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <p className="text-3xl font-serif text-gold-shine mb-2">{stat.value}</p>
                <p className="text-xs text-muted-foreground tracking-[0.15em] uppercase">{stat.label}</p>
              </div>)}
          </div>
        </div>
      </section>

      <TechLine />

      {/* Formação Acadêmica */}
      <section className="py-12 sm:py-16 bg-secondary relative overflow-hidden">
        <TechGridOverlay />
        <div className="container px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-primary uppercase tracking-[0.3em] text-xs font-medium mb-6 animate-fade-in">
              {ap.education.sectionTitle}
            </p>
            <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4">
              {ap.education.title}
            </h2>
            <div className="gold-line w-16 mx-auto mb-6" />
          </div>
          
          <div className="space-y-6">
            {formacaoAcademica.map((item, index) => <div key={item.instituicao} className="group glass-card p-8 animate-fade-in-up" style={{
            animationDelay: `${(index + 1) * 100}ms`
          }}>
                <div className="flex items-start gap-6">
                  <div className="h-14 w-14 border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover:border-primary/40 group-hover:bg-primary/5 transition-all duration-500">
                    <GraduationCap className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-serif text-foreground mb-2 tracking-wide">
                      {item.instituicao}
                    </h3>
                    <p className="text-primary text-sm font-medium mb-3">
                      {item.curso}
                    </p>
                    <p className="text-muted-foreground text-sm leading-relaxed text-justify">
                      {item.descricao}
                    </p>
                  </div>
                </div>
              </div>)}
          </div>
        </div>
      </section>

      {/* Experiência Profissional */}
      <section className="py-16 sm:py-24 bg-background relative overflow-hidden">
        <ParticleBackground />
        <div className="container px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-primary uppercase tracking-[0.3em] text-xs font-medium mb-6 animate-fade-in">
              {ap.experience.sectionTitle}
            </p>
            <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4">
              {ap.experience.title}
            </h2>
            <div className="gold-line w-16 mx-auto mb-6" />
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {experienciaProfissional.map((item, index) => <div key={item.cargo} className="group glass-card p-8 animate-fade-in-up" style={{
            animationDelay: `${(index + 1) * 100}ms`
          }}>
                <div className="h-14 w-14 border border-primary/20 flex items-center justify-center mb-6 group-hover:border-primary/40 group-hover:bg-primary/5 transition-all duration-500">
                  <item.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-serif text-foreground mb-4 tracking-wide">
                  {item.cargo}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed text-justify">
                  {item.descricao}
                </p>
              </div>)}
          </div>

          {/* Texto adicional sobre experiência internacional */}
          <div className="mt-16 max-w-4xl mx-auto">
            <div className="glass-card p-8 animate-fade-in">
              <h3 className="text-xl font-serif text-foreground mb-4 flex items-center gap-3">
                <Globe className="h-6 w-6 text-primary" />
                {ap.experience.additionalTitle}
              </h3>
              <div className="space-y-4 text-muted-foreground leading-relaxed text-justify">
                <p>
                  {ap.experience.additionalText1} <strong className="text-foreground">{ap.experience.europeanCities}</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Advocacia Pro Bono */}
      <section className="py-16 sm:py-24 bg-secondary">
        <div className="container px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="animate-slide-right">
              <p className="text-primary uppercase tracking-[0.3em] text-xs font-medium mb-6">
                {ap.proBono.sectionTitle}
              </p>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-6">
                {ap.proBono.title.split(' ')[0]} <span className="text-gold-shine">{ap.proBono.title.split(' ').slice(1).join(' ')}</span>
              </h2>
              <div className="gold-line w-20 mb-8" />
              <p className="text-muted-foreground leading-relaxed mb-6 text-justify">
                {ap.proBono.description1}
              </p>
              <p className="text-muted-foreground leading-relaxed text-justify">
                {ap.proBono.description2}
              </p>
            </div>

            <div className="animate-slide-left delay-200">
              <div className="glass-card p-8">
                <h3 className="text-lg font-serif text-foreground mb-6 flex items-center gap-3">
                  <Heart className="h-5 w-5 text-primary" />
                  {ap.proBono.areasTitle}
                </h3>
                <ul className="space-y-4">
                  {areasProBono.map((area, index) => <li key={index} className="flex items-start gap-3 text-muted-foreground text-sm animate-fade-in" style={{
                  animationDelay: `${(index + 1) * 100}ms`
                }}>
                      <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      {area}
                    </li>)}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Atuação Social */}
      <section className="py-16 sm:py-24 bg-background relative overflow-hidden">
        <ParticleBackground />
        <div className="container px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-primary uppercase tracking-[0.3em] text-xs font-medium mb-6 animate-fade-in">
              {ap.social.sectionTitle}
            </p>
            <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-6">
              {ap.social.title}
            </h2>
            <div className="gold-line w-16 mx-auto mb-8" />
            
            <div className="grid md:grid-cols-3 gap-8 mt-12">
              {[{
              icon: Users,
              titulo: ap.social.jci.title,
              descricao: ap.social.jci.description
            }, {
              icon: Heart,
              titulo: ap.social.leo.title,
              descricao: ap.social.leo.description
            }, {
              icon: Gavel,
              titulo: ap.social.cumprimento.title,
              descricao: ap.social.cumprimento.description
            }].map((item, index) => <div key={item.titulo} className="group glass-card p-8 animate-fade-in-up" style={{
              animationDelay: `${(index + 1) * 100}ms`
            }}>
                  <div className="h-14 w-14 border border-primary/20 flex items-center justify-center mb-6 mx-auto group-hover:border-primary/40 group-hover:bg-primary/5 transition-all duration-500">
                    <item.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-serif text-foreground mb-4 tracking-wide">
                    {item.titulo}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed text-center">
                    {item.descricao}
                  </p>
                </div>)}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 bg-muted relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-primary" style={{
          transform: 'translate(-50%, -50%) rotate(45deg)'
        }} />
        </div>
        
        <div className="container relative px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center">
            <div className="gold-line w-16 mx-auto mb-8" />
            <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-6 animate-fade-in">
              {ap.cta.title}
            </h2>
            <p className="text-muted-foreground mb-10 animate-fade-in delay-100 text-justify">
              {ap.cta.description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up delay-200">
              <Button asChild className="btn-gold px-10 shimmer">
                <a href="https://wa.me/5554999700575" target="_blank" rel="noopener noreferrer">
                  {ap.cta.whatsapp}
                </a>
              </Button>
              <Button asChild variant="outline" className="btn-outline-gold px-10">
                <Link to="/areas">
                  {ap.cta.viewAreas}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>;
}