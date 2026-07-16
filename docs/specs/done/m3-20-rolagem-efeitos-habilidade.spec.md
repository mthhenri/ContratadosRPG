# m3-20-rolagem-efeitos-habilidade.spec.md

> Task 20 do milestone `m3-ficha-jogador.spec.md`. Quarta do pacote **Rolagem v2**
> (`m3-16` gramática → `m3-18` dano tipado → `m3-19` teste → **`m3-20` efeitos** → `m3-21` presets →
> `m3-22` frontend). Depende de m3-18 e m3-19.

> **Regras de jogo:** `docs/core/sistema-v4.1.0.md` — "Habilidades" (ex.: **Força Bruta [4 E]**:
> "Soma sua Força × 3 no dano de ataques físicos"). **O documento vence.**

## Objetivo

Dar às habilidades **efeitos legíveis por máquina** (hoje só têm `descricao` em texto), espelhando o
modelo estruturado das modificações de item (`ModificacaoEfeitoDto`). Assim um preset (m3-21) pode
**aplicar** o efeito de uma habilidade na fórmula — ex.: Força Bruta soma FOR × 3 ao dano.

## Entregáveis

### 1. Enums (`shared/src/enums/`, exportados em `index.ts`)

- `RolagemEfeitoTipoEnum`: `DANO_FIXO | DANO_DADOS | DANO_ATRIBUTO | BONUS_TESTE | ELEVAR_DADO`
  (o inédito frente às mods de item é `DANO_ATRIBUTO` = atributo × mult como dano tipado).
- `RolagemEfeitoAlvoEnum`: `TESTE | DANO` (roteia o efeito ao passo certo; ausente = inferido do tipo).

### 2. DTO (`rolagem.dtos.ts`)

`RolagemEfeitoDto` (`tipo`, `valor?`, `faces?`, `atributo?`, `multiplicador?`, `tipoDano?`,
`variante?: 'DADO'|'FIXO'`, `alvo?`) — nomes ecoando `ModificacaoEfeitoDto`.

### 3. Modelo de habilidade

- `FichaHabilidadeDto` += `efeitos?: RolagemEfeitoDto[]` (ausente = só descrição, legado).
- `HabilidadeBaseDto` += `efeitos?` (herdado por `HabilidadeCatalogoItemDto` via `extends`, e o
  spread de `comCategoria` já o repassa). **Semear Força Bruta** no catálogo (FOR × 3 físico, alvo DANO).

### 4. Motor (`rolagem.ts`)

- **`aplicarEfeitos(formula, efeitos, modo?)`** — puro; funde os efeitos cujo `alvo` casa com o modo
  (bônus de teste no `TESTE`, dano no `SOMA`) numa **nova** fórmula interpretada. `DANO_ATRIBUTO`
  adiciona um termo de atributo escalado tipado; `DANO_FIXO`/`DANO_DADOS` adicionam constante/dados
  tipados; `BONUS_TESTE` soma D20 ao pool (`DADO`) ou constante (`FIXO`); `ELEVAR_DADO` sobe as faces
  via `elevarDado` (reuso de `regras/descanso`).
- **`rolarInterpretada(formula, atributos, modo?, proficiencia?, rolarDado?)`** — extraído de
  `rolarFormula` (que agora é interpretar + `rolarInterpretada`), permite rolar uma fórmula já com
  efeitos fundidos (base do runner de m3-21). Helper `abreviacaoAtributo` em `rolagem.dados`.

## Casos de teste — 6 novos, 244 no total

`aplicarEfeitos`: Força Bruta soma FOR × 3 (Físico 34) · `DANO_FIXO` (Balístico 14) · `ELEVAR_DADO`
(D8→D10) · `BONUS_TESTE` DADO (+D20 no pool) e FIXO (+constante) · **roteamento por alvo** (efeito de
DANO ignorado num passo de TESTE). Catálogo: Força Bruta carrega o efeito estruturado.

## Fora de escopo (próximas tasks)

Ligar habilidades a presets, gastar energia e rodar o encadeamento (m3-21); UI de edição de efeitos
e cópia do catálogo p/ ficha (m3-22). Só **Força Bruta** foi semeada — as demais habilidades ganham
efeito estruturado incrementalmente (via UI ou seeds futuras); sem efeito, seguem como texto.
