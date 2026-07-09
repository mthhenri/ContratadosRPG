# m3-15-ficha-presets-rolagem.spec.md

> Task 15 do milestone `m3-ficha-jogador.spec.md`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Objetivo

Aba **Rolagens** (`m3-11`): **presets de rolagem de dados** salvos na ficha — atalhos que o jogador
monta uma vez (ex.: "Ataque (Luta) = 1d20 + LUT") e reusa. Introduz uma **nova sub-coleção** no
contrato (`rolagens`) e um editor no próprio lugar; opcionalmente, executa a rolagem e mostra o
resultado (motor de dados puro em `shared/regras`).

## Entregáveis

1. **Contrato (shared):** `FichaRolagemDto = { nome: string; formula: string; descricao?: string }`
   e `FichaJogadorDadosDto.rolagens: readonly FichaRolagemDto[]`. Documentar no `SCHEMA.md`
   (já esboçado no bloco `rolagens`). Sem redefinir tipo no back/front (proibição #21/#22).
2. **`shared/regras/dados` (novo, puro, zero-dep):** parser+avaliador de fórmula de dados
   (`NdM (+/− K)` e referências a atributo tipo `+LUT`) → resultado com os dados individuais e o
   total. Motor único consumido por front (rolar) e back (se um dia validar). Testado (Vitest).
3. **Editor no próprio lugar** (padrão granular de `m3-10`): adicionar/editar/remover preset
   (`nome`, `formula`, `descricao?`), com **validação da fórmula** (fórmula inválida = aviso).
   Persiste via `alterarFicha` (otimista).
4. **Rolar** um preset — botão que avalia a fórmula (com os atributos atuais da ficha) e mostra o
   detalhamento (dados + total). Sem persistir histórico nesta task.
5. Standalone, Signals, Reactive Forms, `.scss`/BEM com tokens.

## Critérios de Aceite

- Dono/mestre cria, edita, remove e **rola** presets; recarregar mantém a lista.
- O avaliador de fórmula vive em `shared/regras` (fonte única, zero-dep, testado); nada de regra de
  dados no componente.
- Fórmula inválida não quebra a tela — vira aviso.

## Fora de Escopo

- Histórico/log de rolagens e rolagem compartilhada em tempo real (candidata a M-futuro / `m3-08`).
- Aleatoriedade determinística/seed — rolagem real do navegador basta aqui.

## Dependências

- `m3-10` (edição granular), `m3-11` (aba Rolagens), M1 (padrão de `shared/regras` puro e testado).
