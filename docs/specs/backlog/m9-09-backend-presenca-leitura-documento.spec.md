# m9-09-backend-presenca-leitura-documento.spec.md

> **Task avulsa pós-M9 (pedido direto do autor, 2026-09-28).** Terceira de quatro specs de melhoria
> da Biblioteca: `m9-07` (desselecionar), `m9-08` (importar Markdown), `m9-09` (presença — contrato e
> backend) e `m9-10` (presença — frontend). Esta task é **só contrato + backend + o envio do
> cliente**; a exibição para o mestre é a `m9-10`.

> **Antes de começar:** skill `tempo-real` (quem emite, quem escuta, salas e permissões) e
> `dto-conventions` (nomes dos DTOs novos). `SYSTEM.SPEC.md` §9 e proibições #25/#28.

## Objetivo

O mestre fica sabendo, ao vivo, **quem está com cada documento aberto** na Biblioteca — jogadores e
espectadores. O backend mantém, em memória, quem está lendo o quê e avisa só a sala do mestre quando
isso muda. Presença é efêmera: nada vai ao banco.

## Estado atual

- Não existe presença genérica. O único precedente é o Caderno do Esquadrão
  (`caderno-esquadrao:presenca`, `campanha.gateway.ts:215`): o **cliente** dispara e o gateway só
  retransmite à sala (P-039), documentado como "não é a mutação que a proibição #25 veda".
- Esse modelo de retransmissão **não serve aqui**: (1) quem chega depois não recebe o estado atual —
  só as mudanças seguintes; (2) retransmitir na sala `campanha:<id>` mostraria a leitura de um jogador
  aos outros jogadores e, pior, a do mestre num documento **oculto** vazaria a existência dele.
- Salas: `campanha:<id>` (mestre + jogador), `campanha:<id>:mestre` (só o mestre, m8) e
  `campanha:<id>:espectador`. `campanha:entrar` valida por `CampanhaService.validarAcessoSalaCampanha`;
  a mudança de papel/revogação já move os sockets entre salas (`campanha.gateway.ts:~405-428`).
- Quem pode ler um documento é decidido pela `DocumentoService` (`recuperarLegivel`/
  `recuperarParaMestre`, `documento.service.ts:406-422`): mestre lê tudo, jogador/espectador só o
  revelado.
- `JwtPayload` do socket tem `sub` (usuário), `login`, `tipo` e `tokenVersao` — **sem nome**.
- Um único processo Node, sem adapter Redis: as salas do Socket.IO já vivem em memória do processo.

## Entregáveis

1. **Contrato em `shared/src/dtos/documento/`** (nomes finais conforme `dto-conventions`; sugestões):
   - entrada do cliente — `DocumentoLeituraInformarDto { campanhaId: number; documentoId: number | null }`
     (`null` = não estou lendo nenhum);
   - saída para o mestre — `DocumentoLeitoresDto { campanhaId: number; leitores:
     DocumentoLeitorDto[] }` com `DocumentoLeitorDto { documentoId: number; usuarioId: number; papel:
     TipoCampanhaMembroPapelEnum }`. Sempre o **retrato completo** da campanha (não um delta): o
     cliente substitui o que tem, sem reconciliação.
2. **Estado em memória numa service do módulo `documento`** (ex.: `DocumentoLeituraService`), nunca no
   gateway: mapa `socketId → { campanhaId, usuarioId, papel, documentoId }`. O retrato agrupa por
   **usuário** (duas abas do mesmo usuário no mesmo documento contam uma vez) e **omite o mestre** —
   ele não precisa se ver.
3. **Informar leitura** (`@SubscribeMessage('documento:leitura')` no `CampanhaGateway`, que só extrai
   o usuário e delega): a service
   - exige que o socket esteja na sala da campanha (ou revalida por `validarAcessoSalaCampanha`, como
     a presença do Caderno — proibição #28, sem regra nova);
   - com `documentoId` não nulo, confirma pela `DocumentoService` que **esse usuário pode ler esse
     documento** (a mesma verificação do `GET documento/:id`); se não pode, trata como `null` — um
     jogador não consegue "estar lendo" um oculto nem forçar um id que não vê;
   - grava e, **se o retrato mudou**, emite `documento:leitores` **só na sala `campanha:<id>:mestre`**.
4. **Retrato inicial para o mestre:** ao informar leitura (inclusive `null`), um socket do mestre
   recebe o retrato atual direto no ack/emit para o próprio socket — o mestre que abre a Biblioteca
   depois dos jogadores já vê quem está lendo.
5. **Limpeza obrigatória** (e emissão do retrato novo quando algo sai):
   - desconexão do socket (`handleDisconnect`);
   - `campanha:sair`;
   - mudança de papel/revogação de acesso que já remove o socket das salas;
   - `documento:alterado` com `OCULTADO` ou `REMOVIDO`: a service tira desse documento todo leitor
     que não é mestre (sem esperar o cliente) — chamada pela `DocumentoService` depois da mutação, no
     mesmo ponto em que ela já emite o evento.
6. **Cliente — só o envio** (`TempoRealService` + `BibliotecaLeituraStore`): `informarLeitura(
   campanhaId, documentoId | null)`; a store informa ao abrir um documento, ao fechá-lo (inclusive
   pelo `m9-07`), ao sair da página (`onDestroy` → `null`) e **de novo na reconexão** (`reconexao$`),
   porque o backend perde o estado do socket antigo. A página do mestre também informa (item 4), para
   receber o retrato. A exibição é da `m9-10`.
7. **Documentação:** `SYSTEM.SPEC.md` §9 lista `documento:leitura` (cliente → servidor, presença
   efêmera sem persistência, como a do Caderno) e `documento:leitores` (só `campanha:<id>:mestre`) —
   **alteração da constituição: apresentar ao autor antes de gravar**. `MEMORY.md` aponta a service.

## Critérios de Aceite

- `npm run test -w shared`, `-w backend` e `-w frontend` verdes, com testes novos:
  - service: abrir/trocar/fechar; duas abas do mesmo usuário contam uma vez; mestre fora do retrato;
    retrato só emitido quando muda; desconexão e `campanha:sair` limpam; jogador informando um oculto
    ou um id de outra campanha vira `null`; `OCULTADO`/`REMOVIDO` tira os leitores não-mestre;
  - gateway: `documento:leitores` sai **só** para `campanha:<id>:mestre` (nunca `campanha:<id>` nem a
    do espectador); handler sem regra própria (delegação);
  - store: informa ao abrir, fechar, destruir e reconectar.
- `npm run lint` dos três workspaces sem erros.
- **Verificação pela skill `verify`** com três sessões reais (mestre, jogador, espectador), observando
  os frames do WebSocket: jogador abre um revelado → o mestre recebe o retrato com ele; o espectador
  abre outro → retrato com os dois; o jogador **não** recebe nenhum `documento:leitores`; fechar a aba
  do jogador → sai do retrato; mestre oculta o documento aberto do jogador → sai do retrato; derrubar e
  subir o backend → depois da reconexão o retrato volta a ter os leitores reais.

## Fora de Escopo

- Qualquer UI de presença — `m9-10`.
- Jogadores verem uns aos outros (ou verem o mestre) lendo.
- Presença em outras telas (ficha, cena, caderno) ou "online na campanha" em geral.
- Histórico ("quem já leu"/"marcar como lido") — isso seria persistência, outra spec.
- Várias instâncias do backend: o estado em memória vale por processo, como as salas hoje. Se o
  deploy passar a ter mais de uma instância, presença e salas precisam de adapter compartilhado juntas
  (registrar em `IDEAS.md` se ainda não houver).

## Dependências

`m9-02` (`DocumentoService`, `documento:alterado`, salas), `m8-02` (sala do espectador e do mestre),
`p-083`/`p-084` (`reconexao$`), skills `tempo-real` e `dto-conventions`.

## Riscos e Mitigação

- **Vazamento pelo canal de presença:** emitir o retrato na sala comum revelaria o que o mestre lê.
  Emitir só na sala do mestre e testar isso explicitamente.
- **Presença fantasma:** socket derrubado sem `campanha:sair` (Cloud Run, rede) ficaria "lendo" para
  sempre se a limpeza dependesse do cliente — por isso o `handleDisconnect`.
- **Gateway com regra:** tentação de guardar o mapa no gateway. O estado e a decisão ficam na service;
  o gateway só roteia (proibição #25/#28).

## Decisões assumidas ao especificar (confirmar com o autor)

1. **Só o mestre vê quem está lendo.** Jogadores não veem uns aos outros. Se o autor quiser que a mesa
   também veja, o retrato precisa de um recorte por papel (nunca incluir leitura do mestre em oculto).
2. **Espectadores entram no retrato**, marcados pelo `papel` — a `m9-10` os distingue na tela.
3. **Presença ≠ mutação:** entra por WebSocket como a do Caderno, sem REST, porque nada é gravado.
