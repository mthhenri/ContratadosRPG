# previa-jogador-visao-real.spec.md

> Task solta, pedida pelo autor em 2026-09-24: ajustar "ver como jogador" e "ver como espectador"
> depois que a visão de jogador mudou de forma (coluna de ações, painel lateral segmentado). Spec
> registrada junto com a implementação, na mesma sessão.

## Objetivo

As duas prévias do mestre usam a tela real de quem está sendo emulado — a mesma
`CampanhaDetalheJogador` para "ver como jogador" e o mesmo `CampanhaEspectador` para "ver como
espectador" — barrando toda edição e mostrando exatamente o recorte daquela pessoa, nunca o do
mestre.

## Entregáveis

1. `/campanhas/:id/previa/:usuarioAlvoId` monta `CampanhaDetalheJogador` (não uma cópia do layout
   antigo). A página `CampanhaPreviaJogador` vira casca, no molde de `CampanhaDetalheShell`, e
   provê `CampanhaPreviaJogadorDadosService` no lugar de `CampanhaDetalheDadosService`.
2. `CampanhaPreviaJogadorDadosService` alimenta a tela só pela projeção do alvo
   (`recuperarPreviaJogador`, `recuperarFichaPreviaJogador`, `recuperarEncontroAtivoPreviaJogador`)
   e nunca chama `recuperarCampanha`, `listarMembros`, `listarFichas`, `recuperarFicha` nem
   `listarPorCampanha`. Tempo real vira refetch da projeção; rolagem só entra no feed se o alvo a
   receberia (`PUBLICA` ou `PRIVADA` feita por ele).
3. `CampanhaDetalheDadosService` ganha `previa()` (contexto do alvo, `null` na visão real),
   `usuarioAtivoId` passa a ser o do alvo na prévia, e `recuperarFicha()` vira o ponto único de
   busca da ficha exibida.
4. Na prévia, `CampanhaDetalheJogador` fica somente leitura: ficha sem ajuste/rolagem/mandar para
   a base, painel de Rolagens sem rolar, inventário de esquadrão somente leitura, Criar/Vincular/
   Acesso/Remover/Excluir/Caderno desabilitados (coluna de ações e menu "⋯"), sem "Abrir
   completa", sem "voltar às campanhas", sem "Ver ficha →" no banner e sem abrir o histórico em
   janela. Barra "Visualizando como <alvo> · prévia somente leitura" com "Sair da prévia", mesma
   receita da barra do Painel do espectador. "Iniciativa" abre `IniciativaLeitura` em modal sobre
   o encontro redigido para o alvo (desabilitado sem encontro). A aba "Inv. Esquadrão" some se o
   alvo não acessa o inventário.
5. "Ver como espectador" continua sendo o `CampanhaEspectador` real; o mestre em prévia deixa de
   ver rolagens `PRIVADA` que chegam pela sala `campanha:<id>:mestre` ou pelo REST do mestre —
   no painel, na Iniciativa do espectador e na janela externa aberta com `?origem=espectador`.

## Critérios de Aceite

- Suíte do frontend verde, com `previa-jogador.page.spec.ts` reescrito para a nova composição e
  casos novos nos specs de `espectador`, `painel-espectador` e `historico-rolagens-janela`.
- `npm run lint` sem erros; build do frontend sem erro novo.
- Ao vivo (stack real): prévia e visão real do jogador lado a lado em `1920×1080`, `360×800`,
  `960×1080` e `1366×768`, sem overflow; nenhuma requisição de escrita sai da prévia; rolagem
  privada de terceiro não aparece (REST e socket) e a do próprio alvo aparece; painel do
  espectador em prévia sem nenhuma `PRIVADA`.

## Fora de Escopo

- Estado visual de desabilitado de `app-coluna-acoes-item` (primitivo em `shared/ui/`; decisão do
  autor) — registrado como `P-079`.
- Levar a prévia de jogador para a tela de Iniciativa do jogador (`PainelEncontroJogador`); a
  prévia continua usando a leitura em modal (m8-05).
- Qualquer mudança de backend ou de contrato em `shared/`.

## Dependências

`m8-04` e `m8-05` (projeções da prévia) em `done/`; `docs/design/DESIGN.md`.
