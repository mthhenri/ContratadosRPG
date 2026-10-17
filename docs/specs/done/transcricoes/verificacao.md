# Verificação — preparação documental do Contratados Transcriber

**Data:** 2026-10-14. **Base:** `master` em
`f1e1d58295deb9986a6d2f6d71d6857047899782`.
Branch local: `docs/contratados-transcriber-revisao-2026-10-14`.
Spec dona: [transcricoes.spec.md](../transcricoes.spec.md).

## Resultado e limites

Dez specs preparadas no backlog, relatório com D-01…D-08, originais auxiliares
preservados e ponteiros de contexto. As 20 decisões numeradas da guarda-chuva
continuam textualmente idênticas às do ZIP. Dependência faltante da importação
corrigida, sequência local 01→03→02→04→05→06→07; 08–09 bloqueadas.

Somente documentação. Nenhuma spec foi ativada ou encerrada como implementação.
Não houve código, migration, infraestrutura, deploy, alteração de workflow,
credencial, merge, push nem PR remoto. O autor respondeu à dúvida sobre previews:
**“Não sei; prepare branch local e patch”**. A entrega permanece local por essa
instrução, com [texto do PR preparado](pr-proposto.md) para uso futuro autorizado.

## Comandos e checagens

| Verificação | Resultado |
|---|---|
| Leitura integral de regras/skill e 14 Markdown do pacote | Realizada; inventário e fontes em [revisao.md](revisao.md) |
| `cmp AGENTS.md CLAUDE.md` | Exit 0; cópias idênticas |
| `npm run repo:test` | **14/14 aprovados**, zero falhas/pulos na execução com permissão de subprocesso |
| `npm run repo:verificar` | Exit 0; organização e espelhos aprovados na árvore local |
| `npm run repo:verificar -- --staged` | Exit 0; organização e espelhos aprovados no índice preparado |
| `git diff --check` e `git diff --cached --check` | Exit 0; sem erros de whitespace |
| Conferência local descartável das specs/links/decisões/grafo | Aprovada: dez specs com seções e numeração; 20 decisões integrais; quatro auxiliares byte a byte; ordem sem ciclo e links/âncoras válidos |

Os comandos `repo:test`/`repo:verificar` tentados inicialmente dentro do sandbox
falharam por restrição de subprocesso: `spawnSync git EPERM`. `repo:test` reportou
um arquivo aprovado e outro falho, sem executar corretamente todos os testes.
A mesma checagem com permissão adicional, sem modificar nenhum script, rodou
os 14 testes e o verificador com sucesso. Isso é limite do ambiente, não falha
corrigida no código do projeto. Logs brutos locais em `.artifacts/transcricoes/`
não são versionados nem necessários para entender este resultado.

SHA-256 dos auxiliares originais preservados:

- `decisoes-originais.md`: `10cb9b7aa6a369a1b997255662ef2e9f81254b07630516d7737ba58816ff2818`
- `pacote-original.md`: `3e3d275ef4966a673c06cb6681b788a3a17c818bf587678f9d6d8e4ff43835cf`
- `pedido-01-original.md`: `f2b6ad9d0052a2a0986c8f02cd9042b672c19ac8494fe7c663b54449f57f1e40`
- `pedido-02-original.md`: `3636ddeca3af8ce1dee11a50ab9e707849787143fd2f26a418a6d439fc0ba411`

## Gates que não foram executados nesta revisão

Build/lint/testes funcionais dos workspaces, API/Postgres, OpenAPI gerado,
UP/DOWN, testes do app/worker/outbox, WAVs Craig reais, comparação com
`transcrever.py`, instalação Windows CPU/GPU, browser real e visual nos quatro
viewports. Eles pertencem às tasks futuras e não podem ser inferidos de
`repo:test`/`repo:verificar`. Nenhuma tarefa de produto está certificada pronta.

Acesso a produção/Cloudflare e configuração real de previews não foram
inspecionados; não presumir que commit documental remoto evita deploy.
As decisões D-01…D-06 e evidências locais bloqueiam os recortes correspondentes;
D-07/D-08 permanecem futuras com 08–09, sem autorização de execução.
