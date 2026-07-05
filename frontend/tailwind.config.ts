// tailwind.config.ts — configuração do Tailwind do frontend.
// O `theme.extend` é mesclado a partir do handoff de design (docs/design/tema/tailwind.config.ts):
// os utilitários apontam para as MESMAS CSS custom properties de docs/design/tema/_tokens.scss
// (espelhadas em src/styles/tema/_tokens.scss), para que utilitário Tailwind e SCSS/BEM nunca
// divirjam. Nada de hex/fonte/raio solto aqui (proibições #29 do CLAUDE.md). Tailwind cobre
// layout/espaçamento; a identidade visual continua vindo dos tokens e do preset PrimeNG.

import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{html,ts}'],
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
