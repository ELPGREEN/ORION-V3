import { synthesizeFormant } from "./src/lib/tts/formantSynth";
import { writeFileSync } from "fs";

async function test() {
  const texts: [string, string][] = [
    ["Olá", "orion_v19_ola.wav"],
    ["Bom dia", "orion_v19_bomdia.wav"],  
    ["Brasil", "orion_v19_brasil.wav"],
  ];
  
  for (const [text, file] of texts) {
    const blob = await synthesizeFormant(text);
    const buf = await blob.arrayBuffer();
    writeFileSync(`/mnt/documents/${file}`, Buffer.from(buf));
    console.log(`✓ ${file} — ${buf.byteLength} bytes`);
  }
}

test().catch(e => console.error(e));
