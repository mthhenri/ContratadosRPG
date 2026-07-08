# m3-01-contrato-ficha-jogador-dados.spec.md

> Task 1/9 do milestone `m3-ficha-jogador.spec.md`.

## Objetivo

Fechar a **forma final do documento JSONB `ficha.dados`** para a ficha de jogador — o
contrato tipado `FichaJogadorDadosDto` em `shared/src/dtos/ficha/`, derivado de
`docs/core/sistema-v4.1.0.md` — e sincronizar `SCHEMA.md`. Pura camada `shared/`: sem
migration, sem service, sem endpoint, sem frontend. É a fundação que o backend (validação
autoritativa) e o frontend (cálculo/exibição ao vivo) consomem.

## Entregáveis

1. **`FichaJogadorDadosDto` + sub-DTOs** em `shared/src/dtos/ficha/` (novo subpath export
   `./dtos/ficha` no `package.json`), forma final derivada do sistema v4.1.0: `classe`
   (`ClasseEnum`), arquétipo/subclasse, `nivel`, `prestigio`, `atributos`
   (vigor/destreza/força/vontade), `sentidos`, `estado` (vida atual, energia atual,
   traumas, lesões), `habilidades`, `inventario` e `anotacoes`. **Reusar** os enums de
   conteúdo de jogo já existentes no shared (`ClasseEnum`, `PatenteEnum`,
   `ItemCategoriaEnum`…) — nunca redefinir (proibição #21).
2. **Inventário reusa o formato do carrinho da calculadora M1** (itens + modificações +
   amplificadores) — mesmo contrato tipado do `shared/regras/compras`, sem duplicar tipos.
3. **Validação estrutural class-validator** (`@IsEnum`, `@IsInt`, ranges, `@ValidateNested`)
   — camada 1 (SYSTEM.SPEC §11). Os enums de conteúdo de jogo vivem **dentro** do JSONB →
   **sem** tabela `tipo_*` (§10.3), validados por `@IsEnum`.
4. **Nenhum derivado persistido.** Vida máxima, energia máxima, defesa, deslocamento, dano
   de corpo, dano furtivo, limite de inventário, percepção, etc. **não** entram no
   documento — são calculados por `shared/regras` a partir de classe/nível/atributos, no
   front (exibição) e no back (validação de coerência). Documentar isso no contrato.
5. **`SCHEMA.md`** — seção "Forma dos documentos JSONB" atualizada do rascunho para a forma
   **final** da ficha de jogador (remover o marcador "esboço — fechar no M3").
6. Cada campo, faixa e limite conferido contra `docs/core/sistema-v4.1.0.md` — **o documento
   vence o código** (§16 #27).

## Critérios de Aceite

- `FichaJogadorDadosDto` compila no `shared`, exportado via subpath, consumível por backend
  e frontend sem redefinição.
- Forma bate 1:1 com `sistema-v4.1.0.md` (classe/atributos/estado/inventário) e o inventário
  reusa o formato de carrinho da calculadora M1 (sem tipo duplicado).
- `SCHEMA.md` reflete a forma final; nenhum campo derivado persistido.
- **Nenhum** service, repository, migration, endpoint ou frontend nesta task.

## Fora de Escopo

- Tabelas e migrations (`m3-02`).
- Validação dos dados via motor de regras no service (`m3-03`).
- `FichaCriaturaDadosDto` / NPC (M4).

## Dependências

- M1: `shared/regras` completo, enums de conteúdo de jogo e o formato de inventário da
  calculadora de compras.
- Rascunho atual em `SCHEMA.md` (seção "Forma dos documentos JSONB").
