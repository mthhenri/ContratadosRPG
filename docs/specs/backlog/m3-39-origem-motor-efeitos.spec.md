# m3-39-origem-motor-efeitos.spec.md

> Task 36 do milestone `m3-ficha-jogador.spec.md`. Lote de refino da ficha (`m3-38`…`m3-54`).

> **Antes de codar:** reler `docs/core/sistema-v4.1.0.md` (seções Origem / Formação /
> Especialidade / Experimento). **O documento vence** (proibição #27) — o texto abaixo é resumo
> de trabalho.

## Objetivo

Fazer a **Origem afetar de fato os cálculos** da ficha (hoje só parte das Formações tem efeito),
**atrelar a Especialidade à Origem** automaticamente e implementar a regra
**"Experimento com peculiaridade perde a Origem"**.

## Entregáveis

1. **Formações passam a afetar os derivados no motor.** Hoje `aplicarFormacaoAosDerivados`
   (`shared/src/regras/identidade/formacoes.ts`) só materializa 4 alvos (`DERIVADO`,
   `DERIVADO_ESCOLHA`, `DANO_CORPO`, `DANO_FURTIVO_DADO`); os alvos **modelados-mas-sem-consumidor**
   `RESISTENCIA`, `INICIATIVA`, `SOBRECARGA`, `ROLAGEM`, `DT_REPARO`, `DURACAO_EFEITO` ganham
   consumidor conforme o documento. `INICIATIVA` coordena com a `m3-45` (preset de iniciativa);
   `RESISTENCIA` alimenta `montarResistencias` (`shared/src/regras/agente/resistencia.ts`) via o
   ponto de extensão `bonusExternos` já previsto na `m3-36`.
2. **Aplicação server-side.** Hoje `backend/src/modules/ficha/ficha.service.ts` **não** chama
   `aplicarFormacaoAosDerivados` — os deltas da Formação só são aplicados no frontend. A task
   passa a aplicar/validar os deltas de Origem no `FichaService` (em `criarFicha`/`alterarFicha`,
   junto de `aplicarSnapshotDeMaximos`), para que o snapshot persistido reflita a Origem.
3. **Especialidade atrelada à Origem.** `FichaEspecialidadeDto` já é campo de `FichaOrigemDto`
   (`shared/src/dtos/ficha/ficha.dtos.ts`). Garantir que definir/editar a Origem
   (mini-editor `editarOrigem`/`confirmarOrigem`, `ficha-visualizacao.component.ts` ~linha 761)
   crie/selecione a Especialidade de forma acoplada — não existe Especialidade sem Origem.
   Backend valida a coerência em `FichaService.validarFormaOrigem`.
4. **Experimento + peculiaridade zera a Origem.** Regra de classe (`ClasseEnum` Experimento com
   peculiaridade): a Origem é removida/bloqueada. Implementar a validação em
   `FichaService.validarFormaOrigem`/`validarDadosContraRegras` e refletir no frontend (o
   mini-editor de Origem some/trava para Experimento com peculiaridade). Fixar o gatilho exato
   pelo `sistema-v4.1.0.md`.

## Critérios de Aceite

- Uma Origem com bônus de Formação de Resistência/Iniciativa/etc. altera os derivados exibidos e
  o snapshot persistido (não só um chip decorativo).
- Recriar/editar a ficha no backend produz derivados coerentes com a Origem (aplicação
  server-side, não só no front).
- Não é possível ter Especialidade sem Origem; editar a Origem mantém a Especialidade acoplada.
- Um Experimento com peculiaridade não tem Origem (UI e backend concordam).

## Fora de Escopo

- Redesenho visual do editor de Origem (só o acoplamento da Especialidade e o gate de
  Experimento); apresentação enriquecida dos dados de Origem fica na `m3-47`.
- Saber de Campo continua sem efeito mecânico (fora do escopo, salvo se o documento exigir).

## Dependências

- `m3-23`/`m3-24`/`m3-25` (contrato + motor + imutabilidade de Identidade), `m3-01` (contrato
  `FichaJogadorDadosDto`), `m3-36` (ponto de extensão de resistências), `m3-45` (iniciativa).
