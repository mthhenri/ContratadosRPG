# P-104 — Recuperação do build com cache local

## Resultado e alcance

Recuperado o comando habitual `npm run build --workspace=frontend`, no Windows,
com cache persistente habilitado e sem `CI=true` nem limite de workers.
`frontend/angular.json` configura `cli.cache.path` como `.angular/cache-local`.
O cache anterior foi preservado; nenhum processo de outra sessão foi encerrado.
Não houve mudança de dependências, budgets, UI, fontes ou regras do jogo.

Esta é uma recuperação do estado local de cache por configuração suportada,
não uma correção do código nativo LMDB. O defeito interno que torna a abertura
da base original fatal permanece sem diagnóstico; não atribuímos corrupção
dos dados, do lock ou incompatibilidade de versões sem evidência.

## Diagnóstico controlado

Ambiente: Node 24.11.0, npm 11.6.1, Angular CLI/build 21.2.18, LMDB 3.5.1.

1. Build original no sandbox chegou à etapa de fontes, mas falhou com
   `ENOTFOUND fonts.googleapis.com`; essa limitação de rede não comprova P-104.
2. Build original com rede reproduziu saída `3221225477` (access violation,
   representada como `-1073741819` pelo PowerShell), sem diagnóstico TypeScript.
3. Um processo mínimo com `require('lmdb').open()` sobre
   `.angular/cache/21.2.18/frontend/angular-compiler.db` também caiu antes
   de imprimir a confirmação de abertura, tanto em leitura como abertura normal.
   Isso isola a falha na abertura da base usada pelo compilador, sem Angular/UI.
4. LMDB novo em `.artifacts/p-104-build-cache/novo.db` escreveu e leu um registro.
5. Cópia do banco original para uma pasta isolada abriu e percorreu os 2.997
   registros. Uma segunda cópia, incluindo também o arquivo de lock, abriu.
   Logo, copiar apenas o lock não reproduz a falha; não há prova de que seja
   corrupção de conteúdo ou do lock. O caminho/estado original em uso é relevante.
6. Havia `ng serve` e um `ng build` de outra sessão usando a base anterior.
   Foram preservados. Não inferimos que acesso simultâneo, sozinho, seja a causa.
7. Com a única alteração de caminho em `cli.cache`, o build passou. A segunda
   execução passou reutilizando a base já preenchida, enquanto um processo
   mínimo LMDB a manteve aberta por 55 segundos (`CACHE_OPEN 1199`/`CACHE_CLOSED`).
8. `ng cache info` confirmou `Enabled: Yes`, `Environment: local` e
   `Effective Status: Enabled`; `CI` e `NG_BUILD_MAX_WORKERS` estavam ausentes.

A mudança usa a [configuração oficial de cache do Angular](https://angular.dev/cli/cache).
O código instalado em `normalize-cache.js` confirma os padrões: habilitado no
ambiente local, segmentado pela versão Angular. Não se desativou o cache para
mascarar a falha. Uma ocorrência nova exige investigação própria, não rotações
automáticas de caminho nem limpeza de caches compartilhados.

## Gates

| Comando/cenário | Resultado |
|---|---|
| `npm run build --workspace=frontend`, base nova | passou; compilação 23,578 s |
| Mesmo comando, cache preenchido + outro processo com a base aberta | passou; 11,393 s |
| `npm run ng --workspace=frontend -- cache info` | cache local habilitado, 3,30 MB |
| `npm run lint` | três workspaces passaram; sem erros; avisos existentes de formatação |
| `npm run test --workspace=shared` | 69 arquivos, 1.157 testes passaram |
| `npm run test --workspace=backend` | 53 arquivos, 994 passaram, 1 ignorado |
| `npm run test --workspace=frontend -- --watch=false` | 66 testes de normalização e 231 arquivos/3.126 testes Angular passaram |
| `npm run repo:test` | 7 testes passaram |
| `npm run repo:verificar` | organização e espelhos aprovados |
| `git diff --check` | passou |

Testes Vitest e o teste de índice Git inicialmente falharam dentro do sandbox
com `EPERM`/restrição de escrita; repetidos fora dele, passaram. A primeira
tentativa ampla foi interrompida por esta sessão depois dessas falhas de ambiente.
Não são regressões da configuração. O aviso de jsdom sobre navegação não
implementada não causou falha Angular. O build mantém o aviso existente de
budget: 589,54 kB iniciais, acima do aviso de 450 kB e abaixo do teto de 1 MB.

Revisão direta: diff de runtime limitado a `cli.cache.path`, defaults de
habilitação/ambiente preservados; pasta já coberta por `.angular/` no `.gitignore`.
Documentação e spec registram a recuperação sem transformar a causa interna
desconhecida em afirmação. Não há gate visual: nenhum componente/estilo foi alterado.
Alteração concorrente em `docs/core/sistema-v4.1.4.md` preservada, fora deste diff.

Logs e cópias locais em `.artifacts/p-104-build-cache/`, ignorados pelo Git e
ausentes no clone. Commit autorizado pelo autor após a entrega; sem push.
