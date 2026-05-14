
import { computeFreeEnergy, computeQuantumFreeEnergy } from './src/lib/neural/active-inference-guard';
import { performance } from 'perf_hooks';

const query = "Qual a diferença entre dolo e culpa no direito penal brasileiro? Explique com base no Código Penal.";
const response = "A diferença entre dolo e culpa é fundamental no Direito Penal. O dolo ocorre quando o agente quer o resultado ou assume o risco de produzi-lo (Art. 18, I do CP). Já a culpa ocorre quando o agente deu causa ao resultado por imprudência, negligência ou imperícia (Art. 18, II do CP). No dolo eventual, o indivíduo prevê o resultado mas não se importa. Na culpa consciente, ele prevê mas acredita sinceramente que não ocorrerá.";

function benchmark() {
  console.log("--- Starting Benchmarks for Active Inference Guard ---");

  // Warmup
  for (let i = 0; i < 100; i++) {
    computeFreeEnergy(query, response);
    computeQuantumFreeEnergy(query, response);
  }

  const iterations = 1000;

  let t0 = performance.now();
  for (let i = 0; i < iterations; i++) {
    computeFreeEnergy(query, response);
  }
  let t1 = performance.now();
  console.log(`computeFreeEnergy: ${((t1 - t0) / iterations).toFixed(4)}ms per call`);

  t0 = performance.now();
  for (let i = 0; i < iterations; i++) {
    computeQuantumFreeEnergy(query, response);
  }
  t1 = performance.now();
  console.log(`computeQuantumFreeEnergy: ${((t1 - t0) / iterations).toFixed(4)}ms per call`);
}

benchmark();
