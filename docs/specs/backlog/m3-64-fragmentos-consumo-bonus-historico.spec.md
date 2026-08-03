# m3-64-fragmentos-consumo-bonus-historico.spec.md

> Task do milestone `m3-ficha-jogador.spec.md`. Continuação do lote de Fragmentos (`m3-35`, `m3-42`).

> **Antes de codar:** reler `docs/core/sistema-v4.1.0.md` — "⬥ Função" > "⬦ Potencializador"
> (tabela "Consumido", linha ~1938) e "⬦ Consumo de Fragmentos" (~1940-1943). **O documento vence**
> (proibição #27).

## Objetivo

O painel "Consumir" (`ficha-inventario.component.ts:1301-1353`,
`ficha-inventario.component.html:1001-1041`) hoje só cobra o preço (Preço de Sanidade + Energia
Máxima extra) e diz "o benefício pessoal do Consumo é narrativo — combine com o Mestre". O
documento, porém, **define um cardápio fechado** de benefícios ("Consumido") por módulo — isso não
é narrativo, é mecânico e está sendo ignorado. Junto disso, consumir um fragmento não deixa rastro
algum: o item some do inventário e só resta uma sequela genérica sem indicar de qual fragmento veio.

## Entregáveis

1. **Tabela de bônus "Consumido".** Nova tabela em `fragmento.dados.ts` (`BONUS_CONSUMIDO`, no
   padrão de `BONUS_POTENCIALIZADOR`) com as 3 opções por módulo da coluna "Consumido" do doc:
   "+N em todos os testes do atributo à escolha" (Módulo I soma **+1 ponto no atributo**, além do
   teste — e é a **única forma** de ultrapassar o limite de 6 pontos num atributo, doc ~1943),
   "+N em Defesa", "+N de dano do Corpo". Função pura irmã de
   `listarBonusFragmentoPotencializador` (ex.: `listarBonusConsumoFragmentoPotencializador`).
2. **Onde o bônus vive.** Ao contrário do bônus "em item" (vira Modificação de um item), o bônus
   "Consumido" é do **agente**, permanente. Verificar `dados.modificadoresTeste`
   (`ficha-visualizacao.component.ts:999-1002`, já usado para modificador temporário de teste por
   atributo) como candidato natural para a opção de teste; para Defesa e dano do Corpo, decidir e
   documentar o campo (`derivados`? novo bloco `bonusFragmentosConsumidos`?) — critério: uma única
   fonte de verdade que `calcularDefesa`/o dano do Corpo já leem, sem duplicar cálculo no componente
   (proibição #26).
3. **UI de escolha.** O painel "Consumir" ganha um `<select>` com as 3 opções (mais o atributo-alvo
   quando a opção for "testes do atributo à escolha"), no mesmo padrão do `opcoesBonusFragmento` do
   painel "Aplicar em...". `confirmarConsumirFragmento` aplica o bônus escolhido junto do débito já
   existente. O texto "combine com o Mestre" sai — o app agora resolve o benefício mecânico.
4. **Rastro do consumo.** `sequelasFragmentoConsumido.emit` (`ficha-inventario.component.ts:1346-1350`)
   hoje cria `{ nome: SEQUELA_CONSUMO_FRAGMENTO }` sem `descricao`. Preencher `descricao` com o
   módulo/tipo do fragmento consumido e o bônus escolhido (ex.: `"Fragmento Potencializador Módulo
   III consumido — +3 em Defesa"`), para que a sequela na lista geral carregue a informação, já que
   não há histórico dedicado (decisão: reaproveitar a sequela como registro, não criar uma nova
   tabela/lista só para isso — mais simples e consistente com "sanidade materializa-se como
   sequelas/traumas", `m3-42`).
5. Testes em `shared` para a nova tabela; testes de componente para a UI de escolha e o texto da
   sequela.

## Critérios de Aceite

- O painel "Consumir" exige escolher um dos 3 bônus "Consumido" do módulo antes de confirmar.
- O bônus escolhido reflete de fato no stat correspondente do agente (teste do atributo, Defesa ou
  dano do Corpo), via a mesma função pura que os demais derivados usam.
- A sequela "Rejeição Biológica" gerada carrega, na `descricao`, qual fragmento foi consumido e qual
  bônus foi escolhido.

## Fora de Escopo

- Cardápio "em item" do Potencializador (`m3-63`).
- Uma tela/lista dedicada de "histórico de fragmentos consumidos" separada da lista de Sequelas —
  fica registrado em `IDEAS.md` como possível upgrade futuro.

## Dependências

- `m3-42` (Preço de Sanidade, `sequelasFragmentoConsumido`).
