# Arquivamento da rodada de ícones e repriorização de Active

Data: 2026-10-09. [Spec da rodada](../icones-recursos-sistema.spec.md).

## Decisão e estado resultante

O autor autorizou arquivar esta rodada de ícones em `done/`, mantendo o levantamento
de glifos aberto. A continuação é
[icones-recursos-glifos-e-pendencias](../../backlog/icones-recursos-glifos-e-pendencias.spec.md).
Ela preserva glifos/conceitos sem ícone, decisão sobre tooltip por extenso e cobertura
restante de tema claro/toque. Na etapa de organização, as três correções locais descritas
na entrega 2 ainda aguardavam commit; a conferência posterior está registrada abaixo.

Entregas realizadas: trio Vida/Energia/Defesa, adoção nas telas e votação dos 21 itens,
implementados em task própria. Os relatos das duas entregas, as sete pranchas e a votação
foram preservados. Não há nova certificação visual ou dispensa dos requisitos pendentes.

O montador continua em `active/`: quatro tasks implementadas, experimento em andamento
com o autor/testers, sem escolha unilateral da versão final.

O autor confirmou a devolução de ambas as specs de usabilidade ao backlog:
`usabilidade-2026-09-13` e `usabilidade-classes-condicoes-2026-10-09`. Seus relatórios
e pendências permanecem juntos das specs; tooltips e pontilhado implementados não
foram revertidos. A M4 já está em `done/` e não sofreu outra movimentação nesta tarefa.

## Conferência

Specs e pastas movidas juntas, referências corrigidas mecanicamente e contexto/histórico
alinhados. Contratos e achados históricos preservados. Busca por destinos antigos sem
ocorrências, `git diff --check` aprovado, `npm run repo:test` com sete casos aprovados e
`npm run repo:verificar` com organização e espelhos aprovados na árvore local.
Na etapa documental não se repetiram build, lint, testes do produto ou inspeção visual;
as alterações da aplicação foram preservadas para a conferência posterior. Sem publicação.

## Conferência do conjunto para commit — 2026-10-09

O autor autorizou o commit de todas as mudanças pendentes, incluindo a reorganização,
o fecho da M4 e as três correções de Esquadrão/Fragmentos. O diff completo de código foi
revisado contra as convenções: somente apresentação, sem novas regras, DTOs ou controles.
Os análogos são os cartões existentes do Esquadrão e o catálogo do Inventário; a quebra
de rótulo/valor segue a receita já usada em `ficha-inv__carga-topo`. Os componentes
continuam usando os ícones, modal e botões canônicos existentes; sem ampliar primitivos.
Manter as correções nos consumidores é proporcional: não acrescentam responsabilidades.

A primeira inspeção reproduziu custo de Fragmento com 193px de conteúdo em 186px úteis:
rótulo com largura mínima, custo sem quebra e intervalo de 8px não cabiam juntos.
A linha passou a admitir quebra, mantendo o custo inteiro alinhado à direita, com
intervalos de `--space-4`/`--space-8`. A nova medição foi 186px/186px, sem corte.

Aplicação real em Chromium, com barras de rolagem visíveis, nos quatro viewports:
1920×1080, 1366×768, 960×1080 e 360×800. Conferidos Esquadrão com duas fichas visíveis,
Vida/Energia inteiras (ícones acompanhando o texto), foco e retorno pelo teclado;
modal de adição no catálogo de Fragmentos, todos os custos e tooltip de Energia.
No celular, percorridos os cartões inicial e final e os botões de adição completos.
As capturas foram inspecionadas pessoalmente pelo agente principal: mesma identidade,
densidade, hierarquia, cores e controles dos análogos, sem novo overflow horizontal.
Os alvos móveis existentes foram preservados. Não houve erro JavaScript observado.
O cenário temporário de campanha e duas fichas foi removido por exclusão lógica.

Validações: Prettier nos três arquivos de UI aprovado; build de produção do frontend
aprovado após a correção final, com fidelidade dos JSONs de regras ao Markdown;
236 arquivos e 3.189 testes do frontend aprovados; lint dos três workspaces sem erros.
Permanecem os avisos globais de lint (27.152) e orçamento inicial (593,49kB para 450kB).
A última alteração é exclusivamente SCSS: recebeu novo build e conferência real, sem
repetir a suíte inteira. Evidências brutas em `.artifacts/icones-recursos-sistema/fecho/`.

Glifos, decisão sobre tooltip por extenso, tema claro e toque em aparelho físico continuam
no backlog. Esta conferência cobre as três correções locais; não encerra essas pendências
nem as duas avaliações de usabilidade. Gates finais aprovados: sete casos de `repo:test`,
`repo:verificar` na árvore local, `repo:verificar -- --staged` no índice preparado e
`git diff --cached --check`, antes do commit autorizado. Sem push ou publicação.
