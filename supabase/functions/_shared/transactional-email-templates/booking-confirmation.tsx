/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Orion"

interface BookingConfirmationProps {
  name?: string
  tipo?: string
  dataHora?: string
  advogado?: string
}

const BookingConfirmationEmail = ({ name, tipo, dataHora, advogado }: BookingConfirmationProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Consulta agendada — {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={logoBox}>
          <span style={logo}>ORION</span>
          <span style={logoSub}>by ELP Global</span>
        </div>
        <Heading style={h1}>Consulta agendada!</Heading>
        <Text style={text}>
          {name ? `Olá, ${name}!` : 'Olá!'} Sua consulta foi agendada com sucesso.
        </Text>
        {(tipo || dataHora || advogado) && (
          <Container style={detailsBox}>
            {tipo && <Text style={detailRow}><strong style={detailLabel}>Tipo:</strong> {tipo}</Text>}
            {dataHora && <Text style={detailRow}><strong style={detailLabel}>Data/Hora:</strong> {dataHora}</Text>}
            {advogado && <Text style={detailRow}><strong style={detailLabel}>Profissional:</strong> {advogado}</Text>}
          </Container>
        )}
        <Text style={text}>
          Você receberá uma notificação antes do horário agendado. Caso precise reagendar, acesse a plataforma.
        </Text>
        <Text style={footer}>Equipe {SITE_NAME} — ELP Global</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BookingConfirmationEmail,
  subject: 'Consulta agendada — Orion',
  displayName: 'Agendamento de consulta',
  previewData: { name: 'Carlos', tipo: 'Consulta Jurídica', dataHora: '15/04/2026 às 14:00', advogado: 'Dr. Silva' },
} satisfies TemplateEntry

const main = { backgroundColor: '#0a0f14', fontFamily: "'Segoe UI', Arial, sans-serif", margin: '0', padding: '40px 0' }
const container = { maxWidth: '480px', margin: '0 auto', backgroundColor: '#111820', borderRadius: '16px', border: '1px solid #2a2520', padding: '40px 32px' }
const logoBox = { textAlign: 'center' as const, marginBottom: '28px' }
const logo = { fontSize: '28px', fontWeight: '800' as const, color: '#e8a435', letterSpacing: '-0.02em' }
const logoSub = { fontSize: '12px', color: '#6b5e4e', display: 'block', marginTop: '2px', letterSpacing: '0.12em', textTransform: 'uppercase' as const }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#e6ddd0', margin: '0 0 16px', textAlign: 'center' as const }
const text = { fontSize: '14px', color: '#8a8078', lineHeight: '1.6', margin: '0 0 24px', textAlign: 'center' as const }
const detailsBox = { backgroundColor: '#1a1e26', border: '1px solid #2a2520', borderRadius: '12px', padding: '20px 24px', margin: '0 0 24px' }
const detailRow = { fontSize: '14px', color: '#e6ddd0', margin: '0 0 8px', lineHeight: '1.5' }
const detailLabel = { color: '#e8a435' }
const footer = { fontSize: '11px', color: '#4a453e', margin: '32px 0 0', textAlign: 'center' as const }
