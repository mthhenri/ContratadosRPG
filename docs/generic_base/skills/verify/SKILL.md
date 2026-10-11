---
name: verify
description: >
  Como levantar a aplicação real e dirigi-la de verdade para verificar uma mudança — subir o
  stack, abrir no navegador (Playwright), montar o cenário, capturar evidência. Use quando a
  tarefa pedir "verificar ao vivo", "rodar o app", "testar na tela", "capturar", ou antes de
  declarar pronta qualquer mudança observável (UI, endpoint, fluxo, relatório gerado) — testes
  e lint não substituem isso.
---

# Verificação ao vivo — <nome-do-projeto>

> Esqueleto de adoção. A regra ("pronto exige ver rodando") vive em `CLAUDE.md`/`AGENTS.md`
> ("Gate obrigatório de qualidade e conclusão"). Esta skill carrega o que a documentação não
> carrega: **como subir, como dirigir e as armadilhas que já custaram tempo**. Preencha os
> trechos `<...>` com o projeto real e apague o que não se aplicar; **acrescente armadilha nova
> aqui na hora em que ela morder**, com sintoma e causa.

## Onde vai a evidência

Antes de capturar, localize a spec dona. Capturas, logs, dumps e cenários temporários em
`.artifacts/<tarefa>/` (ignorada pelo Git); relatório textual em
`docs/specs/<estado>/<tarefa>/`. O relatório precisa explicar resultado e limites **sem
depender de imagem local** para o veredito (`ARCHITECTURE.md` §3.1).

## Levantar o stack

```bash
<comando que sobe banco/dependências>
<comando que aplica migrations>
<comando que sobe o backend>     # porta <N>
<comando que sobe o frontend>    # porta <N>
```

- **Portas já ocupadas?** Quem trabalha costuma deixar o stack rodando. Antes de subir outro,
  confira a porta; subir um segundo processo no mesmo checkout pode derrubar o primeiro.
- Dependência/pacote novo exige reiniciar o servidor de desenvolvimento que já estava no ar.
- Pacote compartilhado (`shared/`): se o backend consome o build (`dist`) e não o fonte, mudança
  no contrato só aparece depois de rebuildar o pacote — sintoma típico: teste passa isolado e a
  rota nova responde 404.

## Viewports padrão (só se houver UI)

Nunca a janela padrão do navegador. Defina aqui os tamanhos fixos do projeto — sugestão mínima:

| Perfil | Tamanho |
|---|---|
| Mobile | `360×800` |
| Desktop | `1920×1080` |

```js
await browser.newContext({ viewport: { width: 360, height: 800 } });
```

## Dirigir a UI

- Playwright instalado globalmente (`npm root -g`) ou como devDependency — registre qual.
- Sessão autenticada sem passar pela tela de login: <chave de storage / token a plantar>.
- Monte o cenário por API (registrar, logar, criar os dados), não clicando em tudo.
- **Provar "sem recarregar":** plante `window.__sentinela` antes e confira depois.
- **Estados persistidos:** o navegador do teste nasce com storage limpo — plante a chave e capture
  também o estado não-padrão (colapsado, filtro salvo...) antes de fechar o gate.
- Percorra os estados reais (vazio, carregando, cheio, erro, desabilitado, texto longo); uma
  captura só do estado inicial não valida uma tela interativa.

## Tempo real (apague se não houver)

- Como o cliente conecta, como autentica o handshake, quem pode entrar em cada sala.
- Testar com **dois usuários** em contextos separados; reconexão exige derrubar o servidor de
  verdade (desligar a rede do navegador só é percebido no timeout de ping).

## Armadilhas já pagas

<um parágrafo por armadilha: sintoma → causa → como evitar. Comece vazio e deixe crescer.>
