/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu código de verificação</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Confirme sua identidade</Heading>
        <Text style={text}>Use o código abaixo para confirmar sua identidade:</Text>
        <Container style={codeBox}>
          <Text style={codeLabel}>Código de verificação</Text>
          <Text style={code}>{token}</Text>
        </Container>
        <Text style={text}>
          Digite esse código no site para prosseguir.
        </Text>
        <Text style={footer}>
          Este código expira em poucos minutos. Se você não solicitou, pode ignorar este e-mail.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#000000',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const codeBox = {
  backgroundColor: '#f4f4f5',
  borderRadius: '12px',
  padding: '20px 16px',
  margin: '0 0 24px',
  textAlign: 'center' as const,
}
const codeLabel = { fontSize: '12px', color: '#71717a', margin: '0 0 8px', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }
const code = {
  fontSize: '32px',
  lineHeight: '1',
  fontWeight: 'bold' as const,
  color: '#000000',
  letterSpacing: '0.22em',
  margin: '0',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
