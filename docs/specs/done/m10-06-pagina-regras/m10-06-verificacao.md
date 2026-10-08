# M10-06 — Verificação da página pública de Regras

08/10/2026. Escopo: página, blocos básicos, navegação, topbar e crédito da
spec proprietária. M10-04 commitada em `9d1a81d6`, com trailer de coautoria
conferido; M10-06 não commitada nesta entrega.

## Implementação e revisão

Rotas públicas lazy `/regras/sistema` e `/regras/guia`, com redirect de `/regras`;
cache HTTP concorrente por livro e remoção da entrada após falha para permitir retry.
Árvore até nível 3, todos os títulos navegáveis, versão pelo JSON e download dos
PDFs anteriores. Topbar usa Regras e a marca própria; rodapé contém origem/adaptação
e CC BY-SA. Layout não monta mais o antigo leitor global; arquivos dele permanecem
até M10-11.

Cada tipo básico tem componente próprio, inline sem HTML cru, renderização recursiva
e fallback que preserva conteúdo dos blocos ricos. Não altera regras de domínio,
contratos compartilhados ou backend. A página concentra apenas carga/apresentação
e ciclo da navegação; árvore e observação da rolagem estão extraídas. Com cerca de
230 linhas, não incorpora responsabilidades de pesquisa, painel ou renderização rica.
Chips usam variantes existentes: Energia `N E` secundário/contorno e REAÇÃO
primário/contorno. Nenhum primitivo foi ampliado.

Dois workers, modelo padrão herdado, executaram recortes independentes: blocos e
carga/árvore. O segundo fez revisão independente do diff integrado e encontrou o
último capítulo curto, que não alcança a linha superior ao rolar. O principal
reproduziu e corrigiu: ao chegar ao fim do documento, a última seção fica ativa.
Principal revisou o diff, preservou os testes antigos do layout e inspecionou
pessoalmente as capturas da aplicação real.

## Gate visual

Análogo registrado antes de editar: trilhos de leitura dos patchnotes; referência
de página/Coluna do exemplão M10. Aplicação Angular real, com assets públicos,
sem autenticação nem necessidade de API/Postgres para esta jornada.

| Viewport | Bases | Estados observados |
|---|---|---|
| 1920×1080 | claro/escuro | Sistema, Vida por sumário, troca para Guia |
| 1366×768 | claro/escuro | Sistema, Vida por sumário, troca para Guia |
| 960×1080 | claro/escuro | Sistema, Vida por sumário, troca para Guia |
| 360×800 | claro/escuro | Sistema, Vida por sumário, troca para Guia |
| 1920×1080 e 360×800 | escuro | âncora direta/inexistente, link interno com piscada, último capítulo, carregamento, erro/retry |
| 1920×1080 e 360×800 | claro/escuro | tabela e habilidade |

Confirmados mesma família de cartões, densidade e hierarquia do análogo; IBM Plex,
tokens, controles completos e glifos canônicos; ausência de overflow do documento
e de erros de página. Documento até 960px e alinhado à esquerda; tabela ocupa a
largura da leitura. Mobile mantém sumário acima, com rolagem própria limitada a
240px, conforme exceção da spec até M10-08. Tabelas têm rolagem horizontal local,
fade e primeira coluna fixa no mobile. Tarja sólida segue Documento de contenção.

Correções durante o gate: cartão do documento alinhado ao exemplão; retirada dos
espaços indevidos antes da pontuação do inline; linha de leitura considerando o
arredondamento do browser; salto longo imediato para tornar a piscada visível;
último capítulo curto ativo; sumário acompanha internamente o item ativo.

Navegação modifica a URL sem empilhar histórico por scroll; alvo recebe foco ao
acionar link, e âncora inexistente limpa o fragmento e mostra aviso no topo.
Downloads dos PDFs retornaram HTTP 200. Evidência local: `.artifacts/m10-06/`:
`visual.cjs`, `estados.cjs`, seus logs/JSONs e capturas por viewport/base/estado.
Checagem adicional em 1920×1080 e 360×800 com movimento reduzido: redirect público,
Enter no sumário, foco no título, ausência de animação, Voltar conservando a URL
anterior e alvos de toque de pelo menos 44px no seletor/PDF/sumário. Passou em
`acessibilidade.cjs` / `acessibilidade-final.log`. No mobile, acionar o seletor
acima do texto requer rolar até ele, e a URL anterior reflete essa posição.

## Gates automatizados e limites

- Angular focado: 5 arquivos / 31 testes passaram no corte de carga/árvore/blocos,
  página e topbar; integração final também inclui os testes antigos do layout.
- Angular amplo: **218 arquivos / 3.077 testes passaram**, com configuração
  temporária e exclusão explícita dos dois specs do montador afetados por P-106.
  Log `testes-frontend.log`; configuração temporária preservada só nos artefatos.
- `npm run lint`: sem erros; avisos existentes shared 5.890, backend 4.475 e
  frontend 27.077. Log `lint.log`.
- `npm run repo:verificar`: organização e espelhos aprovados na árvore local;
  `git diff --check`: sem erros. Nenhum commit da M10-06 foi solicitado; gate
  staged será executado quando seus arquivos forem preparados para commit.
- `CI=true NG_BUILD_MAX_WORKERS=2 npx ng build`: passou; bundle inicial 581,26 kB,
  aviso acima do orçamento de 450 kB, abaixo do limite de erro de 1 MB. Log `build.log`.
  Execução direta do Angular evita o prebuild bloqueado por P-105; não comprova
  sucesso de `npm run build` nem da geração dos livros.
- Shared/backend/normalizador não foram alterados. Gates executados nesta sessão
  na M10-04 são reutilizados: shared 974 testes/67 arquivos passaram, dois arquivos
  bloqueados por P-106; backend 994 testes/53 arquivos passaram e um skip;
  normalizador 34 passaram e seis falharam por P-105. Não se declara suíte global verde.

P-105 segue aberto: arquivos/fontes v4.1.3 no preparo/normalizador precisam de
alinhamento com v4.1.4. Esta página consumiu os assets já gerados de Sistema
v4.1.3 e Guia v4.2.0, exibindo a versão efetiva do JSON. P-106 segue aberto:
quatro testes apontam ao corpus anterior à realocação. Esses defeitos não são
introduzidos por M10-06 e não foram corrigidos fora do escopo.

Blocos ricos, painel/mobile, pesquisa e exportação/remoção do PDF permanecem nas
tasks M10-07…11. A jornada desta página está verificada; seus limites de conteúdo
e dos gates globais estão discriminados acima.
