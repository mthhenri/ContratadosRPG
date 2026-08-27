---
name: verify
description: Como levantar o stack real (Postgres + NestJS + Angular) e dirigir a aplicação de verdade para verificar uma mudança — inclusive o tempo real (WebSocket) com dois usuários.
---

# Verificação ao vivo — ContratadosRPG

Roda o app de verdade e observa. Testes e lint são complementares, mas não substituem a
verificação manual quando ela for necessária.

## Levantar o stack

```bash
npm run db:up                             # Postgres 16 (container contratados-rpg-postgres)
npm run db:migrate --workspace=backend
npm run backend:dev                       # 3100
npm run frontend:dev                      # 4300 (proxy → 3100, inclui /socket.io com ws:true)
```

**Portas já ocupadas?** O autor costuma deixar backend e frontend rodando. Um `ng serve`
iniciado *antes* de um `npm install` não enxerga dependência nova — se a mudança adicionou
pacote, suba um frontend próprio numa porta isolada em vez de confiar no que está no ar.

### Armadilha: DTO novo em `shared/` não aparece no backend rodando

O backend importa `@contratados-rpg/shared/*` pelo pacote publicado (resolve para `shared/dist`,
não para `shared/src`). `nest start --watch` recompila e reinicia sozinho a cada save em
`backend/src`, mas **não** detecta mudanças em `shared/src` — um DTO/enum novo só aparece no
backend depois de `npm run build --workspace=shared`. Sintoma: `tsc`/testes de `shared` e
`backend` passam isoladamente, mas a rota nova responde 404 ("Cannot PATCH/POST/...") ou o
compilador do `nest start --watch` acusa `TS2724: has no exported member` mesmo com o código
correto. Rode o build do `shared` **antes** de testar contra o backend já em execução; se o
processo já tentou subir com o import quebrado e morreu por `EADDRINUSE` numa tentativa seguinte,
mate o processo órfão (`netstat -ano | grep :3100`) antes de reiniciar.

### Armadilha: `Origin` e o 500 fantasma

`APP_FRONTEND_ORIGEM` no `.env` é `http://localhost:4300`. O Chrome manda `Origin` em
requisições same-origin com método **não-simples** (PUT/POST/DELETE) — `GET` não manda.
Servir o frontend em **outra porta** faz todo PUT do browser voltar
**500 "Erro interno do servidor"** (o CORS rejeita a origem e o filtro global mapeia pra 500),
enquanto as telas carregam normalmente. Isso *parece* bug de produto e não é.

Ao usar porta alternativa, suba um backend próprio com a origem casada:

```bash
APP_PORTA=3101 APP_FRONTEND_ORIGEM=http://localhost:4301 npm run backend:dev
npm run start --workspace=frontend -- --port 4301 --proxy-config <proxy apontando p/ 3101>
```

## Viewports padrão

Toda verificação visual usa um destes dois tamanhos fixos — nunca a janela padrão do
navegador nem um tamanho arbitrário:

- **Mobile:** `360×800` (Galaxy S20 FE) — telefone de referência do projeto.
- **Desktop:** `1920×1080` (FullHD).

```js
await browser.newContext({ viewport: { width: 360, height: 800 } });  // mobile
await browser.newContext({ viewport: { width: 1920, height: 1080 } }); // desktop
```

O breakpoint mobile do CSS (`$bp-mobile`) é `560px` — 360px está bem dentro dele, então
qualquer verificação em 360×800 já exercita o layout mobile real, não uma zona intermediária.

## Dirigir a UI

Playwright está **global** (`npm root -g`), não em `node_modules`. Chromium já em cache.

```js
const { chromium } = require(require.resolve('playwright', { paths: [require('child_process').execSync('npm root -g').toString().trim()] }));
```

Sessão real sem passar pela tela de login — o `SessaoService` lê uma chave só:

```js
await contexto.addInitScript(([k, v]) => localStorage.setItem(k, v),
  ['contratados-rpg.sessao', JSON.stringify(usuarioAutenticadoDto)]); // { token, id, login, nome }
```

Monte o cenário por REST (`/autenticacao/registro`, `/login`, `POST /campanha`,
`POST /campanha/entrar` com `codigoConvite`, `POST /ficha`). Abra a ficha criada em
`http://localhost:4300/fichas/:id` — **não** `/ficha/:id`; a rota de visualização vive sob o
acervo (`/fichas`), só a criação/edição fica sob `/painel/:campanhaId/ficha`. Seletores úteis:
`.ficha-ident__nome` (codinome), `[aria-label="Aumentar vida"]` / `"Reduzir vida"` (ajuste
rápido). `[aria-label="Vida atual"]` **só existe** no modo de digitação.

**Provar "sem recarregar":** plante `window.__sentinela` antes e confira depois — se a página
recarregou, a variável some.

## Tempo real (WebSocket)

- O cliente conecta em `environment.apiBase || undefined` (mesma origem em dev, via proxy).
- Handshake leva o JWT em `auth.token`. Token ausente/inválido → o gateway aceita o transporte
  e **só então** chama `disconnect(true)`: o cliente vê `connect` seguido de `disconnect`
  (`io server disconnect`), **não** `connect_error`. Não há laço de reconexão (`socket.active`
  fica `false`) — servidor que desconecta manda o cliente não retentar.
- Entrada em sala é gateada pela §14 na service dona: `ficha:entrar` responde
  `{sucesso:false}` e não faz `join` para quem não pode ver a ficha.
- O join sai por **polling** antes do upgrade pra websocket — escutar só `framesent` do
  WebSocket **não** captura o `ficha:entrar`. Capture também os POST de
  `/socket.io/?...transport=polling`.

Cliente cru pra testar o gateway direto (mesmo protocolo do Angular):

```js
const { io } = require(require.resolve('socket.io-client', { paths: [REPO] }));
io('http://localhost:3100', { auth: { token } });
```

**Testar a reconexão (§9):** `context.setOffline(true)` **não serve** — o socket só percebe
pelo timeout de ping. O `WsIoAdapter` (`backend/src/core/gateway/ws-io.adapter.ts`) não
sobrescreve `pingInterval`/`pingTimeout`, então valem os padrões do Socket.IO
(`pingInterval 25s` + `pingTimeout 20s`, até ~45s). Derrube o backend de
verdade (fecha o TCP → `disconnect` na hora), altere a ficha **direto no Postgres**
(`docker exec contratados-rpg-postgres psql -U postgres -d contratados_rpg -c "UPDATE ficha …"`)
— assim nenhum `ficha:alterada` existe para a mudança — e suba o backend. Se a tela atualizar,
foi o refetch da reconexão, não o broadcast.
