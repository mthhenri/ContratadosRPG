# Verificação — mudanças publicadas para leitores

Data: 2026-10-22. Resultado: **concluída**, implementação e gates locais aprovados.
Spec: [livros-mudancas-publicadas-para-leitores.spec.md](../livros-mudancas-publicadas-para-leitores.spec.md).

## Escopo entregue

- Leitor página/painel oferece “O que mudou” a visitantes e usuários comuns, sem Oficina.
- Publicação usa `EditorMarkdown` com Reactive Forms e propagação imediata para não perder
  o último texto ao confirmar. Nota opcional permanece em `livro_versao.nota`, sem migration.
- Consulta independente da edição: `/livros/:codigo/mudancas?origemId=...` só entrega
  publicações oficiais, notas do intervalo e fragmentos dos blocos afetados.
- Destino fixo atual, origem anterior por padrão; origem antiga reúne notas cronológicas
  e compara diretamente os extremos. Primeira publicação não despeja o livro inteiro.
- Novas/removidas agrupam subárvores efetivamente cobertas; alterações não repetem filhas
  inalteradas. Movimento e alteração de uma peça não duplicam o texto. Reordenação inclui
  posições. Categoria de habilidade aparece no fragmento com rótulo legível.
- `/livros/:codigo/publicada` serve à navegação para a regra vigente, inclusive quando
  admin/tester estava lendo rascunho. Falha/retry conserva essa intenção e a âncora.
- Markdown passa pelo renderer seguro existente. Nenhum endpoint administrativo foi
  liberado; não há nova permissão de escrita ou leitura integral de histórico ao público.
- OpenAPI regenerado; contratos aditivos em `shared/src/dtos/livro/livro-publicacao.dtos.ts`.

## Arquitetura e impacto

`RegrasMudancasPublicadas` concentra transporte/estado/apresentação pública em
`frontend/src/app/modules/regras/publicacoes/`; `RegrasLeitor` recebe apenas host,
abertura e navegação. Isso evita aumentar o estado da Oficina ou concentrar nova
responsabilidade no leitor já extenso. Sem refatoração ampla nem mudança de primitivo.

| Item compartilhado/reuso | Consumidores avaliados | Decisão |
|---|---|---|
| `EditorMarkdown` | 12 consumidores prévios, incluindo Biblioteca, fichas e Caderno | Novo uso na publicação; API/estilo do primitivo preservados |
| `compararLivros` | barrel, Oficina e testes do shared/importador | Reuso backend, sem alterar motor ou assinaturas |
| Exportador Markdown | exportação canônica e seus testes | Reuso sem alteração global; adaptação de fragmentos em util local |
| `RegrasService` | leitor e pesquisa | Método aditivo para leitura oficial; cache por papel preservado |
| Markdown seguro | NPC, patchnotes e novo componente | Renderer preservado; novo consumidor usa sanitização canônica |
| DTOs públicos | API, OpenAPI e componente público novos | Aditivos, sem herança entre DTOs nem ids de autor |

Buscas `npm run impacto` e pontos cegos manuais conferidos. Não houve consumidor
fora do pedido com comportamento alterado que exigisse decisão adicional do autor.
Leitura manual do diff pela skill `convencoes-check`: controllers só repassam; seleção
e validação no service; SQL existente nos repositórios; nenhum hardcode de cor/fonte/raio
nos estilos novos; sem alteração de fórmula, livro gerado, enum ou schema.

## Testes e gates

| Comando/gate | Resultado |
|---|---|
| `npm run test --workspace=shared` | 77 arquivos, **1.340 aprovados** |
| `npm run test --workspace=backend` | 75 arquivos aprovados, 8 ignorados; **1.305 aprovados**, 99 ignorados pela configuração existente |
| `npm run test --workspace=frontend -- --watch=false` | 289 arquivos, **3.594 aprovados**, mais **89** testes dos normalizadores |
| Testes focados API/controller/service/OpenAPI | **58 aprovados** após correções da revisão |
| Testes focados frontend Regras antes da revisão | **327 aprovados**; novos casos posteriores cobertos pela suíte final |
| Lint dos três workspaces, incluindo `tsc --noEmit` backend | Zero erros; avisos de estilo registrados nos logs |
| Build shared/backend/frontend | Aprovados; frontend final com `CI=true` e `NG_BUILD_MAX_WORKERS=2` |
| HTML/SCSS tocados | Formatados com Prettier do projeto |
| `npm run repo:verificar`, `git diff --check` | Aprovados |
| `npm run repo:test` | **14 aprovados**, após realocação final da spec/anexos |

Teste primeiro: falhas comportamentais observadas para editor/entrada pública,
seleção autorizada da API, agrupamento, retry oficial e posições da reordenação;
logs locais registram vermelho/verde. O runner frontend no sandbox falhou por `EPERM`
de cache temporário antes de coletar testes; execução fora dele passou. Backend usou
TEMP/TMP locais de artefatos. Isso é limitação do ambiente, não falha de produto.

Avisos: lint mantém avisos de estilo, inclusive comprimento de linhas; não se reivindica
lint sem warnings. Build frontend mantém o orçamento inicial excedido (603,33 kB para
450 kB), compatível com a pendência de orçamento já documentada; build terminou com exit 0.
O jsdom emite avisos de navegação entre documentos em testes de links, sem teste reprovado.

## Aplicação real e comparação visual pessoal

Stack real isolado: PostgreSQL Docker 16, banco `livro_mudancas_20261022`, NestJS
`localhost:3101`, Angular `localhost:4301`. Banco original e produção não foram escritos.
Cópia local com três publicações, rascunho e trabalho distintos, usuários reais
NORMAL/TESTER/ADMIN e Guia inicialmente com uma única publicação. Fotografias do cenário
validadas pelo validador canônico; sucesso do browser usa a API real.

Principal executou os scripts do navegador e **inspecionou pessoalmente a UI renderizada**,
incluindo desktop/mobile, notebook/tela dividida, claro/escuro, página/painel, notas,
blocos ricos, remoções, erro e editor de publicação. Análogos inspecionados no código:
gaveta de mudanças e diálogo de publicação da Oficina, mais editor canônico.

- **38 casos aprovados:** 32 combinações NORMAL/visitante × página/painel × claro/escuro
  × `1920×1080`, `1366×768`, `960×1080`, `360×800`; mais primeira publicação, erro/retry e
  espera em desktop/mobile. Em cada combinação: padrão, origem antiga, notas intermediárias,
  blocos alterados/novos/removidos/movidos, tabela/lista/formatação, seletor por teclado,
  Escape e restauração de foco. Zero erros JavaScript ou overflow da superfície medidos.
- Retorno do foco ao gatilho e foco visível confirmados em **32/32** combinações; controles
  móveis medidos na consulta com altura mínima de 44px. Toque exercitado no Chromium móvel.
- Primeira publicação sem anterior; notas ausentes e versões de mesmo conteúdo sem diff
  conferidas depois por publicação real adicional do Guia, desktop/mobile.
- Falha 503 e espera interceptadas somente para exercer estados transitórios; após liberar
  a rede, todo conteúdo de sucesso veio do servidor real. Não foram forjadas respostas felizes.
- Publicação real pelo editor em `360×800`: título Markdown e parágrafo persistidos;
  NORMAL abriu a nota como título formatado. Novo rascunho posterior com nota privada ficou
  fora da comparação; TESTER navegou da consulta para a regra oficial e perdeu a tarja de
  rascunho. Acesso direto a rascunho, versão de outro livro e id inexistente retornou 404.
- Gate encontrou a barra móvel do editor cobrindo Cancelar/Publicar. Correção **local de
  layout**, mantendo o primitivo: reserva estável nas ações e alvos de toque 44px. Refeito
  desktop/mobile; Cancelar funciona durante edição e Publicar funcionou no cenário real.
- Comparação com os análogos: mesma voz visual, densidade e hierarquia; controles/ícones
  canônicos, sem aparência de formulário genérico, foco/contraste legíveis nos dois temas,
  sem corte da superfície. Tabelas usam a rolagem local prevista. Índices 01/02 preenchem
  os cabeçalhos dos cartões, sem caixas decorativas vazias.

As capturas imediatamente após abrir uma gaveta podem pegar a animação e parecer cortadas;
a inspeção estável aguarda a transição. A primeira rodada da matriz teve asserção sensível
a caixa (“Removida” versus rótulo visual uppercase), corrigida no script de teste;
a rodada válida terminou **38/38**. Isso não exigiu mudança de produto.

## Revisão independente

Subagentes Codex com modelo herdado: API/testes e UI pública em paralelo; preparação
de cenário isolado; revisor independente consolidado. Revisão encontrou quatro cenários:
descendente novo além de peça movida, retry oficial, posição entre irmãs e categoria de
habilidade invisível. Todos reproduzidos/corrigidos com regressões; conferência restrita
posterior confirmou resolução dos quatro, sem residual concreto.

## Evidências e limites

Evidências **locais e ignoradas** em `.artifacts/livros-mudancas-publicadas-para-leitores/`:
`gate-estados-resultados.json` e capturas `gate-*.png`, `publicar-fluxo.json`,
`editor-visual.json`, `estados-sem-conteudo.json`, logs das suítes/build/lint e scripts
reproduzíveis do cenário. Não há credenciais nem capturas adicionadas ao Git.
O clone depende do relato e dos testes versionados; imagens locais são suplementares.

Sem teste/deploy em produção ou push. Commit local autorizado pelo autor após a entrega,
com verificação do conteúdo preparado e trailer de coautoria. Toque/viewport simulados no
Chromium, não telefone físico. As publicações `*-local` e o rascunho de teste existem
somente no banco isolado. Histórico anterior ausente não é reconstruído; exportação
para dev continua em sua spec do backlog. Nenhum gate obrigatório local permanece aberto.
