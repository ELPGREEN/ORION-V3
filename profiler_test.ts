import { analyzeSemantics } from './src/lib/neural/nlp-semantic-analyzer';

const testInputs = [
  "O que é o artigo 5º da Constituição?",
  "Como fazer um divórcio consensual?",
  "Analise a jurisprudência do STF sobre LGPD",
  "Oi, tudo bem?",
  "Urgente! Preciso de ajuda com um contrato de locação agora!",
  "Qual a diferença entre roubo e furto no Código Penal?",
];

function profile() {
  console.log("Starting profile...");
  const results = [];
  for (const input of testInputs) {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      analyzeSemantics(input);
    }
    const end = performance.now();
    results.push((end - start) / 1000);
  }
  const avg = results.reduce((a, b) => a + b, 0) / results.length;
  console.log("Average latency: " + avg.toFixed(6) + "ms");
  console.log("Individual latencies: " + results.map(r => r.toFixed(6)).join(", "));
}

profile();
