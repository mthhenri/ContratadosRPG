# m3-35-ficha-fragmentos-inventario.spec.md

> Task 32 do milestone `m3-ficha-jogador.spec.md`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

> **Antes de codar:** reler `docs/core/sistema-v4.1.0.md` (seção Fragmentos, ~linhas
> 1894-1920) pra confirmar os números exatos de custo de energia e a tabela completa de
> bônus por módulo/categoria — o texto abaixo é um resumo de trabalho, o documento vence.

## Objetivo

Dar um mecanismo real de consumo/aplicação a fragmentos (`ItemCategoriaEnum.FRAGMENTO_
CONSTRUTOR`/`FRAGMENTO_POTENCIALIZADOR`), incluindo o custo em Energia descrito no
documento. Hoje fragmentos só existem como item de catálogo com um seletor de módulo, sem
nenhum efeito mecânico.

## Entregáveis

1. `ModificacaoAplicadaDto` (`shared/src/regras/compras/compras.dtos.ts`) ganha
   `readonly origemFragmento?: { readonly tipo: FragmentoTipoEnum; readonly modulo: FragmentoModuloEnum };`
   pra distinguir mods de origem fragmento sem string-matching em `nome`.
2. Nova tabela de dados `shared/src/regras/dados/fragmento-bonus.dados.ts` (padrão de
   `compras.dados.ts`/`patente.dados.ts`): por (tipo, módulo, categoria-alvo), lista de
   opções de bônus selecionáveis (dano, teste, ou — pra Proteções — resistência+Esquiva/
   Bloqueio/Defesa). Função pura `listarBonusFragmento(dto)`.
3. Funções puras de custo de energia: aquisição do módulo debita Energia Máxima
   (permanente); acoplar debita Energia atual + Energia Máxima do módulo; remover debita
   Energia atual ×2 (sem devolver Energia Máxima nem ressuscitar o fragmento).
4. Verificar se `calcularStatItem` já soma efeitos `DEFESA` (como já soma `RESISTENCIA`) —
   se for só chip decorativo hoje, estender pra realmente agregar, já que o bônus de
   Proteção do exemplo (Módulo I) depende disso alimentar o Combate (`m3-36`).
5. UI no `ficha-inventario`:
   - Adicionar fragmento ao inventário já debita a Energia Máxima da aquisição.
   - Ação "Aplicar em..." em fragmentos Potencializador: escolhe item-alvo compatível →
     escolhe UMA opção de bônus → confirma empurra o `ModificacaoAplicadaDto`
     (`ignoraLimiteTotal`/`ignoraLimiteProprio: true`) no item alvo, remove/decrementa o
     fragmento do inventário, debita Energia atual + Energia Máxima do módulo.
   - Mods de origem fragmento aparecem nos chips do item alvo (reusar
     `descreverEfeitosModificacao`) com badge diferenciado; ação "Remover" estorna a mod e
     debita Energia atual ×2.
   - Fragmentos Construtor: passe de clareza no formulário de item customizado deixando
     explícito que ali o fragmento *é* a peça (via `categoriaEmprestada`), distinto do
     fluxo de aplicar-em-outro-item do Potencializador.

## Critérios de Aceite

- Aplicar um fragmento Potencializador soma o bônus escolhido no item alvo (chip visível,
  stat recalculada) e remove o fragmento do inventário avulso.
- Energia debitada corretamente nos 3 momentos (adquirir/acoplar/remover).
- Mods de fragmento não contam pro limite de modificações da patente.
- Remover reverte a mod do item mas não devolve um fragmento avulso.

## Fora de Escopo

- Qualquer mudança no fluxo de venda de fragmentos (`shared/src/regras/compras/venda.ts`,
  usado só pela calculadora M1) — permanece intocado.

## Dependências

- `m3-14` (editor de Inventário), tabela de patente/limite de modificações já existente.
