/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Orion"

interface WelcomeProps {
  name?: string
}

const WelcomeEmail = ({ name }: WelcomeProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Bem-vindo à plataforma {SITE_NAME}!</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={logoBox}>
          <span style={logo}>ORION</span>
          <span style={logoSub}>by ELP Global</span>
        </div>
        <Heading style={h1}>
          {name ? `Bem-vindo, ${name}!` : 'Bem-vindo à Orion!'}
        </Heading>
        <Text style={text}>
          Parabéns por entrar na plataforma! Sua conta foi criada com sucesso e você já pode explorar todos os recursos disponíveis.
        </Text>
        <Text style={text}>
          Se precisar de ajuda, nossa equipe está à disposição. Basta responder este e-mail ou acessar o suporte na plataforma.
        </Text>
        <Text style={footer}>Equipe {SITE_NAME} — ELP Global</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeEmail,
  subject: `Bem-vindo à ${SITE_NAME}!`,
  displayName: 'Boas-vindas',
  previewData: { name: 'João' },
} satisfies TemplateEntry

const main = { backgroundColor: '#0a0f14', fontFamily: "'Segoe UI', Arial, sans-serif", margin: '0', padding: '40px 0' }
const container = { maxWidth: '480px', margin: '0 auto', backgroundColor: '#111820', borderRadius: '16px', border: '1px solid #2a2520', padding: '40px 32px' }
const logoBox = { textAlign: 'center' as const, marginBottom: '28px' }
const logo = { fontSize: '28px', fontWeight: '800' as const, color: '#e8a435', letterSpacing: '-0.02em' }
const logoSub = { fontSize: '12px', color: '#6b5e4e', display: 'block', marginTop: '2px', letterSpacing: '0.12em', textTransform: 'uppercase' as const }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#e6ddd0', margin: '0 0 16px', textAlign: 'center' as const }
const text = { fontSize: '14px', color: '#8a8078', lineHeight: '1.6', margin: '0 0 24px', textAlign: 'center' as const }
const footer = { fontSize: '11px', color: '#4a453e', margin: '32px 0 0', textAlign: 'center' as const }
