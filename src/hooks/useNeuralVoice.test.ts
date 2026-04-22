import { describe, expect, it } from "vitest";
import { cleanTextForSpeech } from "./useNeuralVoice";

describe("cleanTextForSpeech — sanitização de bordões proibidos", () => {
  it("remove a frase exata 'Prepare-se para a ação. Debre ao máximo e deixa que eu te proteja'", () => {
    expect(
      cleanTextForSpeech("Prepare-se para a ação. Debre ao máximo e deixa que eu te proteja"),
    ).toBe("");
  });

  it("remove a catchphrase mesmo com variação de pontuação e acento", () => {
    expect(
      cleanTextForSpeech("Prepare-se para ação, Debrin ao máximo, e deixa que eu te proteja!"),
    ).toBe("");
  });

  it("preserva o restante útil da fala ao remover só o bordão", () => {
    expect(
      cleanTextForSpeech("Prepare-se para a ação. Debre ao máximo e deixa que eu te proteja. Vou identificar o que estou vendo agora."),
    ).toBe("Vou identificar o que estou vendo agora");
  });
});