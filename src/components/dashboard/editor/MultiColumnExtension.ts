/**
 * TipTap Multi-Column Layout Extension
 * Supports newspaper-style columns, flexbox rows, and grid layouts
 */
import { Node, mergeAttributes } from "@tiptap/core";

export type ColumnLayout = "newspaper" | "flex-row" | "grid-2x2" | "grid-3";

export const MultiColumnBlock = Node.create({
  name: "multiColumnBlock",
  group: "block",
  content: "(block | columnItem)+",
  defining: true,

  addAttributes() {
    return {
      layout: {
        default: "newspaper" as ColumnLayout,
        parseHTML: (el) => el.getAttribute("data-layout") || "newspaper",
        renderHTML: (attrs) => ({ "data-layout": attrs.layout }),
      },
      columns: {
        default: 2,
        parseHTML: (el) => parseInt(el.getAttribute("data-columns") || "2", 10),
        renderHTML: (attrs) => ({ "data-columns": attrs.columns }),
      },
      gap: {
        default: "1rem",
        parseHTML: (el) => el.getAttribute("data-gap") || "1rem",
        renderHTML: (attrs) => ({ "data-gap": attrs.gap }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="multi-column"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const layout = HTMLAttributes["data-layout"] || "newspaper";
    const columns = HTMLAttributes["data-columns"] || 2;
    const gap = HTMLAttributes["data-gap"] || "1rem";

    let style = "";
    switch (layout) {
      case "newspaper":
        style = `column-count: ${columns}; column-gap: ${gap}; column-rule: 1px solid hsl(var(--border));`;
        break;
      case "flex-row":
        style = `display: flex; gap: ${gap}; align-items: stretch;`;
        break;
      case "grid-2x2":
        style = `display: grid; grid-template-columns: repeat(2, 1fr); gap: ${gap};`;
        break;
      case "grid-3":
        style = `display: grid; grid-template-columns: repeat(3, 1fr); gap: ${gap};`;
        break;
    }

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "multi-column",
        style,
        class: "multi-column-block",
      }),
      0,
    ];
  },
});

export const ColumnItem = Node.create({
  name: "columnItem",
  group: "block",
  content: "block+",
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-type="column-item"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "column-item",
        style: "flex: 1; min-width: 0;",
        class: "column-item",
      }),
      0,
    ];
  },
});
