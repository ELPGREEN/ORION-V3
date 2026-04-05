import { } from 'react';
import { SEO } from '@/components/SEO';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { HelpCircle, Factory, Flame, Recycle, Truck, FileText, Mail, Phone, Clock, DollarSign, Settings, Shield, Leaf, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';

import { useParallax } from '@/hooks/useParallax';

// Lazy load 3D components


// FAQ Categories
const faqCategories = [
  {
    id: 'tire-recycling',
    icon: Recycle,
    color: 'from-primary to-secondary',
    titleKey: 'faq.categories.tireRecycling.title',
    defaultTitle: 'Reciclagem de Pneus',
    questions: [
      {
        questionKey: 'faq.tireRecycling.q1',
        defaultQuestion: 'Qual a capacidade de processamento de uma planta de reciclagem de pneus?',
        answerKey: 'faq.tireRecycling.a1',
        defaultAnswer: 'Nossas plantas de reciclagem de pneus têm capacidade de 1 a 10 toneladas por hora, dependendo do modelo escolhido. Operando 24/7, uma planta média pode processar até 30.000 toneladas de pneus por ano.'
      },
      {
        questionKey: 'faq.tireRecycling.q2',
        defaultQuestion: 'Quais são os produtos finais da reciclagem de pneus?',
        answerKey: 'faq.tireRecycling.a2',
        defaultAnswer: 'Os principais produtos são: borracha granulada (60-65%), aço de alta qualidade (25-30%) e fibras têxteis (10-15%). A borracha pode ser vendida para fabricação de pisos, asfalto modificado e novos produtos de borracha.'
      },
      {
        questionKey: 'faq.tireRecycling.q3',
        defaultQuestion: 'Quanto tempo leva para instalar uma planta completa?',
        answerKey: 'faq.tireRecycling.a3',
        defaultAnswer: 'A instalação completa leva de 3 a 6 meses, incluindo preparação do terreno, montagem dos equipamentos, testes e treinamento da equipe. Oferecemos suporte técnico durante todo o processo.'
      },
      {
        questionKey: 'faq.tireRecycling.q4',
        defaultQuestion: 'Qual o investimento inicial necessário?',
        answerKey: 'faq.tireRecycling.a4',
        defaultAnswer: 'O investimento varia de $2 milhões a $10 milhões dependendo da capacidade e configuração. Oferecemos diferentes modelos de financiamento e parcerias para viabilizar seu projeto.'
      },
      {
        questionKey: 'faq.tireRecycling.q5',
        defaultQuestion: 'Quais certificações e licenças são necessárias?',
        answerKey: 'faq.tireRecycling.a5',
        defaultAnswer: 'Nossos equipamentos possuem certificação CE e ISO. Auxiliamos na obtenção de licenças ambientais locais e oferecemos documentação completa para aprovação regulatória.'
      }
    ]
  },
  {
    id: 'pyrolysis',
    icon: Flame,
    color: 'from-secondary to-primary',
    titleKey: 'faq.categories.pyrolysis.title',
    defaultTitle: 'Pirólise',
    questions: [
      {
        questionKey: 'faq.pyrolysis.q1',
        defaultQuestion: 'O que é pirólise e como funciona?',
        answerKey: 'faq.pyrolysis.a1',
        defaultAnswer: 'Pirólise é um processo termoquímico que decompõe materiais orgânicos em ausência de oxigênio a temperaturas de 400-600°C. Transforma pneus em óleo de pirólise, negro de fumo e aço recuperado.'
      },
      {
        questionKey: 'faq.pyrolysis.q2',
        defaultQuestion: 'Qual o rendimento de uma planta de pirólise?',
        answerKey: 'faq.pyrolysis.a2',
        defaultAnswer: 'De cada 10 toneladas de pneus, obtemos aproximadamente: 4-4,5 toneladas de óleo, 3-3,5 toneladas de negro de fumo, 1,5 toneladas de aço e 1 tonelada de gás (usado como combustível).'
      },
      {
        questionKey: 'faq.pyrolysis.q3',
        defaultQuestion: 'O processo de pirólise é seguro e ambientalmente correto?',
        answerKey: 'faq.pyrolysis.a3',
        defaultAnswer: 'Sim, nossas plantas utilizam sistemas de controle de emissões avançados e operam em circuito fechado. O gás produzido é reutilizado como combustível, tornando o processo altamente eficiente e sustentável.'
      },
      {
        questionKey: 'faq.pyrolysis.q4',
        defaultQuestion: 'Para que serve o óleo de pirólise?',
        answerKey: 'faq.pyrolysis.a4',
        defaultAnswer: 'O óleo de pirólise pode ser usado como combustível industrial, refinado para diesel ou vendido para indústrias químicas. Tem alto poder calorífico e valor de mercado significativo.'
      },
      {
        questionKey: 'faq.pyrolysis.q5',
        defaultQuestion: 'Qual a vida útil de uma planta de pirólise?',
        answerKey: 'faq.pyrolysis.a5',
        defaultAnswer: 'Com manutenção adequada, nossas plantas têm vida útil de 15-20 anos. Oferecemos contratos de manutenção preventiva e peças de reposição para garantir operação contínua.'
      }
    ]
  },
  {
    id: 'otr',
    icon: Truck,
    color: 'from-primary to-secondary',
    titleKey: 'faq.categories.otr.title',
    defaultTitle: 'Pneus OTR (Gigantes)',
    questions: [
      {
        questionKey: 'faq.otr.q1',
        defaultQuestion: 'O que são pneus OTR e de onde vêm?',
        answerKey: 'faq.otr.a1',
        defaultAnswer: 'OTR significa "Off-The-Road" - são pneus gigantes usados em mineração, portos, agricultura e construção. Podem pesar até 4,5 toneladas e ter diâmetro de até 4,5 metros.'
      },
      {
        questionKey: 'faq.otr.q2',
        defaultQuestion: 'Por que os pneus OTR requerem equipamentos especiais?',
        answerKey: 'faq.otr.a2',
        defaultAnswer: 'Devido ao tamanho e peso extremos, pneus OTR não podem ser processados em trituradores convencionais. Nossa linha OTR foi desenvolvida especificamente para cortar, separar e processar esses pneus gigantes.'
      },
      {
        questionKey: 'faq.otr.q3',
        defaultQuestion: 'Qual a capacidade de processamento da linha OTR?',
        answerKey: 'faq.otr.a3',
        defaultAnswer: 'Nossa linha OTR completa processa de 10 a 20 toneladas por hora, equivalente a 3-5 pneus gigantes de mineração por hora, operando 24/7 com apenas 2-3 operadores por turno.'
      },
      {
        questionKey: 'faq.otr.q4',
        defaultQuestion: 'Qual o valor dos produtos reciclados de pneus OTR?',
        answerKey: 'faq.otr.a4',
        defaultAnswer: 'Os pneus OTR contêm borracha e aço de alta qualidade. Os blocos de borracha são vendidos a $0,35/kg, o aço a $0,55/kg e as fibras a $0,20/kg, gerando excelente retorno sobre investimento.'
      },
      {
        questionKey: 'faq.otr.q5',
        defaultQuestion: 'Vocês oferecem treinamento para operação da linha OTR?',
        answerKey: 'faq.otr.a5',
        defaultAnswer: 'Sim, oferecemos treinamento completo de 2-4 semanas para sua equipe, incluindo operação, manutenção preventiva e segurança. Também disponibilizamos suporte técnico remoto 24/7.'
      }
    ]
  },
  {
    id: 'quotation',
    icon: FileText,
    color: 'from-primary/80 to-secondary/80',
    titleKey: 'faq.categories.quotation.title',
    defaultTitle: 'Processo de Cotação',
    questions: [
      {
        questionKey: 'faq.quotation.q1',
        defaultQuestion: 'Como solicitar uma cotação?',
        answerKey: 'faq.quotation.a1',
        defaultAnswer: 'Você pode solicitar cotação através do nosso site, preenchendo o formulário na página de cada planta, ou entrando em contato direto por email ou telefone. Responderemos em até 48 horas úteis.'
      },
      {
        questionKey: 'faq.quotation.q2',
        defaultQuestion: 'Quais informações são necessárias para cotação?',
        answerKey: 'faq.quotation.a2',
        defaultAnswer: 'Precisamos saber: tipo de material a processar, capacidade desejada (ton/hora ou ton/dia), localização do projeto, infraestrutura disponível (energia, água, espaço) e prazo de implementação.'
      },
      {
        questionKey: 'faq.quotation.q3',
        defaultQuestion: 'Em quanto tempo recebo a proposta comercial?',
        answerKey: 'faq.quotation.a3',
        defaultAnswer: 'Após análise inicial, enviamos proposta preliminar em 5-7 dias úteis. Proposta técnica detalhada é fornecida após visita técnica ou análise aprofundada do projeto, em até 15 dias.'
      },
      {
        questionKey: 'faq.quotation.q4',
        defaultQuestion: 'Vocês oferecem financiamento ou leasing?',
        answerKey: 'faq.quotation.a4',
        defaultAnswer: 'Sim, trabalhamos com parceiros financeiros para oferecer opções de financiamento, leasing e parcerias operacionais. Cada caso é analisado individualmente para encontrar a melhor solução.'
      },
      {
        questionKey: 'faq.quotation.q5',
        defaultQuestion: 'O que está incluído no preço dos equipamentos?',
        answerKey: 'faq.quotation.a5',
        defaultAnswer: 'Nossos preços incluem: equipamentos completos, documentação técnica, treinamento inicial, supervisão de instalação e garantia de 12-24 meses. Frete e instalação são cotados separadamente conforme localização.'
      },
      {
        questionKey: 'faq.quotation.q6',
        defaultQuestion: 'Vocês fazem visitas técnicas antes da venda?',
        answerKey: 'faq.quotation.a6',
        defaultAnswer: 'Sim, para projetos de grande porte, realizamos visitas técnicas ao local de instalação sem custo. Também convidamos clientes para visitar nossas instalações e ver os equipamentos em operação.'
      }
    ]
  }
];

// Contact Methods with translation keys
const getContactMethods = (t: (key: string) => string) => [
  {
    icon: Mail,
    title: t('faq.contactMethods.email'),
    value: 'info@iasofthub.com',
    action: 'mailto:info@iasofthub.com'
  },
  {
    icon: Phone,
    title: t('faq.contactMethods.phone'),
    value: '+39 350 102 1359',
    action: 'tel:+393501021359'
  },
  {
    icon: Clock,
    title: t('faq.contactMethods.hours'),
    value: t('faq.contactMethods.hoursValue'),
    action: null
  }
];

export default function FAQ() {
  const { t } = useTranslation();
  const contactMethods = getContactMethods(t);
  const parallaxOffset = useParallax(0.3);

  return (
    <>
    <SEO title="FAQ | ELP Green Technology" description="Perguntas frequentes sobre pirólise, reciclagem de pneus, economia circular e as soluções da ELP Green Technology." />
    <div className="min-h-screen bg-background/95 overflow-hidden">
      <Header />

      {/* Hero Section with Particles and Parallax */}
      <section className="relative min-h-[60vh] flex items-center pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220,40%,8%)] via-[hsl(220,35%,12%)] to-[hsl(220,40%,8%)]" />
        
        
        <div 
          className="container-wide relative z-10"
          style={{ transform: `translateY(${parallaxOffset}px)` }}
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-primary/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6 border border-primary/30"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-white text-sm font-medium">
                {t('faq.badge', 'Central de Ajuda')}
              </span>
            </motion.div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
              {t('faq.title', 'Perguntas Frequentes')}
            </h1>

            <p className="text-xl text-white/70 leading-relaxed max-w-xl mx-auto">
              {t('faq.description', 'Encontre respostas para as dúvidas mais comuns sobre nossas plantas de reciclagem e processos.')}
            </p>
          </motion.div>
        </div>
        
        {/* Gradient fade to content */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* FAQ Categories */}
      <section className="py-16 relative overflow-hidden">
        <div className="container-wide">
          <div className="space-y-8">
            {faqCategories.map((category, categoryIndex) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: categoryIndex * 0.1, duration: 0.6 }}
                viewport={{ once: true }}
              >
                <GlassCard className="p-6 md:p-8 bg-card/30">
                  <div className="flex items-center gap-4 mb-6">
                    <motion.div 
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className={`p-3 rounded-xl bg-gradient-to-r ${category.color} shadow-lg`}
                    >
                      <category.icon className="h-6 w-6 text-white" />
                    </motion.div>
                    <h2 className="text-2xl font-bold">
                      {t(category.titleKey, category.defaultTitle)}
                    </h2>
                  </div>

                  {/* Questions Accordion */}
                  <Accordion type="single" collapsible className="space-y-3">
                    {category.questions.map((qa, qaIndex) => (
                      <AccordionItem 
                        key={qaIndex} 
                        value={`${category.id}-${qaIndex}`}
                        className="border border-border/50 rounded-xl px-5 data-[state=open]:bg-muted/30 backdrop-blur-sm transition-all duration-300 hover:border-primary/30"
                      >
                        <AccordionTrigger className="text-left hover:no-underline py-5">
                          <span className="font-medium pr-4">
                            {t(qa.questionKey, qa.defaultQuestion)}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                          {t(qa.answerKey, qa.defaultAnswer)}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>

                  {/* Quick Link to Plant Page */}
                  {category.id !== 'quotation' && (
                    <div className="mt-8 pt-6 border-t border-border/50">
                      <Link to={`/plants/${category.id === 'tire-recycling' ? 'tire-recycling' : category.id}`}>
                        <Button variant="outline" className="group">
                          {t('faq.viewPlant', 'Ver Planta')} {t(category.titleKey, category.defaultTitle)}
                          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Still Have Questions - Enhanced */}
      <section className="py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
        
        <div className="container-wide relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {t('faq.stillQuestions', 'Ainda tem dúvidas?')}
            </h2>
            <div className="w-20 h-1 bg-gradient-to-r from-primary to-secondary mx-auto rounded-full mb-6" />
            <p className="text-white/70 max-w-2xl mx-auto text-lg">
              {t('faq.stillQuestionsDesc', 'Nossa equipe está pronta para ajudar. Entre em contato e responderemos suas perguntas.')}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto mb-12">
            {contactMethods.map((method, index) => (
              <motion.div
                key={method.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.15 }}
                viewport={{ once: true }}
                whileHover={{ y: -5, scale: 1.02 }}
              >
                <GlassCard className="p-6 text-center h-full bg-white/5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center mx-auto mb-4 border border-primary/30">
                    <method.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">{method.title}</h3>
                  {method.action ? (
                    <a href={method.action} className="text-white/70 hover:text-primary transition-colors">
                      {method.value}
                    </a>
                  ) : (
                    <p className="text-white/70">{method.value}</p>
                  )}
                </GlassCard>
              </motion.div>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-wrap justify-center gap-4"
          >
            <Link to="/contact">
              <Button size="lg" variant="elp-white">
                <Mail className="mr-2 h-5 w-5" />
                {t('faq.contactUs', 'Fale Conosco')}
              </Button>
            </Link>
            <Link to="/solutions">
              <Button size="lg" variant="elp-white-outline">
                <Factory className="mr-2 h-5 w-5" />
                {t('faq.viewSolutions', 'Ver Soluções')}
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Key Benefits - Enhanced */}
      <section className="py-20 relative overflow-hidden">
        
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">{t('faq.whyChooseUs', 'Por que nos escolher?')}</h2>
            <div className="w-20 h-1 bg-gradient-to-r from-primary to-secondary mx-auto rounded-full" />
          </motion.div>
          
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: Shield, title: t('faq.benefits.quality', 'Qualidade Garantida'), desc: t('faq.benefits.qualityDesc', 'Equipamentos certificados CE/ISO') },
              { icon: DollarSign, title: t('faq.benefits.roi', 'ROI Comprovado'), desc: t('faq.benefits.roiDesc', 'Retorno de 25-40% ao ano') },
              { icon: Settings, title: t('faq.benefits.support', 'Suporte 24/7'), desc: t('faq.benefits.supportDesc', 'Assistência técnica global') },
              { icon: Leaf, title: t('faq.benefits.eco', 'Sustentável'), desc: t('faq.benefits.ecoDesc', 'Processos eco-friendly') },
            ].map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -8, scale: 1.02 }}
              >
                <GlassCard className="p-6 text-center h-full hover:border-primary/50 transition-all duration-300">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-4 border border-primary/20">
                    <benefit.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-bold mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
    </>
  );
}
