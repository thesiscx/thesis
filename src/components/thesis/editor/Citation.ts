import { Mark, mergeAttributes } from '@tiptap/core';

export interface CitationOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    citation: {
      setCitation: (attributes: { tooltip: string }) => ReturnType;
      toggleCitation: (attributes: { tooltip: string }) => ReturnType;
      unsetCitation: () => ReturnType;
    };
  }
}

export const Citation = Mark.create<CitationOptions>({
  name: 'citation',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      tooltip: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-tooltip'),
        renderHTML: (attributes) => {
          if (!attributes.tooltip) {
            return {};
          }
          return {
            'data-tooltip': attributes.tooltip,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-citation]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-citation': '',
        class: 'citation-mark',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setCitation:
        (attributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes);
        },
      toggleCitation:
        (attributes) =>
        ({ commands }) => {
          return commands.toggleMark(this.name, attributes);
        },
      unsetCitation:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },
});

export default Citation;
