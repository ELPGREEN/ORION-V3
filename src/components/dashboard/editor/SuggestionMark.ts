import { Mark, mergeAttributes } from "@tiptap/react";

export const SuggestionMark = Mark.create({
  name: "suggestion",

  // Allow other marks (highlight, color, bold, etc.) to coexist
  inclusive: false,
  excludes: "",

  addAttributes() {
    return {
      suggestionId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-suggestion-id"),
        renderHTML: (attrs) => {
          if (!attrs.suggestionId) return {};
          return { "data-suggestion-id": attrs.suggestionId };
        },
      },
      suggestionType: {
        default: "insert",
        parseHTML: (el) => el.getAttribute("data-suggestion-type") || "insert",
        renderHTML: (attrs) => {
          return { "data-suggestion-type": attrs.suggestionType };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-suggestion-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    // Render as a plain span with ONLY data attributes — no class, no style
    // This ensures it never interferes with user-applied formatting (color, highlight, etc.)
    return [
      "span",
      mergeAttributes(HTMLAttributes),
      0,
    ];
  },
});
