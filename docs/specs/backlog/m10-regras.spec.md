# m10-regras.spec.md

> **Milestone M10 — Regras (documentos do sistema no site).** Consolida a conversa de 05–06/10/2026
> com o autor e os testers. Este arquivo é guarda-chuva: implementar somente pelas tasks
> `m10-01`…`m10-11`, cada uma com a sua spec em `docs/specs/backlog/` (quebra feita em 2026-10-06).
> A numeração M10 deixa de ser a sugerida pela `I-015` (assistência por IA), que segue como ideia.
>
> **Fonte visual:** `docs/design/propostas/m10-regras-exemplao.html` — exemplão standalone revisado
> com o autor e os testers. Abas *Protótipo* (página, painel, celular, PDF), *Decisões* e *Ícones*.
> Mockup é fonte visual, **nunca de mecânica nem de texto**: o texto exibido vem sempre do `.md`
> canônico; divergência entre exemplão e `docs/core/` → o documento vence.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e o handoff em `docs/design/tema/`. Todo
> controle usa o primitivo de `shared/ui/` com a API completa; se faltar variante, glifo ou
> primitivo, **parar e perguntar ao autor**.

## Vocabulário

- **Site** = o software. **Sistema** = a documentação do jogo (`sistema-v4.1.3.md`); **Guia** =
  `guia_de_mestre-v4.2.0.md`. Os dois juntos são **as Regras**.
- **Formato canônico** = a árvore tipada (JSON) gerada no build a partir do `.md`. É o formato que o
  editor futuro vai gravar.

## Objetivo

Trocar os PDFs de regras da topbar por um leitor próprio — página completa, painel flutuante e
celular — com pesquisa e exportação para PDF a partir da nossa própria visualização, e remover o
PDF do Docs e o `pdfjs-dist` quando a exportação existir.

## Decisões de produto fechadas

| Tema | Decisão |
|---|---|
| Fonte | Google Docs → `.md` exportado, renomeado e salvo em `docs/core/` (como hoje). O fluxo do autor não muda; só deixa de exportar o PDF (na `m10-11`). |
| Parse | **No build**, uma vez; o front só renderiza. Nada de backend: os documentos são públicos. |
| Normalizador | Mora em `frontend/scripts/` (só o build do front consome; sem emenda à §6 do SYSTEM.SPEC). Os tipos da árvore ficam em `frontend/src/app/modules/regras/`. Se o editor/texto único precisarem no backend, script e tipos mudam **juntos** para `shared/`. |
| Módulo | `frontend/src/app/modules/regras` (`modules/documento` continua sendo a Biblioteca; `shared/regras` é o motor, outro workspace). |
| Acesso | Sistema e Guia públicos, sem login (o Guia não tem bestiário nem missões prontas). |
| Versões | Sempre a última. Histórico = git. Sem selo "o que mudou". |
| Âncoras | Derivadas do título, sem o glifo (`/regras/sistema#vida`). Renomear no Docs quebra link antigo — o build avisa quando uma âncora usada some. |
| PDF | **Impressão nativa** (CSS de impressão). Paged.js fica como expansão futura (`IDEAS`). |
| Remoção do PDF | Só junto da exportação: sai PDF, `pdfjs-dist`, leitor mobile, cópia no build. Até lá o PDF antigo fica como download provisório. |
| Agentes | `CLAUDE.md`/`AGENTS.md` e a skill `regras-do-jogo` passam a apontar para o formato gerado quando o PDF sair. |

## Decisões visuais fechadas

Resumo; o detalhe e o desenho estão no exemplão (aba *Decisões*), que a task de cada bloco cita.

- **Topbar:** "Documentos" vira **Regras**, com o **ícone SCP** (CC BY-SA 3.0 — crédito no rodapé de
  Regras; SVG definitivo na `m10-04`).
- **Abertura:** painel flutuante por padrão; ↗ abre a página completa (padrão da Biblioteca, `m9-11`).
- **Página completa:** dois trilhos (análogo: leitura em trilhos dos patchnotes). Sumário fixo em
  árvore até ⬥, largo o bastante para não quebrar título; rolagem do site. **Coluna**: texto,
  tabela e grade numa mesma largura de ~960px, trilho + documento **alinhados à esquerda**; grades
  em 2 colunas. Sistema ↔ Guia em `app-segmentado` no topo do trilho, cada um com URL própria
  (`/regras/sistema`, `/regras/guia`).
- **URL acompanha a seção**; sem botão de copiar link. Exportar PDF = botão de ícone no cabeçalho do
  trilho, ao lado de "Sistema · v4.1.3".
- **Painel / celular:** texto sempre visível + **gaveta** de sumário (☰), primitivo novo
  `app-gaveta` (decisão do autor, `m10-05`). Maximizado, o painel vira o layout da página.
- **Hierarquia:** ⬢ rótulo de capítulo · ⬡ título mono · ⬥ subtítulo · ⬦ verbete com filete.
- **Blocos:** habilidades em lista densa; dossiê de Classe com arquétipos em `app-abas`; Origens em
  cartão de dossiê; Equipamentos em lista densa (nunca tabela, Uma/Duas Mãos com dois valores);
  Módulos de fragmento V → I; Nota amarela fixa; Exemplo na cor tema (`--accent`); tarja ████ como
  barra sólida; tabelas só para dados de verdade, com 1ª coluna fixa e rolagem lateral no celular;
  blocos próprios do Guia; ficha completa (A Estátua); níveis de ameaça pintados pela cor do nível.
- **Links internos:** referência a seção vira link; clique rola e pisca o destino. "Página N" vira o
  nome da seção.
- **Pesquisa:** resultados no lugar do sumário (caminho + trecho), "1 de N" ↑↓ no texto, Esc volta;
  atalho "N resultados no outro documento →". No painel/celular, dentro da gaveta.
- **Estados:** `app-esqueleto` com a silhueta do trilho e do texto na abertura e na troca de
  documento; seção inexistente abre no topo com aviso.
- **PDF:** papel claro, capa com tarjas e só a versão (sem data), sumário, cabeçalho corrido,
  capítulo em página nova, blocos sem quebra, abas em sequência.

## Quebra em tasks

| Task | Entrega | Depende de |
|---|---|---|
| `m10-01` | Normalizador — núcleo e formato canônico | — |
| `m10-02` | Normalizador — casos explícitos (tabelas de layout, equipamentos, Guia, ficha rica, níveis) | 01 |
| `m10-03` | Ícones de identidade no `app-icone` | — |
| `m10-04` | SVG definitivo do SCP + crédito | — |
| `m10-05` | Primitivo `app-gaveta` | — |
| `m10-06` | Página `/regras/*`, trilhos, sumário, blocos básicos, topbar "Regras" | 01, 04 |
| `m10-07` | Blocos ricos | 02, 03, 06, `icones-recursos-sistema` (entrega 1) |
| `m10-08` | Painel flutuante e celular (substitui o leitor de PDF) | 05, 06 |
| `m10-09` | Pesquisa | 06, 08 |
| `m10-10` | Exportar PDF (impressão nativa) | 07 |
| `m10-11` | Remoção do PDF antigo e ponteiros dos agentes | 10 |

`03`, `04` e `05` podem correr em paralelo com `01`/`02`. **Fora da numeração:**
`icones-recursos-sistema.spec.md` (trio Vida/Energia/Defesa no site todo e levantamento de ícones
novos — a entrega 1 é pré-requisito da `m10-07`) e `regras-glossario.spec.md` (independente).

## Anotações e limites conhecidos

- **Impressão nativa:** o sumário do PDF sai **sem número de página** e a referência interna sai como
  "nome da seção" (sem "p. N"). Cabeçalho corrido e número de página no rodapé via `@page`. Os dois
  limites caem quando o Paged.js entrar (`IDEAS`).
- **Tabelas de layout** são a regra mais arriscada do normalizador: lista explícita de casos na
  `m10-02` + aviso no build para tabela de layout não reconhecida (cai como bloco genérico, nunca
  some conteúdo).
- **Ficha completa (A Estátua)** depende de padrões fixos no Docs ("Força 3 \[Médio +9\]", "Vida
  Máxima: …", ataques "Nome | Ação | Teste | Dano"); fora deles cai no bloco genérico.
- **Âncoras do Docs:** a exportação traz ids próprios (`{#⬡-gerais}`) e links `[Página 34](#⬡-gerais)`;
  o normalizador traduz para as âncoras do site. O sumário que vem no `.md` (com números de página
  do Docs) é descartado — o site monta o seu.
- **Ícones:** os 18 de identidade estão decididos (aba *Ícones* do exemplão, campo `dec`). Refino de
  desenho fica para depois (`IDEAS`): Suporte × Paramédico são ambos cruz e aparecem juntos no
  dossiê do Suporte; as espadas do Combatente quase viram "X" pequenas; a Silhueta do Civil lembra
  "perfil de usuário". Criatura = logo SCP, depende da `m10-04`.
- **Ponte com a Biblioteca:** a M9 previa reaproveitar `shared/leitor-documentos/` para PDF na
  Biblioteca; esse leitor sai na `m10-11`. Se PDF na Biblioteca voltar a ser pedido, reavaliar.
- **Fora do M10 (registrado em `IDEAS`):** Paged.js; ingestão de `.docx` (muda só a entrada do
  normalizador); pontes site → regra ("Ver regra" na ficha); editor no site (com versões antigas só
  leitura); texto único (catálogos do `shared/` vindo dos verbetes, por ID); IA sobre trecho.

## Fora de escopo

Editor no site, texto único, pontes site → regra, glossário (spec própria), ingestão de `.docx`,
ícones de Vida/Energia fora do leitor (spec própria), selo de versão/"o que mudou".
