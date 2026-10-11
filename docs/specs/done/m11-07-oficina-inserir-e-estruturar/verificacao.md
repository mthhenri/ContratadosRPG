# m11-07 — Inserir e estruturar: verificação e decisões

> Relatório da [m11-07](../m11-07-oficina-inserir-e-estruturar.spec.md). Capturas e roteiros ficam em
> `.artifacts/m11-07/` (ignorada pelo Git); o veredito abaixo não depende delas.

## O que foi entregue

- **Inserção**: ponto "+" (`app-oficina-insercao`) depois de cada peça e no fim das listas (seção, raiz do
  livro, habilidades de classe/subclasse/arquétipo e, na classe, "+ Arquétipo"); e "/" num parágrafo vazio,
  que abre o mesmo menu no lugar do parágrafo. As opções saem de `LIVRO_RAIZ_PERMITIDA` /
  `LIVRO_FILHOS_PERMITIDOS` (a tabela do validador): dentro de classe, só habilidade e arquétipo; dentro de
  arquétipo, só habilidade; arquétipo nunca na raiz nem em seção.
- **Esqueletos** (`shared/src/livro/esqueletos.ts`, `criarEsqueletoPeca`): função pura por tipo, com teste de
  que **os 30 tipos** nascem sem pendência estrutural. Arquétipo e subclasse nascem com a habilidade inicial
  vazia (`inicial: true`); a classe nasce com Saúde, progressão e tabela vazias e **sem arquétipos** (o "+
  Arquétipo" os acrescenta). O que fica vazio aparece como pendência de conteúdo.
- **Arrastar no sumário** (`app-oficina-sumario`, `@angular/cdk/drag-drop`): seções, classes, subclasses e
  arquétipos, na ordem do livro, com alça `⋮⋮`; a distância horizontal do arrasto escolhe o nível. A peça leva
  o que contém. Prévia junto ao ponteiro ("Fica dentro de X" ou o motivo da recusa, em vermelho) e barra de
  destino recuada no nível escolhido. **Teclado**: Alt+↑/↓ sobem e descem, Alt+← sai do pai, Alt+→ entra na
  irmã de cima (recusa quando não cabe), F2 renomeia; o resultado é anunciado numa região `aria-live`.
  Destino proibido pela tabela é recusado antes de chamar a API (e a API recusa de novo).
- **Renomear** (F2 ou o lápis da linha do sumário): `PATCH /livros/:codigo/pecas/:id/nome` troca nome/título e
  deriva a âncora nova; colisão (âncora atual ou antiga de **outra** peça) resolve com `-2`, `-3`…; a antiga vai
  para `regra_peca_ancora_antiga`. Voltar ao nome de antes reaproveita a própria âncora antiga. Digitar no
  título da tela continua só trocando o texto (não mexe em links).
- **API**: `POST /livros/:codigo/pecas` aceita `filhos` (o esqueleto) e cria peça e filhas **numa transação**
  (`transacaoService`, com trava do livro); limite de 20 peças por esqueleto; cada filho confere aninhamento e
  forma. `alterarPosicao` (`m11-06`) já movia com `ordem`; nada mudou nele.
- **Primitivo novo** `app-menu-insercao` (`shared/ui/`), aprovado pelo autor: popover ancorado com campo de
  filtro e lista (combobox/listbox), abaixo ou acima da âncora, fecha com Esc/Tab/clique fora.
- **Dependência nova**, também aprovada pelo autor: `@angular/cdk` (`^21.2.0`) só para o arrastar.

## Decisões registradas

- **O que o menu oferece agora**: a tabela de aninhamento filtrada pelos tipos que a Oficina **já edita na
  tela** (parágrafo, seção, habilidade, nota, exemplo, fórmula, classe, subclasse, arquétipo). Tabelas,
  equipamentos, origens, fichas etc. entram com a edição deles na `m11-08` — criar hoje uma tabela vazia que
  não se consegue preencher não ajudaria. A função de esqueleto e a API já cobrem todos os tipos.
- **Arrastar achatado, não aninhado**: o sumário é uma lista só (`cdkDropList`) e o nível vem do deslocamento
  horizontal. Listas aninhadas do CDK elegem a primeira lista irmã sob o ponteiro (ordem de registro), o que
  impede reordenar dentro de um filho. Enquanto se arrasta, o que a peça carrega some da lista (vai junto).
- **Posição entre irmãs que o sumário não mostra**: o sumário só lista seções/classes/arquétipos, mas a peça
  também tem parágrafos irmãos. Cair "antes da irmã X do sumário" vira o `indice` real dela; cair depois da
  última irmã do sumário vale "logo depois dela" (antes dos blocos finais). Largar no mesmo lugar não chama a
  API.
- **Peça nova e âncora**: nasce com `ancora = null`. Seção, classe e subclasse ganham a âncora derivada do nome
  **no primeiro nome salvo** (`alterarDados`, sem registrar âncora antiga); depois, trocá-la é o "Renomear".
  Habilidade, parágrafo etc. não têm âncora (a leitura só usa a de seção, classe e subclasse).
- **Menu "/"**: o `/` sozinho no parágrafo abre o menu e esvazia o parágrafo; escolher um tipo cria a peça no
  lugar do parágrafo e o remove sem aviso (um passo só no Desfazer, que devolve os dois lados); Esc devolve o
  cursor ao parágrafo. "Parágrafo" não é oferecida (já se está nela).
- **Celular**: sem mouse, só o "+" depois da peça selecionada e os do fim das listas ficam à vista (594 pontos
  visíveis poluiriam a tela); o lápis de renomear fica sempre à vista; arrastar e criar classe no celular
  continuam fora de escopo, mas o sumário abre na gaveta com alvos de 44 px e as setas não dependem de mouse.
- **Extração** (risco da spec): o store ganhou `inserir`, `moverPara`, `renomear` e o menu "/"; a regra de
  destino, os tipos oferecidos e as linhas do sumário vivem em `oficina-estrutura.ts` (função pura, 20 testes),
  não no store nem nos componentes.

## Verificação

- **Testes**: `shared` 1234 (esqueletos 36), `backend` 1093 (12 ignorados já existentes; `regra-peca.service`
  40: criar com filhos atômico, recusa de filho/forma/tamanho, renomear com colisão atual e antiga, voltar ao
  nome, âncora para peça sem âncora, revisão defasada, mover recusa destino inválido), `frontend` (oficina:
  estrutura 20, store 35, sumário 8, inserção 5; `app-menu-insercao` 9). Lint dos três workspaces sem erros.
- **Visual (skill `verify`)**: app real (ng serve 4301 → backend 3101, **banco isolado**
  `contratados_rpg_m11_07` com os dois livros importados, Sistema com 1049 peças e Guia com 367) em
  `1920×1080` e `360×800`, tema escuro. Análogos: o exemplão (`.insercao`, `.paleta-insercao`, `.sumario`) e o
  sumário do leitor de Regras. Percorrido: "+" ao passar o mouse e com a peça selecionada, menu com o
  filtro, nota nova com pendência, `/` num parágrafo vazio com filtro (`/hab`), Esc devolvendo o foco, classe
  com "+ Arquétipo" (só ele no menu), arquétipo novo com a habilidade inicial vazia, renomear pelo sumário,
  arrastar válido (muda de pai), arrastar recusado (seção entre arquétipos: prévia vermelha, aviso e nada
  muda), Alt+↓ válido e recusado, gaveta do sumário no celular. **URL antiga**: renomeada "Maestrias" →
  "Maestrias do Agente" (`maestrias` → `maestrias-do-agente`), publicado um rascunho, `/regras/sistema#maestrias`
  abre a seção renomeada com o hash reescrito para o novo.
- **Leitor fora da Oficina**: Leitura da classe nos dois viewports sem pontos de inserção, sem o sumário da
  Oficina e sem overflow; as abas de arquétipo seguem iguais.
- **Sem overflow horizontal** nos dois viewports e **sem erro de console**.

## Revisão independente

Agente `revisor` (Claude), sem acesso ao diagnóstico: 12 achados. Corrigidos: (1) peça criada nunca ganhava
âncora (agora no primeiro nome, ver acima); (2) o "/" depois de selecionar tudo apagava o texto — só abre em
campo que estava vazio antes da digitação; (3) Alt+↑/↓ reaninhava na vizinha — agora troca de lugar com a irmã
mantendo o pai (← e → mudam de pai); (4) a API aceitava arquétipo/subclasse sem a habilidade inicial — agora
exige exatamente uma; (5) clicar fora do menu "/" roubava o foco de volta — só o Esc devolve; (6) movimentos
em voo (tecla segurada) davam conflito falso — o store ignora enquanto há um; (7) "/" em ficha de criatura
abria menu vazio — não abre; (10) nome de 200 caracteres com colisão estourava a coluna — a base da âncora é
truncada; (12) peça sem campo editável (arquétipo, classe, subclasse) não pede foco; (9, parcial) o Desfazer
de renomear grava o pendente antes. Registrados como limite: (8) o `nivel` da seção não acompanha a
profundidade ao inserir/mover (hoje `2`); (9) o Desfazer renomeia de volta e re-deriva a âncora, que pode
diferir de uma importada; (11) dentro da Oficina a URL antiga só resolve depois de publicar.

## Limites

- Só Chromium (Playwright); sem Firefox/Safari e sem teclado virtual do celular.
- Arrastar no celular não foi exercitado (fora de escopo); o toque na alça usa os eventos de ponteiro do CDK.
- A criação dos blocos ricos e a edição de nome/citação do arquétipo na tela são da `m11-08`: hoje o nome do
  arquétipo novo se define pelo "Renomear" do sumário.
- O arquétipo recém-criado não vira a aba ativa sozinho (a aba aparece na ordem do livro).
- Publicar o rascunho de verificação gerou 12 pendências de conteúdo esperadas (campos vazios do que foi
  criado no teste); nada disso foi no banco de dev do autor.
