/**
 * ═══ ORION ARTIFACTS SYSTEM ═══
 * Creates interactive apps, code snippets, documents
 * Similar to Claude Artifacts
 */

export interface Artifact {
  id: string;
  type: "react" | "html" | "python" | "json" | "markdown" | "diagram";
  title: string;
  code: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

export const ARTIFACT_TEMPLATES = {
  react: (title: string, code: string) => ({
    id: `artifact_${Date.now()}`,
    type: "react" as const,
    title,
    code,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),

  html: (title: string, code: string) => ({
    id: `artifact_${Date.now()}`,
    type: "html" as const,
    title,
    code,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),

  python: (title: string, code: string) => ({
    id: `artifact_${Date.now()}`,
    type: "python" as const,
    title,
    code,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),

  json: (title: string, data: object) => ({
    id: `artifact_${Date.now()}`,
    type: "json" as const,
    title,
    code: JSON.stringify(data, null, 2),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),

  markdown: (title: string, content: string) => ({
    id: `artifact_${Date.now()}`,
    type: "markdown" as const,
    title,
    code: content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
};

export const REACT_BASIC_TEMPLATE = `import React, { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);
  
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Meu App React</h1>
      <p>Contador: {count}</p>
      <button 
        onClick={() => setCount(count + 1)}
        style={{ 
          padding: '0.5rem 1rem',
          background: '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Incrementar
      </button>
    </div>
  );
}`;

export const CHART_TEMPLATE = `import React from 'react';

export default function Chart() {
  const data = [
    { label: 'Jan', value: 30 },
    { label: 'Fev', value: 45 },
    { label: 'Mar', value: 60 },
    { label: 'Abr', value: 55 },
    { label: 'Mai', value: 70 },
  ];
  
  const max = Math.max(...data.map(d => d.value));
  
  return (
    <div style={{ padding: '2rem' }}>
      <h2>Gráfico de Barras</h2>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', height: '200px' }}>
        {data.map((d, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '40px', 
              height: \`\${(d.value / max) * 180}px\`,
              background: '#0070f3',
              borderRadius: '4px 4px 0 0'
            }} />
            <div style={{ marginTop: '8px', fontSize: '12px' }}>{d.label}</div>
            <div style={{ fontSize: '10px', color: '#666' }}>{d.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}`;

export const TODO_TEMPLATE = `import React, { useState } from 'react';

export default function TodoApp() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Aprender Orion', done: false },
    { id: 2, text: 'Criar primeiro app', done: true },
  ]);
  const [newTodo, setNewTodo] = useState('');
  
  const addTodo = () => {
    if (!newTodo.trim()) return;
    setTodos([...todos, { id: Date.now(), text: newTodo, done: false }]);
    setNewTodo('');
  };
  
  const toggleTodo = (id: number) => {
    setTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };
  
  return (
    <div style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto' }}>
      <h2>Lista de Tarefas</h2>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          value={newTodo}
          onChange={e => setNewTodo(e.target.value)}
          placeholder="Nova tarefa..."
          style={{ flex: 1, padding: '0.5rem' }}
        />
        <button onClick={addTodo} style={{ padding: '0.5rem 1rem', background: '#0070f3', color: 'white', border: 'none' }}>
          Add
        </button>
      </div>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {todos.map(todo => (
          <li key={todo.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0' }}>
            <input type="checkbox" checked={todo.done} onChange={() => toggleTodo(todo.id)} />
            <span style={{ textDecoration: todo.done ? 'line-through' : 'none' }}>{todo.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}`;

export function createArtifact(type: keyof typeof ARTIFACT_TEMPLATES, title: string, content: string | object): Artifact {
  if (type === "json" && typeof content === "object") {
    return ARTIFACT_TEMPLATES.json(title, content);
  }
  return ARTIFACT_TEMPLATES[type](title, content as string);
}