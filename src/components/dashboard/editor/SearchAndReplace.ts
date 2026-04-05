import { Extension } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface SearchAndReplaceStorage {
  searchTerm: string;
  replaceTerm: string;
  results: { from: number; to: number }[];
  currentIndex: number;
  caseSensitive: boolean;
  updateSearch: (editor: any) => void;
}

const searchAndReplacePluginKey = new PluginKey("searchAndReplace");

function findMatches(doc: any, searchTerm: string, caseSensitive: boolean) {
  const results: { from: number; to: number }[] = [];
  if (!searchTerm) return results;

  const search = caseSensitive ? searchTerm : searchTerm.toLowerCase();
  doc.descendants((node: any, pos: number) => {
    if (!node.isText) return;
    const text = caseSensitive ? node.text! : node.text!.toLowerCase();
    let index = text.indexOf(search);
    while (index !== -1) {
      results.push({ from: pos + index, to: pos + index + search.length });
      index = text.indexOf(search, index + 1);
    }
  });
  return results;
}

export const SearchAndReplace = Extension.create({
  name: "searchAndReplace",

  addStorage() {
    return {
      searchTerm: "",
      replaceTerm: "",
      results: [] as { from: number; to: number }[],
      currentIndex: -1,
      caseSensitive: false,
      updateSearch: (_editor: any) => {},
    };
  },

  onCreate() {
    const storage = this.storage as SearchAndReplaceStorage;
    const ext = this;

    storage.updateSearch = (editor: any) => {
      storage.results = findMatches(editor.state.doc, storage.searchTerm, storage.caseSensitive);
      storage.currentIndex = storage.results.length > 0 ? 0 : -1;
      editor.view.dispatch(editor.state.tr.setMeta(searchAndReplacePluginKey, { updated: true }));
    };
  },

  addProseMirrorPlugins() {
    const storage = this.storage as SearchAndReplaceStorage;
    return [
      new Plugin({
        key: searchAndReplacePluginKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, oldSet) {
            const meta = tr.getMeta(searchAndReplacePluginKey);
            if (meta) {
              // Explicit update — rebuild from current results
              if (storage.results.length === 0) return DecorationSet.empty;
              const decorations = storage.results.map((match, i) => {
                const cls = i === storage.currentIndex ? "search-result search-result-current" : "search-result";
                return Decoration.inline(match.from, match.to, { class: cls });
              });
              try {
                return DecorationSet.create(tr.doc, decorations);
              } catch {
                return DecorationSet.empty;
              }
            }
            if (tr.docChanged) {
              // Doc changed (typing) — recalculate positions from the new doc
              if (!storage.searchTerm) return DecorationSet.empty;
              storage.results = findMatches(tr.doc, storage.searchTerm, storage.caseSensitive);
              if (storage.currentIndex >= storage.results.length) {
                storage.currentIndex = storage.results.length > 0 ? 0 : -1;
              }
              if (storage.results.length === 0) return DecorationSet.empty;
              const decorations = storage.results.map((match, i) => {
                const cls = i === storage.currentIndex ? "search-result search-result-current" : "search-result";
                return Decoration.inline(match.from, match.to, { class: cls });
              });
              try {
                return DecorationSet.create(tr.doc, decorations);
              } catch {
                return DecorationSet.empty;
              }
            }
            return oldSet;
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});

// Helper functions to manipulate search from outside
export function setSearchTerm(editor: any, term: string) {
  const storage = editor.storage.searchAndReplace as SearchAndReplaceStorage;
  storage.searchTerm = term;
  storage.updateSearch(editor);
}

export function setReplaceTerm(editor: any, term: string) {
  const storage = editor.storage.searchAndReplace as SearchAndReplaceStorage;
  storage.replaceTerm = term;
}

export function setCaseSensitive(editor: any, value: boolean) {
  const storage = editor.storage.searchAndReplace as SearchAndReplaceStorage;
  storage.caseSensitive = value;
  storage.updateSearch(editor);
}

export function goToNextResult(editor: any) {
  const storage = editor.storage.searchAndReplace as SearchAndReplaceStorage;
  if (storage.results.length === 0) return;
  storage.currentIndex = (storage.currentIndex + 1) % storage.results.length;
  editor.view.dispatch(editor.state.tr.setMeta(searchAndReplacePluginKey, { updated: true }));
  try {
    const match = storage.results[storage.currentIndex];
    const dom = editor.view.domAtPos(match.from);
    (dom.node as HTMLElement)?.scrollIntoView?.({ behavior: "smooth", block: "center" });
  } catch { /* ignore */ }
}

export function goToPrevResult(editor: any) {
  const storage = editor.storage.searchAndReplace as SearchAndReplaceStorage;
  if (storage.results.length === 0) return;
  storage.currentIndex = (storage.currentIndex - 1 + storage.results.length) % storage.results.length;
  editor.view.dispatch(editor.state.tr.setMeta(searchAndReplacePluginKey, { updated: true }));
  try {
    const match = storage.results[storage.currentIndex];
    const dom = editor.view.domAtPos(match.from);
    (dom.node as HTMLElement)?.scrollIntoView?.({ behavior: "smooth", block: "center" });
  } catch { /* ignore */ }
}

export function replaceCurrent(editor: any) {
  const storage = editor.storage.searchAndReplace as SearchAndReplaceStorage;
  if (storage.results.length === 0 || storage.currentIndex < 0) return;
  const match = storage.results[storage.currentIndex];
  editor.chain().focus().insertContentAt({ from: match.from, to: match.to }, storage.replaceTerm).run();
  storage.updateSearch(editor);
}

export function replaceAll(editor: any) {
  const storage = editor.storage.searchAndReplace as SearchAndReplaceStorage;
  if (storage.results.length === 0) return;
  const sorted = [...storage.results].sort((a, b) => b.from - a.from);
  const { tr } = editor.state;
  for (const match of sorted) {
    tr.insertText(storage.replaceTerm, match.from, match.to);
  }
  editor.view.dispatch(tr);
  storage.results = [];
  storage.currentIndex = -1;
  editor.view.dispatch(editor.state.tr.setMeta(searchAndReplacePluginKey, { updated: true }));
}

export function clearSearch(editor: any) {
  const storage = editor.storage.searchAndReplace as SearchAndReplaceStorage;
  storage.searchTerm = "";
  storage.replaceTerm = "";
  storage.results = [];
  storage.currentIndex = -1;
  editor.view.dispatch(editor.state.tr.setMeta(searchAndReplacePluginKey, { updated: true }));
}

export default SearchAndReplace;
