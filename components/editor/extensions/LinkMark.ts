import { Mark, mergeAttributes } from "@tiptap/react";

export const LinkMark = Mark.create({
  name: "link",
  priority: 1000,
  keepOnSplit: false,

  addAttributes() {
    return {
      href: {
        default: null,
      },
      target: {
        default: null,
      },
      class: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'a[href]:not([href*="javascript:"])',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const isNodus = typeof HTMLAttributes.href === "string" && HTMLAttributes.href.startsWith("nodus://");
    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        class: isNodus
          ? "nodus-link text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary font-medium cursor-pointer transition-colors"
          : "external-link text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary font-medium transition-colors",
        target: isNodus ? undefined : "_blank",
        rel: isNodus ? undefined : "noopener noreferrer nofollow",
      }),
      0,
    ];
  },
});
