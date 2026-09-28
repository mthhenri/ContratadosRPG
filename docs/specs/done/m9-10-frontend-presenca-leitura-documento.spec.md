# m9-10-frontend-presenca-leitura-documento.spec.md

> **Task avulsa pós-M9 (pedido direto do autor, 2026-09-28).** Quarta de quatro specs de melhoria da
> Biblioteca (`m9-07` desselecionar, `m9-08` importar Markdown, `m9-09` presença — backend, `m9-10`
> presença — frontend). Depende da `m9-09`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` (seção "Biblioteca de documentos") e o handoff
> em `docs/design/tema/`. Todo controle usa o primitivo de `shared/ui/` com a API completa; se faltar
> um, **parar e perguntar ao autor**.

## Objetivo

Na Biblioteca do mestre, cada documento mostra **quantos e quais** jogadores/espectadores estão com
ele aberto agora, e o documento aberto mostra os nomes. Atualiza ao vivo pelo `documento:leitores` da
`m9-09`.

## Análogo aprovado (registrar no fecho da task)

- **O chip Revelado/Oculto do `app-documento-cartao`** (`documento-cartao.component.html`): o
  indicador de leitores é mais um `app-chip` com ícone na mesma linha de meta do cartão — mesma
  densidade, nada de avatar ou bolinha desenhada à mão.
- **O cabeçalho do documento aberto** no `BibliotecaLayout` (onde já ficam título, chip de estado e as
  ações do mestre) para a linha "Lendo agora".
- Tooltip: diretiva `appTooltip` (nunca `title`).

## Estado atual

- O cartão tem `<ng-content />` dentro de `.documento-cartao__texto` e a linha
  `.documento-cartao__meta` com rótulo do tipo + chip de estado (só mestre, `mostrarEstado`).
- A casca `BibliotecaDocumentos` já chama `campanhaService.listarMembros` (`biblioteca-documentos.
  page.ts:55`) para decidir o papel; os nomes dos membros estão, portanto, disponíveis sem GET novo.
- Depois da `m9-09`: `TempoRealService` recebe `documento:leitores` (retrato completo, sem o mestre,
  agrupado por usuário, com `papel`) e a página do mestre já informa leitura para receber o retrato
  inicial.

## Entregáveis

1. **Estado na página do mestre** (ou num pequeno store/service do módulo, se a página — já extensa —
   pedir extração; avaliar e registrar no fecho): `leitoresPorDocumento = computed(...)` a partir do
   último retrato filtrado pela campanha, com os nomes resolvidos pela lista de membros. `usuarioId`
   desconhecido (membro que entrou depois da carga) → recarrega membros **uma vez** pelo endpoint
   existente; enquanto isso, mostra "Membro".
2. **Indicador no cartão** (só mestre, com `mostrarEstado`): quando o documento tem leitores, um
   `app-chip` com `<app-icone nome="olho" />` e a contagem (`1 lendo`, `3 lendo`), com `appTooltip`
   listando os nomes ("Ana, Bruno e Carla (espectadora)"). Sem leitores, nada aparece (sem "0").
   Escolher `severidade` distinta do chip Revelado (que também usa `olho`) — se nenhuma severidade
   existente diferenciar bem, ou se o ícone `olho` confundir com "Revelado", **parar e perguntar ao
   autor** (glifo novo é decisão dele). O cartão ganha um input para isso (ou recebe o chip por
   projeção), e a lista repassa; jogador e espectador nunca recebem o dado.
3. **"Lendo agora" no documento aberto** (mestre): linha discreta no cabeçalho do painel com os nomes
   em `app-chip` (espectador identificado), escondida quando ninguém está lendo. Também vale nos
   resultados de busca do mestre (o chip do item 2 no resultado), se couber sem mudar a densidade;
   senão, só lista e painel — registrar.
4. **Ao vivo e reconexão:** substituir o retrato a cada `documento:leitores`; na reconexão, a página
   informa leitura de novo (m9-09) e recebe um retrato fresco. Sair da página descarta o estado.
5. **Acessibilidade:** o chip tem texto real ("2 lendo"), não só ícone; o rótulo acessível do cartão
   inclui os leitores quando houver; mudanças de presença **não** são anunciadas em `aria-live` (seria
   ruído constante).
6. **Documentação de design:** `DESIGN.md` registra o indicador de leitores e a linha "Lendo agora".

## Critérios de Aceite

- `npm run test -w frontend` verde, com testes novos: retrato → contagem e nomes por documento;
  mestre nunca aparece; espectador identificado; membro desconhecido recarrega membros uma vez;
  retrato vazio some com o chip; jogador/espectador não renderizam o indicador; reconexão reinforma.
- `npm run lint -w frontend` sem erros.
- **Verificação pela skill `verify`** em `1920×1080`, `960×1080` e `360×800`, com três sessões reais
  (mestre, jogador, espectador pelo convite próprio):
  - jogador abre um documento revelado → chip "1 lendo" aparece no cartão do mestre na hora; tooltip
    com o nome; abrir esse documento no mestre mostra "Lendo agora";
  - espectador abre o mesmo → "2 lendo", espectador identificado;
  - jogador fecha (inclusive pelo segundo clique da `m9-07`) ou troca de documento → o chip acompanha;
  - fechar a aba do jogador → sai; mestre oculta o documento aberto pelo jogador → o chip some;
  - jogador e espectador não veem indicador nenhum;
  - reconexão do backend: o retrato se refaz;
  - cartão com título longo + chip de estado + chip de leitores no `360×800`: sem overflow horizontal,
    título truncado como na `m9-06`, alvos ≥ 44 px, foco visível.
- Comparação visual com o chip Revelado/Oculto e o cabeçalho do painel: mesma densidade e hierarquia,
  "parece parte do mesmo produto".

## Fora de Escopo

- Backend e contrato — `m9-09`.
- Indicador para jogadores/espectadores; avatar/foto dos leitores; posição de rolagem ("em que parte
  está lendo"); histórico de quem já leu.
- Presença fora da Biblioteca (cena de Investigação da `m7-25` pode reaproveitar depois).

## Dependências

`m9-09` (evento e envio de leitura), `m9-04`/`m9-05`/`m9-06` (página do mestre, layout, cartão,
truncamento), `m9-07` (fechar pelo segundo clique — só para a verificação), `docs/design/DESIGN.md`.

## Decisões assumidas ao especificar (confirmar com o autor)

1. **Contagem no cartão + nomes no tooltip e no documento aberto**, em vez de listar nomes na lista —
   mantém a densidade da lista com vários leitores.
2. **Só na visão do mestre** (herda a decisão #1 da `m9-09`).
