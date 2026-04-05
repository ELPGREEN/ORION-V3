import { Node, mergeAttributes } from "@tiptap/react";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { useState } from "react";

// ─── NodeView Component ───
function FormFieldNodeView({ node, updateAttributes, editor }: any) {
  const { fieldType, label, value, options } = node.attrs;
  const isEditable = editor.isEditable;
  const [editing, setEditing] = useState(false);

  const baseClass =
  "inline-flex items-center border border-primary/30 rounded px-1.5 py-0.5 text-xs bg-primary/5 align-baseline";

  if (!isEditable) {
    // Read-only / fill mode
    if (fieldType === "checkbox") {
      return (
        <NodeViewWrapper as="span" className={baseClass}>
          <input
            type="checkbox"
            checked={value === "true"}
            onChange={(e) => updateAttributes({ value: String(e.target.checked) })}
            className="h-3 w-3 mr-1 accent-primary" />
          
          <span className="text-[11px] text-foreground">{label}</span>
        </NodeViewWrapper>);

    }
    if (fieldType === "date") {
      return (
        <NodeViewWrapper as="span" className={baseClass}>
          <span className="text-[10px] text-muted-foreground mr-1">{label}:</span>
          <input
            type="date"
            value={value || ""}
            onChange={(e) => updateAttributes({ value: e.target.value })}
            className="bg-transparent text-[11px] text-foreground outline-none border-none w-28" />
          
        </NodeViewWrapper>);

    }
    if (fieldType === "select") {
      const opts = (options || "").split(",").map((o: string) => o.trim()).filter(Boolean);
      return (
        <NodeViewWrapper as="span" className={baseClass}>
          <span className="text-[10px] text-muted-foreground mr-1">{label}:</span>
          <select
            value={value || ""}
            onChange={(e) => updateAttributes({ value: e.target.value })}
            className="bg-transparent text-[11px] text-foreground outline-none border-none">
            
            <option value="">Selecione...</option>
            {opts.map((o: string) =>
            <option key={o} value={o}>{o}</option>
            )}
          </select>
        </NodeViewWrapper>);

    }
    // Default: text
    return (
      <NodeViewWrapper as="span" className={baseClass}>
        <span className="text-[10px] text-muted-foreground mr-1">{label}:</span>
        <input
          type="text"
          value={value || ""}
          onChange={(e) => updateAttributes({ value: e.target.value })}
          placeholder="___________"
          className="bg-transparent text-[11px] text-foreground outline-none border-none w-24 placeholder:text-muted-foreground/40" />
        
      </NodeViewWrapper>);

  }

  // Editable / template-design mode
  if (editing) {
    return (
      <NodeViewWrapper as="span" className="inline-flex items-center gap-1 border-2 border-dashed border-primary/50 rounded px-2 py-1 bg-primary/10 align-baseline">
        <input
          type="text"
          value={label}
          onChange={(e) => updateAttributes({ label: e.target.value })}
          placeholder="Label"
          className="bg-transparent text-[11px] font-medium text-foreground outline-none border-none w-20"
          autoFocus />
        
        <select
          value={fieldType}
          onChange={(e) => updateAttributes({ fieldType: e.target.value })}
          className="bg-transparent text-[10px] text-muted-foreground outline-none border border-border rounded px-1 h-5">
          
          <option value="text">Texto</option>
          <option value="date">Data</option>
          <option value="checkbox">Check</option>
          <option value="select">Seleção</option>
        </select>
        {fieldType === "select" &&
        <input
          type="text"
          value={options || ""}
          onChange={(e) => updateAttributes({ options: e.target.value })}
          placeholder="op1,op2,op3"
          className="bg-transparent text-[10px] text-muted-foreground outline-none border border-border rounded px-1 w-24 h-5" />

        }
        <button
          onClick={() => setEditing(false)}
          className="text-[10px] text-primary hover:text-primary/80 font-medium">
          
          ✓
        </button>
      </NodeViewWrapper>);

  }

  return (
    <NodeViewWrapper as="span" className={`${baseClass} cursor-pointer border-dashed`} onClick={() => setEditing(true)}>
      <span className="text-[10px] text-primary font-medium">📋 {label}</span>
      
    </NodeViewWrapper>);

}

// ─── TipTap Extension ───
export const FormFieldExtension = Node.create({
  name: "formField",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      fieldType: { default: "text" },
      label: { default: "Campo" },
      value: { default: "" },
      options: { default: "" }
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-form-field]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-form-field": "" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FormFieldNodeView);
  }
});

export default FormFieldExtension;