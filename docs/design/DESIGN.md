# DESIGN.md — Tema "Terminal de Contenção" (handoff para o repo)

Este pacote traduz o tema de design dos protótipos para a stack real do
`mthhenri/ContratadosRPG` (Angular 21 · PrimeNG 21 · Tailwind · SCSS + BEM em português).
**Nenhum valor é inventado** — tudo espelha o bloco "TEMA VISUAL" do `CLAUDE.md` do design.

## Princípio

`_tokens.scss` (CSS custom properties) é a **única fonte de verdade em runtime**.
Tailwind e o preset PrimeNG apenas *apontam* para essas vars — nunca redeclaram hex.
Trocar o `--accent` (spec M1: presets + color picker) muda tudo de uma vez.

> **Identidade x trocável:** o *dark base* e a família *IBM Plex* são a identidade e não
> mudam. Só o `--accent` é trocável (com trava de contraste, conforme M1).

## O que vai em cada arquivo, e onde colocar

Assumindo o app Angular em `apps/web/` (ajuste ao seu layout de monorepo):

- **`tema/_tokens.scss`** → `apps/web/src/styles/tema/_tokens.scss`
  As CSS custom properties. Importe PRIMEIRO no `styles.scss` global:
  `@use 'tema/tokens';`

- **`tema/_base.scss`** → `apps/web/src/styles/tema/_base.scss`
  Reset de body, fontes IBM Plex, o grid de textura e a **scrollbar customizada global**
  (ver "Scrollbar" abaixo). Importe DEPOIS dos tokens.
  Instale as fontes: `npm i @fontsource/ibm-plex-mono @fontsource/ibm-plex-sans`
  (ou use o `<link>` do Google Fonts — instruções no topo do arquivo).

- **`tema/_componentes.scss`** → biblioteca de referência.
  Copie o bloco BEM que precisar (`.card`, `.stat`, `.stepper`, `.chip-classificacao`…)
  para o SCSS do componente standalone correspondente. Não precisa importar inteiro.

- **`tema/tailwind.config.ts`** → **mescle** o `theme.extend` no seu
  `tailwind.config.ts` existente (cores, fontes, radius, tracking apontando p/ as vars).

- **`tema/contencao.preset.ts`** → `apps/web/src/styles/tema/contencao.preset.ts`
  Preset PrimeNG (base Aura). Registre no bootstrap:
  ```ts
  providePrimeNG({
    theme: { preset: ContencaoPreset, options: { darkModeSelector: '.dark' } }
  });
  ```
  E deixe `.dark` no `<html>` (dark-first).

## Ordem de import no styles.scss global

```scss
@use 'tema/tokens';       // 1. CSS custom properties (obrigatório primeiro)
@use 'tema/base';         // 2. body, fontes, textura
// componentes: cada componente importa/escreve seu próprio SCSS BEM
```

## Mapa de tokens (resumo)

- Superfícies: `--bg` fundo · `--surface` cards · `--surface-2` caixas internas/inputs
- Bordas hairline: `--border` · controle: `--border-strong`
- Texto: `--text` · `--text-dim` · `--text-mute`
- Accent (trocável): `--accent` + `--accent-dim` (12%) + `--accent-border` (40%)
- Semânticas: `--energy` #4c8dd0 · `--positive` #4a9d6b · `--warning` #d9a441
- Tipografia: `--font-mono` (dados/títulos/rótulos) · `--font-sans` (corpo)
- Forma: `--radius-card` 6px · `--radius-control` 4px
- Densidade confortável: `--pad-card` 20px · `--gap-grid` 16px

## Scrollbar (padrão global)

O tema **não usa a barra de rolagem nativa** do navegador em lugar nenhum — ela destoa da
estética "técnica, sóbria, fria". O padrão canônico vive em **`tema/_base.scss`** (não em
`_componentes.scss`, porque é regra **global**, não um bloco para copiar por componente) e vale
para todo container com overflow — scroll geral, os modais, tabelas e o textarea de código — sem
precisar ser repetido por componente.

- **Thumb:** `--surface-2` com contorno `--border-strong`, raio `--radius-control`. Fino
  (`width`/`height: 10px`). No `:hover`, o contorno passa a `--accent-border` (realce sutil —
  **nunca** `--accent` sólido, reservado para ação/estado ativo).
- **Track / corner:** transparentes.
- **Cross-browser:** `::-webkit-scrollbar-*` (Chrome/Edge/Safari) + `scrollbar-width: thin` e
  `scrollbar-color: var(--border-strong) transparent` (Firefox e a spec padrão).
- **Só tokens** (`--surface-2`/`--border-strong`/`--accent-border`) → segue legível e discreto nas
  duas bases (clara/escura) do tema em runtime, que sobrescrevem esses tokens. Nenhum hex solto
  (proibição #29).

Telas futuras (ficha de jogador/criatura, guia de missão) herdam esse padrão automaticamente —
**não reintroduzir a scrollbar nativa** nem restilizá-la localmente por componente.

## Foco de teclado (padrão global)

Mesmo racional da scrollbar: definido **uma vez** em `tema/_base.scss`, não repetido por
componente. Todo `a`/`button` ganha um `outline: 2px solid var(--accent-border)` (com
`outline-offset: 2px`) em `:focus-visible` — navegação por teclado consistente com a identidade,
em vez do outline padrão (inconsistente) do navegador. Inputs/textarea ficam de fora dessa regra
global porque já têm o próprio tratamento de `:focus` (borda `--accent-border`) definido por
página — um outline extra ali duplicaria o sinal.

Telas futuras herdam esse padrão automaticamente — não reintroduzir `outline: none` sem repor um
tratamento de foco equivalente.

## Referência visual

Os protótipos aprovados (mesmos tokens) servem de referência 1:1 para o dev reproduzir:
- `Calculadora de Atributos.dc.html` — steppers, stat grid, cabeçalho de seção
- `Ficha de Jogador.dc.html` — barras Vida/Energia, inventário, chips
- `Ficha de Criatura.dc.html` — layout denso, modificadores, resistências
