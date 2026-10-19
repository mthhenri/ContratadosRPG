# Verificação — leitores após reconexão

## Implementação

O módulo de ficha ganhou `ficha-leitura-revalidar.ts`: operador de apresentação
que troca/cancela a leitura anterior com `switchMap`. Só HTTP 403/404 dispara a
limpeza terminal do leitor; falhas transitórias são absorvidas sem encerrar os
sinais futuros de reconexão. Não replica o árbitro de permissão do backend.

`FichaFlutuanteConteudo` revalida jogador/criatura no carregamento e a cada
reconexão, limpa documento/base/nome ao negar e informa o pai para fechar o alvo.
Destruição cancela respostas pendentes. Leitura autorizada usa merge de três
vias para preservar edições locais, com `untracked` no callback que também pode
ser síncrono. Não há efeito reagindo ao contador histórico de reconexão.

Páginas completas de jogador e criatura usam o mesmo operador e seu fluxo de
saída canônico. A expulsão limpa documento/base/histórico/topbar e callbacks
tardios não restauram documento, histórico ou bandeja. A janela de histórico
reutiliza a limpeza de P-131 e distingue falha transitória de negação.

Não se adicionou responsabilidade às páginas extensas: a política de repetição
e interpretação de erro foi extraída para um operador do módulo; páginas só
associam o seu GET e a sua saída. A flutuante mantém sua responsabilidade de
carregar o documento; o pai continua responsável por abrir/fechar.

## Evidência

- TDD inicial: **7 falhas/120 aprovados**, incluindo a ausência de revalidação e
  de limpeza; a versão integrada aprovou **183 testes/7 arquivos**. Regressão
  adicional de rolagem em voo após revogação falhou antes do guard e foi incluída
  na suíte final. Casos: 403, 404, 500 com nova tentativa, resposta superada,
  revogação online durante GET, criatura concedida e edição local preservada.
- API exclusiva 3101, SPA exclusiva 4301 e banco local; campanha sintética 128,
  fichas 473/474 e criatura 475. Criatura veio da fixture canônica já existente
  do teste de service, sem criar/alterar fórmula de jogo.
- Abriram-se flutuantes de jogador/criatura, páginas completas dos dois tipos,
  histórico, ficha do dono e ficha de criatura do mestre. Apenas a API exclusiva
  foi interrompida. Durante a queda: SQL ocultou a ficha 473 e fez soft delete
  da concessão da criatura 475 ao usuário sintético 214, sem emitir evento.
- Ao religar: ambas as flutuantes fecharam, páginas completas redirecionaram à
  campanha, histórico ficou negado e neutro. Dono/mestre conservaram leitura.
  Sentinelas permaneceram nas sete páginas: sem reload. Observaram-se os quatro
  viewports 1920×1080, 360×800, 960×1080 e 1366×768.
- Na mesma página, ocultar/exibir novamente retirou e permitiu reabrir a ficha
  do jogador. Concessão da criatura foi restaurada pelo REST para as próximas
  tasks. Fonte de autoridade e suspensão de concessão não foram alteradas.
- Build de produção frontend aprovado: aviso já existente de bundle 599,02 kB;
  lint frontend sem erros, avisos de estilo. Workspaces shared/backend não
  alterados nesta spec e seus gates da task anterior continuam aplicáveis.
- Capturas/logs/JSON locais em `.artifacts/fix-ficha-oculta-leitores-apos-reconexao/`,
  ignorados e ausentes do clone; cenário mantido só para a sequência autorizada.

## Impacto e comparação pessoal

Alvos: filho/pai da flutuante, páginas completas e histórico. Hospedeiros
combate mestre/jogador, Investigação e detalhe mestre acompanham o fechamento
no componente, sem mudança de autorização ou API dos hospedeiros. As listas da
Investigação já invalidam o alvo pelo recorte e continuam assim; não se removeu
essa defesa. `impacto --simbolo FichaFlutuanteConteudo` conferiu o pai e os testes,
incluindo detalhe mestre. Nenhum primitivo compartilhado foi ampliado.

Análogo escolhido antes de editar: as mesmas telas e o fechamento por revogação
online já aprovado. Inspeção pessoal desktop/mobile constatou fechamento, saída
e cabeçalho neutro. Shell, densidade, hierarquia, controles e alvos móveis
preservados; template só ganhou vínculo de saída do componente. Sem CSS novo,
HTML genérico ou criação de controles; Prettier conferiu o HTML alterado.

## Limites e fecho

O feed de rolagens ainda identifica a ficha oculta; é D-01 e permanece para a
próxima spec, sem confundir com o documento dos leitores. Criatura continua
aparecendo sem números na iniciativa após revogação, pelo contrato canônico;
não foi removida como se fosse jogador oculto. Sem teste de produção.

Suíte final: **284 arquivos / 3564 testes aprovados**, incluindo a regressão
adicional do evento tardio. Build/lint finais aprovados. Revisão manual do diff,
organização e índice conferidos antes do commit; alterações concorrentes de
ícones preservadas. P-130 fecha apenas a limpeza/revalidação desses leitores.
