# Task 01 — implementação local e verificação

Data: 2026-10-14. Base: `d339e525f70328c69a0f5b42f8af00662bac255d`.
Worktree: `/workspace/ContratadosRPG-transcricoes`; branch `feat/transcricoes-01`.
Autor autorizou a V1 local e aprovou D-01/contrato estrutural D-05 (“aprovo”).

**Estado: active.** Fundação implementada e verificada no recorte; o fecho global
continua aberto pelos problemas abaixo. Nenhum Windows, UI, inferência, fila,
sincronização, exportação ou nuvem foi entregue por esta task. 08–09 seguem bloqueadas.
Sem push, PR remoto, merge, deploy ou acesso a produção.

## Entrega

- DTOs readonly/subpath shared, enum de estado e validators de metadados/tempo/id.
- Migration SQL 0037 com sessão/faixa/estado/execução/segmento, UUIDs estáveis e
  PKs numéricas, índices/FKs, original imutável, revisão e seleção coerente.
- API NestJS privada de metadados: nove operações sob `/transcricao`, CRUD de
  sessão, arquivamento reversível e criação/listagem/recuperação de faixas.
- Mestre atual revalidado por campanha; ADMIN/TESTER não ganham bypass. Guards
  globais preservados (conta/tokenVersao/expiração). 404 privado uniforme;
  corpo inválido/ids fora de INTEGER/filtro inválido dão 400; auth inválida 401.
- SQL de exclusão transacional da raiz e descendentes; criação bloqueia a raiz.
  Seleção/alteração de estado arbitram pela faixa, inclusive snapshot antigo.
- Cronologia determinística em milissegundos, offsets negativos, falas simultâneas
  e diferença entre correção null/vazia, sem alterar original.
- OpenAPI gerado e servido com contratos/status reais desse recorte; respostas
  dos módulos anteriores preservadas. Sem armazenamento/transporte de WAV.

Ingestão idempotente, alterações editoriais/offsets e escolha pelo site de execução
alternativa continuam com 05/06; a fundação define seus dados, não antecipa endpoints.

## Evidência executada

| Comando/prova | Resultado final |
|---|---|
| `npm ci` | Dependências do lockfile instaladas; sem mudança do lockfile |
| `npm run build --workspace=shared` | Exit 0 |
| `npm run build --workspace=backend` | Exit 0 |
| `npm run build --workspace=frontend` | Exit 0; aviso do bundle inicial 596,56kB acima do budget de aviso 450kB |
| Testes focados backend: `transcricao.service.spec.ts`, `transcricao-tempo.util.spec.ts`, `transcricao.controller.spec.ts`, `openapi.document.spec.ts` | **31/31** aprovados |
| `TESTAR_POSTGRES_TRANSCRICAO=1 npm run test --workspace=backend -- transcricao-postgres.spec.ts` | **11/11** aprovados; UP/DOWN, consultas reais, FK, original, concorrência READ COMMITTED/REPEATABLE READ e rollback |
| `TESTAR_API_TRANSCRICAO=1 npm run test --workspace=backend -- transcricao-api.spec.ts` | **13/13** aprovados; JWT/guards/API compilada/Postgres real, nove operações e OpenAPI servido |
| `npm run openapi:gerar-contratos --workspace=backend` | Gerado; comparação com gerador e documento servido aprovadas |
| `npm run test --workspace=shared` | **1276/1276** aprovados |
| `npm run lint --workspace=shared` | Exit 0, warnings históricos do workspace |
| `npm run lint --workspace=backend` | Exit 0, **0 erros**, warnings do workspace; inclui `tsc --noEmit` |
| `npm run lint` | Shared/backend sem erros; falha por dois erros preexistentes no frontend (abaixo) |
| `npm run test --workspace=backend` | **1126 aprovados, 2 falhos preexistentes, 36 pulados**; casos PG/API opt-in foram executados separadamente |
| `npm run test` na baseline | Shared aprovado; duas falhas backend já presentes e frontend OOM antes do produto mudar |
| `NODE_OPTIONS=--max-old-space-size=8192 npm run test --workspace=frontend` | Testes de regras 88 aprovados; suite Angular interrompida por worker: 473 aprovados de 536 anunciados, execução não certificada completa |

`npm run repo:test` aprovado **14/14**; `repo:verificar` aprovado na árvore e
no índice; whitespace conferido e corrigido antes do commit local de progresso. Logs brutos ficam
localmente em `.artifacts/transcricoes-01-sessoes-e-contratos/`, ignorados pelo Git.
Não dependem de captura ausente para sustentar este relatório. Sem UI nesta task,
nenhuma inspeção visual foi feita ou declarada; gates visuais seguem obrigatórios
nas tasks com telas. Não há prova física Windows/CPU/GPU neste corte.

## Falhas preexistentes e limitações

1. `backend/src/modules/livro/regra-peca.service.spec.ts`:
   - “cria o arquétipo com a habilidade inicial vazia dentro dele”;
   - “é atômico: falha ao criar a filha não deixa o arquétipo pela metade”.
   Ambas falharam antes e depois da implementação (BusinessException de forma
   da peça). Código/testes da Oficina não foram alterados nesta task.
2. `frontend/src/app/modules/regras/oficina/oficina-texto.component.ts`, linhas
   234/235: `no-irregular-whitespace`. Arquivo não tem diff contra a base;
   os erros já são citados no histórico de 13/10. Não houve correção fora de escopo.
3. Suite frontend excedeu heap padrão na baseline. A execução com 8GiB ainda
   encerrou worker inesperadamente e não terminou; não presumir todos os demais
   testes verdes. Não alteramos config de testes ou budget para esconder limites.

Esses gates impedem mover a task para done. Nenhuma das falhas foi removida
silenciosamente ou atribuída ao Transcriber; sua resolução é trabalho separado.

## Revisão independente e regressões

Delegação: revisor Codex (modelo herdado, somente leitura), via skill
`requesting-code-review` e política `orquestracao`. Um único revisor, sem delegação
em profundidade; análise do problema/spec/diff sem receber conclusão do implementador.
Quatro achados procedentes, reproduzidos e corrigidos:

- INTEGER: 2147483648 retornou 500 em REST; teste passou a exigir 400 e validação
  agora limita IDs ao int4 antes de query. Tempo continua em inteiro seguro separado.
- Criar faixa × excluir: duas conexões reproduziram faixa viva sob raiz excluída;
  criação bloqueia/revalida sessão. Teste confirma todos os filhos excluídos.
- Seleção × estado: duas conexões reproduziram seleção de execução falha;
  mudança de estado bloqueia/versiona faixa. Ordem inversa e REPEATABLE READ também
  exercitados; seleção válida não é invalidada por concorrência.
- OpenAPI: teste detectou POST sem 201/erros omitidos. Respostas da tag Transcrições
  agora refletem 201/200/400/401/404, com prova também no JSON servido pela API.

## Impacto e responsabilidade

`impacto --simbolo validarMembro` e `--simbolo ehMestre` executados. Os métodos
existentes não foram alterados: consumidores antigos preservados; uso novo mantém
sentido de papel atual por campanha. Shared recebe novos símbolos/subpath, sem
renomear DTOs/enum existentes. AppModule e mapa OpenAPI acompanham exclusivamente
registro do módulo novo. Regeneração OpenAPI é aditiva; override de status só na
nova tag. Nenhum consumidor frontend/tema foi editado; build Angular passou.

## Como reproduzir as provas locais

Usar exclusivamente PostgreSQL 16 descartável `transcricao_test`, usuário
`postgres`, senha de teste `transcricao_local_test`, host `127.0.0.1`, porta 55439.
Não apontar essas provas a produção/.env pessoal. Container sem volumes:
`docker run --detach --name contratados-transcricao-test-01 --publish 127.0.0.1:55439:5432 --env POSTGRES_USER=postgres --env POSTGRES_PASSWORD=transcricao_local_test --env POSTGRES_DB=transcricao_test postgres:16`.

1. Instalar lockfile e compilar shared/backend.
2. Aplicar migrations 0001–0036 no banco descartável, antes da prova de schema
   (0037 ausente). A suite `TESTAR_POSTGRES_TRANSCRICAO=1` aplica UP e DOWN de 0037.
   Se já aplicada, retirar somente o batch da 0037 nesse banco de teste.
3. Aplicar 0037 com Knex para a prova REST e subir backend compilado na porta
   53101, `APP_AMBIENTE=development`, origem local 4300, storage `local`,
   `JWT_SECRETO=transcricao_segredo_somente_teste_local`, `JWT_EXPIRACAO=7d`,
   com as mesmas variáveis DB locais explicitamente definidas.
4. Executar `TESTAR_API_TRANSCRICAO=1`. A suite cria usuários/campanhas sintéticos
   e tokens de teste; não imprime credenciais. Não rodar schema/REST em paralelo
   porque a primeira aplica/remove as tabelas da task.
5. Encerrar API/container criados por esta task. Dados eram sintéticos, sem WAV;
   nenhum volume nem produção é removido.
