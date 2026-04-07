import { synthesizeFormant } from "./src/lib/tts/formantSynth";
import { writeFileSync } from "fs";

async function test() {
  const texts: [string, string][] = [
    ["Olá", "orion_v20_ola.wav"],
    ["Bom dia", "orion_v20_bomdia.wav"],  
    ["Brasil", "orion_v20_brasil.wav"],
    ["Eu sou o Orion, sua inteligência artificial", "orion_v20_frase.wav"],
  ];
  
  for (const [text, file] of texts) {
    const blob = await synthesizeFormant(text);
    const buf = await blob.arrayBuffer();
    writeFileSync(`/mnt/documents/${file}`, Buffer.from(buf));
    console.log(`✓ ${file} — ${buf.byteLength} bytes`);
  }
}

test().catch(e => console.error(e));
