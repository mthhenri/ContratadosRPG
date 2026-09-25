# i-027-caderno-janela-externa.spec.md

> Task avulsa. Origem: `IDEAS.md` `I-027`, 3ª e última fatia (Histórico → Anotações → **Caderno**).
> Reaproveita a rota isolada `/janela/`, o `JanelaExternaService`, o `JanelaExternaCabecalho` e o
> comportamento de recolher/restaurar entregues em `rolagens-janela-externa`,
> `i-027-rolagens-janela-contextos` e `i-027-anotacoes-janela-externa`.

## Estado de fechamento · 2026-09-25

- **Entregue e verificado ao vivo** (stack do autor, Playwright com a janela real capturada como
  popup; contas criadas por REST — mestre, jogadora e espectador na campanha "Caderno I-027",
  soft-deletada ao fim), em `1920×1080`, `960×720` (tamanho da janela) e `360×800`. Todos os
  critérios de aceite conferidos; nenhum erro de console.
- **Na primeira execução do roteiro** a janela do mestre mostrou "acesso negado" enquanto o dev
  server servia os módulos recém-recompilados; três execuções seguidas do mesmo fluxo (e a rota
  aberta direto) carregaram normalmente. Não reproduzido — registrado para quem vir de novo.

## Objetivo

Permitir abrir o Caderno da campanha numa janela separada do navegador, com o mesmo conteúdo e as
mesmas permissões do painel flutuante (Meu caderno, Esquadrão colaborativo, Jogadores para o
mestre, busca). Enquanto a janela existe, o painel local do Caderno sai da tela em toda página da
mesma aba que o hospeda; ao fechar a janela, ele volta com os dados recarregados.

## Entregáveis

1. **Corpo do Caderno extraído.** O conteúdo que hoje vive dentro do `app-painel-flutuante` de
   `CadernoFlutuante` (escopo, busca e resultados, lista de páginas, editor, confirmações de
   exclusão e de descarte) vira `CadernoConteudo` (`modules/pagina-caderno/caderno-conteudo.*`),
   com `:host { display: contents }` para continuar projetado direto na coluna flexível do corpo do
   painel. Entradas: `campanhaId`, `ehMestre`, `membros`, `mobile`; saída `abrirFicha`; um slot
   `[cadernoEscopoExtra]` no fim da faixa de escopo. Não provê `CadernoFlutuanteStore` nem
   `CadernoEsquadraoColaborativoService` — quem hospeda provê (painel ou janela). `CadernoFlutuante`
   fica com o que é da janela flutuante: gatilho, painel, maximizar, redimensionar, posição,
   `abrir`/`alternar`/`aberto` e a troca de campanha. A janela seria a segunda cópia do corpo.
2. **Status de salvamento extraído.** O selo "Salvando…/Salvo/Falha ao salvar/Conflito de versão" e
   o botão "Recarregar versão" do cabeçalho do painel viram `CadernoSalvamento`
   (`modules/pagina-caderno/caderno-salvamento.*`), lido do store. O painel o põe em
   `[painelCabecalhoExtra]`; a janela, no slot `[cadernoEscopoExtra]`.
3. **Fachada `CadernoJanelaService`** (`modules/pagina-caderno/caderno-janela.service.ts`), sobre
   `JanelaExternaService`: contexto `caderno:<campanhaId>`, URL
   `/janela/campanha/:campanhaId/caderno`, janela `960×720` (o tamanho inicial do painel é
   `960×680`; acima do breakpoint mobile de 560px o corpo mantém as duas colunas).
4. **Gatilho "Abrir em janela"** no cabeçalho do painel (`[painelAcoesExtras]`, antes de
   maximizar): `app-botao-icone` com ícone `abrir-externo`, `aria-label` "Abrir caderno em janela"
   e tooltip "Abrir em janela" — mesmo controle das anotações e do histórico. Não aparece no mobile
   (folha cheia). O clique grava o rascunho pendente (`salvarAgora`) e abre a janela, síncrono no
   `(click)`.
5. **Recolher e restaurar**, dentro de `CadernoFlutuante` (as seis páginas que o hospedam —
   campanha do mestre e do jogador, Iniciativa do mestre e do jogador, fichas de jogador e criatura
   — não mudam): com `CadernoJanelaService.estaAberta(campanhaId)`, o painel fica fechado e
   `aberto()` devolve `false` (o item "Caderno" da coluna de ações e do menu "⋯" deixa de ficar
   pressionado); `abrir()`/`alternar()` focam a janela existente em vez de abrir o painel. Ao
   recolher, o corpo grava o pendente e encerra a sessão colaborativa do Esquadrão (sem presença
   fantasma). Ao fechar a janela, o painel volta ao estado anterior (aberto, se estava aberto) e o
   corpo recarrega a lista do modo atual e a página que estava selecionada, pela API — a janela
   pode ter alterado as mesmas páginas, e a versão antiga levaria a um "Conflito de versão" na
   primeira edição. Com rascunho que não pôde ser salvo (página nova sem título), nada é
   recarregado e o rascunho continua.
6. **Rota isolada** `janela/campanha/:campanhaId/caderno`, guardada por `autenticacaoGuard`, sob o
   prefixo `/janela/` que o `Layout` já isola.
7. **Página `CadernoJanela`** (`modules/pagina-caderno/paginas/caderno-janela/`): provê o store e o
   serviço colaborativo; busca a campanha e os membros (`recuperarCampanha` + `listarMembros`) e
   decide `ehMestre` pelo próprio vínculo; espectador, não membro ou REST negado → estado vazio de
   acesso negado, sem conteúdo. Cabeçalho `JanelaExternaCabecalho` com "Caderno · <campanha>" e
   "Voltar à campanha" (`/campanhas/:id`). Conecta o socket e entra na sala `campanha:<id>` (eventos
   e presença do Esquadrão), abre o store e monta `CadernoConteudo` em tela cheia, com
   `container-type: inline-size` para a mesma regra de sobreposição da lista abaixo de 640px, e o
   `mobile` pelo mesmo breakpoint do painel. Um resultado de busca do tipo "Ficha" abre
   `/campanhas/:id/ficha/:fichaId#anotacoes` — o mesmo destino das páginas da campanha — numa nova
   aba, já que a janela não comanda a aba principal. Fechar a janela com rascunho não salvo ou
   gravação em andamento dispara a confirmação nativa (`beforeunload`); ao sair, grava o pendente e
   encerra a sessão colaborativa.

## Critérios de Aceite

1. Em desktop, o painel do Caderno tem um único botão de ícone "Abrir em janela" que abre
   `/janela/campanha/:id/caderno`; o painel local sai da tela e o item "Caderno" da coluna deixa de
   estar pressionado. Em 360×800 o botão não aparece.
2. Na janela, o mestre vê "Meu caderno", "Esquadrão" e "Jogadores"; o jogador, os dois primeiros.
   Criar e editar página do próprio caderno salva sozinho; a página do Esquadrão editada na janela
   aparece na aba de outro membro sem recarregar.
3. Fechar a janela devolve o painel na aba principal sem recarregar a página, já com o texto salvo
   na janela; editar em seguida salva sem "Conflito de versão". Clicar "Caderno" com a janela aberta
   a foca, sem segunda janela — inclusive a partir de outra página da mesma aba (ficha, Iniciativa).
4. Espectador (e quem não é membro) recebe estado de acesso negado na rota da janela, sem conteúdo.
5. Testes focados (fachada, corpo extraído via painel, recolher/restaurar, página da janela),
   suíte do frontend, lint e build sem erro novo.
6. Gate visual (`CLAUDE.md`): análogos — `AnotacoesJanela`/`HistoricoRolagensCampanhaJanela` para o
   casco da janela e o painel do Caderno para o corpo. `verify` em `1920×1080` e `360×800` (janela
   e painel após a extração): modos Meu caderno, Esquadrão e Jogadores, busca com resultado, lista
   recolhida, lista/conteúdo no mobile; sem overflow; só o corpo rola.

## Fora de Escopo

- Mudar quem pode ler ou editar cadernos, o contrato de `pagina-caderno` ou a busca.
- Tempo real para páginas do caderno privado (hoje não existe; o restaurar recarrega pela API).
- Ressincronizar o Caderno na reconexão do socket — o painel também não faz; fica como está.
- Janela do Caderno a partir da prévia de jogador ou do espectador (nenhum dos dois monta o Caderno).
- Retirar o gatilho flutuante próprio (`mostrarGatilho`) ou mexer no leitor de documentos.

## Dependências

- `docs/specs/done/rolagens-janela-externa.spec.md`,
  `docs/specs/done/i-027-rolagens-janela-contextos.spec.md` e
  `docs/specs/done/i-027-anotacoes-janela-externa.spec.md`.
- `docs/design/DESIGN.md` e `docs/design/tema/`.

## Riscos e Mitigação

- **Painel escondido com versão velha**: o caderno privado não tem tempo real; sem recarregar ao
  restaurar, a primeira edição no painel bateria em `409`. Mitigação: entregável 5 e critério 3.
- **Presença duplicada no Esquadrão**: o painel escondido manteria a sessão Yjs aberta ao lado da
  janela. Mitigação: encerrar a sessão ao recolher e reabrir ao restaurar.
- **Corrida entre o save do painel e a carga da janela**: o `salvarAgora` do clique é assíncrono.
  A janela carrega a SPA antes de listar as páginas, e uma página só é buscada ao ser escolhida; no
  pior caso a janela recebe "Conflito de versão" e oferece "Recarregar versão".
- **Extração de componente extenso**: os testes existentes de `CadernoFlutuante` continuam como
  testes de integração do painel com o corpo real; nenhum comportamento do painel muda.
