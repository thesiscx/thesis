import { Node, mergeAttributes } from '@tiptap/core';

export interface EmbedOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    embed: {
      setEmbed: (options: { src: string }) => ReturnType;
    };
  }
}

// Convert common video share URLs to embed URLs
const normalizeEmbedUrl = (url: string): string => {
  // YouTube
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (youtubeMatch) {
    return `https://www.youtube-nocookie.com/embed/${youtubeMatch[1]}`;
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  // Loom
  const loomMatch = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
  if (loomMatch) {
    return `https://www.loom.com/embed/${loomMatch[1]}`;
  }

  // Wistia
  const wistiaMatch = url.match(/wistia\.com\/medias\/([a-zA-Z0-9]+)/);
  if (wistiaMatch) {
    return `https://fast.wistia.net/embed/iframe/${wistiaMatch[1]}`;
  }

  // Mux - typically already in embed format or needs stream URL
  // Return as-is for Mux and other providers
  return url;
};

export const Embed = Node.create<EmbedOptions>({
  name: 'embed',

  group: 'block',

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-embed]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, { 'data-embed': '' }),
      [
        'iframe',
        mergeAttributes(HTMLAttributes, {
          src: HTMLAttributes.src,
          frameborder: '0',
          allowfullscreen: 'true',
          allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
          style: 'width: 100%; aspect-ratio: 16/9; border-radius: 8px;',
        }),
      ],
    ];
  },

  addCommands() {
    return {
      setEmbed:
        (options) =>
        ({ commands }) => {
          const normalizedSrc = normalizeEmbedUrl(options.src);
          return commands.insertContent({
            type: this.name,
            attrs: { src: normalizedSrc },
          });
        },
    };
  },
});
