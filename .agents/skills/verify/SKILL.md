---
name: verify
description: Levanta o stack real e verifica a aplicação ContratadosRPG em execução, incluindo UI, REST e WebSocket.
---

# Verificação ao vivo

Esta skill é para observar a aplicação real; testes e lint são complementares,
mas não substituem a verificação manual quando ela for necessária.

## Stack

```bash
npm run db:up
npm run db:migrate --workspace=backend
npm run backend:dev       # 3100
npm run frontend:dev      # 4300, proxy para 3100
```

O frontend e o backend podem já estar rodando. Se a alteração adicionou uma
dependência, reinicie o processo que a utiliza ou suba-o em uma porta isolada.
Ao usar outra porta, mantenha `APP_FRONTEND_ORIGEM` do backend igual à origem do
frontend; caso contrário, PUT/POST/DELETE podem aparecer como erro 500 por CORS.

O backend importa `@contratados-rpg/shared/*` do pacote publicado (`shared/dist`), não de
`shared/src`. `nest start --watch` recompila sozinho a cada save em `backend/src`, mas não
detecta mudanças em `shared/src` — um DTO/enum novo só chega ao backend depois de
`npm run build --workspace=shared`. Sintoma: a rota nova responde 404 mesmo com o código
correto, ou o watcher acusa `TS2724: has no exported member`.

Exemplo de stack isolado:

```bash
APP_PORTA=3101 APP_FRONTEND_ORIGEM=http://localhost:4301 npm run backend:dev
npm run start --workspace=frontend -- --port 4301 --proxy-config <proxy-para-3101>
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
qualquer verificação em 360×800 já exercita o layout mobile real, não uma zona
intermediária.

## UI e sessão

Playwright está disponível globalmente. O `SessaoService` aceita uma sessão
real no localStorage, evitando login pela tela:

```js
await contexto.addInitScript(([chave, valor]) => localStorage.setItem(chave, valor),
  ['contratados-rpg.sessao', JSON.stringify(usuarioAutenticadoDto)]);
```

Monte cenários por REST (`/autenticacao/registro`, `/login`, campanha e ficha).
Para provar que uma ação não recarregou a página, defina `window.__sentinela`
antes e confira o valor depois.

## WebSocket

- O JWT vai em `auth.token`.
- Token ausente ou inválido pode produzir `connect` seguido de `disconnect`, e
  não necessariamente `connect_error`.
- A entrada em sala é autorizada pela service dona da ficha; falha responde
  `{sucesso:false}` sem executar `join`.
- O primeiro join usa polling antes do upgrade; capture também POSTs de
  `/socket.io/?...transport=polling`, não só frames WebSocket.

Para testar o gateway diretamente:

```js
const { io } = require('socket.io-client');
io('http://localhost:3100', { auth: { token } });
```

Para testar reconexão, não dependa apenas de `context.setOffline(true)`: o socket
pode levar até o intervalo de ping para perceber a perda. Derrube o backend,
altere a ficha diretamente no Postgres sem emitir evento e suba o backend; uma
atualização na tela deve vir do refetch de reconexão.
