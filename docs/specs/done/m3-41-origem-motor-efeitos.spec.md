# m3-41-origem-motor-efeitos.spec.md

> Task 38 do milestone `m3-ficha-jogador.spec.md`. Lote de refino da ficha (`m3-40`…`m3-56`).

> **Antes de codar:** reler `docs/core/sistema-v4.1.0.md` (seções Origem / Formação /
> Especialidade / Experimento). **O documento vence** (proibição #27) — o texto abaixo é resumo
> de trabalho.

> **Concluída em duas fatias, com o Entregável 1 conscientemente reduzido.** Investigação mostrou
> que, das 6 categorias de efeito de Formação sem consumidor, só `RESISTENCIA`, `SOBRECARGA` e a
> parte de `ROLAGEM` referente a **teste de atributo** (`PERICIA_DADO_ATRIBUTO`/
> `PERICIA_BONUS_ATRIBUTO`) têm onde aterrissar hoje sem inventar subsistema novo — as outras 3
> (`INICIATIVA`, `DT_REPARO`, `DURACAO_EFEITO`) e o resto de `ROLAGEM` (categoria de arma/condição)
> exigiriam construir do zero um sistema de durabilidade/reparo de equipamento, um rastreador de
> duração de efeito por turno e um motor de rolagem ciente de contexto (nenhum existe hoje, nem é
> detalhado o bastante no `sistema-v4.1.0.md` pra implementar sem extrapolar); **decisão do autor:
> ficam fora de escopo** desta task, a implementar quando as specs/sistemas de que dependem
> existirem (`m3-47` — Iniciativa —, e ainda sem spec própria as outras três). Ver "Fora de Escopo".
> Os Entregáveis 2 (aplicação server-side), 3 (Especialidade↔Origem) e 4 (Experimento+Peculiaridade)
> foram implementados na íntegra.

## Objetivo

Fazer a **Origem afetar de fato os cálculos** da ficha (hoje só parte das Formações tem efeito),
**atrelar a Especialidade à Origem** automaticamente e implementar a regra
**"Experimento com peculiaridade perde a Origem"**.

## Entregáveis

1. **Formações passam a afetar os derivados/cálculos no motor — escopo reduzido às 3 categorias
   com onde aterrissar.** Hoje `aplicarFormacaoAosDerivados` (`shared/src/regras/identidade/
   formacoes.ts`) só materializa 4 alvos (`DERIVADO`, `DERIVADO_ESCOLHA`, `DANO_CORPO`,
   `DANO_FURTIVO_DADO`). Entregue: `obterResistenciaFormacao` (alvo `RESISTENCIA`, soma em
   `montarResistencias`/`shared/src/regras/agente/resistencia.ts`, novo campo `formacao` em
   `ResistenciaLinhaDto`), `obterToleranciaSobrecargaFormacao` (alvo `SOBRECARGA`, desloca o
   limiar de "Sobrecarregado" via novo input `toleranciaSobrecarga` em `FichaInventario`) e
   `obterBonusRolagemAtributoFormacao` (fatia de `ROLAGEM` restrita a teste de atributo —
   `PERICIA_DADO_ATRIBUTO`/`PERICIA_BONUS_ATRIBUTO` —, consumida por `rolarTesteAtributo`/
   `modificadorTeste` em `ficha-visualizacao.component.ts`). `INICIATIVA`, `DT_REPARO`,
   `DURACAO_EFEITO` e o resto de `ROLAGEM` (categoria de arma/condição) foram **para Fora de
   Escopo** — ver abaixo.
2. **Aplicação server-side.** `backend/src/modules/ficha/ficha.service.ts` não chamava
   `aplicarFormacaoAosDerivados` — os deltas da Formação só eram aplicados no frontend.
   `aplicarSnapshotDeMaximos` (chamada só em `criarFicha`) agora aplica o delta de Formação da
   Origem ao snapshot que o **próprio backend** deriva do zero (`calcularDerivadosComOrigem`),
   quando o cliente não manda `derivados` pronto. `alterarFicha` continua sem recalcular
   `derivados` (m3-10 — liberdade total de edição; o cliente já manda o delta aplicado,
   `ajustarOrigem`/`visualizar.page.ts`).
3. **Especialidade atrelada à Origem.** `FichaEspecialidadeDto` já é campo **obrigatório** de
   `FichaOrigemDto` — estruturalmente impossível ter Especialidade sem Origem (só existe aninhada).
   O gap real era completude: `validarFormaOrigem` agora exige `especialidade.gatilho` não-vazio
   (mesma exigência já feita para o `texto` de cada Formação).
4. **Experimento + peculiaridade zera a Origem.** Nova `experimentoComPeculiaridade(classe,
   habilidades)` (`shared/src/regras/identidade/experimento.ts`) — `true` quando a classe é uma das
   3 subclasses de Experimento **e** a ficha tem a habilidade "Peculiaridade" (catálogo de
   Subclasse, `HabilidadeCategoriaEnum.SUBCLASSE`; "substituindo seus bônus originais de Origem").
   `FichaService.validarFormaIdentidade` rejeita `identidade.origem` não-nulo nesse caso (vale para
   qualquer editor, inclusive o mestre — é regra de forma, não de posse). Frontend:
   `origemEditavel` trava e um chip "Substituída pela Peculiaridade" aparece no lugar do lápis.

## Critérios de Aceite

- Uma Origem com bônus de Formação de Resistência/Sobrecarga/teste de atributo altera os valores
  exibidos (Resistência somada na aba Combate, limiar de Sobrecarregado deslocado, dado/bônus
  extra no teste do atributo mirado) — não só um chip decorativo.
- Criar a ficha via API com `identidade.origem` já definida e sem `derivados` prontos produz um
  snapshot coerente com a Origem (aplicação server-side, não só no front).
- Não é possível salvar uma Origem com Especialidade sem gatilho.
- Um Experimento com Peculiaridade não consegue salvar Origem (UI trava o editor; backend rejeita
  o payload direto).

## Fora de Escopo

- Redesenho visual do editor de Origem (só o acoplamento da Especialidade e o gate de
  Experimento); apresentação enriquecida dos dados de Origem fica na `m3-49`.
- Saber de Campo continua sem efeito mecânico (fora do escopo, salvo se o documento exigir).
- **`INICIATIVA`, `DT_REPARO`, `DURACAO_EFEITO` e `ROLAGEM` por categoria de arma/condição**
  (decisão do autor, ver nota de status acima): sem tela/motor pra aterrissar hoje — precisam,
  respectivamente, do preset de Iniciativa (`m3-47`), de um sistema de durabilidade/reparo de
  equipamento (sem spec própria ainda), de um rastreador de duração de efeito por turno (idem) e
  de um motor de rolagem ciente de contexto (categoria de arma em uso, condição da cena — idem).
  Ficam registradas em `listarEfeitosPendentes` (`shared/src/regras/identidade/formacoes.ts`) até
  ganharem spec e sistema de apoio próprios.
- Não foi criada nenhuma affordance de UI para **remover** uma Origem já definida (só editar seus
  campos) — o gate de Experimento+Peculiaridade impede *definir* uma Origem nova nesse estado, mas
  não força a remoção de uma Origem antiga se o agente virar Experimento-com-Peculiaridade depois
  de já tê-la; cenário raro (Peculiaridade é escolhida na criação) e fora do que a spec pede.

## Dependências

- `m3-23`/`m3-24`/`m3-25` (contrato + motor + imutabilidade de Identidade), `m3-01` (contrato
  `FichaJogadorDadosDto`), `m3-36` (ponto de extensão de resistências), `m3-47` (iniciativa).
