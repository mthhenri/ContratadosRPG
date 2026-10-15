# PR proposto — documentação

**Título:** docs: revisar specs do Contratados Transcriber e separar V1 local da nuvem

**Base:** master
**Branch:** docs/contratados-transcriber-revisao-2026-10-14
**Estado:** texto preparado; sem PR remoto, conforme resposta do autor. Se posteriormente autorizado publicar, usar draft; não fazer merge nem habilitar auto-merge.

## Descrição

As specs do pacote de 14/10/2026 precisam refletir os contratos e as permissões
atuais antes da implementação. Este PR acrescenta a guarda-chuva e nove tasks
revisadas ao backlog, preserva as decisões originais e registra conflitos,
recomendações pendentes e o mapa de execução.

A ordem local fica 01 → 03 → 02 → 04 → 05 → 06 → 07: importação no aplicativo
precisa do shell Windows da 03. As tasks 08–09 permanecem bloqueadas até nova
autorização da nuvem. Nenhuma task foi ativada ou declarada implementada.

A revisão explicita Mestre por campanha, revogação/tokenVersao, isolamento de
recursos, validação de payloads do app, OpenAPI, idempotência e proteção editorial.
O storage público atual não atende WAV privado. Player local, stack/vínculo
Windows e política temporal/exportação são recomendações para aprovação, não
escolhas de produto assumidas. Gates incluem quatro viewports e Windows físico.

Somente Markdown em docs/specs/backlog e ponteiros/registro em docs/context.
Nenhum código, migration, credencial, workflow ou configuração de deploy alterado.

## Validação

Resultados auditáveis e limites: `docs/specs/backlog/transcricoes/verificacao.md`.
repo:test 14/14 e repo:verificar (árvore/índice) aprovados na preparação local.
Verificar integridade dos quatro auxiliares originais, requisitos das dez specs,
links e grafo sem ciclo. Gates funcionais/visuais/Windows são futuros e não foram
executados numa revisão documental.

## Publicação sem deploy

DEPLOY.md registra previews automáticos para branches e PRs. Este texto não é
um PR já aberto. O autor confirmou nesta sessão “Não sei; prepare branch local e patch”.
Manter branch/commit locais e entregar patch; não publicar branch ou PR nesta execução. Não alterar
configuração de hospedagem, criar commit de skip não validado ou publicar para
“testar” se o preview sobe. Publicação precisa respeitar a restrição do autor.
