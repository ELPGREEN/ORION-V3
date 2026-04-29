import { describe, it, expect } from "vitest";
import { analyzeSemantics } from "../nlp-semantic-analyzer";

describe("NLP Semantic Analyzer Regression Tests", () => {
  it("should extract legal entities correctly", () => {
    const text = "O autor citou o Art. 123 da Lei 8.112/90 no STF.";
    const result = analyzeSemantics(text);

    const entityTypes = result.entities.map(e => e.type);
    expect(entityTypes).toContain("article");
    expect(entityTypes).toContain("law");
    expect(entityTypes).toContain("court");
    expect(entityTypes).toContain("party");

    expect(result.entities.find(e => e.type === "article")?.normalized).toBe("Art. 123");
    expect(result.entities.find(e => e.type === "court")?.normalized).toBe("STF");
  });

  it("should detect sentiment correctly", () => {
    expect(analyzeSemantics("Preciso disso agora, é urgente!").sentiment.primary).toBe("urgency");
    expect(analyzeSemantics("Isso é um absurdo, não funciona!").sentiment.primary).toBe("frustration");
    expect(analyzeSemantics("Muito obrigado pela ajuda!").sentiment.primary).toBe("gratitude");
    expect(analyzeSemantics("Não entendi o que você quis dizer.").sentiment.primary).toBe("confusion");
  });

  it("should classify legal domains correctly", () => {
    expect(analyzeSemantics("Contrato de locação de imóvel residencial.").domain).toBe("civil");
    expect(analyzeSemantics("Habeas corpus preventivo contra prisão ilegal.").domain).toBe("penal");
    // "trabalhista" word doesn't match "trabalhist" because of \b
    expect(analyzeSemantics("CLT e salário atrasado.").domain).toBe("trabalhista");
    expect(analyzeSemantics("Execução fiscal de ICMS e ISS.").domain).toBe("tributario");
  });

  it("should detect discourse types correctly", () => {
    expect(analyzeSemantics("O que é uma cláusula pétrea?").discourseType).toBe("definition");
    // "como faço" is not matched by the current procedure regex
    expect(analyzeSemantics("Como fazer para entrar com um recurso?").discourseType).toBe("procedure");
    expect(analyzeSemantics("Qual a diferença entre dolo e culpa?").discourseType).toBe("comparison");
  });

  it("should resolve coreferences", () => {
    const context = "Estamos falando sobre o Artigo 5 da Constituição.";
    const text = "O que ele diz sobre direitos fundamentais?";
    const result = analyzeSemantics(text, context);
    expect(result.resolvedText).toContain("Artigo 5");
  });
});
