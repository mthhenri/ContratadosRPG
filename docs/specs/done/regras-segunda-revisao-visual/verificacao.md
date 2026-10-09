# Segunda revisão visual — Sistema e Guia de Mestre

09/10/2026. Pedido: revisão completa dos dois livros/menu, topo, separação de resultados,
highlight do tema, limpar o campo e debounce. [Preparação do editor](editor-proprio.md).

## Defeitos encontrados e corrigidos

| Achado | Causa | Resultado |
|---|---|---|
| Categorias de equipamentos ausentes do menu e da leitura | Nove títulos `⬡` e sete `⬥ Modificações` estavam nos cabeçalhos das tabelas; o renderer só mostrava os itens | Seções de nível 2/3 recuperadas na ordem da fonte; categorias sob Equipamentos e modificações sob sua categoria |
| Três notas excepcionais invisíveis | JSON preservava as células originais, mas o renderer de modificações ignorava a nota | Explosivos/Munições: 250 $; Armazenamento: nenhum peso adicional e 300 $, apresentados com RegrasNota |
| Roteiros do Guia repetidos | Renderer mostrava etapas numeradas e depois todos os parágrafos originais | Introdução antes, 13/15 etapas uma vez, conclusão depois; original preservado para auditoria |
| Tabelas comprimidas no celular | `min-width` nas células não garantia largura legível da tabela | Largura mínima por quantidade de colunas, rolagem horizontal local, primeira coluna fixa preservada |

A correção anterior de classes/subclasses permanece: Combatente, Especialista, Suporte
e três Experimentos aparecem no sumário. Não se criaram títulos editoriais ou regras.
O normalizador continua sem cálculos. Nenhuma alteração feita nos Markdown autorais.

## Pesquisa e navegação

- Botão × ao final do campo, limpeza imediata e foco no input. Reuso de `app-campo`
  compacto/com ícone e `app-botao-icone` **padrao**, tamanho canônico para ação dentro
  de campo: 32×32 desktop, 44×44 mobile. Padding reserva seu espaço, sem sobrepor texto.
- Debounce de 300 ms desde a última alteração pesquisável. Limpar/destruir cancela o
  timer; termos com menos de dois caracteres removem resultados imediatamente. Enter
  aplica o termo pendente; Enter/Shift+Enter continuam navegando após a busca; Esc limpa
  inclusive antes do timer. Estado do termo permanece no controller/memória existentes.
- Divisores de 1 px e respiro entre resultados, usando tokens e o botão de resultado
  existente (`secundario`, `texto`, `pequeno`). Caminho e trecho mantêm a hierarquia.
- Highlights comuns usam `accent-dim` e sublinhado `accent-border`; ocorrência atual
  usa `accent`/`accent-text` e contorno. A troca de tema recolore os mesmos nós `mark`,
  sem refazer pesquisa. Não existe amarelo nativo de `mark` nesta apresentação.
- Topo com `app-botao-icone` padrao/primario e chevron girado, análogo de Patchnotes.
  Fixo na página, local no painel; preserva termo, fecha gaveta, remove seleção/fragmento
  e devolve foco ao documento. Movimento reduzido usa rolagem imediata.

## Cobertura estrutural

Sistema: 191 títulos externos às tabelas, 16 recuperados de tabelas e seis destinos de
classes/subclasses; **213 destinos renderizados e 117 entradas no sumário**. Guia:
103 destinos, **61 entradas no sumário**. Todos os links do menu têm destino existente,
sem âncora duplicada, nos quatro viewports. Os 96/42 títulos de nível 4 ficam fora do
sumário conforme o limite de três níveis do leitor; seguem presentes no corpo.

Fonte e assets conferidos contra normalização fresca. Zero blocos genéricos em ambos;
11 grades no Sistema, zero no Guia. Os 27 avisos existentes (11 grades e 16 colisões
de títulos) permanecem explicados pela revisão anterior. Preservação do texto plano,
pontuação, ordem e links validada pelo oráculo independente dos testes do normalizador.
Títulos originados de tabela são contados uma vez pelo oráculo, pois já constam nas
células originais; os novos testes verificam separadamente hierarquia e destinos.

Codex/explorer fez uma consulta estrutural independente e somente leitura para localizar
omissões entre fonte, JSON e renderers. Confirmou categorias/notas e os dois roteiros;
a inspeção visual e o fecho foram feitos pessoalmente pelo agente principal.

## Aplicação real — verify e design-fidelity

Frontend existente em `http://localhost:4300`; rotas públicas, sem depender de API/login
ou banco. Chromium com barras de rolagem visíveis. Análogos: RegrasLeitor aprovado
(shell, trilho/gaveta, cartão, densidade/hierarquia), Patchnotes (topo), RegrasNota e
RegrasTabela existentes. Skills task-flow, design-fidelity, verify e convencoes-check.

**Inspeção integral:** capturas do documento completo no escuro em 1920×1080 e 360×800,
do registro de abertura ao crédito final. Folhas de contato sem lacunas verticais:
quatro desktop/oito mobile do Sistema, duas desktop/três mobile do Guia. Foram
inspecionadas pessoalmente; recortes maiores usados para investigar problemas.
Capturas finais dos documentos e dos nove arquétipos completos em ambos os tamanhos;
nove recortes desktop e dezoito mobile das abas foram também inspecionados.

**Estados integrados:** ambos os livros, 1920×1080, 360×800, 960×1080 e 1366×768.
Menus/destinos, navegação até Explosivos/seleção/fragmento, múltiplos resultados
(99 no Sistema, 33 no Guia para “vida”), zero resultados, Enter imediato, limpeza
durante espera, Esc pendente, termo conservado ao voltar ao topo, troca no painel,
page/painel simultâneos e topo do painel sem alterar URL/rolagem da página de fundo.
Rolagem suave padrão também confirmada do fim dos dois livros, foco no documento e
recarga mantendo o topo/fragmento vazio; matriz de estados usa movimento reduzido.
Sem erros de runtime e sem overflow horizontal da página em toda essa matriz.
Contenção da gaveta no painel confirmada também em 960/1366: termina no limite da
janela, corpo rola localmente e nenhum elemento da gaveta recebe interação abaixo dela.

**Temas:** vermelho padrão no escuro; azul selecionado pela UI no claro/escuro em
1920/360, 99 marcas conservadas e mesmo nó antes/depois. Ocorrência atual azul
`rgb(76, 141, 208)` com texto preto; capturas confirmam contraste com o fundo e destaque
distinto. Base clara também percorrida em abertura, termos, origens, classes/subclasses,
grades, equipamentos/modificações, módulos/NAs/tabelas e blocos ricos do Guia. Tabela
de Amplificadores no mobile: 297 px disponíveis e 480 px de conteúdo; primeira coluna
permanece fixa ao rolar. Região focável e fade existente sinalizam mais colunas.

Comparação: mesma tipografia IBM Plex, densidade e hierarquia do leitor aprovado,
controles/ícones/estados canônicos, sem aparência de formulário genérico. Novos botões
usam APIs de tamanho/cor e foco do primitivo; alvos mobile de 44 px. O topo fica no
canto e não cobre os controles de navegação. Títulos/nota agora contextualizam o catálogo.

Algumas capturas logo após abrir a gaveta/trocar tema pegaram uma transição de pintura
(input aparentemente vazio e coluna fixa sem pintar). Foram refeitas após estabilização:
valor “vida”, texto/fundo legíveis, 44 px, coluna sticky/fundo corretos; nenhum defeito
persistente confirmado. Capturas integrais de elementos podem incluir um trecho da barra
sticky na primeira linha; essa limitação de captura não foi tratada como conteúdo ausente.

Evidências brutas em `.artifacts/regras-segunda-revisao-visual/`: inventário inicial,
folhas integrais, logs; `final/` contém estados/temas/abas completos, tabelas e JSONs
`resultados.json`/`temas.json`. Não são publicadas nem versionadas.

## Gates e revisão do diff

- `npm run test --workspace=frontend -- --watch=false`: **68/68** normalizador,
  **232 arquivos / 3.136/3.136** Angular aprovados. Debounce/limpeza/Enter/Esc/destruição,
  topo/painel/movimento reduzido, categorias, notas e roteiro sem duplicação cobertos.
- Após ajustar o tamanho canônico do ×: `ng test --watch=false` com os dois componentes
  focados: **11/11** aprovados. Formatação de todos os HTML/SCSS tocados aprovada.
- `npm run lint --workspace=frontend`: zero erros, 26.974 avisos legados.
- `CI=true npm run build --workspace=frontend`: build final aprovado; assets fiéis ao
  Sistema v4.1.4/Guia v4.2.0. Aviso preexistente: inicial 589,54 kB ante orçamento 450 kB.
  Contorno P-111 usado só na execução; cache/configuração não alterados.
- Revisão manual de todos os patches e buscas aplicáveis de convencoes-check: sem DTO,
  enum, SQL, regra de jogo, `NgModule`/`ngModel`, cor/fonte/raio hardcoded ou estilo inline
  literal novo. Raios encontrados são tokens; `[style.--regras-tabela-colunas]` passa
  somente a quantidade de colunas ao cálculo de layout, não uma receita visual local.
- Leitor extenso: voltar ao topo é parte da navegação já existente, com 19 linhas e
  reutilização do hospedeiro/memória; não justifica extração de uma nova responsabilidade.
  Espera/confirmar termo ficam no controller de busca, interação/foco no componente.
- `npm run repo:test`: **7/7** testes de organização aprovados. O primeiro ensaio foi
  impedido pelo sandbox de gravar a configuração do repositório temporário; repetição
  com acesso permitido passou, sem alteração no repositório principal.
- `npm run repo:verificar`: organização e espelhos da árvore local aprovados após
  mover spec e anexos juntos para `done/`. `git diff --check` aprovado; avisos de
  conversão LF/CRLF são da configuração existente do Git.

Um comando inicial amplo misturou arquivos Vitest com o runner Node e falhou por runner
incorreto; a suíte definida pelo projeto passou. O teste de movimento reduzido precisou
de stub de `matchMedia` no ambiente jsdom; corrigido antes do gate integrado aprovado.

## Limites e pendências fora deste recorte

P-110 (asterisco autoral da abertura) permanece; P-108 (revisão substancial do PDF) não
foi reaberta por esta inspeção do site. P-111 continua contornada. P-109 removida porque
a alteração preexistente do autor já corrigiu a nota para 4.1.4, confirmada no site/build.
Não houve revisão semântica das regras, PDF, navegadores Edge/Firefox ou perfil de
desempenho em hardware lento. O debounce reduz buscas intermediárias; não é promessa
de custo constante para termos com muitas ocorrências. Editor: levantamento concluído,
implementação futura depende de spec própria. Sem commit, push ou publicação.
