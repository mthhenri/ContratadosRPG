# ui-45-campanha-mestre-roteiro.spec.md

> Task solta de UI. Nasce da avaliação das telas do mestre (ui-43/ui-44) e da escolha do autor,
> em 2026-11-28, pela direção **A · Roteiro no topo** entre três mockups. Só a tela de campanha
> do mestre (`/campanhas/:id`, `CampanhaDetalheMestre`); a do jogador e a do espectador não mudam.

## Objetivo

Fazer a tela de campanha do mestre responder de relance "onde a sessão está": qual cena está
aberta, quais vêm a seguir, o que os jogadores já viram e o que o mestre anotou por último. O
espaço vem de cartões de ficha mais enxutos, da missão em uma linha e do fim da "última rolagem"
duplicada.

## Referência visual

Canvas privado do autor: <https://claude.ai/artifact/QDtNMYidnz9muifgDspWmU>. As pranchas que valem
são **A · Roteiro no topo**, **A · Sem cena aberta (na base)** e **A · Mobile 360**; as direções B e
C ficaram de fora. O mockup é fonte de **forma e hierarquia**, não de mecânica nem de dados: o que
ele mostra e o sistema não tem fica de fora (ver Fora de Escopo). As pranchas foram desenhadas em
`1920×945`, a área útil do Chrome maximizado no monitor do autor (1920×1080, escala de 100%).

## Entregáveis

1. **Cabeçalho em uma faixa.** Voltar, `//` + nome da campanha, o estado da equipe e a missão
   ficam na mesma linha (quebrando quando faltar largura).
   - O chip "NA BASE"/"EM MISSÃO" vira um `app-segmentado` com as duas opções **Na base** e
     **Em missão**, com nome acessível "Onde a equipe está". A troca chama o mesmo
     `alternarEstado` de hoje (`detalhe-mestre.page.ts:199`); nada muda no backend nem na regra de
     inventário só leitura fora da base.
   - A descrição da campanha (a missão) vira **uma linha** com reticências, precedida do rótulo
     "Missão", e um botão **Ler missão** abre o texto inteiro (expandir no lugar ou
     `app-modal`; escolher pelo análogo mais próximo e registrar no relatório). Sem descrição, a
     linha e o botão não aparecem.
2. **Faixa "Roteiro da sessão"** logo abaixo do cabeçalho, com régua e o link **Todas as cenas →**
   (vai ao hub de cenas). Da esquerda para a direita:
   - um bloco **Encerradas** com a contagem de cenas `ENCERRADA` (some quando for zero);
   - **com cena `ATIVA`:** um cartão em destaque (borda e fundo de acento) com os chips "Ativa" e o
     tipo (`rotuloTipoCena`), o nome, a linha "N documentos · “<título>” em foco no palco" (só para
     Investigação, e o trecho do foco só quando houver documento em foco) e o botão primário
     **Conduzir cena**, que leva à cena;
   - **sem cena ativa:** um cartão tracejado com o chip "Nenhuma cena aberta", "Próxima: <nome>"
     da primeira `PLANEJADA` na ordem, o tipo e o botão primário **Abrir cena**, que chama o mesmo
     fluxo de abrir cena do hub (com a mesma confirmação, se o hub tiver). Sem nenhuma planejada, o
     cartão diz "Nenhuma cena planejada" e o botão vira **Nova cena**;
   - as cenas `PLANEJADA` restantes, na ordem do hub, em cartões menores com chip "Planejada", chip
     do tipo e nome; clicar abre a cena;
   - um botão tracejado **+ Nova cena** (mesmo fluxo do hub).
   A faixa rola na horizontal quando não couber; nada quebra para uma segunda linha no desktop.
   Dados: `CenaService.listarPorCampanha` (já ordenado) e, para a ativa de Investigação,
   `CenaService.listarDocumentos`. A faixa acompanha `cena:alterada` em tempo real como o hub já faz.
3. **Cartões de ficha enxutos** (Esquadrão, Criaturas, NPCs) na tela do mestre:
   - retrato menor, nome, jogador/dono, Vida e Energia como `app-barra-recurso` lado a lado e as
     reações numa linha só;
   - **sem a faixa "Última rolagem"** nos cartões do mestre: a rolagem fica só no histórico ao lado.
     O espectador e o jogador mantêm a faixa (o cartão do espectador não é tocado);
   - grade `auto-fill` com mínimo menor que os 400px atuais, para caberem pelo menos três cartões
     por linha no corpo em `1920×945` com a coluna de ações recolhida;
   - as abas mostram a contagem junto do rótulo ("Esquadrão · 4"), e **+ Novo agente** vai para o
     fim da barra de abas.
   Medir o impacto antes (skill `gerenciamento-de-impacto`): `campanha-fichas-abas` e
   `criatura-esquadrao-card` são usados também pelo jogador e pelo espectador; o enxugamento é só
   do mestre, por input ou variante, nunca mudando o cartão dos outros papéis.
4. **Mesa do mestre** na lateral direita, no lugar do painel atual, com três blocos empilhados:
   - **Documentos.** Com Investigação ativa: os documentos da cena, cada um com o estado
     "Em foco", "Revelado" ou "Oculto" (de `CenaDocumentoResumoDto`). Sem ela: até cinco documentos
     revelados da Biblioteca, do mais recente para o mais antigo por `updatedDate`, com o título
     "Revelados na Biblioteca". Link **Biblioteca →** abre o painel flutuante da Biblioteca que a
     coluna de ações já abre. Vazio: `app-estado-vazio` curto;
   - **Caderno · última editada.** A página do caderno do mestre com o `updatedDate` mais recente
     (`PaginaCadernoService.listarPaginas`): título, "editada há <tempo>" e um trecho de até três
     linhas do conteúdo em texto puro (um `recuperarPagina` só dessa página). **Abrir →** abre essa
     página no painel do Caderno. Sem páginas: estado vazio com "Nova página";
   - **Rolagens.** A rolagem rápida e o histórico de hoje, com cada rolagem em uma linha (total,
     teste, quem, hora). O alternador "Rolagens públicas", o link de abrir em janela e o Inventário
     continuam acessíveis; onde ficam (aba no bloco, item da coluna de ações) é decisão do
     implementador pelo análogo, registrada no relatório.
5. **Mobile (`< $bp-mobile`)**, na ordem: cabeçalho; segmentado Na base/Em missão na largura toda;
   linha da missão com "Ler ▸"; cartão da cena (ativa ou próxima) na largura toda com o botão na
   largura toda; demais cenas rolando de lado; fichas em lista; Documentos; Caderno; **Rolagens por
   último**. A coluna de ações segue como barra de rodapé, como já é hoje. Todo alvo de toque com
   pelo menos `$alvo-toque` (44px).
6. **Esqueleto de carregamento** atualizado para a nova silhueta (faixa do roteiro, cartões
   enxutos, três blocos da mesa), reaproveitando as classes reais como hoje.
7. **Testes** da página e dos componentes tocados:
   - cena ativa, só planejadas e nenhuma cena: o cartão certo, o botão certo e a ação emitida;
   - contagem de encerradas e sumiço no zero;
   - o cartão do mestre sem "Última rolagem" e o do espectador/jogador ainda com ela;
   - Documentos com e sem Investigação ativa; Caderno com e sem páginas;
   - o segmentado chamando a troca de estado.
8. **Documentação:** `docs/design/DESIGN.md` (a tela de campanha do mestre e a mesa), `HISTORY.md`,
   `CONTEXT.md` e o relatório da task em `docs/specs/<estado>/ui-45-campanha-mestre-roteiro/`.

## Critérios de Aceite

- `npm run test --workspace=frontend` verde (com `NODE_OPTIONS=--no-experimental-webstorage`,
  `P-138`), lint sem erro novo, build sem erro novo além do aviso de budget já conhecido.
- Gate visual (skills `design-fidelity` e `verify`) contra o canvas e contra o análogo
  (`campanha-fichas-abas` e o hub de cenas), nos viewports **`1920×945`** (o do autor),
  `1920×1080`, `1366×768`, `960×1080` e `360×800`, com a coluna de ações aberta e recolhida.
  Estados percorridos: cena de Investigação ativa com documento em foco, cena de Combate ativa,
  nenhuma ativa com planejadas, nenhuma cena, missão longa e ausente, caderno vazio, com 4 e com
  8+ fichas.
- Em `1920×945`, com Investigação ativa e coluna recolhida, a faixa do roteiro, a primeira linha de
  fichas e os três blocos da mesa aparecem sem rolar a página.
- Sem overflow horizontal da página em nenhum viewport (a faixa do roteiro rola só dentro dela).
- Jogador e espectador: capturas antes/depois iguais nos cartões de ficha.
- `npm run repo:verificar` limpo.

## Fora de Escopo

- **Fixar uma página do Caderno.** Não existe no sistema; é a questão a) em aberto do
  `quadro-investigacao-campanha`. Aqui vale só "última editada".
- "Aberta há N min" na cena ativa (a cena não guarda a hora de abertura) e a contagem de
  criaturas/NPCs por cena planejada (o `CenaResumoDto` só tem `temEncontro`). Nenhum DTO ou
  endpoint novo nesta task.
- Reorganizar os grupos e itens da coluna de ações (outro mockup da fila).
- As telas de cena, a Biblioteca como página e a tela do jogador.
- O quadro de investigação.

## Dependências

- `ui-43` e `ui-44` em `done/` (coluna de ações compartilhada, rótulos por tipo de cena).
- `docs/design/DESIGN.md` e `docs/design/tema/`; primitivos `app-segmentado`, `app-chip`,
  `app-cartao`, `app-barra-recurso`, `app-estado-vazio`, `app-abas`. Se algum não cobrir o que a
  faixa ou a mesa precisam, **parar e perguntar ao autor** (CLAUDE.md, "Biblioteca de componentes").

## Riscos e Mitigação

- **Enxugar o cartão para todos.** O cartão e as abas são compartilhados com jogador e espectador;
  um default novo muda as três telas. Mitigação: o mapa de impacto vem antes do primeiro edit, e
  as capturas antes/depois do jogador e do espectador entram no gate.
- **Mais requisições no carregamento.** A tela passa a buscar cenas, documentos e caderno. Buscar
  em paralelo, não bloquear o esqueleto das fichas por elas e dar a cada bloco seu próprio estado
  de carregando/erro.
- **Abrir cena daqui fugir do fluxo do hub.** Reusar o mesmo método e a mesma confirmação do hub,
  sem cópia local.
