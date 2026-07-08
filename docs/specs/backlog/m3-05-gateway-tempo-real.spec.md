# m3-05-gateway-tempo-real.spec.md

> Task 5/9 do milestone `m3-ficha-jogador.spec.md`.

## Objetivo

Gateway Socket.IO **broadcast-only** (SYSTEM.SPEC §9) — o tempo real das fichas. Handshake
autenticado por JWT, salas `ficha:<id>` e `campanha:<id>`, eventos `ficha:alterada`,
`ficha:criada` e `membro:entrou` **emitidos pela service após a mutação**. Nenhuma escrita
entra pelo gateway (proibição #25).

## Entregáveis

1. **Infra de gateway WebSocket** em `backend/core/gateway/` — **handshake autenticado**: o
   JWT é validado na conexão com o **mesmo mecanismo** do Passport da m2-02 (nada de segundo
   validador). Origem do Socket.IO travada em `APP_FRONTEND_ORIGEM` (§10.6).
2. **Salas e permissão de entrada:**
   - `ficha:<id>` — entrar exige a **mesma permissão de visualização do REST** (§14),
     consultando a service de ficha (`m3-03`/`m3-04`);
   - `campanha:<id>` — só membros, consultando a service de campanha (M2).
   O gateway **não duplica regra de permissão** (proibição #28) — consulta o service dono.
3. **Eventos de negócio** (payload tipado no `shared` se necessário): `ficha:alterada` (sala
   `ficha:<id>`), `ficha:criada` e `membro:entrou` (sala `campanha:<id>`).
4. **Emissão pela service após mutação bem-sucedida**: `fichaService.criar`/`alterar` emitem
   (`ficha:criada` / `ficha:alterada`); `campanhaService.entrarCampanha` (m2-05) emite
   `membro:entrou`. Cabear a emissão nas services existentes, sem mover regra para o gateway.
5. **Testes**: a entrada em sala respeita a matriz §14 (critério do milestone — "entrada em
   sala WS"); o gateway nunca aceita mutação.

## Critérios de Aceite

- Entrada em `ficha:<id>` / `campanha:<id>` barrada sem a permissão correspondente (§14),
  coberta por testes.
- As services emitem `ficha:criada`/`ficha:alterada`/`membro:entrou` após a mutação
  respectiva.
- Gateway é broadcast-only — nenhuma escrita entra por ele (proibição #25).

## Fora de Escopo

- Cliente Socket.IO e a tela do mestre ao vivo — `m3-08`.
- Frontend.

## Dependências

- `m3-03` / `m3-04` (services de ficha + a verificação de permissão que o gateway reusa).
- `m2-05` (`entrarCampanha`, para o `membro:entrou`) e `m2-02` (JWT/Passport do handshake).
