# m11-09 — verificação

Spec: [`m11-09-oficina-mudancas-e-publicar.spec.md`](../m11-09-oficina-mudancas-e-publicar.spec.md).

## O que mudou
- `shared`: `sugerirNumeroVersao` (patch + 1 da última versão **publicada**; primeira publicação `1.0.0`; número fora
  de `X.Y.Z` não tem sugestão), com testes.
- Primitivo novo **`app-menu-acoes`** (`shared/ui/menu-acoes/`), aprovado pelo autor (item 6 da spec): botão com seta
  que abre uma lista curta de ações (ARIA `menu`, setas/Home/End, Enter/Espaço, Esc devolve o foco, Tab e clique fora
  fecham, item desabilitado é pulado). Documentado em `docs/design/DESIGN.md`.
- `OficinaMudancas` (serviço por leitor): versões do livro, última publicada, comparação da cópia de trabalho contra
  ela com `compararLivros` (debounce de 600 ms, nunca por tecla), marcas por peça (nova verde; alterada ou movida
  amarela; removida só na gaveta), publicação (grava o que estiver por salvar, número e nota limpos, recusa devolve as
  pendências) e comparação entre duas versões (Histórico).
- UI: barra da Oficina com os estados ("Em edição" ou "Igual à publicada" e a publicação mais recente — "Versão X"
  que todos veem ou "Rascunho X" que só os testers veem), botão "O que mudou" com contador e "Publicar ▾"; pontos
  de mudança nas peças e no sumário; gaveta "O que mudou" (abas *Edição × publicada* e *Histórico*, lista
  classificada com caminho, diff palavra a palavra e clique que leva à peça); diálogo de publicação em `app-modal`
  (resumo, número sugerido, nota, pendências: versão com pendência bloqueia, rascunho avisa, estrutural bloqueia
  tudo, sem mudança desde a publicada não publica); seletor de versão para ADMIN com faixa "Somente leitura" que
  esconde a Oficina e o editor.
- Backend: nada mudou (API da m11-04 já pronta).

## Análogo
`m11-oficina-exemplao.html` (`.marca-alteracao`, `.gaveta`, `.dialogo`, `.publicar-grupo`) e, no produto, o
`app-menu-insercao`, o `app-gaveta` do sumário e o `app-modal`.

## Resultados
- Medição do comparador: ~2 ms para uma árvore de 1080 peças; o cálculo incremental da spec não foi preciso.

## Fecho
**Testes e lint (rodada final):** shared 1258, backend 1093 (12 ignorados já existentes), frontend 3403; `npm run lint`
sem erros nos três workspaces (só avisos de aspas já existentes); `npm run repo:verificar` aprovado.

**Revisão independente (`revisor`):** 12 achados. Corrigidos: (1) publicar não segue quando o salvamento deixou algo
por gravar; (2) a leitura em cache é invalidada ao voltar da Oficina para a Leitura (a edição e a publicação aparecem
sem recarregar); (3) falha ao listar versões não vira "nunca publicado" — o diálogo avisa e bloqueia, e mostra
"Lendo as versões…" antes do carregamento; (4) corrida do seletor de versão (geração + conferência do livro, e o
`<select>` volta à opção vigente em falha); (5) a falha do Histórico não aparece na aba Edição; (6) o resumo da gaveta
e do diálogo conta o que a lista mostra (sem filhas de peça nova nem de removida; no Histórico, pelo caminho da mãe);
(7) campos e selos usam `campo__controle` e `app-chip` em vez de receitas locais; (10) breakpoint por `bp.mobile`;
(11) o temporizador do comparador é limpo ao destruir. Não corrigidos, por decisão registrada: (8) o `bloqueada` do
diálogo repete a regra do backend (versão sem pendência, estrutural bloqueia tudo) — uma função pura em `shared/`
usada pelos dois lados fica como melhoria; as pendências de "fotografia" só aparecem na recusa 400, já tratada;
(9) peça **movida** pinta ponto amarelo (a spec diz "alterada" e não cita movida; o exemplão não marca) — mantido;
(12) o `article` clicável da gaveta fala só "Ir para X" ao leitor de tela; o detalhe campo a campo fica lido na ordem
do documento.

**Ao vivo (pilha isolada, 3 papéis):** antes de publicar, admin, tester e comum viam a 4.1.4; com o rascunho 4.1.5,
admin e tester viam a 4.1.5 (RASCUNHO) e o comum seguia na 4.1.4; com a versão 4.1.5, os três viam a 4.1.5. O mesmo
número foi aceito para o rascunho e depois para a versão.

**Gate visual** (`verify`, 1920×1080 e 360×800 com toque, escuro e claro): marcas nas peças e no sumário; gaveta
nas duas abas (clique leva à peça e fecha a gaveta); menu "Publicar ▾"; diálogo de rascunho e de versão; Histórico
4.1.4 → 4.1.5; versão antiga somente leitura (sem barra da Oficina nem campos editáveis). Sem overflow horizontal e
sem erro de console. Depois das correções do revisor, repeti o diálogo, a gaveta e a versão antiga no claro desktop e
no mobile escuro: iguais ao aprovado, agora com `campo__controle` e `app-chip`.

**Limites:** a decisão de publicação continua no backend (o diálogo só antecipa); versões anteriores à importação não
entram no Histórico peça a peça; a marca de peça movida e o texto de leitor de tela da gaveta ficam como acima.

