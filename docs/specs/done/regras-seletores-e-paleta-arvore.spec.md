# Seletores do trilho de Regras e paleta "Ir para uma seção" em árvore

> Task de usabilidade/visual do leitor de Regras; pedido do autor em conversa (13/10/2026). **Backlog: não implementada.**
> Duas entregas independentes no mesmo leitor: (A) ícones nos livros e alternador de modo; (B) paleta da **Leitura** em árvore colapsada. Podem ser implementadas e fechadas em cortes separados, mas ficam numa spec só por decisão do autor.
> Prova de conceito aprovada: artefato "Seletores das Regras" (opções A/B/C, desktop e 360px).

## Problema

1. **Seletores do trilho.** Sistema/Guia e Leitura/Oficina são dois `app-segmentado [fluido]` empilhados (~80px) em `#navegacao`, com o mesmo peso visual, embora o modo seja secundário (só quem edita o vê). Os livros não têm ícone.
2. **Paleta "Ir para uma seção".** É uma lista plana: a hierarquia (Criação de Personagem › Atributos › Maestrias) aparece só como texto de contexto. O autor quer navegar como no sumário (árvore), porém **colapsada**, abrindo por clique.

## Decisões do autor (fechadas)

- **Ícone dos livros:** `d20` no Sistema, `coroa` no Guia de Mestre.
- **Modo:** alternador único (opção A da POC): um `app-botao-icone` ao lado do seletor de livro, no lugar do segmentado Leitura/Oficina. Sem ampliar `app-segmentado`.
- **Mobile:** seguir a recomendação da análise: modo só na gaveta (nunca na barra do topo); barra do topo ganha os ícones dos livros; gaveta com uma linha só (livro + alternador).
- **Paleta em árvore:** só na **Leitura**. A paleta da Oficina ("Ir para peça", `itensPecas`) fica **inalterada**.

## Fonte de verdade e responsabilidade

- Mudança de apresentação e navegação; **não** altera regra, fórmula, permissão nem conteúdo dos livros. Constituição, [convenções](../../CONVENTIONS.md) e [design](../../design/DESIGN.md) prevalecem.
- Leitor: `frontend/src/app/modules/regras/regras-leitor.component.{html,ts,scss}` (template `#navegacao`, barra mobile, `itensPaleta`, `ativoSumario`).
- Paleta: primitivo `frontend/src/app/shared/ui/paleta/` (`paleta.ts` para lógica pura, `paleta.component.*` para a UI). Dados da árvore: `construirSumarioRegras` em `regras-sumario.ts` (já devolve `RegrasSumarioItem` aninhado; não duplicar a hierarquia).
- Regra de domínio nenhuma vive no frontend aqui; `podeEditar()`, `oficinaAtiva()` e `alternarModo()` permanecem como estão.

## Entrega A: seletores

### Requisitos

1. **Livros com ícone.** Em cada item de `app-segmentado` (Sistema e Guia), projetar `<app-icone>` antes do texto: `d20` e `coroa`. Tamanho do ícone alinhado à fonte de 9px do item (≈ 13px; confirmar a API de `app-icone`). Vale para o trilho (desktop), a barra do topo e a gaveta (mobile). Estado ativo continua só pela cor do item.
2. **Modo como alternador.** Substituir o segmentado Leitura/Oficina por um `app-botao-icone` na **mesma linha** do seletor de livro (livro `fluido` + botão de 32px, `align-self: stretch`):
   - ícone `editar` em Leitura (ação: entrar na Oficina) e `olho` na Oficina (ação: voltar à leitura);
   - `[ativo]="oficinaAtiva()"` (destaque de item ativo do primitivo) e `[attr.aria-pressed]` no consumidor, como os toggles existentes;
   - `aria-label` e `appTooltip` descrevem a **ação** ("Entrar na Oficina" / "Voltar à leitura"); **nunca** `title` HTML;
   - continua visível apenas com `podeEditar()`; clique chama `alternarModo(!oficinaAtiva())`.
3. **Mobile.**
   - Barra do topo: `Sumário`, busca e seletor de livro **com ícones**. Não recebe o alternador.
   - Gaveta: uma linha com livro + alternador (some a linha própria de Leitura/Oficina). O seletor de livro continua também na barra do topo, como hoje.
   - O rótulo "Sumário" **permanece**. Só se a medição em 360px mostrar estouro ou aperto, trocar o botão por ícone-só com `aria-label="Abrir sumário das Regras"` e `appTooltip`; registrar a medida e a escolha no fecho.
4. Preservar: troca de livro, `aria-expanded` do Sumário, foco ao fechar a gaveta, estado de modo e versão (`<select>` de versão continua abaixo, visível só em `podeEditar()`), URL e rolagem atuais.

### Primitivos

Usar `app-segmentado`/`app-segmentado-item`, `app-botao-icone` (com `[ativo]`, `[tamanho]`) e `app-icone`, pela API completa. **Não** ampliar `app-segmentado`. Se `app-botao-icone` ou `app-icone` não cobrir o necessário (tamanho, ícone), parar e perguntar ao autor antes de contornar.

## Entrega B: paleta em árvore colapsada (Leitura)

### Comportamento

1. **Sem termo digitado:** lista os capítulos (nível 1) recolhidos. Nós com filhos têm chevron; **clique no chevron abre/fecha**, **clique no título navega** (emite `escolheu` com a âncora e fecha, como hoje). Indentação por nível, no padrão do `.regras__sumario-item` do sumário. Sem o texto de contexto (a indentação o substitui).
2. **Com termo digitado (≥ 1 caractere):** volta à lista plana filtrada atual (`filtrarPaleta`), com o caminho em `contexto`. A árvore não filtra nem expande ramos.
3. **Ao abrir o modal:** consulta limpa, tudo recolhido, **exceto o caminho até a seção ativa** (`ativoSumario()`), que abre já expandido e com o item ativo marcado. Documento trocado ou reabertura recomeçam o estado.
4. **Teclado.** Campo de busca mantém o foco (`aria-activedescendant`), como hoje; as teclas não sobem do campo:
   - ↑ ↓ movem entre os nós **visíveis**; Home/End primeiro/último;
   - → expande o nó (se já aberto, vai ao primeiro filho); ← recolhe (se recolhido ou folha, vai ao pai);
   - Enter navega para o nó ativo; Esc fecha (pelo modal).
5. **ARIA.** Modo árvore: `role="tree"`, nós `role="treeitem"` com `aria-level`, `aria-expanded` (só em nós com filhos) e `aria-selected` no ativo. Modo filtrado mantém `role="listbox"`/`option`. Rótulo acessível e o `aria-controls`/`aria-activedescendant` do campo apontam para a estrutura em uso.
6. **Mobile.** Chevron com alvo de toque conforme a convenção do projeto; sem overflow horizontal em títulos longos (quebrar ou truncar com tooltip, a decidir ao inspecionar o análogo); rolagem interna da lista preservada (`LIMITE_VISIVEL` aplica-se só ao modo filtrado).
7. A Oficina continua com a lista plana de peças, sem árvore.

### Desenho técnico

- **`paleta.ts` (lógica pura, testável):** tipo `PaletaNo { id, rotulo, filhos?: readonly PaletaNo[] }` e função que, dados `nos` e o `Set` de ids abertos, devolve as **linhas visíveis** (`id`, `rotulo`, `nivel`, `temFilhos`, `aberto`, `paiId`) e uma função que calcula os ancestrais de um id para a expansão inicial. Sem DOM, sem Angular.
- **`Paleta`:** novo input opcional `[arvore]` (e `[idAtivo]` para a expansão inicial). Sem `[arvore]`, comportamento idêntico ao atual (compatibilidade com a Oficina e com os testes existentes). O índice ativo continua sendo uma posição numa lista (agora a de linhas visíveis ou a filtrada).
- **Leitor:** passa `sumario()` como `[arvore]` e `ativoSumario()` como `[idAtivo]` na Leitura; mantém `[itens]` (lista plana atual de `itensPaleta`) para o modo filtrado. Na Oficina, passa só `[itens]`.
- Reutilizar o chevron/ícone do sumário (`app-icone nome="chevron"`/`chevron-direita`) e tokens; sem hex, fonte ou raio fixos.

### Primitivo novo?

Ampliar `app-paleta` com `[arvore]` é a recomendação (a busca, o foco, o Esc e o modal já estão resolvidos nele). Se, ao implementar, a árvore justificar um primitivo próprio, parar e consultar o autor.

## Contrato visual e verificação

- **Análogos aprovados** (inspecionar no código e na aplicação real, registrar shell, densidade, hierarquia, espaçamento, controles, estados, iconografia e responsividade antes de editar):
  - Entrega A: o `app-segmentado` atual do trilho; o botão "Sumário" (ícone + texto) e `app-botao-icone` de busca na barra mobile; o toggle com `[ativo]` existente do `app-botao-icone`.
  - Entrega B: o sumário em árvore do trilho (`#arvore`, `.regras__sumario-item`) e a `paleta` atual (modal, campo, item ativo).
- Usar a skill `verify` na aplicação real em **1920×1080 e 360×800** (mais os viewports que o leitor já exige, como painel normal/maximizado quando disponível). Comparar pessoalmente com os análogos e corrigir divergências antes de apresentar.
- **Estados a percorrer:**
  - A: Sistema/Guia; Leitura/Oficina com `podeEditar()` (usuário admin) e sem; gaveta aberta/fechada; tooltip e foco do alternador; medida da barra em 360px (anotar largura útil e sobra).
  - B: abrir recolhido; expandir/recolher por clique e por teclado; navegar por um item de nível 2 e 3; abrir já na seção ativa; digitar termo (volta ao plano) e apagar (volta à árvore); termo sem resultado; Guia e Sistema; Esc.
- **Testes:**
  - `paleta.spec.ts`: linhas visíveis, expansão, ancestrais, ordem, folhas, ids duplicados em níveis diferentes.
  - `paleta.component.spec.ts`: modos árvore e filtrado, teclado (↑ ↓ → ← Home End Enter Esc), ARIA, reset ao abrir, expansão inicial, sem `[arvore]` igual ao atual.
  - `regras-leitor.component.spec.ts`: ícones dos livros, alternador (rótulo, `aria-pressed`, ação, visibilidade por permissão), paleta com `[arvore]` na Leitura e sem na Oficina.
- Executar build, lint e os testes do frontend proporcionais; `npm run repo:verificar` no fecho e `--staged` antes de eventual commit.

## Fora de escopo

- Ampliar `app-segmentado` (tamanho compacto) ou criar primitivo de árvore sem decisão do autor.
- Paleta da Oficina, busca textual do leitor, sumário lateral, versões/mudanças da Oficina, PDF.
- Alterar regras, textos dos livros, permissões ou rotas.
- Novos ícones fora de `IconeNome` (`d20`, `coroa`, `editar`, `olho` já existem).

## Organização e fecho

Anexos em `regras-seletores-e-paleta-arvore/`, ao lado desta spec; capturas e saídas brutas em `.artifacts/regras-seletores-e-paleta-arvore/`. Ao fechar: mover spec e anexos juntos para `done/`; registrar em `docs/context/HISTORY.md` (análogos, viewports, estados, comparação visual, medida do mobile, correções); atualizar `CONTEXT.md` nas seções afetadas e a linha de `.paleta`/`.segmentado` em `docs/design/DESIGN.md` se o catálogo mudar. Uma entrega sem verificação visual obrigatória permanece **aberta**.
