// contencao.preset.ts
// Preset de tema PrimeNG 21 — "Terminal de Contenção" (Contratados RPG).
// Baseado em Aura. Mapeia as CSS custom properties do tema para os tokens do PrimeNG.
// O accent é trocável em runtime (spec M1: presets + color picker); o dark base e a
// família tipográfica IBM Plex são a IDENTIDADE e não devem ser trocados.
//
// Uso (bootstrap standalone, Angular 21):
//   import { providePrimeNG } from 'primeng/config';
//   import { ContencaoPreset } from './styles/tema/contencao.preset';
//   providePrimeNG({ theme: { preset: ContencaoPreset, options: { darkModeSelector: '.dark' } } })

import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';

// Paleta accent gerada a partir de --accent (#d53030). Ao trocar o accent via color
// picker, regenere estes tons (a spec M1 exige trava de contraste — validar 50/500/900).
export const ContencaoPreset = definePreset(Aura, {
  primitive: {
    // Escala neutra fria do tema (dark base). Mesmos valores das CSS vars em _tokens.scss.
    contencao: {
      bg: '#0a0c0f',
      surface: '#13161b',
      surface2: '#1a1e24',
      border: 'rgba(255,255,255,.07)',
      borderStrong: 'rgba(255,255,255,.12)',
      text: '#e6e8eb',
      textDim: '#969ba3',
      textMute: '#656a72',
    },
  },
  semantic: {
    // --- Tipografia (identidade) ---
    // Registre as fontes globalmente (ver _base.scss). PrimeNG herda via CSS.
    // Dados/títulos/rótulos/números: IBM Plex Mono · Corpo: IBM Plex Sans.

    // --- Forma (levemente arredondado) ---
    borderRadius: {
      none: '0',
      xs: '3px',
      sm: '4px',   // controles / inputs / botões
      md: '4px',
      lg: '6px',   // cards / painéis
      xl: '6px',
    },

    // --- Accent como primary ---
    primary: {
      50: '#fdf5f5', 100: '#f5cdcd', 200: '#eda6a6', 300: '#e57f7f',
      400: '#dd5757', 500: '#d53030', 600: '#b52929', 700: '#952222',
      800: '#751a1a', 900: '#551313', 950: '#350c0c',
    },

    colorScheme: {
      dark: {
        surface: {
          0: '#ffffff', 50: '#e6e8eb', 100: '#c9ccd1', 200: '#969ba3',
          300: '#656a72', 400: '#4a4f57', 500: '#1a1e24', 600: '#13161b',
          700: '#0f1216', 800: '#0a0c0f', 900: '#07090b', 950: '#050607',
        },
        primary: {
          color: '#d53030',
          contrastColor: '#0a0c0f',   // texto escuro sobre botão accent
          hoverColor: '#dd5757',
          activeColor: '#b52929',
        },
        // Superfícies e texto do conteúdo mapeando os tokens do tema.
        content: {
          background: '#13161b',
          hoverBackground: '#1a1e24',
          borderColor: 'rgba(255,255,255,.07)',
          color: '#e6e8eb',
          hoverColor: '#ffffff',
        },
        text: {
          color: '#e6e8eb',
          mutedColor: '#969ba3',
        },
        formField: {
          background: '#1a1e24',
          borderColor: 'rgba(255,255,255,.12)',
          hoverBorderColor: 'rgba(255,255,255,.2)',
          focusBorderColor: '#d53030',
          color: '#e6e8eb',
          placeholderColor: '#656a72',
          borderRadius: '4px',
        },
      },
    },
  },
});

// Cores semânticas de domínio (NÃO são do PrimeNG — use via CSS var / classe utilitária):
//   --energy   #4c8dd0   (Energia)
//   --positive #4a9d6b   (dano furtivo / ganho)
//   --warning  #d9a441   (aviso / prestígio)
