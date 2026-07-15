# m3-14-ficha-editor-inventario.spec.md

> Task 14 do milestone `m3-ficha-jogador.spec.md`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Objetivo

Editor **no próprio lugar** da aba **Inventário** (`m3-11`): o `inventario` do `dados` — itens (com
modificações) + amplificadores, **reusando o formato do carrinho da calculadora M1**
(`CarrinhoItemDto`/`AmplificadorAplicadoDto` de `shared/regras/compras`, sem tipo duplicado — como já
fixa `m3-01`). Permite montar/editar o inventário da ficha reaproveitando a UI e as regras de compras.

## Entregáveis

1. **Lista de itens** com nome, categoria, custo/peso, quantidade, "guardada" e modificações; e a
   lista de **amplificadores** acoplados.
2. **Adicionar/editar/remover** item e amplificador reusando os componentes/regras da calculadora de
   compras (M1) — **sem reimplementar** cálculo de custo/peso/limites (proibição #26).
3. **Inventário máximo** (`Força × 5`) exibido como referência a partir de `derivados.inventarioMaximo`
   (editável em `m3-10`); ultrapassar é **aviso**, não trava (liberdade total).
4. Cada mutação persiste via `alterarFicha` (otimista), padrão granular de `m3-10`.
5. Standalone, Signals, Reactive Forms, `.scss`/BEM com tokens.

## Critérios de Aceite

- Dono/mestre monta e edita o inventário da ficha; recarregar mantém itens/modificações/amplificadores.
- Reusa `shared/regras/compras` (mesmos contratos e cálculos da calculadora M1), sem duplicar.
- Peso/limite mostrados como referência; exceder não bloqueia o salvamento.

## Fora de Escopo

- Loja/compra-venda com saldo (Dinheiro corrente ainda fora do contrato) — só o inventário da ficha.
- Refino mobile dedicado (`m3-09`).

## Dependências

- `m3-10` (edição granular + `derivados.inventarioMaximo`), `m3-11` (aba Inventário),
  `m3-01` (contrato `FichaInventarioDto`), M1 (`shared/regras/compras` + UI da calculadora).

## Refinamentos entregues (pós-spec, a pedido)

Além do editor base acima, esta task recebeu rodadas de refino aplicadas **na ficha e na calculadora
de compras** (mesmo motor `shared/regras/compras`, sem duplicação):

1. **UX de gestão:** confirmação ao Esvaziar; remoção com confirmação **no próprio X** (última
   unidade) e **dialog "quantos remover"** (stack > 1); feedback "✓ Adicionado" no botão; botão
   **"Modificar"** que revela o painel de mods; **porte** de armazenamento como botão compacto
   Vestida/Guardada com ícone próprio (vestida = accent; guardada = cinza).
2. **Itens e modificações custom REALMENTE funcionais:** o motor resolve o stat pelo próprio item
   quando é custom (`resolverDadosItem`) — `CarrinhoItemDto` ganhou `dano`/`informacao`/`resistencia`/
   `bonus`/`categoriaEmprestada`/`modulo`. A **modificação custom** deixou de ser texto e ganhou uma
   **lista de efeitos mecânicos** (`ModificacaoEfeitoDto[]`) discriminada por `ModificacaoEfeitoTipoEnum`
   (enum novo), cobrindo **todos os arquétipos** das tabelas (dano fixo/dados/dado-base/elevar-dado,
   perfuração, bônus em teste, resistência, defesa, alcance, raio, duração, condição, inventário). O
   motor funde no stat os de dano/resistência/inventário e descreve os demais no chip
   (`descreverEfeitoModificacao`).
3. **Categorias de item Fragmento Construtor / Potencializador** (achadas, montadas como item custom
   com módulo I–V + forma base), e bloqueio de modificação em consumíveis (Operacional/Medicinal).
4. **Cadastro redesenhado:** form de item custom com campos por categoria; form de mod custom com
   `FormArray` de efeitos (seletor de tipo por linha + campos condicionais).
5. **Limites de modificação flexíveis:** o campo da mod custom passou a ser o **teto** dela
   (`empilhamentoMaximo`, entra em 1×); exceder o limite da patente é **permitido e marcado como
   "Excedente"** (não trava); e cada mod (catálogo ou custom) pode ser marcada para **não contar** no
   limite total da arma (`ignoraLimiteTotal`) ou no próprio teto (`ignoraLimiteProprio`).
6. **Layout do item:** ações (Modificar / Vestir-Guardar) e o **X por último** ficam no cabeçalho, ao
   lado de dinheiro e peso; armazenamento **vestido ocupa "0 slots"**.
7. **Correção:** ajustar os empilhamentos de uma mod deixou de descartar seus efeitos/descrição/teto.

Contrato estendido em `shared`: `ModificacaoEfeitoTipoEnum` (enum), `ModificacaoEfeitoDto`,
`CarrinhoItemDto` (stats custom), `ModificacaoAplicadaDto` (`efeitos`/`empilhamentoMaximo`/
`ignoraLimiteTotal`/`ignoraLimiteProprio`), categorias `FRAGMENTO_*` em `ItemCategoriaEnum`. Tudo
com testes no motor (`compras.spec`) e nos componentes, e verificado ao vivo.
