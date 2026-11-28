# Relatório — ui-45 (tela de campanha do mestre, roteiro no topo)

## O que foi entregue

| Entregável | Onde |
|---|---|
| 1. Cabeçalho: segmentado Na base/Em missão e missão em uma linha | `detalhe-mestre.page.html/.scss/.ts` (`definirEstadoEquipe`, `missaoAberta`, `textoMissao`) |
| 2. Faixa "Roteiro da sessão" | `campanha/componentes/campanha-roteiro/` (novo); lista de cenas em `CampanhaDetalheDadosService.cenas` (mesma leitura da cena ativa, sem GET extra) |
| 3. Cartões enxutos só no mestre | inputs `compacto` e `mostrarUltimaRolagem` em `EspectadorFichaCard` e `CriaturaEsquadraoCard` (padrão inalterado); `campanha-fichas-abas` (contagem no rótulo da aba, botão de criar no fim da barra, grade de 340px) |
| 4. Mesa do mestre | `campanha/componentes/campanha-mesa-mestre/` (novo) e `paginas/detalhe-mestre/campanha-mesa-mestre.service.ts` (novo); `CadernoFlutuante.abrirPagina/abrirNovaPagina` e `CadernoConteudo.abrirPaginaDoMeuCaderno/comecarPaginaNoMeuCaderno`; `app-cartao-rolagem [linha]` |
| 5. Mobile | SCSS dos componentes acima (ordem: cabeçalho, segmentado, missão, cena, seguintes, fichas, Documentos, Caderno, Rolagens) |
| 6. Esqueleto | o próprio roteiro com `[cenas]="null"` e a mesa no estado CARREGANDO, dentro da casca de carregamento |
| 7. Testes | `detalhe-mestre.page.spec.ts` (bloco "roteiro da sessão e mesa do mestre", segmentado, cartão sem última rolagem), specs dos dois cartões e do `cartao-rolagem` |

Decisões do implementador, registradas como a spec pede:

- **"Ler missão"** abre o texto no lugar, logo abaixo do cabeçalho. Não é modal: segue a
  preferência do autor por edição e leitura no próprio lugar.
- **Rolagens públicas, janela externa e Inventário** continuam no painel Rolagens⇆Inventário,
  embaixo da mesa, sem mudança de lugar.
- **"Abrir cena"** só aparece sem cena ativa, então chama `CenaService.abrirCena` e navega, como
  `HubCenas.abrirPlanejada`, sem a confirmação de encerrar (não há cena a encerrar). **"Nova cena"**
  reusa a entrada `?nova=1` do hub.
- **"Missão:" no começo da descrição** é descartado na exibição. A campanha de teste escreve
  "MISSÃO: …" na própria descrição, e a tela mostrava "MISSÃO MISSÃO: …". Esse defeito só apareceu
  na verificação ao vivo.

## Ajuste do autor depois da primeira versão

Na primeira versão, Documentos e Caderno ficavam na lateral, acima das rolagens. Isso criou scroll na
página e tirou as rolagens de foco. Três arranjos foram para o canvas (fileira "Ajuste da mesa"), e o autor
escolheu **Documentos e Caderno abaixo das fichas**.

- **Lateral:** voltou a ser só Rolagens⇆Inventário.
- **Altura:** acima do tablet, a página fica na altura da tela; as fichas e as rolagens rolam cada uma
  por dentro.
- **Botões:** "Biblioteca" e "Abrir" viraram `app-botao` secundário em contorno; antes estavam no estilo
  texto e não pareciam botão.
- **Medido ao vivo:**
  - em 1920×945 e 1920×1080, a página não rola;
  - em 1366×768, a coluna de fichas rola por dentro, sem sobrepor os blocos de baixo. A sobreposição
    apareceu ao vivo e foi corrigida com `flex: none` nos filhos da coluna;
  - no celular a ordem segue fichas → Documentos → Caderno → Rolagens.
- **Cartões:** cabem 3 por linha em 1920, com Vida e Energia lado a lado.

## Mapa de impacto

| Item | Consumidores | Classe | Decisão |
|---|---|---|---|
| `EspectadorFichaCard` (inputs novos) | campanha do mestre, espectador da campanha, painel do espectador, cena sem iniciativa do mestre | pedido (mestre) / sem mudança (demais, padrão `true`/`false`) | aplicar |
| `CriaturaEsquadraoCard` | só `campanha-fichas-abas` | pedido | aplicar |
| `CampanhaFichasAbas` | só a campanha do mestre | pedido | aplicar; input `rolagens` removido |
| `CartaoRolagem` (input `linha`) | campanha do mestre, jogador, espectador, prévia de Investigação, histórico lateral | pedido (mestre) / sem mudança (padrão `false`) | aplicar |
| `CadernoFlutuante` / `CadernoConteudo` (métodos públicos novos) | 10 consumidores | sem mudança, só acréscimo | aplicar |
| `CampanhaDetalheDadosService.cenas` | mestre (lê), jogador e prévia (não leem) | acréscimo | aplicar |

## Verificação

- `npm run build --workspace=frontend`: sem erros; só o aviso de budget conhecido (604 kB).
- `npm run test --workspace=frontend` com `NODE_OPTIONS=--no-experimental-webstorage` (`P-138`):
  304 arquivos e 3.809 testes passando.
- `npm run lint --workspace=frontend`: 0 erros. Os avisos dos arquivos novos são os de aspas que o
  repositório inteiro carrega.
- **Ao vivo**, com Playwright sobre os servidores do autor (3100/4300) e a conta `codex.dev`,
  campanha 2. Os estados que o banco não tinha foram simulados interceptando só os GETs no
  navegador, sem escrita no banco:
  - sem cena ativa;
  - nenhuma cena;
  - Combate ativo com nome longo e encerradas;
  - missão ausente e missão longa;
  - Caderno com páginas.
- **Viewports:** 1920×945 (o do autor) com a coluna recolhida e aberta, 1920×1080, 1366×768 (com a
  coluna recolhida e aberta), 960×1080 e 360×800.
  - Nenhum overflow horizontal da página.
  - A faixa do roteiro rola por dentro em 1366 e 960.
  - Em 1920×945, com Investigação ativa e coluna recolhida: o roteiro termina em y=275, a primeira
    linha de fichas em y=531 (4 cartões por linha), os Documentos começam em y=291 e o painel de
    Rolagens em y=644. Tudo aparece sem rolar a página.
  - Nenhum erro de console.
- **Fluxos ao vivo:** "Biblioteca" abre o painel e "Nova página" abre o Caderno em "Meu caderno"
  numa página nova, marcando o item da coluna. Nenhuma requisição de escrita.
- **Achados corrigidos durante a verificação:**
  - "MISSÃO MISSÃO:" repetido;
  - chips das planejadas empilhando em cartões de 220px (passaram a 250px, e "Nova cena" a 150px);
  - rótulo "ESQUADRÃ…" cortado na aba ativa do mobile (a contagem saiu do texto visível no mobile e
    ficou no nome acessível);
  - chip "Planejada" empilhando nos cartões de 200px do mobile (escondido lá).
- **Comparação com o análogo** (`.cena-cartao` do hub, painel lateral da própria página):
  - mesmo produto, mesma densidade;
  - controles e ícones canônicos (`app-chip`, `app-botao`, `app-segmentado`, `app-estado-vazio`);
  - foco com contorno de acento;
  - alvos de 44px no mobile nos controles novos.

## Limites

- **"Abrir cena" não foi acionado ao vivo**, porque abriria uma cena de verdade na campanha de
  teste. Ele está coberto por teste de unidade e reusa a chamada do hub.
- **Jogador e espectador:** a ausência de mudança é garantida pelo padrão dos inputs novos e pelos
  testes dos cartões. Não houve captura antes/depois das telas deles nesta sessão.
- **Foco no título da página nova do Caderno:** ao abrir pela mesa, ele não ficou no campo de título
  na captura. O `setTimeout` do próprio Caderno corre antes de a janela abrir. É sem efeito
  funcional e foi registrado como observação, não corrigido.
- **Capturas** em `.artifacts/ui-45-campanha-mestre-roteiro/` (local, ignorada).
