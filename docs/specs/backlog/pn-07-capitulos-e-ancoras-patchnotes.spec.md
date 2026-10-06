# pn-07-capitulos-e-ancoras-patchnotes.spec.md

> Task 1/5 do guarda-chuva `pn-revisao-pagina-patchnotes.spec.md`. É a base de dados das tasks
> visuais: o sumário (`pn-09`) e o resumo em destaque (`pn-11`) consomem o que esta task produz.

## Objetivo

Cada nota passa a ter **capítulos derivados do próprio Markdown**, com âncora estável. A URL com
fragmento (`/patchnotes/1.4.0#biblioteca-de-documentos`) abre a nota já posicionada no capítulo, e
cada título ganha o botão "copiar link". Nada muda no formato publicado.

## Entregáveis

1. **Função pura** `capitularPatchnote(estrutura)` em
   `frontend/src/app/modules/patchnotes/patchnote-formato.ts`, a partir do `PatchnoteEstruturado`
   de `estruturarPatchnote`.
   - Saída: árvore de capítulos `{ titulo, id, publico, filhos }`.
     - Os grupos `# …` são capítulos.
     - Os blocos `## …` são os filhos.
   - O `publico` (`players` | `mestre` | `resumo` | `geral`) é deduzido do título normalizado do
     grupo. `pn-11` o usa para reconhecer o resumo. Não há filtro por público.
   - **Slug**:
     - remove emoji, acento e pontuação; minúsculas; espaços viram `-`;
     - títulos repetidos recebem `-2`, `-3`… na ordem do documento;
     - se o título ficar vazio, o slug é `capitulo`.
   - Grupo implícito (nota escrita só com `##`, `titulo: null`) não vira capítulo; seus blocos
     sobem para o primeiro nível.
2. **Ids no template**: os títulos de grupo e de bloco renderizados recebem o `id` do capítulo
   correspondente.
   - `scroll-margin-top` com a altura da topbar (`--altura-topbar`), para o título não ficar
     escondido sob ela.
3. **Fragmento na URL**: com fragmento, a página rola até o capítulo **depois que a nota
   renderiza**.
   - Vale na entrada direta e na troca de versão (o fragmento vale para a nota de destino).
   - Fragmento inexistente é ignorado, sem erro e sem rolagem.
   - Respeita `prefers-reduced-motion`.
4. **Copiar link do capítulo**: cada título de grupo e de bloco tem
   `app-botao-icone tamanho="mini"` com `<app-icone nome="link" />`, `aria-label` "Copiar link de
   <título>" e `appTooltip`.
   - Visibilidade: aparece no hover/foco do título; em `(hover: none)` fica sempre visível, com
     opacidade reduzida.
   - O clique:
     1. copia a URL absoluta com o fragmento (`navigator.clipboard`, com falha tolerada);
     2. atualiza o fragmento da URL sem navegar (`replaceUrl`);
     3. mostra um toast curto via `NotificacaoService`.
   - Alvo de toque: se o `mini` não chegar a 44px no mobile, **parar e perguntar ao autor**
     (regra da biblioteca de componentes).

## Critérios de Aceite

1. Testes da função pura cobrindo:
   - slug com emoji, acento e pontuação;
   - títulos repetidos;
   - nota só com `##` (grupo implícito);
   - `publico` de cada grupo das seis notas reais (`docs/patchnotes/*.md`);
   - grupo sem blocos (o `# RESUMO…`).
2. Testes da página:
   - ids presentes nos títulos;
   - fragmento existente rola;
   - fragmento inexistente não lança;
   - copiar chama o clipboard e notifica.
3. Suítes e lint de `frontend` verdes.
4. Ao vivo (`verify`, `1920×1080` e `360×800`):
   - abrir `/patchnotes/1.4.0#para-o-mestre` posiciona logo abaixo da topbar;
   - copiar link e colar numa aba nova abre no mesmo ponto;
   - o botão de link não desloca o título quando aparece.

## Fora de Escopo

- O sumário visual e o *scroll-spy* (`pn-09`).
- Mover o resumo (`pn-11`).
- Layout em trilhos (`pn-08`).
- Filtro por público e contagem de seções (descartados na bancada; ver guarda-chuva).

## Dependências

`pn-04` concluída. `patchnote-formato.ts` atual.

## Riscos e Mitigação

- **Slug muda quando o título muda.** Isso é aceitável, porque a nota publicada raramente é
  editada. Registrar no `CONTEXT.md` que renomear um bloco quebra links já compartilhados.
- **Rolar antes de o `[innerHTML]` existir.** Rolar só depois que a nota está no DOM
  (`afterNextRender` ou equivalente). Um teste prova o caso da troca de versão.
