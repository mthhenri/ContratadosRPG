# Verificação — regras-visual-09 (contraste dos rótulos na base clara)

## Decisão e escopo

Em vez de escurecer `--warning`, `--help`, `--energy` ou `--vida` (101 consumidores de `color: var(--warning|help|energy…)`
entre texto, ícone, borda e fundo), foram criados **tokens de cor de texto**: `--vida-texto`, `--energy-texto`,
`--warning-texto`, `--help-texto`. Na base escura valem a própria cor (nenhuma mudança). Na clara, `TemaService.TOKENS_CLARO`
os escurece em direção a `--text` (80% / 70% / 50% / 70% da cor), mesmo recurso de `--cor-ficha-legivel` e do precedente
`--dano-geral` (P-113). A paleta canônica e o espelho de valores ficam intactos; os tokens novos entram em
`frontend/src/styles/tema/_tokens.scss`, `docs/design/tema/_tokens.scss` e `docs/design/DESIGN.md`.

Consumidores trocados para o token de texto (só a cor do **texto** do rótulo): `regras-destaque` (Habilidade inicial e
Custo do experimento) e a variante `faixa` do `Stat` (rótulo de Vida e Energia; único uso real é `regras-saude`, ou seja,
os cartões Vida/Energia inicial das classes, subclasses e arquétipos). Ícone, faixa lateral, borda e fundo continuam na cor
crua. `Vida inicial`, que a auditoria não listou, foi incluída por dividir o mesmo tratamento (4,28:1 antes), conforme o
item 4 da spec. Os demais usos de `color: var(--vida|energy|positive)` em valores numéricos grandes do `Stat` não foram
tocados (fora do recorte: texto grande, outros fundos). `--positive` na faixa não existe.

## Contraste (base clara, fundo composto lido do DOM, luminância sRGB)

| Rótulo, 11px | Antes | Depois (cor → fundo) |
|---|---|---|
| Habilidade inicial | 1,87:1 | 5,21:1 (rgb 117,92,45 → 236,234,229) |
| Custo do experimento | 3,22:1 | 5,29:1 (rgb 114,90,153 → 247,244,251) |
| Energia inicial | 3,05:1 | 5,02:1 (rgb 59,105,153 → 238,240,243) |
| Vida inicial | 4,28:1 | 5,79:1 (rgb 174,43,44 → 238,240,243) |

Base escura conferida no app: os sete rótulos mantêm exatamente `rgb(217,164,65)`, `rgb(155,120,208)`, `rgb(76,141,208)` e
`rgb(213,48,48)` — fidelidade preservada.

## Testes

`ng test` Regras 302/302; `tema.service.spec` com novo caso (a base clara escreve os quatro tokens e a escura não escreve);
Stat e tema 38/38; `node --test scripts/*.test.mjs` 89 aprovados e as mesmas 3 falhas preexistentes de estilo;
`repo:verificar` aprovado.

## Limites

- Medição por DOM/estilo computado em Sistema → Experimento Híbrido (largura responsiva do painel do navegador, sem viewport emulado); o
  efeito é só de cor, independente de viewport, e os rótulos são o mesmo componente em 1920, 960 e 360. Não foram
  inspecionados esses viewports separadamente nem o painel flutuante maximizado.
- Capturas de tela do painel do navegador saíram corrompidas; sem imagem. As transições ficam congeladas no navegador
  embutido e foram desligadas por CSS injetado só na sessão de teste (a primeira leitura, no início da transição, deu cor
  quase preta e foi descartada).
- Rótulos "Habilidade inicial" e "Custo do experimento" estavam em abas/painéis não visíveis no momento da leitura; o estilo
  computado vale igual quando a aba é aberta. Não é certificação de acessibilidade de todo o tema.
