# pn-10-lista-de-versoes-patchnotes.spec.md

> Task 4/5 do guarda-chuva `pn-revisao-pagina-patchnotes.spec.md`. Enriquece o trilho de versões
> que `pn-08` deixou fixo.

## Objetivo

A lista de versões passa a dizer **o que** cada versão trouxe e **o que é novo para você**:
- título da versão e selo "Atual";
- agrupamento por linha (`v1.4.x`, `v1.3.x`…);
- marca "Novo" nas versões publicadas depois da sua última visita.

## Entregáveis

1. **Título nas versões**:
   - cada item mostra número, data e título (`PatchnoteResumoDto.titulo`), com o título limitado a
     duas linhas;
   - texto truncado tem `appTooltip` com o título completo (nunca `title`);
   - o item da versão mais recente tem `app-chip` "Atual", com o mesmo selo do cabeçalho da nota;
   - no mobile a faixa horizontal mostra o título também, com o item mais largo e o alvo de 44px
     mantido.
2. **Agrupar por linha**:
   - no trilho vertical, os itens se agrupam por `MAJOR.MINOR` sob um rótulo mono `v1.4.x`, na
     ordem do índice (mais recente primeiro);
   - na faixa horizontal do mobile não há rótulos;
   - o agrupamento é uma função pura testada em `patchnote-formato.ts`.
3. **Novo desde a última visita**:
   - a fonte é a chave existente `contratados-rpg.versao-vista` do `VersaoService` (`pn-01`);
     **nenhuma chave nova**.
   - A página hoje chama `marcarVista()` assim que o índice carrega, o que sobrescreve o valor.
     O `VersaoService` passa a expor a versão vista **anterior** (lida uma vez, antes da marcação),
     e a página compara com ela.
   - São marcadas as versões com `compararVersoesPatchnote(versao, vistaAnterior) > 0`
     (`shared/src/validators/patchnote.validators.ts`; não reimplementar).
   - Sem versão vista anterior (primeira visita ou storage indisponível) não há marcas: nem tudo
     "novo", nem erro.
   - Cada versão nova tem `app-chip` "Novo".
   - No topo do trilho aparece uma linha "N versões novas desde a sua última visita", só quando
     N > 0.
   - As marcas ficam até a próxima entrada na página; elas não somem ao clicar.
4. **Severidade do chip "Novo"**: `ChipSeveridade` não tem tom positivo (o protótipo usava verde).
   Ao abrir a task, **perguntar ao autor** entre:
   - (a) usar uma severidade existente;
   - (b) ampliar o primitivo `app-chip`.

## Critérios de Aceite

1. Testes:
   - função de agrupamento;
   - `VersaoService` expõe a vista anterior antes de `marcarVista()` sobrescrever;
   - marcas corretas para "vista 1.2.0", "vista = atual" (nenhuma), "sem vista" (nenhuma) e
     storage que lança;
   - título e "Atual" renderizados.
2. Suítes e lint de `frontend` verdes.
3. Gate visual (`verify`) em `1920×1080`, `1366×768`, `960×1080` e `360×800`:
   - lista agrupada;
   - títulos truncados com tooltip;
   - com `contratados-rpg.versao-vista` **plantada** em `1.2.0` antes de abrir, porque o
     Playwright nasce com storage limpo (ver memória de estados persistidos);
   - sem chave plantada;
   - ponto da topbar (`versaoNova`) continua apagando como antes.

## Fora de Escopo

- Agrupar por mês.
- Paginação ou busca na lista.
- "Novo" sincronizado entre aparelhos (exigiria backend).

## Dependências

`pn-08` concluída.

## Riscos e Mitigação

- **Marcar e apagar no mesmo carregamento.** É o atalho óbvio: ler a chave depois de
  `marcarVista()`. O teste do entregável 3 trava a ordem.
