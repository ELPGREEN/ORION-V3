import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface SlashCommandState {
  active: boolean;
  query: string;
  range: { from: number; to: number };
  decorationSet: DecorationSet;
}

const slashCommandPluginKey = new PluginKey("slashCommand");

export const SlashCommandExtension = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        key: slashCommandPluginKey,
        state: {
          init(): SlashCommandState {
            return { active: false, query: "", range: { from: 0, to: 0 }, decorationSet: DecorationSet.empty };
          },
          apply(tr, prev, _oldState, newState): SlashCommandState {
            // Check if selection is a cursor (not a range)
            const { $from } = newState.selection;
            if (!newState.selection.empty) {
              return { active: false, query: "", range: { from: 0, to: 0 }, decorationSet: DecorationSet.empty };
            }

            // Get text before cursor on current line
            const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);

            // Check for slash pattern: / at start of node or after whitespace
            const match = textBefore.match(/(?:^|\s)\/([\w\u00C0-\u017F]*)$/);

            if (match) {
              const query = match[1] || "";
              const from = $from.pos - query.length - 1; // -1 for the /
              const to = $from.pos;
              return {
                active: true,
                query,
                range: { from, to },
                decorationSet: DecorationSet.empty,
              };
            }

            return { active: false, query: "", range: { from: 0, to: 0 }, decorationSet: DecorationSet.empty };
          },
        },
        props: {
          handleKeyDown(view, event) {
            const state = slashCommandPluginKey.getState(view.state) as SlashCommandState;
            if (!state?.active) return false;

            // Let the React component handle these keys
            if (["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(event.key)) {
              return false; // Don't prevent — the SlashCommandMenu listens on document
            }

            return false;
          },
        },
      }),
    ];
  },
});

export function getSlashCommandState(editorState: any): SlashCommandState | null {
  return slashCommandPluginKey.getState(editorState) as SlashCommandState | null;
}
