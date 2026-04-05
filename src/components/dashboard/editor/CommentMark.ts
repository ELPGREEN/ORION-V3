import { Mark, mergeAttributes } from "@tiptap/react";

export const CommentMark = Mark.create({
  name: "comment",

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-comment-id"),
        renderHTML: (attrs) => {
          if (!attrs.commentId) return {};
          return { "data-comment-id": attrs.commentId };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-comment-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        class: "comment-highlight",
        style:
          "background-color: hsl(48 96% 89% / 0.6); border-bottom: 2px solid hsl(48 96% 53%); cursor: pointer;",
      }),
      0,
    ];
  },
});
