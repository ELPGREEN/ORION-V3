import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type VueTechnique = {
  id: string;
  name: string;
  category: "Reactivity" | "Composition" | "Built-in" | "SFC" | "Lifecycle";
  summary: string;
  example: string;
  docsUrl: string;
};

const TECHNIQUES: VueTechnique[] = [
  {
    id: "ref",
    name: "ref()",
    category: "Reactivity",
    summary:
      "Cria uma referência reativa para valores primitivos. Acessada via .value no script e desempacotada automaticamente em templates.",
    example: `import { ref } from 'vue'

const count = ref(0)
count.value++
console.log(count.value) // 1`,
    docsUrl: "https://vuejs.org/api/reactivity-core.html#ref",
  },
  {
    id: "reactive",
    name: "reactive()",
    category: "Reactivity",
    summary:
      "Cria um proxy reativo profundo para objetos. Ideal para estado estruturado com múltiplas propriedades.",
    example: `import { reactive } from 'vue'

const state = reactive({ count: 0, user: { name: 'Ada' } })
state.count++
state.user.name = 'Linus'`,
    docsUrl: "https://vuejs.org/api/reactivity-core.html#reactive",
  },
  {
    id: "computed",
    name: "computed()",
    category: "Reactivity",
    summary:
      "Cria um valor derivado com cache automático que só recalcula quando suas dependências reativas mudam.",
    example: `import { ref, computed } from 'vue'

const count = ref(1)
const double = computed(() => count.value * 2)
console.log(double.value) // 2`,
    docsUrl: "https://vuejs.org/api/reactivity-core.html#computed",
  },
  {
    id: "watch",
    name: "watch()",
    category: "Reactivity",
    summary:
      "Observa fontes reativas e dispara um callback quando mudam. Suporta múltiplas fontes e acesso ao valor anterior.",
    example: `import { ref, watch } from 'vue'

const query = ref('')
watch(query, (next, prev) => {
  console.log('mudou de', prev, 'para', next)
})`,
    docsUrl: "https://vuejs.org/api/reactivity-core.html#watch",
  },
  {
    id: "watchEffect",
    name: "watchEffect()",
    category: "Reactivity",
    summary:
      "Executa um efeito imediatamente e o re-executa sempre que qualquer dependência reativa rastreada mudar.",
    example: `import { ref, watchEffect } from 'vue'

const id = ref(1)
watchEffect(() => {
  console.log('buscando id', id.value)
})`,
    docsUrl: "https://vuejs.org/api/reactivity-core.html#watcheffect",
  },
  {
    id: "composable",
    name: "Composables (Composition API)",
    category: "Composition",
    summary:
      "Funções reutilizáveis que encapsulam lógica reativa com estado, equivalente a hooks. Convenção: prefixo use*.",
    example: `// useMouse.ts
import { ref, onMounted, onUnmounted } from 'vue'

export function useMouse() {
  const x = ref(0), y = ref(0)
  const update = (e: MouseEvent) => { x.value = e.x; y.value = e.y }
  onMounted(() => window.addEventListener('mousemove', update))
  onUnmounted(() => window.removeEventListener('mousemove', update))
  return { x, y }
}`,
    docsUrl: "https://vuejs.org/guide/reusability/composables.html",
  },
  {
    id: "defineProps",
    name: "defineProps() / defineEmits()",
    category: "SFC",
    summary:
      "Macros do <script setup> para declarar props e eventos com tipagem completa em TypeScript, sem imports.",
    example: `<script setup lang="ts">
const props = defineProps<{ title: string; count?: number }>()
const emit = defineEmits<{ (e: 'update', value: number): void }>()
</script>`,
    docsUrl: "https://vuejs.org/api/sfc-script-setup.html#defineprops-defineemits",
  },
  {
    id: "suspense",
    name: "<Suspense>",
    category: "Built-in",
    summary:
      "Componente built-in que coordena dependências assíncronas em sua árvore, exibindo um fallback até resolverem.",
    example: `<Suspense>
  <template #default>
    <AsyncDashboard />
  </template>
  <template #fallback>
    <div>Carregando…</div>
  </template>
</Suspense>`,
    docsUrl: "https://vuejs.org/guide/built-ins/suspense.html",
  },
  {
    id: "teleport",
    name: "<Teleport>",
    category: "Built-in",
    summary:
      "Renderiza um fragmento de template em outro lugar do DOM (ex.: body) — útil para modais e tooltips.",
    example: `<Teleport to="body">
  <div class="modal">Olá do topo da árvore!</div>
</Teleport>`,
    docsUrl: "https://vuejs.org/guide/built-ins/teleport.html",
  },
  {
    id: "lifecycle",
    name: "onMounted() / onUnmounted()",
    category: "Lifecycle",
    summary:
      "Hooks de ciclo de vida da Composition API para reagir à montagem/desmontagem do componente.",
    example: `import { onMounted, onUnmounted } from 'vue'

onMounted(() => console.log('montou'))
onUnmounted(() => console.log('desmontou'))`,
    docsUrl: "https://vuejs.org/api/composition-api-lifecycle.html",
  },
];

export function VueApiExplorer() {
  const [selectedId, setSelectedId] = useState<string>(TECHNIQUES[0].id);
  const selected = useMemo(
    () => TECHNIQUES.find((t) => t.id === selectedId) ?? TECHNIQUES[0],
    [selectedId],
  );

  return (
    <section className="py-12 sm:py-16 bg-muted/5 border-y border-border/10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-10 max-w-4xl">
        <div className="text-center mb-8">
          <p className="text-xs text-primary/70 tracking-[0.3em] uppercase mb-2">
            Vue 3 · API Reference
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Explore técnicas da API do Vue
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            Escolha uma técnica oficial do Vue 3 para ver um resumo e um exemplo
            de código equivalente.
          </p>
        </div>

        <div className="max-w-md mx-auto mb-6">
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger aria-label="Selecionar técnica do Vue">
              <SelectValue placeholder="Escolha uma técnica" />
            </SelectTrigger>
            <SelectContent>
              {TECHNIQUES.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} · {t.category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card className="border-border/40 bg-background/60 backdrop-blur">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-lg sm:text-xl text-foreground">
                {selected.name}
              </CardTitle>
              <Badge variant="secondary" className="text-[10px] tracking-wider uppercase">
                {selected.category}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {selected.summary}
            </p>
            <pre className="bg-muted/40 border border-border/30 rounded-md p-4 overflow-x-auto text-xs sm:text-sm leading-relaxed">
              <code>{selected.example}</code>
            </pre>
            <a
              href={selected.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs text-primary hover:underline"
            >
              Ver na documentação oficial →
            </a>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export default VueApiExplorer;
