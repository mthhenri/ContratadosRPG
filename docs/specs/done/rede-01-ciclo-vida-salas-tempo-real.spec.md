# rede-01-ciclo-vida-salas-tempo-real.spec.md

> Task avulsa de infraestrutura, originada pela revisão de requisições de 2026-09-20. Primeiro
> corte da frente `rede-*`: corrige o ciclo de vida das salas Socket.IO antes de otimizar os
> consumidores, para que eventos de contextos abandonados não continuem chegando ao navegador.

## Objetivo

Fazer a associação do socket às salas `ficha:<id>` e `campanha:<id>` durar exatamente enquanto
houver consumidor autorizado no frontend. Sair de uma tela, encerrar a sessão, perder acesso ou
trocar de papel precisa interromper no servidor o tráfego que deixou de ser pertinente, sem
derrubar uma sala que ainda esteja sendo usada por outro componente da mesma SPA.

## Entregáveis

1. **Referência por consumidor no frontend.** `TempoRealService` substitui os `Set<number>` de
   salas por contadores por id. A primeira entrada efetiva (`0 → 1`) registra a sala e emite o
   join quando o socket já está conectado; entradas adicionais apenas incrementam a referência.
   Uma saída intermediária apenas decrementa; somente a última (`1 → 0`) remove o registro e
   solicita a saída ao servidor. Contagem nunca fica negativa e saída de sala não registrada é
   no-op.
2. **Saída real no gateway.** Criar mensagens broadcast-only de infraestrutura para abandonar
   ficha e campanha. Os payloads usam DTOs próprios em `shared/src/dtos/` —
   `FichaSalaSairDto { id }` e `CampanhaSalaSairDto { id }` —, sem parâmetro primitivo nem alias de
   DTO de recuperação. `CampanhaGateway` executa `leave` sem mutação de domínio: ficha sai de
   `ficha:<id>`; campanha sai de todas as salas possíveis daquele id (`campanha:<id>`,
   `campanha:<id>:mestre` e `campanha:<id>:espectador`).
3. **Reconexão coerente.** Após queda e reconexão, somente ids com referência positiva são
   reingressados, uma vez por sala. Uma saída ocorrida enquanto offline não entra na fila do
   Socket.IO nem reaparece na próxima conexão.
4. **Sessão encerrada encerra socket.** Qualquer transição de sessão autenticada para `null`
   desconecta o `TempoRealService`, limpa salas/contadores e impede que logout manual ou 401
   mantenham o socket autenticado antigo. A reação deve ser central à mudança da sessão, não
   duplicada apenas nos dois chamadores hoje conhecidos (`Layout` e interceptor).
5. **Revogação de ficha expulsa no servidor.** Depois de `FichaService.revogarAcesso` persistir e
   emitir `ficha:acesso-revogado`, todos os sockets do `usuarioId` revogado abandonam
   `ficha:<id>`. O aviso chega antes da expulsão para a tela aberta poder redirecionar; alterações
   posteriores da ficha não trafegam mais para esses sockets. Dono e mestre não são removidos por
   esse caminho, conforme a permissão existente.
6. **Vínculo e papel de campanha recalibram salas.** Após persistência bem-sucedida:
   - remover membro expulsa os sockets do alvo das três salas daquela campanha;
   - `JOGADOR → ESPECTADOR` tira o alvo da sala cheia e da sala de mestre, colocando-o somente na
     sala de espectador;
   - `ESPECTADOR → JOGADOR` faz o inverso;
   - transferência de mestre rebaixa o mestre anterior da sala `:mestre` e ingressa o novo mestre
     nela, mantendo ambos na sala cheia.
   O gateway identifica os sockets pelo `JwtPayload` já armazenado em `socket.data`; não
   reimplementa a permissão, apenas aplica o resultado entregue pela `CampanhaService` depois do
   save.
7. **Instrumentação de teste.** Os fakes de Socket.IO usados por frontend e backend passam a
   observar `join`, `leave`, desconexão e múltiplos consumidores, sem temporizadores reais nem
   dependência de ordem acidental entre specs.

## Critérios de Aceite

- Teste de frontend: duas áreas pedem a mesma campanha; há uma única emissão de entrada. Destruir
  a primeira não emite saída e os eventos continuam; destruir a segunda emite exatamente uma
  saída e remove a campanha do conjunto reingressado.
- Teste de frontend equivalente cobre `ficha:<id>`, saída desconhecida e reconexão com somente as
  referências ainda positivas.
- Logout manual e 401, exercitados por testes dos dois caminhos públicos, deixam `socket === null`,
  `ativo === false`, `conectado === false` e nenhum contador de sala persistido.
- Teste de gateway confirma que `campanha:sair` abandona as três variantes de sala e
  `ficha:sair` abandona somente a ficha pedida, sem consultar repository/service nem aceitar
  escrita de domínio.
- Regressão backend: depois de revogar acesso, uma alteração subsequente emite
  `ficha:alterada` para outros integrantes da sala, mas não para nenhum socket do usuário
  revogado.
- Regressões backend cobrem remoção, mudança nos dois sentidos entre `JOGADOR`/`ESPECTADOR` e
  transferência de mestre; após cada operação, a lista de salas de cada socket corresponde ao
  papel persistido.
- Verificação real com dois usuários e a skill `verify`: navegar campanha A → campanha B remove o
  primeiro socket das salas de A; revogar acesso a uma ficha aberta redireciona o revogado e uma
  alteração posterior não chega a ele; logout encerra a conexão sem esperar outra página chamar
  `conectar()`.
- `npm run test --workspace=shared`, testes focados de gateway/frontend, suites completas de
  backend/frontend, `npm run lint` e builds afetados ficam verdes.

## Fora de Escopo

- Mover qualquer mutação de REST para WebSocket; entrada/saída de sala continua sendo a única
  mensagem iniciada pelo cliente além da presença efêmera já sancionada.
- Otimizar quais GETs cada evento dispara — responsabilidade de `rede-03`.
- Adicionar replay, persistência de eventos ou broker externo.
- Reconectar automaticamente uma tela que perdeu permissão; revogação e remoção encerram acesso.
- Alterar a matriz de permissões de dono, mestre, jogador e espectador.

## Dependências

- `docs/SYSTEM.SPEC.md` §9 e §14.
- Skill `tempo-real` e skill `verify` do projeto.
- Nenhuma spec precisa estar em `done/`; esta task deve preceder `rede-03`.

## Riscos e Mitigação

- **Um componente sai da sala ainda usada por outro.** Mitigado por referência por id e testes
  explícitos de dois consumidores.
- **Socket muda de papel entre o evento e a troca de sala.** A service persiste primeiro e entrega
  o resultado ao gateway; a recalibração é idempotente e deixa o socket apenas nas salas do papel
  final.
- **Usuário revogado recebe um último evento de domínio.** O evento de revogação é emitido antes do
  `leave`, mas a expulsão ocorre na mesma operação pós-save antes de ela concluir; o teste verifica
  que nenhuma alteração posterior atravessa a sala.
