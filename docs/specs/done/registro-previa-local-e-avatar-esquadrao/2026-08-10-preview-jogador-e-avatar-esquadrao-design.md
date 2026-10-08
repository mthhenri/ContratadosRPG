# Preview "Ver como jogador" + Avatar nos cards do Esquadrão

**Escopo:** `frontend/src/app/modules/campanha/paginas/detalhe/` (`detalhe.page.ts`,
`detalhe.page.html`, `detalhe.page.scss`). Duas mudanças independentes, agrupadas por
viverem na mesma tela e terem sido pedidas na mesma conversa.

## Contexto

Hoje, para o mestre comparar a experiência de um jogador específico com o que ele vê como
mestre, é preciso ter duas contas (uma mestre, uma jogadora) na mesma campanha. Além disso,
o card de ficha do "Esquadrão" (grid da visão de mestre) não mostra o avatar da ficha, que já
existe no sistema (m3-62) e é exibido em outras telas (Acervo, Ficha).

## Parte 1 — "Ver como jogador"

### Objetivo

Permitir que o mestre, dentro da tela de detalhe da campanha (`/painel/:id`), alterne
momentaneamente para ver a tela como um jogador específico veria — sem precisar de uma
segunda conta. É puramente uma máscara de apresentação no cliente: **não é multiplicidade de
sessão, não é impersonação no backend**. Nenhuma permissão real muda; o backend continua
recalculando a role verdadeira em cada request (§14 do padrão existente).

### Não-objetivos (fora de escopo)

- Não persiste entre reloads — dar F5 sempre volta ao modo mestre normal (sem query param,
  sem localStorage, sem estado no backend).
- Não cobre outras telas do app (ficha em tela cheia, chat, etc.) — só a tela de detalhe da
  campanha, como ela está no momento em que o botão é clicado.
- Não torna a tela interativa como aquele jogador — é somente leitura (ver abaixo). O mestre
  não pode rolar dados, editar ficha ou executar qualquer ação em nome do jogador emulado.
- Não impersona a identidade do jogador para o backend — toda leitura de dados que a tela já
  não buscava antes continua vindo com a autoridade real do mestre (que já vê tudo).

### Mecanismo

- Novo signal em `CampanhaDetalhe`: `previewJogador = signal<CampanhaMembroResumoDto | null>(null)`.
- Novo computed `exibirComoMestre = computed(() => this.ehMestre() && !this.previewJogador())`.
  Substitui `ehMestre()` nos pontos do template que hoje decidem entre layout de mestre e
  layout de jogador: menu kebab de campanha (editar/excluir/convite), coluna "Membros"
  (gestão) e a escolha entre grid "Esquadrão" (mestre) vs. coluna de ficha em destaque
  (jogador). O `ehMestre()` original continua existindo e sendo usado nas checagens de
  permissão reais (`podeGerenciarMembro`, `podeAjustarFicha`, etc.) — ele representa a role
  verdadeira, não a de apresentação.
- Menu kebab (⋮) do cabeçalho ganha a opção **"Ver como jogador ▸"**, que abre uma lista dos
  membros com papel JOGADOR (a partir de `membrosOrdenados()`, filtrando `papel === JOGADOR`).
  Se a campanha não tiver nenhum jogador, a opção não aparece (ou aparece desabilitada).
- Ao escolher um jogador na lista:
  - `previewJogador.set(membro)`;
  - `fichaExibidaId` é setado para a primeira ficha própria daquele jogador
    (`fichasPorMembro().get(membro.usuarioId)?.[0]?.id ?? null`) — mesma lógica que já
    semeia `fichaExibidaId` para o jogador real em `carregar()`. Se o jogador não tiver
    ficha, a tela mostra o mesmo estado vazio que ele veria.
- **Bloqueio de interação:** enquanto `previewJogador()` não é `null`, a área de conteúdo da
  página (tudo exceto a barra de saída) fica envolta por um container com
  `pointer-events: none` — trava clique em qualquer botão, link ou formulário sem precisar
  desabilitar cada handler individualmente. Cobre tanto o antigo layout de mestre (que não
  deve mais aparecer, pois `exibirComoMestre()` é `false`) quanto o layout de jogador
  renderizado.
- **Barra de saída:** faixa fixa/sticky no topo da página, fora do container travado (permanece
  clicável), com texto no formato "Visualizando como **{nome}** · somente leitura" e um botão
  "Sair da visualização" que chama `previewJogador.set(null)` (e limpa `fichaExibidaId` de
  volta a `null`, já que o layout de mestre não usa essa coluna).
- Ao trocar de rota / destruir o componente, nada precisa ser limpo explicitamente — o estado
  é local à instância do componente.

### Limitação aceita (documentada, não resolvida agora)

Se o mestre, dentro do preview, usar o recurso existente "Ver ficha" para trocar para a ficha
de um colega de equipe, os controles de edição daquela ficha podem aparecer habilitados mesmo
que o jogador emulado não tivesse esse direito — porque `podeAjustarFicha` usa a role real do
mestre (sempre `true`), não a do jogador emulado. Isso não tem efeito prático (a tela inteira
está com `pointer-events: none`), só um pequeno desvio visual num caso de borda. Resolver isso
exigiria reescrever as checagens de permissão de exibição para considerarem um "usuário
efetivo" diferente do autenticado, o que não se justifica para uma prévia somente leitura.

## Parte 2 — Avatar nos cards do Esquadrão

### Objetivo

O grid "Esquadrão" da visão de mestre (lista achatada de todas as fichas da campanha) hoje
não mostra o avatar da ficha, mesmo esse dado já vindo do backend
(`FichaResumoDto.imagemUrl`, m3-62) e sendo usado em outras telas (ex.: Acervo). Adicionar o
avatar à esquerda de cada card, com as informações atuais (dono, nome, classe/nível/patente,
condições, identidade, vida/energia, defesa/esquiva, menu de ações) reorganizadas numa coluna
à direita dele.

### Mecanismo

- `ItemFicha` (interface interna de `detalhe.page.ts`) ganha `readonly imagemUrl: string | null`,
  copiado de `ficha.imagemUrl` dentro do computed `fichasPorMembro`.
- `detalhe.page.html`: `.detalhe__ficha-card` deixa de empilhar o conteúdo em coluna única e
  passa a ter um avatar fixo à esquerda + uma coluna à direita com todo o conteúdo que já
  existe hoje (nada é removido, reordenado ou re-semanticamente alterado — só envolto num novo
  container).
- Avatar segue o mesmo padrão visual já usado na tela de Acervo (m3-62): caixa com cantos
  arredondados, moldura, `<img>` com `object-fit: cover` quando há `imagemUrl`, e um
  placeholder decorativo (fundo listrado diagonal) quando `imagemUrl` é `null`. Tamanho maior
  que o da Acervo (36px) para acompanhar a altura maior deste card — algo entre 56–64px,
  esticando (`align-self: stretch`) para acompanhar a altura do card; valor exato ajustado
  visualmente durante a implementação.
- O tratamento visual de "ficha crítica" (`--critico`, tingimento de fundo/borda) continua no
  card inteiro, incluindo a moldura do avatar.
- Puramente frontend — nenhuma mudança de backend, DTO ou endpoint (`imagemUrl` já é
  retornado por `listarFichas`).

## Testes / verificação

- Sem testes automatizados novos previstos (mudança majoritariamente visual/apresentação).
  Verificação manual no navegador via `/verify` (subir o stack, entrar como mestre numa
  campanha com jogadores e fichas com/sem avatar definido):
  - Parte 1: abrir o kebab, escolher "Ver como jogador" com um jogador, confirmar que o
    layout muda para o de jogador, que nada é clicável, que a barra de saída aparece e
    funciona, e que um F5 durante o preview volta ao modo mestre normal.
  - Parte 2: conferir que fichas com avatar mostram a imagem e fichas sem avatar mostram o
    placeholder, com o restante das informações do card intactas ao lado.
