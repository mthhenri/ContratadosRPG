// tailwind.config.ts  —  TRECHO a mesclar no seu tailwind.config existente.
// Aponta os utilitários do Tailwind para as MESMAS CSS custom properties de _tokens.scss,
// para que classe utilitária e SCSS/BEM nunca divirjam. Não duplique valores hex aqui.

import type { Config } from 'tailwindcss';

const config: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: {
          DEFAULT: 'var(--surface)',
          2: 'var(--surface-2)',
        },
        border: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)',
        },
        text: {
          DEFAULT: 'var(--text)',
          dim: 'var(--text-dim)',
          mute: 'var(--text-mute)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          dim: 'var(--accent-dim)',
        },
        energy: 'var(--energy)',
        positive: 'var(--positive)',
        warning: 'var(--warning)',
      },
      fontFamily: {
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        label: '0.12em',
      },
      borderRadius: {
        card: '6px',
        control: '4px',
      },
    },
  },
};

export default config;
