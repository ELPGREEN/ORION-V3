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

interface SignupEmailProps {
  siteName: string
  siteUrl?: string
  recipient?: string
  confirmationUrl?: string
  token?: string
}

export const SignupEmail = ({
  siteName,
  recipient,
  token = '123456',
}: SignupEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Confirme seu e-mail para {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Confirme seu e-mail</Heading>
        <Text style={text}>
          Obrigado por se cadastrar em <strong>{siteName}</strong>!
        </Text>
        {recipient && (
          <Text style={text}>
            Confirme seu endereço de e-mail ({recipient}) usando o código abaixo:
          </Text>
        )}
        <Container style={codeBox}>
          <Text style={codeLabel}>Código de verificação</Text>
          <Text style={code}>{token}</Text>
        </Container>
        <Text style={text}>
          Digite esse código no site para confirmar seu cadastro.
        </Text>
        <Text style={footer}>
          Se você não criou uma conta, pode ignorar este e-mail.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

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
