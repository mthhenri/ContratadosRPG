# Preparação da task 03

Em 2026-10-14 o autor autorizou avançar para a próxima spec das transcrições.
A sequência aprovada segue 01→03→02→04→05→06→07. A 01 permanece active,
sem recertificação dos gates globais; seus contratos/API estão no commit local
`d7e6892e`. Continuação não corrige falhas da Oficina nem inicia nuvem/publicação.

Inspeção: task 03 e desenho 01, guards globais/JWT, SessaoTokenService/
impersonação, interceptor HTTP Angular, casca de campanha e design canônico.
Não há app desktop existente. Host é Linux com Python; .NET, PowerShell e Wine
não foram encontrados. Nenhuma nova dependência, código de produto, migration,
infraestrutura ou credencial foi criada nesta preparação.

D-02/D-03 têm proposta concreta em `design.md`. São decisões importantes de
manutenção, UX e segurança que a revisão anterior não delegou unilateralmente.
A spec 03 exige fechar esses pontos antes de construir o app. Após aprovação:
ativar spec/anexos, fechar plano com arquivos/contratos exatos, implementar e
verificar sem apagar pendências de Windows ou gates globais da 01.

`npm run repo:verificar` aprovado (árvore local), exit 0; whitespace sem erros.
Desenho preparado para aprovação; não equivale a produto Windows implementado.

## Continuação autorizada

Em 2026-10-14 o autor respondeu “Vamos para a 03” à proposta concreta. D02/D03
aprovadas; spec/anexos movidos para active. Este arquivo preserva a preparação
anterior; o estado posterior está em plano.md e verificacao.md.
