# m11-10 — verificação

Spec: [`m11-10-troca-fonte-da-verdade.spec.md`](../m11-10-troca-fonte-da-verdade.spec.md).

## Decisões do autor nesta task
- **Formato da cópia gerada:** Markdown legível (sem identificadores no texto), com cabeçalho "gerado — não edite".
- **Plano B estático:** removido. O leitor depende só da API; sem ela (404 ou rede) mostra o erro com "tentar novamente".

## O que mudou
- **`exportarLivroEmMarkdown`** (`shared/src/livro/exportar-markdown.ts`): pura e determinística. Título e subtítulo em `#`,
  seções em `##`… com glifo e `{#âncora}`, parágrafos, listas aninhadas, tabelas de pipes, habilidades
  (`**◈ Nome** [3 E] (Reação) texto`), classe/arquétipo/subclasse com os grupos de habilidades, origens, termos,
  equipamentos/modificações/amplificadores, módulos, níveis de ameaça, ficha de criatura, roteiro, faixas, grades e abertura.
  Exemplo, nota, fórmula e containers levam uma marca em comentário HTML. A tabela de layout que a classe e as origens
  guardam da fonte (repete as peças filhas) não é exportada.
- **`regras:exportar`** (`backend/tools/regras/exportar-livros.ts`, atalho na raiz): lê a versão PUBLICADA atual de cada livro,
  grava `docs/core/sistema-v<n>.md` e `guia_de_mestre-v<n>.md` com cabeçalho e hash do corpo, remove o arquivo da versão
  anterior e não regrava o que já está igual (idempotente). `-- --conferir` só compara com o banco (código de saída 1 se
  divergir). Também regenera `frontend/src/app/shared/condicoes/condicoes.dados.ts` a partir do Sistema publicado.
- **Proteção contra edição à mão:** `repo:verificar` (e `--staged`) confere em `docs/core/*.md` o cabeçalho e o sha256 do
  corpo (CRLF do Git normalizado) e recusa `.md` solto na pasta.
- **Build e leitura sem o normalizador:** `prestart`/`prebuild` e `verificar-regras-publicadas.mjs` saíram; `RegrasService` não
  tem mais o JSON estático (e ganhou `invalidarLeitura`); o normalizador ficou como ferramenta do importador. Os `.md`
  originais foram movidos (`git mv`) para `frontend/scripts/fixtures/fonte-inicial/`, de onde o importador e os testes do
  normalizador passam a ler.
- **Documentação:** `SYSTEM.SPEC.md` §1.1 e árvore da §3, `CLAUDE.md`/`AGENTS.md` (idênticos) e a skill `regras-do-jogo`
  (`.claude/` e `.agents/` idênticas).
- **Consumidor de `docs/core` achado no levantamento:** `shared/src/regras/npc/biblioteca.spec.ts` lia o Guia com o
  formato antigo; o leitor do teste foi adaptado ao formato gerado (e continua sendo o oráculo do motor).

## Fidelidade do conteúdo (item 2 da spec)
Importei os `.md` originais num banco temporário (`contratados_rpg_m11_10`, `regras:importar`) e exportei.
- **Invariante automática** (`backend/src/modules/livro/exportador/exportador.spec.ts`): todo texto de todo `dados` de toda
  peça aparece no Markdown. Passa para o Sistema (1049 peças) e o Guia (367); as únicas exceções são os dois campos
  repetidos descritos acima e a categoria da habilidade de criatura, que o rótulo já traz.
- **`condicoes.dados.ts`** regenerado a partir da fotografia: idêntico ao anterior, só o cabeçalho mudou.
- **`biblioteca.spec.ts`:** as 22 habilidades da Biblioteca de Referência do Guia, lidas da cópia gerada, batem com o motor.
- **Comparação palavra a palavra com os `.md` anteriores** (conjunto de palavras, sem sintaxe de Markdown). O que só
  existe no original: o sumário com números de página, os glifos de seção da âncora duplicada, os cabeçalhos de coluna das
  tabelas de equipamentos/modificações (agora cada item traz seus rótulos: Custo, Peso, Porte, Efeito, Bloqueia…), a
  numeração solta e as imagens embutidas em base64. O que só existe na cópia: esses rótulos por item e o texto das
  etiquetas de estrutura. Nenhum trecho de 10 palavras aparece repetido na cópia além do que o original já repetia.
  Diferenças aprovadas pelo autor: ver "Aprovação" (pendente).

## Fecho
**Testes e lint:** shared 1266, backend 1099 (12 ignorados já existentes), frontend 3404 e 88 do normalizador
(`test:regras`); lint sem erros nos três workspaces; `npm run build --workspace=frontend` sem o normalizador;
`repo:verificar` aprovado; `diff CLAUDE.md AGENTS.md` e `diff -r .claude/skills .agents/skills` vazios.

**Gate visual** (`verify`, pilha isolada, API só com os livros importados): Sistema e Guia, pesquisa, painel flutuante de
Regras e impressão do Guia em 1920×1080 e 360×800 (toque), tema escuro; zero requisição a `/regras/*.json`, sem overflow e
sem erro de console. No mobile o script não achou o botão de impressão (a query dele); a impressão não foi tocada por esta
task e foi vista no desktop (o Sistema segue suspenso, P-108).

**Revisão independente (`revisor`):** corrigidos — (1) a primeira cópia saiu com um `shared/dist` velho: o script
`regras:exportar` agora recompila o `shared` antes (`preregras:exportar`) e a cópia foi regerada (idempotente e
`--conferir` limpos); (3) o teste da Biblioteca achava o Guia por nome fixo: agora por prefixo; (4) parágrafos que
começam com `>`, `#`, `+`, `-` ou `1.` agora saem escapados; (5) restos de comentário/gitignore e o destino padrão do
normalizador (agora `.artifacts/`). Mantidos: os stubs `situacao: null` dos specs do leitor (o gate `podeEditar`
continua válido).

**Ponto aberto (2) — ordem de implantação:** com o JSON estático fora, o leitor depende de o banco de cada ambiente ter
os livros publicados. O banco de dev do autor ainda não tem a importação (`regras:importar` nunca foi rodado nele), então
**antes de subir este frontend é preciso importar nesse banco e em produção**; está registrado no `CONTEXT.md`. A
exportação desta task saiu de um banco temporário que importou os mesmos `.md`: é o mesmo caminho que o banco real
percorrerá, mas não foi lida do banco do autor.

## Aprovação das diferenças
Aprovado pelo autor ao pedir o commit: formato da cópia gerada e lista de diferenças acima (sumário, imagens, rótulos por item).
