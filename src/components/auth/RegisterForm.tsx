import React from "react";
import { Link } from "react-router-dom";
import { UserPlus, Loader2, ScanFace, Fingerprint, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ACCOUNT_TYPES, TIPOS_CASO, AREAS_ATUACAO, UFS, formatCPF, formatPhone, CadastroForm, AccountType } from "./auth-constants";

interface RegisterFormProps {
  cadastroForm: CadastroForm;
  setCadastroForm: (val: any) => void;
  handleCadastro: (e: React.FormEvent) => void;
  loading: boolean;
  errors: Record<string, string>;
  accountType: AccountType;
  setAccountType: (val: AccountType) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  renderDivider: () => React.ReactNode;
  renderGoogleButton: (text: string) => React.ReactNode;
  navigate: (path: string) => void;
}

const inputClass = "h-12 bg-[#161b22] border-[#1e2533] text-white placeholder:text-[#4a5568] focus:border-[#d4a853] focus:ring-[#d4a853]/20";
const labelClass = "text-xs font-medium text-[#c0c8d4] tracking-wider uppercase";
const errorClass = "text-xs text-red-400";

export const RegisterForm = React.memo(({
  cadastroForm, setCadastroForm, handleCadastro, loading, errors,
  accountType, setAccountType, showPassword, setShowPassword,
  renderDivider, renderGoogleButton, navigate
}: RegisterFormProps) => {
  return (
    <form onSubmit={handleCadastro} className="space-y-5 animate-fade-in max-h-[65vh] overflow-y-auto pr-1">
      {/* Account Type */}
      <div className="space-y-3">
        <label className={labelClass}>Tipo de Conta</label>
        <div className="grid grid-cols-2 gap-2">
          {ACCOUNT_TYPES.map(({ value, label, icon: Icon, desc }) => (
            <button key={value} type="button" onClick={() => setAccountType(value)}
              className={`flex items-start gap-2.5 p-3 border text-left transition-all duration-200 ${
                accountType === value
                  ? "border-[#d4a853]/60 bg-[#d4a853]/10 text-white"
                  : "border-[#1e2533] bg-[#161b22] text-[#8b95a5] hover:border-[#2a3140]"
              }`}>
              <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${accountType === value ? "text-[#d4a853]" : "text-[#4a5568]"}`} />
              <div>
                <p className="text-xs font-medium">{label}</p>
                <p className="text-[10px] text-[#4a5568] mt-0.5 leading-tight">{desc}</p>
              </div>
            </button>
          ))}
        </div>
        {accountType === "advogado" && (
          <div className="flex items-center gap-2 p-2 rounded border border-[#d4a853]/20 bg-[#d4a853]/5">
            <ScanFace className="h-4 w-4 text-[#d4a853] shrink-0" />
            <p className="text-[10px] text-[#d4a853]">Advogados devem registrar biometria facial após o cadastro.</p>
          </div>
        )}
      </div>

      {/* Common Fields */}
      <div className="space-y-2">
        <label className={labelClass}>Nome Completo</label>
        <Input placeholder="Seu nome" value={cadastroForm.nome}
          onChange={(e) => setCadastroForm({ ...cadastroForm, nome: e.target.value })}
          required className={inputClass} />
        {errors.nome && <p className={errorClass}>{errors.nome}</p>}
      </div>

      <div className="space-y-2">
        <label className={labelClass}>E-mail</label>
        <Input type="email" placeholder="seu@email.com" value={cadastroForm.email}
          onChange={(e) => setCadastroForm({ ...cadastroForm, email: e.target.value })}
          required className={inputClass} />
        {errors.email && <p className={errorClass}>{errors.email}</p>}
      </div>

      <div className="space-y-2">
        <label className={labelClass}>Telefone</label>
        <Input placeholder="(00) 00000-0000" value={cadastroForm.telefone}
          onChange={(e) => setCadastroForm({ ...cadastroForm, telefone: formatPhone(e.target.value) })}
          maxLength={15} className={inputClass} />
      </div>

      {/* Cliente Fields */}
      {accountType === "cliente" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className={labelClass}>CPF</label>
              <Input placeholder="000.000.000-00" value={cadastroForm.cpf}
                onChange={(e) => setCadastroForm({ ...cadastroForm, cpf: formatCPF(e.target.value) })}
                maxLength={14} className={inputClass} />
              {errors.cpf && <p className={errorClass}>{errors.cpf}</p>}
            </div>
            <div className="space-y-2">
              <label className={labelClass}>Tipo de Caso</label>
              <Select value={cadastroForm.tipoCaso} onValueChange={(v) => setCadastroForm({ ...cadastroForm, tipoCaso: v })}>
                <SelectTrigger className="h-12 bg-[#161b22] border-[#1e2533] text-white focus:ring-[#d4a853]/20">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_CASO.map((tipo) => <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.tipoCaso && <p className={errorClass}>{errors.tipoCaso}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <label className={labelClass}>Descreva seu caso (opcional)</label>
            <textarea placeholder="Explique brevemente sua situação jurídica..."
              value={cadastroForm.descricaoProblema}
              onChange={(e) => setCadastroForm({ ...cadastroForm, descricaoProblema: e.target.value })}
              rows={2} className="w-full resize-none rounded-md bg-[#161b22] border border-[#1e2533] text-white text-sm p-3 focus:border-[#d4a853] focus:ring-1 focus:ring-[#d4a853]/20 placeholder:text-[#4a5568]" />
          </div>
        </>
      )}

      {/* Advogado Fields */}
      {accountType === "advogado" && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-2">
              <label className={labelClass}>Nº OAB</label>
              <Input placeholder="123456" value={cadastroForm.oabNumero}
                onChange={(e) => setCadastroForm({ ...cadastroForm, oabNumero: e.target.value.replace(/\D/g, "").slice(0, 7) })}
                className={inputClass} />
              {errors.oabNumero && <p className={errorClass}>{errors.oabNumero}</p>}
            </div>
            <div className="space-y-2">
              <label className={labelClass}>UF</label>
              <Select value={cadastroForm.oabUf} onValueChange={(v) => setCadastroForm({ ...cadastroForm, oabUf: v })}>
                <SelectTrigger className="h-12 bg-[#161b22] border-[#1e2533] text-white focus:ring-[#d4a853]/20">
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  {UFS.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.oabUf && <p className={errorClass}>{errors.oabUf}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <label className={labelClass}>Áreas de Atuação</label>
            <div className="flex flex-wrap gap-1.5">
              {AREAS_ATUACAO.map((area) => (
                <button key={area} type="button"
                  onClick={() => {
                    const areas = cadastroForm.areasAtuacao.includes(area)
                      ? cadastroForm.areasAtuacao.filter(a => a !== area)
                      : [...cadastroForm.areasAtuacao, area];
                    setCadastroForm({ ...cadastroForm, areasAtuacao: areas });
                  }}
                  className={`px-2.5 py-1 text-[10px] tracking-wider uppercase border transition-all ${
                    cadastroForm.areasAtuacao.includes(area)
                      ? "border-[#d4a853]/50 bg-[#d4a853]/15 text-[#d4a853]"
                      : "border-[#1e2533] bg-[#161b22] text-[#4a5568] hover:text-[#8b95a5]"
                  }`}>
                  {area}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Produtor Fields */}
      {accountType === "produtor" && (
        <div className="space-y-2">
          <label className={labelClass}>Descrição do Negócio (opcional)</label>
          <textarea placeholder="Descreva brevemente seus produtos ou serviços..."
            value={cadastroForm.descricaoNegocio}
            onChange={(e) => setCadastroForm({ ...cadastroForm, descricaoNegocio: e.target.value })}
            rows={2} className="w-full resize-none rounded-md bg-[#161b22] border border-[#1e2533] text-white text-sm p-3 focus:border-[#d4a853] focus:ring-1 focus:ring-[#d4a853]/20 placeholder:text-[#4a5568]" />
        </div>
      )}

      {/* Password */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className={labelClass}>Senha</label>
          <div className="relative">
            <Input type={showPassword ? "text" : "password"} placeholder="••••••••"
              value={cadastroForm.senha}
              onChange={(e) => setCadastroForm({ ...cadastroForm, senha: e.target.value })}
              required minLength={8}
              className="h-12 bg-[#161b22] border-[#1e2533] text-white pr-12 focus:border-[#d4a853] focus:ring-[#d4a853]/20" />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a5568] hover:text-white"
              onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.senha && <p className={errorClass}>{errors.senha}</p>}
        </div>
        <div className="space-y-2">
          <label className={labelClass}>Confirmar</label>
          <Input type="password" placeholder="••••••••" value={cadastroForm.confirmarSenha}
            onChange={(e) => setCadastroForm({ ...cadastroForm, confirmarSenha: e.target.value })}
            required className={inputClass} />
          {errors.confirmarSenha && <p className={errorClass}>{errors.confirmarSenha}</p>}
        </div>
      </div>

      {/* Terms */}
      <div className="flex items-start gap-3 py-2">
        <input type="checkbox" required className="mt-1 h-4 w-4 border-[#1e2533] bg-[#161b22] accent-[#d4a853]" />
        <span className="text-xs text-[#8b95a5] leading-relaxed">
          Li e concordo com os{" "}
          <Link to="/termos" className="text-[#d4a853] hover:underline">Termos de Uso</Link>{" "}e{" "}
          <Link to="/privacidade" className="text-[#d4a853] hover:underline">Política de Privacidade</Link>
        </span>
      </div>

      {/* Submit */}
      <Button type="submit" disabled={loading}
        className="w-full h-12 bg-gradient-to-r from-[#d4a853] to-[#b8942e] hover:from-[#e0b65e] hover:to-[#c9a33a] text-[#0a0a0f] font-semibold text-sm tracking-wider">
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
          <>
            <UserPlus className="mr-2 h-5 w-5" />
            CRIAR CONTA {ACCOUNT_TYPES.find(t => t.value === accountType)?.label.toUpperCase()}
          </>
        )}
      </Button>

      {renderDivider()}
      {renderGoogleButton("CADASTRAR COM GOOGLE")}
      {renderDivider()}

      <Button type="button" variant="outline"
        className="w-full h-12 border-orange-500/30 text-orange-400 hover:bg-orange-500/10 text-sm gap-3 bg-transparent"
        onClick={() => navigate("/register/biometric")}>
        <Fingerprint className="h-5 w-5" />REGISTRO BIOMÉTRICO
      </Button>
    </form>
  );
});
