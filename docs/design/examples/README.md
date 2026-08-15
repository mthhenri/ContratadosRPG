# examples/ — Referência visual (capturas do app real)

Capturas do tema **"Terminal de Contenção"** rodando de verdade em `frontend/` — não são mockup
nem protótipo. Cada tela é um **HTML único e offline** (mesmo formato do modelo antigo: CSS e
imagens embutidos, sem dependência de servidor), em dois arquivos: `<tela>.html` (desktop,
`1920×1080`) e `<tela>--mobile.html` (`360×800`), os mesmos dois viewports obrigatórios da skill
`verify`. É a árvore DOM real do app, congelada num instante — não uma imagem: o CSS embutido
inclui as media queries de verdade, então redimensionar a janela do navegador enquanto o arquivo
está aberto já reproduz boa parte do comportamento responsivo real (não é garantia total — algum
comportamento condicionado por JS, como o `BreakpointObserver`, não reage a resize num arquivo
estático sem script).

> ⚠️ **Estático de propósito.** Cada arquivo teve `<script>` removido na captura — é uma foto da
> árvore DOM+CSS, não o app rodando. Nada aqui é clicável/interativo; use a aplicação real
> (`npm run frontend:dev`) para verificar comportamento, não estas capturas.

> ⚠️ **Estado real, não roteiro de captura.** Os dados visíveis (nome do agente, campanha,
> inventário…) vêm de uma seed descartável só para preencher a tela — não são exemplo de
> conteúdo "correto" nem specs de produto. O que vale aqui é **como as coisas se parecem hoje**:
> cor, tipografia, espaçamento, forma, densidade e os padrões de componente já implementados.

> ⚠️ **Isto substitui o modelo antigo.** Até esta atualização, `examples/` guardava HTML único
> exportado de uma ferramenta de prototipagem externa — um alvo de fidelidade **anterior** à
> implementação, que nunca foi regenerado depois que o app evoluiu. Hoje a relação é a
> **inversa**: o app implementado é a fonte, e estas capturas documentam o estado atual dele.
> Ficam desatualizadas com o tempo — se uma tela mudou visualmente de forma relevante, recapture-a
> (ver "Como regenerar" abaixo) em vez de confiar num PNG antigo.

## Telas

| Arquivo | Tela | Rota | Padrões visuais a reaproveitar |
|---|---|---|---|
| `login.html` | Login | `/login` | Painel split marca+form, campos com rótulo mono |
| `cadastro.html` | Cadastro de conta | `/registro` | Formulário em duas colunas, nota de contenção de dados |
| `campanhas.html` | Painel — Campanhas | `/painel` | Topbar (Barra de Comando), cards de stat, card de campanha, chip de papel |
| `lobby-de-campanha.html` | Detalhe de campanha | `/painel/:id` | Código de convite copiável, card de membro do esquadrão, barras Vida/Energia inline |
| `ficha-de-jogador.html` | Ficha de jogador | `/painel/:campanhaId/ficha/:id` | Barras Vida/Energia, grid de atributos, resistências, abas (Informações/Inventário/Habilidades/Rolagens/Extras/História) |
| `ficha-criacao-guia.html` | Guia de criação (passo 1/8) | `/painel/:campanhaId/ficha/nova` | Trilha de passos numerada, resumo operacional lateral, chip de classificação |
| `acervo-de-fichas.html` | Acervo de fichas | `/fichas` | Card de ficha resumida fora do contexto de campanha |
| `perfil.html` | Perfil | `/perfil` | Banner de tipo de conta, seções empilhadas (perfil/senha/exclusão) |
| `calculadora-de-atributos.html` | Calculadora — Agente/Civil | `/calculadora/agente` | Abas de ferramenta, steppers, stat grid, cabeçalho de seção com índice + régua |

`topbar.html` (exploração 1a/1b/1c) saiu do handoff: a direção **1a — Barra de Comando** já foi
escolhida e implementada — está visível no topo de toda tela autenticada acima.

## Excluído de propósito

**`ficha-de-criatura.html` não foi tocado.** A ficha de criatura (m4-04b) está em refatoração
manual fora deste ciclo de atualização — nem a rota `/painel/:campanhaId/criatura`, nem o
arquivo, nem nenhuma menção a criatura em `../DESIGN.md` foram recapturados ou reescritos. Trate
qualquer referência a criatura no handoff como desatualizada até esse trabalho fechar.

## Como usar

Abra o arquivo (duplo clique — funciona offline, sem servidor). Ao construir ou revisar uma tela
em Angular, compare com a captura equivalente — mesma densidade, hierarquia, controles e estados —
e puxe cor/tipografia/forma de `../tema/_tokens.scss`, nunca do próprio HTML capturado (é
referência visual congelada, não fonte).

## Como regenerar

Sem script fixo no repo — a receita:

1. Suba o stack (`npm run db:up`, `backend:dev`, `frontend:dev` — ver `.agents/skills/verify/`).
2. Semeie uma sessão descartável por REST (`POST /autenticacao/registro` → `/login` → `/campanha`)
   e uma ficha válida com `dados` construído a partir de `shared/regras` (mesma função que
   `frontend/src/app/modules/ficha/ficha-padrao.ts#construirFichaInicial` usa) — o backend só
   valida forma (maestria/identidade/munição), não o orçamento de atributos/habilidades, então um
   payload gerado direto pelas regras `shared/` passa sem precisar automatizar o guia de criação
   tela a tela.
3. Injete a sessão (`localStorage.setItem('contratados-rpg.sessao', JSON.stringify(usuarioAutenticadoDto))`,
   mesmo padrão da skill `verify`) e abra cada rota da tabela acima com Playwright (`npm root -g`,
   Chromium já em cache) nos dois viewports. Pra exportar HTML único e offline em vez de screenshot:
   dentro de `page.evaluate`, busque (`fetch`) o texto de todo `link[rel="stylesheet"]` e o
   `textContent` de todo `<style>` e junte num `<style>` só; converta cada `<img>` pra data URI
   (`fetch` + `FileReader.readAsDataURL`, senão o `src` relativo quebra fora do servidor de dev);
   clone `document.documentElement`, remova `<script>`/`link[rel="stylesheet"]`/`<style>` do clone,
   injete o `<style>` combinado e serialize (`clone.outerHTML`) prefixado por `<!doctype html>`.
4. Nunca inclua uma rota `/criatura` nem sobrescreva `ficha-de-criatura.html` enquanto a m4-04b
   estiver em aberto.

## Relação com o resto do handoff

- `../DESIGN.md` — guia do tema e mapa de tokens
- `../tema/` — tokens SCSS, base, breakpoints, componentes de referência, preset PrimeNG, trecho Tailwind
