# Transição fluida dos painéis laterais

> Task avulsa solicitada após a reserva de conteúdo: a abertura e o fechamento devem mover painel e área de trabalho como uma única transição.

## Objetivo

Tornar a abertura e o fechamento do histórico de rolagens e do inventário de esquadrão visualmente contínuos. A coluna de conteúdo deve reduzir e retornar junto do painel, sem salto na reserva e sem o painel desaparecer antes de concluir sua saída.

## Entregáveis

1. Os dois painéis laterais preservam seu DOM durante a animação de saída, deslizando para a direita antes de removê-lo; reabertura durante a saída cancela o fechamento pendente.
2. Campanha, ficha de jogador, ficha de criatura e Iniciativa usam dimensões e margens interpoláveis para que a área de trabalho desloque e retorne no mesmo ritmo do painel.
3. Movimento reduzido continua sem animação perceptível, e os controles de fundo/mobile, Escape e alternância entre histórico e inventário permanecem funcionais.
4. Testes focados cobrem o estado de saída e a reabertura; a inspeção visual compara abertura e fechamento em `1920×1080`, `960×1080` e `360×800`.

## Critérios de Aceite

- Abrir e fechar histórico ou inventário mostra um único movimento contínuo: conteúdo e painel começam e terminam juntos, sem salto de layout nem remoção brusca.
- Durante a saída, o painel continua visível pelo tempo da transição; após seu término, backdrop e painel deixam o DOM.
- A reabertura durante a saída deixa o painel aberto e não permite que um temporizador anterior o remova.
- Testes focados, build e inspeção real dos três viewports passam; a comparação visual confirma controles, densidade, topbar e ausência de overflow.

## Fora de Escopo

- Mudar largura, conteúdo, permissões, paginação ou semântica dos painéis.
- Reverter a decisão de manter a topbar acima dos painéis.
- Alterar a regra existente que omite a expressão no histórico de teste de atributo direto; a investigação desta task apenas a documenta para o autor.

## Dependências

`docs/design/DESIGN.md`, `docs/design/tema/_tokens.scss`, `docs/specs/done/barra-lateral-reserva-conteudo.spec.md` e `docs/specs/done/painel-lateral-abaixo-topbar-e-contexto-historico.spec.md`.

## Riscos e Mitigação

Remover o painel pelo `@if` no mesmo clique cancela inevitavelmente a transição de saída. Um estado interno de renderização, separado do estado público que reserva a coluna, mantém a superfície apenas até o fim do deslocamento e cancela o temporizador ao reabrir.
