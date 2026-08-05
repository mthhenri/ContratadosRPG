# m3-65-fragmentos-tabela-construtor.spec.md

> Task do milestone `m3-ficha-jogador.spec.md`. Continuação do lote de Fragmentos (`m3-35`, `m3-42`).

> **Antes de codar:** reler `docs/core/sistema-v4.1.0.md` — "⬦ Construtor" (~1944-1946) e sua tabela
> de bônus fixos por módulo (~1950). **O documento vence** (proibição #27).

## Objetivo

Um fragmento Construtor hoje vira só uma arma/proteção comum digitada à mão pelo jogador — nenhum
dos bônus fixos por módulo da tabela do doc (dano/teste da arma, recarga+dano da munição,
resistência+Esquiva/Bloqueio/Defesa da proteção) é aplicado automaticamente, e modificações
adicionadas a ele não recebem o dobro de custo / isenção de peso que o doc garante.

## Entregáveis

1. **Tabela de bônus fixos.** Nova tabela em `fragmento.dados.ts` (`BONUS_FIXO_CONSTRUTOR`) cobrindo
   as 3 formas (Arma, Munição, Proteção) × 5 módulos da tabela do doc (~1950), usando os
   `ModificacaoEfeitoTipoEnum` já existentes: `DANO_DADOS_BASE`/`DANO_FIXO` + `BONUS_TESTE` para
   arma, `RESISTENCIA` + `DEFESA` (variantes Esquiva/Bloqueio/Defesa conforme o módulo) para
   proteção. Munição é o caso especial do item 3.
2. **Aplicação automática.** Ao montar um item custom como Fragmento Construtor
   (`escolherTipoFragmento`/`montarItemCustom`, `ficha-inventario.component.ts`), se a categoria
   emprestada (`categoriaEmprestada`) for Arma Corpo a Corpo/Fogo/Exótica/Proteção, gerar a(s)
   modificação(ões) correspondente(s) da tabela automaticamente (com `origemFragmento`, mesmo
   padrão do Potencializador), em vez de depender do jogador digitar os stats certos. Munição não
   modifica um item — ver item 3.
3. **Munição Construtor.** "Dura 1 cena. 'Recarregar' custa N de Energia. Concede +N de dano." —
   modelar como uma ação própria (botão "Recarregar", análogo a "Aplicar em..."/"Consumir" no card
   do item) que debita a Energia do módulo e restabelece o item para a cena; decidir a representação
   de "dura 1 cena" (campo booleano tipo "recarregada" no item, resetável manualmente pelo
   jogador/mestre ao encerrar a cena — sem sistema de cena automatizado no app hoje).
4. **Dobro de custo em modificações do Construtor.** `obterCustoModificacao`/`obterPesoModificacao`
   (`shared/src/regras/compras/compras.ts`) precisam reconhecer
   `item.categoria === ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR` e aplicar dobro de custo + peso zero
   nas modificações adicionadas a ele (doc — "podem receber modificações como sua arma base, com o
   dobro do custo e sem acréscimo de peso"). Cuidado: isso é diferente das modificações **vindas de
   fragmento potencializador aplicado nele** — Construtor não recebe Potencializador (regra já
   coberta pelo filtro de alvo da `m3-63`), então aqui só entram modificações comuns/custom.
5. Testes em `shared` para a tabela e para o dobro de custo/peso; teste de componente para
   "Recarregar" de munição.

## Critérios de Aceite

- Criar um fragmento Construtor Módulo X como Arma/Proteção já nasce com os bônus fixos do módulo
  aplicados, sem o jogador digitar dano/resistência manualmente.
- Munição Construtor tem ação "Recarregar" que debita a Energia certa.
- Uma modificação comum adicionada a um item Construtor custa o dobro e não pesa.

## Fora de Escopo

- Cardápio do Potencializador (`m3-63`/`m3-64`).
- Sistema de cenas/missões automatizado — "dura 1 cena" fica com reset manual.

## Dependências

- `m3-35`, `m3-42` (fragmento Construtor via `categoriaEmprestada`), `m3-63` (filtro de alvo do
  Potencializador excluindo Construtor).
