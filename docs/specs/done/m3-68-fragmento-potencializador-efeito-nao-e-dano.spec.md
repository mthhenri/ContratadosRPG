# m3-68-fragmento-potencializador-efeito-nao-e-dano.spec.md

> Task do milestone `m3-ficha-jogador.spec.md`. Correção sobre o "Fechamento de Fragmentos"
> (`m3-63`…`m3-67`) — auditoria adicional encontrada ao revisar o cardápio do Potencializador com o
> autor.

> **Antes de codar:** reler `docs/core/sistema-v4.1.0.md` — "⬥ Função" > "⬦ Potencializador" (tabela
> "Em um item", linha ~1938). **O documento vence** (proibição #27). Task de **motor** — rodar
> `npm run test --workspace=shared` antes e depois.

## Objetivo

O cardápio "em um item" do Potencializador tem 4 destinos possíveis, escolhidos exclusivamente (o
jogador aplica só UM por fragmento): **dano** (duas formas — dados ou "N× maior dado"), **teste**,
**efeito** e **resistência**. O código hoje (`listarBonusFragmentoPotencializador`,
`shared/src/regras/compras/fragmento.ts:90-127`) mapeia **errado** duas das opções do "efeito" para
`DANO_FIXO`/`DANO_DADOS_BASE`, tratando "efeito" como se fosse "dano":

- Opção "+N dados": hoje soma no dado **base do dano** (`DANO_DADOS_BASE`). O doc rotula essa opção
  como "(efeito)" — são dados que vão para o **efeito** do item (ex.: numa granada incendiária, que
  tem dano e efeito "Em Chamas" separados, esses dados reforçam o "Em Chamas", nunca o dano).
- Opção "+N no valor" (dentro do cardápio "teste, efeito ou resistência"): hoje as 3 sub-opções
  existem, mas a de "efeito" está mapeada para `DANO_FIXO` e rotulada "de dano (efeito)" — mesmo
  erro, "efeito" virando dano.

**Efeito é diferente de dano** — essa é a regra central que motiva a correção (confirmado pelo
autor). As outras duas opções do cardápio já estão certas e **não mudam**:
- "N× valor máximo do maior tipo de dado do alvo" — pega o maior dado de **dano** do item, seu valor
  máximo (faces), e soma como dano fixo. Isso É dano de verdade, fica em `DANO_FIXO`.
- "+1 dado no teste" — autoexplicativo, fica em `BONUS_TESTE` variante `DADO`.

O cardápio "Consumido" (`BONUS_CONSUMIDO`, `m3-64`) foi revisado junto e **está correto** — fora de
escopo aqui.

## Entregáveis

1. **Novo tipo de efeito `EFEITO`** em `ModificacaoEfeitoTipoEnum`
   (`shared/src/enums/modificacao-efeito-tipo.enum.ts`), com `variante` `'DADO'`/`'FIXO'` (mesmo
   padrão de `BONUS_TESTE`). É **descritivo** — não funde em `calcularStatItem` (mesmo grupo de
   `ALCANCE`/`RAIO`/`DURACAO`/`CONDICAO`, já documentado no topo do enum como "os demais são
   descritivos"; `calcularStatItem` já ignora tipos não tratados no `switch` de
   `shared/src/regras/compras/compras.ts:473-490`, então nenhuma mudança é necessária ali além de
   atualizar o comentário do enum). Precedente: `m3-31` já trata bônus que o motor não computa como
   só descritivo, jogador aplica na mão.
2. **Corrigir `listarBonusFragmentoPotencializador`** (`fragmento.ts:90-127`):
   - Opção "+N dados": trocar `DANO_DADOS_BASE` → `EFEITO` variante `DADO`. Rótulo deixa de dizer
     "no dado base (dano)" — vira algo como "+N dados de efeito (não é dano)".
   - Opção "+N no valor" de efeito: trocar `DANO_FIXO` → `EFEITO` variante `FIXO`. Rótulo deixa de
     dizer "de dano (efeito)" — vira "+N no efeito".
   - As opções de "N× maior dado" e "+dado no teste" ficam inalteradas.
3. **Função única por item reconhece `EFEITO`.** `funcaoFragmento` (`fragmento.ts:138-150`) só
   distingue `'DANO' | 'TESTE' | 'RESISTENCIA' | null` — `EFEITO` cai hoje em `null` (efeito "fora do
   cardápio", não participa da checagem de função única). Adicionar `'EFEITO'` como função própria,
   senão dois fragmentos **ambos** mirando "efeito" no mesmo item não seriam bloqueados por
   `existeFragmentoNaMesmaFuncao` — furo na regra "não pode ter duas coisas apontando pro mesmo
   ponto" (confirmada pelo autor: um Módulo V dando +2 no teste e um Módulo IV dando +3 no teste no
   mesmo item não podem coexistir pra "somar" — mesma lógica vale pra efeito).
4. **Rótulo do chip.** `descreverEfeitoModificacao` (`compras.ts:111-150`) tem um `switch`
   exaustivo por tipo — adicionar `case ModificacaoEfeitoTipoEnum.EFEITO` (dado vs fixo, no padrão do
   `case BONUS_TESTE`).
5. Testes em `shared`: `fragmento.spec.ts` (novo mapeamento das duas opções + colisão de função entre
   dois "efeito" no mesmo alvo) e `compras.spec.ts` (rótulo do novo tipo).

## Critérios de Aceite

- O cardápio "em item" do Potencializador nunca soma nada a `dano` quando a opção escolhida é
  "+N dados" ou "+N no valor → efeito" — só some ao usar "N× maior dado" (dano de verdade).
- Aplicar um Potencializador com "efeito" (dado ou fixo) num item que já tem outro fragmento também
  em "efeito" é bloqueado, igual já acontece com dano/teste/resistência.
- O chip da modificação exibe o bônus de efeito com rótulo próprio, sem mencionar "dano".
- Suíte `shared` verde, com os testes novos cobrindo o mapeamento corrigido e a colisão de função.

## Fora de Escopo

- Cardápio "Consumido" do Potencializador (`m3-64`) — já correto, confirmado nesta revisão.
- Fundir `EFEITO` em algum stat computado (dado de cura, dado de status, etc.) — o sistema não define
  um motor de "efeito" genérico para itens Medicinais/Operacionais/Explosivos hoje; fica descritivo,
  jogador aplica na mão (mesmo tratamento de `m3-31`). Modelar esse motor é tema de spec futura, se o
  autor decidir que vale a pena.
- Bônus fixo do Construtor (`m3-65`) — tabela própria, não usa este cardápio.

## Dependências

- `m3-63` (cardápio "em item" original, função única por item).
- `m3-64` (cardápio "Consumido", revisado e confirmado correto).
