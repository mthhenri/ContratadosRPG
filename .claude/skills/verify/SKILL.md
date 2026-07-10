---
name: verify
description: Como levantar o stack real (Postgres + NestJS + Angular) e dirigir a aplicação de verdade para verificar uma mudança — inclusive o tempo real (WebSocket) com dois usuários.
---

# Verificação ao vivo — ContratadosRPG

Roda o app de verdade e observa. Não vale rodar teste/lint como verificação.

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
`POST /campanha/entrar` com `codigoConvite`, `POST /ficha`). Seletores úteis da ficha:
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
pelo timeout de ping (`pingInterval 25s` + `pingTimeout 20s`, até ~45s). Derrube o backend de
verdade (fecha o TCP → `disconnect` na hora), altere a ficha **direto no Postgres**
(`docker exec contratados-rpg-postgres psql -U postgres -d contratados_rpg -c "UPDATE ficha …"`)
— assim nenhum `ficha:alterada` existe para a mudança — e suba o backend. Se a tela atualizar,
foi o refetch da reconexão, não o broadcast.
