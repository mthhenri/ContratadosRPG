# m9-05-frontend-biblioteca-jogador-espectador.spec.md

> Quinta task do milestone `m9-documentos-campanha.spec.md` — frontend. Leva a biblioteca ao
> **jogador** e ao **espectador** (reusando o `LeitorDocumento` da `m9-04`) e entrega a **busca** nas
> três visões (mestre, jogador, espectador).

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` — inclusive a seção "Biblioteca de documentos"
> que a `m9-04` acrescentou — e o handoff em `docs/design/tema/`. Todo controle usa o primitivo de
> `shared/ui/` com a API completa; se faltar um, **parar e perguntar ao autor**.

## Objetivo

Jogador e espectador abrem a **Biblioteca** e leem, ao vivo, os documentos que o mestre revelou — e
só esses. Os três papéis buscam pelo título e pelo conteúdo, cada um dentro do que pode ver.

## Análogo aprovado (registrar no fecho da task)

- **A página do mestre da `m9-04`** (`BibliotecaMestre`), já aprovada: mesma casca, mesma lista e mesmo
  painel de leitura, **sem** as ações do mestre. A comparação visual desta task é contra ela — o jogador
  deve ver a mesma biblioteca, menos os controles.
- **Espectador:** `CampanhaEspectador` (`modules/campanha/paginas/espectador/`) para a casca e a
  navegação (coluna de ações "Espectador", cabeçalho com voltar); `PainelEncontroEspectador` como o
  exemplo de uma segunda página do espectador que reaproveita o `espectadorCampanhaResolver`.
- **Campo de busca e "Carregar mais":** o histórico de rolagens do painel do espectador
  (`espectador.page.html`, botão `Carregar mais`).

## Estado atual

- A `m9-04` deixou `BibliotecaDocumentos` (a casca em `/campanhas/:campanhaId/documentos`) montando a
  página do mestre e **redirecionando os demais à campanha**; esta task troca esse redirecionamento pela
  página do jogador.
- **O espectador não usa a rota comum.** Ele não consegue carregar `recuperarCampanha`/`listarMembros`
  (o backend responde 403 — `lista.page.ts:127` o leva por outra rota) e vive em
  `campanhas/:id/espectador/**`, todas atrás do `espectadorCampanhaResolver`
  (`core/guards/espectador-campanha.guard.ts`), que carrega o painel do espectador
  (`CampanhaPainelEspectadorDto`, com a `campanha` de identidade segura) e manda para `/acesso-negado`
  se falhar. O mestre em **prévia** de espectador passa pelo mesmo resolver, mas com o payload do mestre
  — por isso a Iniciativa aparece **desabilitada** na prévia (`espectador.page.html`).
- Na **prévia de jogador** (`campanhas/:id/previa/:usuarioAlvoId`) as Cenas também ficam indisponíveis
  (`detalhe-jogador.page.html`): a rota real responderia com o recorte do requisitante (o mestre), não do
  alvo. A Biblioteca cai na mesma regra.
- O recorte é sempre do backend (`m9-02`): a lista de um jogador/espectador já chega sem os ocultos, e
  `GET documento/:id` de um oculto responde 404. O frontend **nunca** decide por CSS o que esconder.
- A sala do espectador (`campanha:<id>:espectador`) recebe `documento:alterado` só nos eventos que a
  mesa enxerga (revelado, oculto-agora, removido, reordenado); os eventos de documento oculto vão só ao
  mestre.

## Entregáveis

1. **Estrutura comum extraída.** A composição "lista + painel + duas vistas no mobile" da página do
   mestre vira um componente de layout usado pelas três páginas (mestre, jogador, espectador). Se isso
   exigir refatorar a `BibliotecaMestre` da `m9-04`, faz-se aqui com os testes dela verdes — **não
   copiar o template**.
2. **Página do jogador** (`biblioteca-jogador`), montada pela casca `BibliotecaDocumentos` quando o
   papel é `JOGADOR`: lista só do revelado, leitor somente leitura, sem "Novo documento", sem chips de
   estado, sem setas, sem Editar/Revelar/Remover. Estado vazio: **"Nenhum documento revelado ainda."**
   com a linha de apoio "O que o mestre revelar aparece aqui ao vivo." Esqueleto durante o carregamento.
3. **Página do espectador** (`biblioteca-espectador`) em `campanhas/:id/espectador/documentos`, com
   `canActivate: [autenticacaoGuard]` e `resolve: { painelEspectador: espectadorCampanhaResolver }`,
   registrada em `app.routes.ts` junto das outras rotas do espectador (antes do prefixo `campanhas`). O
   nome da campanha vem do painel resolvido — **nenhuma** chamada a `recuperarCampanha`, `listarMembros`
   ou `GET /ficha?campanhaId`. Cabeçalho com voltar ao painel do espectador.
4. **Busca** — componente compartilhado (`modules/documento/componentes/busca-documentos/`) com
   `app-campo` (ícone `busca`, debounce curto), consumindo `GET campanha/:id/documento/busca`
   (`m9-03`):
   - estados: ocioso, buscando (esqueleto), sem resultado (`app-estado-vazio`), erro, com resultado;
   - cada resultado mostra título, tipo e o `trecho`; os marcadores `⟦ ⟧` do PostgreSQL viram destaque
     (`<mark>`) **sem `innerHTML`** — o texto é segmentado pelos marcadores e cada parte é renderizada
     como texto;
   - o mestre vê também o chip Revelado/Oculto (`revelado` do resultado); jogador e espectador não
     (é sempre `true`);
   - "Carregar mais" quando há mais páginas; clicar num resultado abre o documento no leitor (e, no
     mobile, muda para a vista do documento);
   - acrescentado ao topo da lista da página do mestre (`m9-04`) e presente nas duas páginas novas.
5. **Ao vivo:** em cada página, `entrarSalaCampanha` ao abrir e `sairSalaCampanha` no `onDestroy`;
   qualquer `documento:alterado` da campanha (e a `reconexao()`) refaz a lista. Se o evento é do
   documento aberto: `OCULTADO`/`REMOVIDO` fecha o painel com o aviso **"Este documento não está mais
   disponível."**; `ALTERADO` recarrega o conteúdo em silêncio (sem esqueleto); `REVELADO` só acrescenta
   à lista (nada abre sozinho — não interromper quem está lendo). Com a busca ativa, o evento refaz
   também os resultados.
6. **Navegação:** item **"Biblioteca"** na categoria "Campanha" da `app-coluna-acoes` de
   `detalhe-jogador` (e no kebab mobile, que repete os itens); item na coluna "Espectador" de
   `CampanhaEspectador`. Na **prévia de jogador** e na **prévia de espectador** o item fica desabilitado,
   com tooltip "Biblioteca indisponível na prévia" (mesmo tratamento da Iniciativa/Cenas).
7. **Documentação de design:** a seção "Biblioteca de documentos" de `docs/design/DESIGN.md` ganha a
   visão do jogador/espectador e a busca.

## Critérios de Aceite

- `npm run test -w frontend` verde, com testes novos: página do jogador (só o revelado, sem controles
  de mestre, estado vazio, esqueleto), página do espectador (usa o painel resolvido e **não** chama os
  endpoints proibidos), `BuscaDocumentos` (estados, destaque sem `innerHTML`, "Carregar mais", chip só
  para o mestre), eventos ao vivo (`REVELADO` acrescenta, `OCULTADO`/`REMOVIDO` do aberto fecha com
  aviso, `ALTERADO` recarrega), itens de navegação desabilitados nas prévias.
- `npm run lint -w frontend` sem erros.
- **Verificação pela skill `verify` em `1920×1080` e `360×800`**, com **três sessões reais** (mestre,
  jogador, espectador — o espectador entra pelo convite próprio) e o par de portas isoladas se o
  `ng serve` do autor estiver com o proxy antigo:
  - o mestre cria um documento: jogador e espectador **não** o veem e a lista deles **não recarrega**
    (provar com `window.__sentinela`);
  - o mestre revela: o documento aparece **ao vivo** nas duas telas; o jogador lê o texto e a imagem;
  - o mestre edita o revelado e salva: o leitor aberto do jogador atualiza sozinho;
  - o mestre oculta o documento que o jogador tem aberto: o painel fecha com o aviso e o item some da
    lista; a busca do jogador **não** o encontra (e a do mestre, sim);
  - um id oculto pedido direto por REST devolve 404 ao jogador; o espectador não gera 403 no console;
  - busca por termo com acento e por radical nas três visões; o destaque aparece no trecho;
  - **reconexão** (skill `verify`, "Testar a reconexão"): derrubar o backend, ocultar um documento
    direto no Postgres, subir de novo — a lista do jogador se refaz sozinha;
  - a prévia do mestre (jogador e espectador) mostra o item desabilitado;
  - mobile: as duas vistas, o voltar, sem overflow horizontal, alvos ≥ 44 px, foco visível.
- **Comparação visual** com a página do mestre da `m9-04`, registrada no fecho: mesma casca, densidade
  e hierarquia, sem controles de mestre, "parece parte do mesmo produto".

## Fora de Escopo

- O cartão **"Documento apresentado"** e a lista de documentos da cena — `m7-25`. Também um deep link
  (`?documento=<id>`) para abrir um documento direto: se a `m7-25` precisar, entra lá.
- Notificação global de "novo documento revelado" fora da página da Biblioteca.
- Marcar como lido, favoritos, comentários do jogador nos documentos.
- O passe responsivo fino (`960×1080`, `1366×768`) — `m9-06`; aqui basta `360×800` sem overflow.
- Caminho novo do espectador para a rota comum (`/campanhas/:id/documentos`): ele usa a própria.

## Dependências

`m9-03` (busca), `m9-04` (`BibliotecaMestre`, `LeitorDocumento`, `DocumentoService`,
`documentoAlterado$`, seção de design), `m8-03`/`m8-07` (painel do espectador, resolver e prévias),
`docs/design/DESIGN.md`.

## Decisões assumidas ao especificar (confirmadas pelo autor em 2026-09-26)

1. **O espectador tem Biblioteca** — é a revisão da decisão #4 do `m8` assumida na `m9-02`. Se o autor
   decidir que é só do jogador, esta task perde o item 3 e o item de navegação do espectador (e o
   backend passa a recusar o espectador, uma linha na `m9-02`).
2. **Nada abre sozinho** quando o mestre revela: o documento entra na lista. Abrir por conta própria
   interromperia quem está rolando dado ou lendo a ficha (mesmo princípio da `m7-25`).

## Riscos e Mitigação

- **Espectador e endpoints proibidos:** copiar a estrutura do hub (que chama `listarMembros`) para a
  página do espectador geraria 403 no console e uma tela quebrada. Testar que só o painel resolvido e a
  API de documento são chamados.
- **Destaque do trecho:** tratar `trecho` como HTML seria uma brecha (o texto vem de conteúdo de
  documento). Segmentar por marcador e renderizar cada trecho como texto.
- **Extração do layout:** refatorar a página do mestre para compartilhar o esqueleto pode regredir a
  `m9-04`; os testes e a verificação visual da `m9-04` precisam continuar valendo depois da extração.

## Decisões tomadas na implementação (2026-09-26)

1. **`app-campo` com ícone — decisão do autor.** O primitivo não tinha ícone. Perguntado, o autor
   escolheu ampliá-lo: novo input opcional `icone`, desenhado dentro do controle. O controle
   continua filho direto do `<label>`, e sem ícone nada muda.
2. **Campo `type="text"` + `inputmode="search"`**, não `type="search"`: o "×" nativo do navegador
   sai branco, fora dos tokens. É o mesmo tipo da busca do Caderno.
3. **Divisor acima da busca.** O divisor "Documentos N" vira "Resultados N" com termo, e fica acima
   do campo, para a busca ser um componente fechado (campo + resultados).
4. **Estado da mesa num store por página** (`BibliotecaLeituraStore`), dividido por jogador e
   espectador. O mestre manteve o próprio estado da `m9-04`: ele tem edição, versão otimista e o
   eco do próprio `REMOVIDO`.
5. **Aviso de indisponível** como notificação `aviso` (o mesmo canal do "removido em outra sessão"
   do mestre). Vale também para o aberto que some da lista sem evento, o caso da reconexão.
6. **Evento com a busca ativa** refaz a primeira página em silêncio. As páginas já carregadas com
   "Carregar mais" recolhem.
7. **Kebab do jogador na prévia:** o item "Biblioteca" fica desabilitado sem tooltip, igual ao
   "Cenas" vizinho. O tooltip "Biblioteca indisponível na prévia" fica na coluna de ações.

## Fecho

- **Análogo registrado:** a página do mestre da `m9-04`. Comparação em 1920×1080 e 360×800:
  - mesma casca, divisor, cartão, painel e leitor;
  - mesma densidade e hierarquia, sem os controles do mestre;
  - o cartão da mesa ocupa a coluna, porque não há setas.
  O espectador segue a navegação do `CampanhaEspectador`: item na coluna "Espectador" e voltar ao
  painel.
- **Verificado:**
  - `npm run test -w frontend`: 2360/2360;
  - `npm run lint -w frontend`: 0 erros;
  - `verify` com três sessões reais: 109/109 checagens em 1920×1080 e 360×800, com todos os itens
    dos critérios de aceite (detalhes em `HISTORY.md`).
- **Pendente (fora de escopo):** passe fino em `960×1080` e `1366×768` (`m9-06`); cartão "Documento
  apresentado" (`m7-25`).
