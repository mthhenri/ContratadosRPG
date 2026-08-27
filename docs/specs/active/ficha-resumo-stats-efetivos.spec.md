# ficha-resumo-stats-efetivos.spec.md

> Task avulsa (bug reportado direto pelo autor, 2026-08-27): Vida máxima e Esquiva no mini-card do
> Esquadrão (painel do mestre, `campanha/detalhe`) não batem com os mesmos números na ficha aberta
> do agente. Investigação confirmou que o mesmo defeito atinge também o cartão de combatente da
> Iniciativa (`Encontro`) e, potencialmente, Defesa/Bloqueio/Energia máxima — mesma causa raiz.

> **Antes de codar:** reler `docs/core/sistema-v4.1.0.md` — "Defesa" (Defesa Final = Defesa Base +
> bônus de reação) — e a docstring de `frontend/src/app/modules/ficha/status-derivado.ts`
> ("Amplificadores... somam por cima do bruto só no display"). Task de motor compartilhado com
> reflexo em dois consumidores de backend; testar `shared` + `backend` e verificar o mini-card do
> Esquadrão e o cartão da Iniciativa na aplicação real.

## Objetivo

Fazer o mini-card do Esquadrão (painel do mestre, `campanha/detalhe`) e o cartão de combatente da
Iniciativa (`Encontro`) exibirem exatamente os mesmos valores de Vida máxima, Energia máxima,
Defesa, Esquiva, Bloqueio e Contra-Ataque que a ficha do próprio agente mostra quando aberta — sem
exigir F5 nem reconexão (o tempo real que atualiza esses painéis já funciona; o problema é o
**valor** devolvido pelo backend, não a atualização dele).

## Causa raiz confirmada

Existem dois valores para cada um desses stats:

- **Stored/calculado** (`dados.derivados.{defesa,esquiva,bloqueio,contraAtaque}` e
  `dados.estado.{vidaMaxima,energiaMaxima}`): um snapshot persistido no JSONB da ficha — calculado
  na criação (`calcularDerivados`, `shared/src/regras/agente/derivados.ts`) e, dali em diante,
  tratado como base editável no próprio lugar (m3-10 — "stored vence o calculado").
- **Efetivo** (o que a ficha realmente mostra): o valor acima **mais**, somente na leitura, nunca
  persistido de volta:
  - o bônus de **amplificadores portados** (`shared/src/regras/agente/amplificador.ts` —
    `ajusteDefesaAmplificadores`, `ajusteEsquivaAmplificadores`, `ajusteBloqueioAmplificadores`,
    `ajusteVidaAmplificadores`, `ajusteEnergiaAmplificadores`);
  - para Defesa/Esquiva/Bloqueio, o bônus de **itens de Proteção equipados**
    (`calcularBonusDefesaEquipamento`, `shared/src/regras/agente/defesa.ts` — mods "Flexível"/
    "Resistente", efeito custom `DEFESA`);
  - a cascata da "Defesa Final" nas três reações (todo bônus que mexe em Defesa soma também em
    Esquiva/Bloqueio/Contra-Ataque, doc — "Defesa").

  Essa soma vive hoje só no frontend: `montarInformacoesExtras`
  (`frontend/src/app/modules/ficha/status-derivado.ts`, linhas 143–212) para Defesa/Esquiva/
  Bloqueio/Contra-Ataque, e `vidaMaximaEfetiva`/`energiaMaximaEfetiva`
  (`frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.ts`,
  linhas 1696–1699) para Vida/Energia. A opção de nunca persistir esse delta é deliberada (evita
  drift ao commitar o bônus como override manual) — o defeito não é essa filosofia, é que os dois
  consumidores fora da ficha só leem o **stored**, sem aplicar o mesmo "por cima":
  - `FichaService.paraResumoPublico` (`backend/src/modules/ficha/ficha.service.ts`, linhas 267–304)
    devolve `fichaInterna.{defesa,esquiva,bloqueio,vidaMaxima,energiaMaxima}` direto do
    `FichaResumoInternoDto` (lido cru do JSONB por `FichaRepository`, linhas 149–161) — sem nenhum
    ajuste de amplificador/equipamento. Só `contraAtaque` já tem um fallback "ao vivo"
    (`calcularContraAtaqueAoVivo`, linhas 306–320), mas resolve um problema diferente (habilidade
    "Contra-Ataque" adicionada depois da criação, "sem cascata" — m3-13) e também não aplica o
    bônus de amplificador/equipamento.
  - `resolverEstadoDoAgente`/`resolverMaximosDoAgente`
    (`backend/src/modules/encontro/encontro-combatente.mapper.ts`, linhas 29–89) leem
    `dados.derivados?.{defesa,esquiva,bloqueio,contraAtaque}` e `dados.estado.{vidaMaxima,
    energiaMaxima}` (com fallback só para o **calculado**, nunca para o **efetivo**) — mesma lacuna.

  Exemplo real do autor: uma ficha com um amplificador `Vida` empilhado e/ou uma Proteção com
  "Flexível" equipada mostra na ficha `135`/`32` (stored + bônus), mas o mini-card do Esquadrão e o
  cartão da Iniciativa mostram `128`/`24` (só o stored) — a diferença é exatamente o bônus que a
  ficha soma e o backend, fora dela, ignora.

## Entregáveis

1. **Função pura compartilhada**, em `shared/src/regras/agente/` (arquivo novo ou extensão de
   `derivados.ts` — decidir no código pela menor duplicação), que recebe o snapshot stored
   (`derivados`/`estado`), o necessário para o fallback calculado (`classe`, `nivel`, `atributos`,
   `habilidades`) e os insumos do bônus "por cima" (`itens`, `amplificadores`), e devolve
   `{ vidaMaxima, energiaMaxima, defesa, esquiva, bloqueio, contraAtaque }` já com toda a soma
   aplicada (stored/calculado + amplificador + equipamento + cascata de Defesa Final). **Não**
   inventa fórmula nova — só orquestra `calcularDefesa`, `calcularContraAtaque`, `calcularVida`,
   `calcularEnergia` (`saude.ts`), `calcularBonusDefesaEquipamento` e as cinco funções `ajuste*Ampl
   ificadores` já existentes, replicando exatamente a composição de `montarInformacoesExtras` e
   `vidaMaximaEfetiva`/`energiaMaximaEfetiva`.
2. **Frontend**: `status-derivado.ts` (`montarInformacoesExtras`) e `ficha-visualizacao.component.ts`
   (`vidaMaximaEfetiva`/`energiaMaximaEfetiva`) passam a delegar a essa função em vez de duplicar a
   soma — continuam sendo a única fonte da tela; o `bruto` editável (m3-10) não muda de
   comportamento, só o cálculo do `efetivo`/`display` deixa de estar duplicado.
3. **`FichaService.paraResumoPublico`** (`backend/src/modules/ficha/ficha.service.ts`): substitui a
   leitura direta de `fichaInterna.{defesa,esquiva,bloqueio,vidaMaxima,energiaMaxima}` pelo mesmo
   cálculo efetivo, reaproveitando os campos que `FichaResumoInternoDto` já carrega (`atributos`,
   `habilidades`, `itens`, `amplificadores`, `nivel`, `classe`) — mesmo padrão já estabelecido para
   `sobrecarregado` (`calcularSobrecarregado`) e `contraAtaque` (`calcularContraAtaqueAoVivo`, que
   pode ser removido/absorvido pela nova função caso a duplicação não valha a pena preservar).
   `FichaResumoDto` não ganha campo novo — os mesmos campos passam a carregar o valor efetivo.
4. **`encontro-combatente.mapper.ts`** (`resolverEstadoDoAgente`/`resolverMaximosDoAgente`): aplica o
   mesmo cálculo efetivo para o combatente do tipo agente, consumindo `dados.inventario.itens`/
   `dados.inventario.amplificadores` (já presentes em `FichaJogadorDadosDto`, sem precisar de nova
   consulta). `resolverEstadoDaCriatura`/`resolverEstadoDoAvulso` não mudam — criatura/avulso não
   têm amplificador portado nem esse mecanismo "stored > calculado" (mesma exclusão já registrada
   para `contraAtaque`).
5. **Testes.** Novo(s) caso(s) em `shared` cobrindo a função com stored + amplificador + equipamento
   combinados (o cenário do bug: valores diferentes com e sem o bônus). `ficha.service.spec.ts` e o
   spec do mapper do Encontro ganham um caso de ficha com amplificador/equipamento confirmando que o
   resumo/cartão bate com o que a ficha mostraria. Ajustar specs de frontend só onde o refactor
   trocar a origem do cálculo, sem duplicar asserts já cobertos no shared.

## Critérios de aceite

- Uma ficha de agente com um amplificador que soma Vida, Esquiva, Defesa ou Bloqueio, e/ou uma
  Proteção equipada com "Flexível"/"Resistente"/efeito `DEFESA` custom: o mini-card do Esquadrão
  (`campanha/detalhe`) e o cartão de combatente da Iniciativa mostram os mesmos números que a ficha
  aberta desse agente, para Vida máxima, Energia máxima, Defesa, Esquiva, Bloqueio e Contra-Ataque.
- Sem nenhum amplificador/equipamento desse tipo, os números continuam batendo como já batiam hoje
  (sem regressão no caso comum).
- Editar manualmente um desses stats no próprio lugar da ficha (override, m3-10) continua vencendo o
  calculado, e o mini-card/cartão refletem o override + o mesmo bônus "por cima" de amplificador/
  equipamento — não o override sozinho.
- Uma ficha de classe Civil (sem Defesa/Esquiva/Bloqueio/Contra-Ataque) continua mostrando esses
  campos ausentes/`N/A` em todo lugar, sem lançar erro.
- Criatura, NPC e avulso na Iniciativa não mudam de comportamento.
- `shared`, `backend` e `frontend` permanecem verdes; lint limpo. Verificado na aplicação real: uma
  ficha real com amplificador e/ou item equipado com bônus, comparando Esquadrão × ficha aberta ×
  cartão da Iniciativa (revelado) nos três, em `1920×1080` e `360×800`, sem overflow.

## Fora de escopo

- Mudar a filosofia "nunca persiste o bônus de amplificador/equipamento de volta como override" —
  ela é intencional (evita drift) e permanece.
- Qualquer regra nova de amplificador, modificação ou item.
- Revelação (quem vê o quê no painel do mestre/Iniciativa) — nenhuma mudança de visibilidade, só de
  valor.
- Tempo real (`ficha:alterada`, `encontro:alterado`) — a propagação já funciona; esta task não mexe
  em socket/broadcast.
- Criatura, NPC e avulso — não têm o mecanismo "stored > calculado" nem amplificador portado.

## Dependências e pontos de atenção

- `m3-10` (mecanismo stored > calculado, base de tudo aqui).
- `m3-39` (`calcularContraAtaqueAoVivo`) — precedente direto do mesmo tipo de correção
  (recalcular no backend o que a ficha já resolve "ao vivo" no cliente), resolvendo uma lacuna
  diferente (habilidade sem cascata) que esta task pode absorver na mesma função nova.
- `m3-43` (bônus de equipamento em Esquiva/Bloqueio/Defesa).
- `m7-17` (resistência a dano por tipo já resolvida "ao vivo" no mapper do Encontro) — mesmo padrão
  de "campo calculado no backend a partir da ficha completa", aplicado agora a estes stats.
- `shared/src/regras/agente/amplificador.ts`, `defesa.ts`, `saude.ts` são a fonte única das fórmulas;
  não duplicar a soma em nenhum dos três consumidores (frontend, resumo de ficha, mapper do
  Encontro).
