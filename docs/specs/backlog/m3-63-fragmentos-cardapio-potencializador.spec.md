# m3-63-fragmentos-cardapio-potencializador.spec.md

> Task do milestone `m3-ficha-jogador.spec.md`. Continuação do lote de Fragmentos (`m3-35`, `m3-42`).

> **Antes de codar:** reler `docs/core/sistema-v4.1.0.md` — seção "⬡ Fragmentos" > "⬥ Função" >
> "⬦ Potencializador" (linhas ~1933-1938). **O documento vence** (proibição #27).

## Objetivo

Fechar as três lacunas do fluxo "Aplicar em..." do fragmento Potencializador que a `m3-35`/`m3-42`
deixaram de fora: a 5ª opção do cardápio de bônus, a regra de "uma única função por item" e a
restrição de alvo mais larga do que o documento permite.

## Contexto (o que já existe)

- `listarBonusFragmentoPotencializador` (`shared/src/regras/compras/fragmento.ts`) devolve hoje
  4 das 5 opções do cardápio "Em um item" (`fragmento.dados.ts` — `BONUS_POTENCIALIZADOR`). A 5ª,
  "N× valor máximo do maior tipo de dado" (doc: `+1× valor máximo do maior tipo de dado` no
  Módulo V, até `5×` no Módulo I), foi deliberadamente cortada no header do arquivo por depender de
  uma primitiva "maior dado do item" que não existia.
- `alvosFragmentoDisponiveis` (`ficha-inventario.component.ts:872-878`) filtra **todo** item de
  categoria Fragmento como alvo inválido. O documento só proíbe fragmento Construtor como alvo
  ("podem ser usados em qualquer item ou ser, **exceto em fragmentos construtores**") — hoje um
  fragmento Potencializador não pode ser alvo de outro, o que é mais restritivo que a regra.
- Nada valida a regra "um item/ser pode conter mais de um fragmento, mas para apenas **uma única
  função**" (doc — não pode haver 2 fragmentos melhorando o mesmo tipo de efeito no mesmo item/ser).
  `confirmarAplicarFragmento` (`ficha-inventario.component.ts:1245-1299`) empilha modificações de
  fragmento livremente.

## Entregáveis

1. **Maior dado do item.** Nova função pura (local natural: perto de `ESCADA_DADOS`/`elevarDado`/
   `descreverDado` em `shared/src/regras/descanso/dado.ts`, ou uma primitiva irmã em
   `shared/src/regras/compras/`) que extrai o **maior tipo de dado** (maior número de faces) do
   campo `dano` (string livre, ex.: `"2D8+3"`) de um `CarrinhoItemDto`/item de inventário. Sem dado
   no campo → a opção não aparece no cardápio para aquele alvo (não faz sentido "1× o maior dado"
   de um item sem dado de dano).
2. **5ª opção do cardápio.** Adicionar a `BONUS_POTENCIALIZADOR`/`listarBonusFragmentoPotencializador`
   a opção "N× valor máximo do maior tipo de dado" (N por módulo: V=1, IV=2, III=3, II=4, I=5,
   conforme a tabela do doc). Como o valor depende do alvo escolhido (não é fixo por módulo como as
   outras 4), o cálculo do `efeito` (`DANO_FIXO`, valor = N × faces do maior dado) só pode ser
   resolvido **depois** que o alvo é escolhido no painel "Aplicar em..." — ajustar
   `opcoesBonusFragmento`/`confirmarAplicarFragmento` para recalcular esta opção quando o alvo
   (`alvoFragmento`) mudar, em vez de listá-la estaticamente por módulo.
3. **Restrição de alvo correta.** Trocar o filtro de `alvosFragmentoDisponiveis` para excluir
   apenas `ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR` (fragmentos Potencializador continuam válidos
   como alvo de outro Potencializador, contanto que a função não colida — item 4).
4. **Validação de função única.** Antes de aplicar, comparar o `efeito.tipo` (e, quando fizer
   sentido, a `variante`/`tipoDano`) da opção escolhida contra os efeitos já presentes em
   `item.modificacoes` com `origemFragmento` preenchido no alvo. Se já houver um fragmento
   cumprindo a mesma função, bloquear a confirmação e mostrar aviso (`ficha-inv__aviso`) explicando
   que o item já tem um fragmento nessa função — sem impedir modificações **não-fragmento** com o
   mesmo tipo de efeito, essa regra é só entre fragmentos.
5. Testes em `shared` para "maior dado do item" (strings variadas, incluindo dano ausente/malformado)
   e para a nova opção do cardápio; testes de componente para a restrição de alvo e o bloqueio de
   função duplicada.

## Critérios de Aceite

- O cardápio do painel "Aplicar em..." mostra 5 opções quando o alvo tem dado de dano, 4 quando não
  tem.
- Aplicar um fragmento potencializador como alvo de outro (não-Construtor) é possível.
- Tentar aplicar um 2º fragmento na mesma função do mesmo item é bloqueado com aviso claro.

## Fora de Escopo

- Bônus "Consumido" da mesma tabela (`m3-64`).
- Tabela fixa do Construtor (`m3-65`).

## Dependências

- `m3-35`, `m3-42` (fluxo "Aplicar em..." e `origemFragmento` já existentes).
