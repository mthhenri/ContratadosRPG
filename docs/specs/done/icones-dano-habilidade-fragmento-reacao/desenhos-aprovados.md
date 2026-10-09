# Desenhos aprovados — ícones de dano, habilidade, fragmento e reação

Fonte dos desenhos: pranchas em `docs/specs/active/icones-recursos-sistema/` (a votação completa está em `votacao-prancha.md` na mesma pasta). Cada bloco abaixo é o **miolo do SVG** (viewBox 24×24, `fill:none; stroke:currentColor; stroke-linecap/linejoin: round`) exatamente como aprovado na prancha. São desenhos de prancha: o refino do traço faz parte da implementação.

O nome do ícone é o valor proposto para `IconeNome`.

## `dano-fisico` — Físico

- Opção aprovada: **Punho** (rodada 1, `prancha-icones.html`).
- Refino: Punho de frente; refinar a proporção dos dedos e do polegar.

```svg
<path d="M6 11V8.5a1.5 1.5 0 0 1 3 0V8a1.5 1.5 0 0 1 3 0 1.5 1.5 0 0 1 3 0 1.5 1.5 0 0 1 3 0V15a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z"/><path d="M6 11l-1.5 3.5A3 3 0 0 0 7 18M9 11v3M12 10v4M15 10v4"/>
```

## `dano-balistico` — Balístico

- Opção aprovada: **Projétil** (rodada 1, `prancha-icones.html`).

```svg
<path d="M9 21v-9c0-3 1.5-5.5 3-7.5 1.5 2 3 4.5 3 7.5v9z"/><path d="M9 17h6"/>
```

## `dano-explosao` — Explosão

- Opção aprovada: **Estouro duplo** (rodada 5, `prancha-icones-rodada-5.html`).
- Refino: Estouro duplo: o estouro interno é o externo escalado (0,42) com traço compensado. No glifo final, assar a geometria interna já escalada para o traço seguir uniforme nos três tamanhos.

```svg
<path d="M12 2l2 5 5-2-2 5 5 2-5 2 2 5-5-2-2 5-2-5-5 2 2-5-5-2 5-2-2-5 5 2z"/><g transform="translate(12 12) scale(0.42) translate(-12 -12)"><path stroke-width="4.2" d="M12 2l2 5 5-2-2 5 5 2-5 2 2 5-5-2-2 5-2-5-5 2 2-5-5-2 5-2-2-5 5 2z"/></g>
```

## `dano-quimico` — Químico

- Opção aprovada: **Béquer** (rodada 1, `prancha-icones.html`).

```svg
<path d="M7 4h10M8 4v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V4M8 11h8"/><path d="M11 15h.01M13.5 14h.01"/>
```

## `dano-geral` — Geral

- Opção aprovada: **Escudo rachado** (rodada 1, `prancha-icones.html`).

```svg
<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M12 3v6l-2 3 3 3-1 6"/>
```

## `dano-composto` — Composto

- Opção aprovada: **Metade a metade** (rodada 1, `prancha-icones.html`).
- Refino: Usado também no Composto com dois tipos; o ícone é do conceito, não da combinação.

```svg
<circle cx="12" cy="12" r="8"/><path d="M12 4v16M12 8h4M12 12h4M12 16h4"/>
```

## `habilidade-geral` — Geral

- Opção aprovada: **Estrela** (rodada 1, `prancha-icones.html`).

```svg
<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.3l6.1-.7z"/>
```

## `habilidade-geral-melhorada` — Geral Melhorada

- Opção aprovada: **Estrela sobre base** (rodada 1, `prancha-icones.html`).

```svg
<path d="M12 3l2.2 4.8 5.2.6-3.9 3.6 1 5.1L12 14.4l-4.5 2.7 1-5.1-3.9-3.6 5.2-.6z"/><path d="M5 21h14"/>
```

## `habilidade-classe` — Classe

- Opção aprovada: **Bandeira** (rodada 1, `prancha-icones.html`).
- Refino: Bandeira da categoria; não confundir com os ícones de identidade das classes (m10-03).

```svg
<path d="M6 21V4M6 4h12l-3 4 3 4H6"/>
```

## `habilidade-arquetipo` — Arquétipo

- Opção aprovada: **Árvore** (rodada 1, `prancha-icones.html`).

```svg
<path d="M12 21v-8M12 13L7 8M12 13l5-5"/><circle cx="7" cy="6" r="2"/><circle cx="17" cy="6" r="2"/>
```

## `habilidade-subclasse` — Subclasse

- Opção aprovada: **Ramo fundo** (rodada 1, `prancha-icones.html`).

```svg
<path d="M12 21v-6M12 15l-5-5V4M12 15l5-5V4"/>
```

## `habilidade-outra-classe` — Outra classe

- Opção aprovada: **Troca** (rodada 1, `prancha-icones.html`).

```svg
<path d="M4 8h14l-3-3M20 16H6l3 3"/>
```

## `habilidade-personalidade` — Personalidade

- Opção aprovada: **Silhueta** (rodada 1, `prancha-icones.html`).

```svg
<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>
```

## `habilidade-especialidade` — Especialidade

- Opção aprovada: **Medalha** (rodada 1, `prancha-icones.html`).

```svg
<circle cx="12" cy="9" r="5"/><path d="M8.5 13.5L7 21l5-3 5 3-1.5-7.5"/>
```

## `habilidade-civil` — Civil

- Opção aprovada: **Crachá** (rodada 1, `prancha-icones.html`).

```svg
<path d="M3 6h18v12H3z"/><circle cx="8" cy="11" r="1.6"/><path d="M5 16c.5-2 3.5-2 6 0M13 10h5M13 14h4"/>
```

## `habilidade-unica` — Única

- Opção aprovada: **Gema** (rodada 1, `prancha-icones.html`).

```svg
<path d="M6 4h12l4 6-10 11L2 10z"/><path d="M2 10h20M9 4l3 6 3-6"/>
```

## `fragmento-construtor` — Construtor

- Opção aprovada: **Prisma** (rodada 2, `prancha-icones-rodada-2.html`).
- Refino: Prisma. Substitui o desenho atual do nome já existente (diamante com selo de martelo).

```svg
<path d="M12 2l5 4v10l-5 6-5-6V6z"/><path d="M12 22V10M7 6l5 4 5-4"/>
```

## `fragmento-potencializador` — Potencializador

- Opção aprovada: **Cristal radiante** (rodada 1, `prancha-icones.html`).
- Refino: Cristal radiante. Substitui o desenho atual do nome já existente (diamante com selo de estrela).

```svg
<path d="M12 5l6 6-6 9-6-9z"/><path d="M6 11h12M3 4l1.5 1.5M21 4l-1.5 1.5M12 1v1.5"/>
```

## `reacao-esquiva` — Esquiva

- Opção aprovada: **Vento** (rodada 1, `prancha-icones.html`).

```svg
<path d="M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h6"/>
```

## `reacao-bloqueio` — Bloqueio

- Opção aprovada: **Escudo e impacto** (rodada 1, `prancha-icones.html`).
- Refino: Escudo de contorno com marcas de golpe; precisa se distinguir do Escudo rachado de Geral e do Contra-ataque a 16px.

```svg
<path d="M13 3l7 2.5v5c0 4-2.8 7.2-7 9-4.2-1.8-7-5-7-9v-5z"/><path d="M3 9h3M2 13h4"/>
```

## `reacao-contra-ataque` — Contra-ataque

- Opção aprovada: **Espada larga** (rodada 4, `prancha-icones-rodada-4.html`).
- Refino: Espada larga atrás do escudo. A prancha usa <mask> para a lâmina sumir atrás do escudo; no glifo final, assar a geometria (segmentos visíveis da lâmina) em vez de mask com id, para não colidir com várias instâncias.

```svg
<mask id="mA" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><rect width="24" height="24" fill="#fff"/><path d="M12 8l4 1.4v3.6c0 2.3-1.6 3.8-4 4.9-2.4-1.1-4-2.6-4-4.9V9.4z" fill="#000" stroke="#000" stroke-width="2.8" stroke-linejoin="round"/></mask><g mask="url(#mA)"><g transform="translate(1 -1) rotate(45 12 12)"><path d="M10.6 6v17l1.4 3 1.4-3V6z"/><path d="M12 8v13"/><path d="M8.3 5.5h7.4"/><path d="M12 5.5V2"/><path d="M12.9 1.2a.9.9 0 1 1-1.8 0 .9.9 0 0 1 1.8 0"/></g></g><path d="M12 8l4 1.4v3.6c0 2.3-1.6 3.8-4 4.9-2.4-1.1-4-2.6-4-4.9V9.4z"/>
```
