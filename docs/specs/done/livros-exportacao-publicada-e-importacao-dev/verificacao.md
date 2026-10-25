# Verificação — transporte da publicação atual dos livros

Spec: [exportação e importação local](../livros-exportacao-publicada-e-importacao-dev.spec.md).
Implementação e verificações em 22–23/10/2026; concluída em 23/10.

## Resultado

ADMIN baixa Sistema e Guia pela Oficina. A API lê as duas publicações atuais em um
statement MVCC, sem consultar a cópia de trabalho; exige autorização também na
service e responde `Cache-Control: no-store`. Pacote versionado em shared contém
fotografias e metadados editoriais; SHA-256 cobre JSON canônico, sem autoria e ids
relacionais. Validação integral recusa campos desconhecidos, referências inválidas,
UUID não canônico, número editorial inseguro e formatos incompatíveis.

CLI local reutiliza o guard de reset-dev e constrói a conexão exclusivamente do
alvo validado. Simulação, importação e recuperação exigem administrador local.
Substituição explícita dos dois livros é transacional, com recuperação gravada e
relida antes da escrita. UUIDs são preservados, links congelados viram referências
editáveis e âncoras antigas são reconstituídas. Sem migration ou alteração de regra.

## Evidências de integração

Origem de teste: API3101/frontend4301, banco `livro_mudancas_20261022`. Destino:
PostgreSQL16 exclusivo5434/`contratados_rpg`, API3102/frontend4302. O banco de
trabalho do autor5432/`contratados_rpg`, o serviço de outro projeto5433 e produção
foram preservados. Artefatos ignorados em `.artifacts/livros-exportacao-publicada-e-importacao-dev/`.

- Endpoint com JWT real: ADMIN200/no-store; visitante401, NORMAL/TESTER403.
  Pacote tem Sistema4.1.6-local e Guia4.2.1-local; fotografia igual a
  `/livros/:codigo/publicada`, sem versões anteriores ou rascunho4.1.7-rascunho-local.
  Alteração temporária de trabalho por REST foi excluída da exportação e revertida.
- Wrappers npm reais: simular, importar com substituição, repetir, simular recuperação
  e restaurar passaram. Hash do estado editorial anterior voltou a ser o mesmo após
  recuperação, incluindo trabalho divergente, oito fotografias ativas, mapa legado,
  âncora renomeada e link por identificador. Após importar: duas publicações e1.416
  peças; repetir preservou contagens e hash. `CLI-VERIFICACAO.md` detalha a prova bruta.
- Teste PostgreSQL opt-in executado pelo principal: **1 cenário integrado aprovado**,
  com rollback ao falhar o segundo livro, falha de backup/usuário/substituição,
  isolamento dos demais dados, UUID inativo, links/mapas, edição e republicação,
  mesmo número com conteúdo diferente, precisão de microssegundos, ordenação de
  trabalho e preservação/restauração de rascunho e trabalho incompletos.
- `npm run regras:exportar`, `npm run regras:exportar -- --conferir` e nova exportação:
  **status0 nas três execuções**, em cópia temporária do repositório ligada ao
  destino5434 após importar. Markdown com cabeçalho/hash e condições gerados; segunda
  execução sem alteração. Fontes e derivados versionados não receberam fixtures.
  Logs `cli-exportar-*-real.log`; cópia temporária em `repositorio-geracao/`.

## Gate visual pessoal do principal

Análogo registrado antes da edição: menu Publicar e estados da Oficina. Novo botão
usa `Botao` secundário/contorno/pequeno, feedback canônico e o mesmo shell, peso,
tipografia e densidade da barra. Responsabilidade separada em componente e service;
a barra extensa recebe apenas a composição, sem lógica de transporte.

Aplicação Angular real percorrida em **1920×1080,360×800,960×1080,1366×768**, claro e
escuro. Principal inspecionou as capturas renderizadas dos estados normal, espera e
falha, comparando ao Publicar adjacente. Mesma hierarquia e controles do produto,
sem HTML genérico ou overflow horizontal; foco visível e alvo móvel44px. Estado de
espera desabilita repetição; falha503 informa o erro e nova tentativa baixa o arquivo.
Download real contém os dois livros e coincide com a publicação oficial. Botão
ausente para NORMAL/TESTER, além do bloqueio direto da API. Evidências `ui-*.png`,
`espera-*.png`, `falha-*.png` e `ui-resultados.json`.

## Revisão e gates gerais

Revisão independente por subagente Codex identificou três casos reproduzidos:
recuperação de rascunho incompleto, UUID maiúsculo normalizado pelo PostgreSQL e
idempotência de árvores com arrays fora da ordem efetiva. Corrigidos e cobertos:
validação estrutural distinta da completude publicada, UUID canônico e comparação
de trabalho ordenado. Principal leu o recorte de API/SQL/runtime/recuperação/DTO/UI
e conferiu as correções. Não foram alterados primitivos, consumidores alheios ou
arquivos de regras geradas. Impacto da barra fica no leitor; DTOs são aditivos e o
exportador compartilhado existente conserva seu contrato e testes.

| Gate | Resultado |
|---|---|
| `npm run test --workspace=shared` |1.340 aprovados |
| `npm run test --workspace=backend` |1.343 aprovados,100 ignorados; caso PostgreSQL opt-in aprovado separadamente |
| `npm run test --workspace=frontend -- --watch=false` |3.600 aprovados +89 normalizadores |
| Lint dos três workspaces |0 erros; avisos de estilo existentes, sem correção em massa |
| Builds shared/backend/frontend | aprovados; frontend603,33kB mantém aviso de orçamento450kB |
| `npm run repo:test` |14 aprovados |
| `npm run repo:verificar` e `git diff --check` | aprovados no fecho |

Passe de convenções: controller fino, permissão na service, SQL no repository,
SELECTs de negócio filtrados por soft delete, INSERT SELECT/named parameters,
ausência de DELETE físico e de acesso a env na aplicação. Exceções legítimas:
catálogo PostgreSQL e advisory lock não têm `is_deleted`; wrappers CLI leem env
fora do ciclo Nest, como as ferramentas existentes. DTOs readonly sem herança;
estilos usam breakpoint/alvo canônicos, sem cor/fonte/raio hardcoded. Sem falha de
produto pendente nos gates. Falhas iniciais de invocadores temporários foram
corrigidas e repetidas; testes de organização exigiram execução fora do sandbox
para criar configuração Git temporária.

## Limites operacionais

Não houve operação em produção. Exportação transporta somente a publicação atual;
não reconstrói histórico da origem. Recuperação protege o estado lógico ativo local,
inclusive histórico ativo e rascunhos, sem copiar registros previamente excluídos;
novos registros ficam excluídos após restaurar e timestamps técnicos seguem os
triggers do banco. O pacote real da origem não tem mapa legado: ida desse mapa,
links ricos e republicação estão cobertos pelo cenário PostgreSQL; a prova real
completa cobre backup/restore do mapa de trabalho divergente. Hash é integridade,
sem assinatura de origem. Banco e arquivos não formam transação única. Nenhum
commit ou push automático; operação documentada em `docs/DEVELOPMENT.md`.
