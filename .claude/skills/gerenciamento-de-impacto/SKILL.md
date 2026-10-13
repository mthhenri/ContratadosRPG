---
name: gerenciamento-de-impacto
description: >
  Medir o impacto antes de alterar algo usado em vários lugares — ícone, glifo, primitivo de
  shared/ui, botão, token, cor, SCSS de tema, classe BEM, regra pura de shared/regras, DTO,
  enum, service, evento — e antes de reaproveitar um item existente num uso novo. Use ao trocar,
  redesenhar, renomear, remover ou mudar comportamento/assinatura de qualquer coisa compartilhada,
  quando o hook avisar "Gerenciamento de impacto", ou quando algo mudou "sozinho" numa tela que
  ninguém tocou ("o ícone virou outro", "o botão mudou na tela X").
---

# Gerenciamento de Impacto — quem mais muda quando isto muda?

> As regras de arquitetura vivem em `CLAUDE.md`/`AGENTS.md`, `docs/CONVENTIONS.md` e
> `docs/design/DESIGN.md`; o mapa de onde as coisas vivem, em `docs/context/MEMORY.md`. Em
> conflito, o documento vence e esta skill é corrigida. O que esta skill carrega de próprio é a
> **ordem de execução**, a **regra de decisão do autor** e os **pontos cegos** da busca.

Origem: o botão "Trocar senha" do Perfil exibia a medalha de `patente` desde o m2-14 — um ícone
com sentido próprio, pego emprestado. Ninguém mediu o impacto nem na entrada nem depois.

## Regra do autor: tudo tem impacto

Todo consumidor de um item compartilhado é avaliado, um por um — não só o que motivou a tarefa.
Consumidor que muda **além do que o pedido nomeou** para a tarefa: leve ao autor o mapa e uma
recomendação antes de aplicar. Seguir sem perguntar só quando o pedido cobre explicitamente
todos os consumidores ("todos os botões primários", "o token `--accent` inteiro") — e mesmo
assim o mapa vai no fecho.

O impacto corre nos dois sentidos:

- **Para fora** — alterar o item muda todos os seus consumidores, inclusive os que só o pegaram
  emprestado.
- **Para dentro** — reaproveitar um item com sentido próprio prende o uso novo à evolução
  daquele sentido. Ícone com nome de conceito (`patente`, `caderno`, `duplicar`) não serve a
  outro conceito: crie um próprio (precedentes: `caderno` × `anotacoes`, `vincular` × `duplicar`,
  `senha` × `patente`). Variante/primitivo genérico (`editar`, `excluir`, `app-botao`) pode ser
  reaproveitado no mesmo sentido.

## Ordem de execução

1. **Nomear a mudança.** Qual item, e que tipo de mudança: aparência, comportamento,
   contrato/assinatura (campo, parâmetro, retorno, seletor, nome) ou sentido.
2. **Levantar consumidores** com o script — ponto de partida, não prova:
   ```bash
   npm run impacto -- <arquivo>          # importadores TS, seletor do componente, @use e var(--x)
   npm run impacto -- --icone <nome>     # <app-icone nome="..."> e literais do nome
   npm run impacto -- --simbolo <Nome>   # identificador, classe BEM, valor de enum, evento
   ```
   Depois cubra os pontos cegos do tipo do item (tabela abaixo).
3. **Classificar cada consumidor** em uma das quatro classes:
   - **pedido** — é o alvo da tarefa;
   - **acompanha** — muda junto e o efeito é o mesmo desejado;
   - **destoa** — muda, mas o sentido ali é outro (empréstimo, contexto diferente);
   - **quebra** — deixa de compilar, de casar o contrato ou de funcionar.
4. **Decidir.** Só **pedido** e **acompanha** explicitamente coberto → aplique. Qualquer
   **acompanha** não nomeado, **destoa** ou **quebra** → mapa ao autor com as opções:
   alterar o compartilhado para todos · criar item/variante nova só para o pedido · separar
   antes o consumidor emprestado (dar a ele item próprio) · não alterar. Ampliar primitivo de
   `shared/ui/` é sempre decisão do autor (`CLAUDE.md`, "Biblioteca de componentes").
5. **Aplicar e verificar consumidor por consumidor.** UI: `design-fidelity` + `verify` também nas
   telas consumidoras afetadas, não só na do pedido. Regra de jogo: `regras-do-jogo`. Dado que
   propaga: `tempo-real`. Contrato: build e testes dos três workspaces.
6. **Registrar.** O mapa de impacto vai no relatório da spec (ou no fecho da tarefa).
   Empréstimo/divergência achado fora do escopo → `PROBLEMS.md`, nunca diff desta tarefa.

## Onde procurar — e o que o script não vê

| Item | Comando | Ponto cego a conferir à mão |
|---|---|---|
| Ícone | `--icone <nome>` | nome vindo de dado (`icone: 'x'` em arrays de abas/menus, `icones-dominio.ts`), ternário em `[nome]`, alias em `glifo()` (`criatura` → `scp`), e o teste de assinatura em `icone.component.spec.ts` |
| Primitivo `shared/ui/` | `<arquivo .ts>` | input com default novo muda quem não passa o input; classes de receita no SCSS do consumidor |
| Token / tema | `<_tokens.scss>` nas **duas** cópias | `docs/design/tema/` × `frontend/src/styles/tema/` (`P-126`); `tailwind.config.ts`; `color-mix` que deriva de outro token |
| Classe BEM / SCSS | `--simbolo <classe>` | classe montada por interpolação/`[class.x]`; cópia local de `.botao` encapsulado |
| Regra pura `shared/regras` | `<arquivo .ts>` | consumidores derivados e stored × efetivo → skill `regras-do-jogo` |
| DTO / campo | `--simbolo <NomeDto>` e `--simbolo <campo>` | SQL dos repositories (alias de coluna), JSONB `dados` e `docs/SCHEMA.md`; `npm run build --workspace=shared` antes de testar o backend |
| Enum | `--simbolo <VALOR>` | tabela `tipo_*` e migrations → skill `sql-migrations`; `switch` exaustivo; rótulos na UI |
| Evento / sala | `--simbolo <evento>` | emissores e assinantes → skill `tempo-real` |
| Service / método | `--simbolo <metodo>` | injeção por outro módulo; ponte gateway → `EncontroService` |

## Formato do mapa de impacto

```markdown
### Impacto — <item> (<tipo de mudança>)
Busca: `npm run impacto -- …` → N consumidores; pontos cegos conferidos: …
| Consumidor | Classe | Decisão |
|---|---|---|
| `caminho/arquivo:linha` (tela/uso) | pedido · acompanha · destoa · quebra | aplicar · item próprio · autor decidiu … |
```

## Gatilho automático (Claude Code)

`scripts/agentes/hook-impacto.mjs` (`PostToolUse` em `Edit|Write|MultiEdit`, registrado em
`.claude/settings.json`) injeta o lembrete quando o arquivo editado fica numa zona compartilhada
(`shared/src`, `frontend/src/app/shared|core`, temas, `backend/src/core`) ou tem 3+ consumidores
diretos — uma vez por arquivo por sessão, sem bloquear. O lembrete chega **depois** da primeira
edição: se ela já mudou o sentido para algum consumidor, trate como mudança ainda não aprovada.
O Codex não tem esse hook: segue esta skill pela linha de `AGENTS.md`.

## Armadilhas

- **Contagem alta não é risco alto, nem o inverso.** `icone.component.html` tem centenas de
  consumidores, mas o impacto real é só o dos glifos tocados; um service com 2 consumidores pode
  quebrar o tempo real inteiro.
- **"Literal (conferir se é ícone)"** inclui falsos positivos (`[value]="patente"`, rotas,
  chaves de estado). Leia a linha antes de classificar.
- **Teste verde não mede impacto visual.** Mudança de glifo, token ou default de primitivo passa
  em build/lint/teste e só aparece na tela do consumidor.
