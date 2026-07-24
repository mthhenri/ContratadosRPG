# m3-49-permissoes-granulares-acesso.spec.md

> Task 46 do milestone `m3-ficha-jogador.spec.md`. Lote de refino da ficha (`m3-38`…`m3-54`).

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).
> **Permissões:** mesmas regras no REST e no WebSocket, sempre arbitradas no **backend**
> (SYSTEM.SPEC §14).

## Objetivo

Granularizar as permissões da ficha: (24) **quem tem só visualização não pode rolar dados**;
(2) **traumas só podem ser tratados na visão de edição**; (27) **revogar acesso "expulsa"** o
jogador da tela da ficha em tempo real; e *(comentário do autor)* **Anotações passa a ter gate de
visualização, igual à História (`m3-48`)**.

## Entregáveis

1. **Visualizador não rola dados (item 24).** Bloquear as ações de rolagem para quem tem só
   acesso de visualização: teste de atributo (`rolarTesteAtributo`,
   `ficha-visualizacao.component.ts` ~linha 503), presets (`ficha-rolagens`), rolar dano da arma
   (`m3-43`). Introduzir um conceito de permissão **mais granular** (ex.: `podeRolar` distinto de
   `podeVer`/`podeEditar`) derivado do papel/acesso — arbitrado no backend nos endpoints de
   rolagem (quando existirem, `m3-27`) e refletido no front. Dono e mestre rolam; visualizador não.
2. **Tratar trauma só em edição (item 2).** A ação "tratar trauma" no `ficha-sanidade`
   (`componentes/ficha-sanidade/`) fica **gated por `ajustavel()`** (modo edição) — some para quem
   não pode editar. Backend valida em `FichaService.validarPermissaoEdicao`.
3. **Revogar acesso "expulsa" (item 27).** Ao `revogarAcesso`
   (`FichaService.revogarAcesso` + `ficha.controller.ts`), **emitir um evento** no gateway
   (`backend/src/core/gateway/campanha.gateway.ts`, espelhando os emits existentes) que o
   `TempoRealService` (`core/services/tempo-real.service.ts`) recebe e usa para **redirecionar o
   visualizador para fora** da tela da ficha (`visualizar.page.ts`) — não pode continuar vendo a
   ficha aberta após a revogação.
4. **Anotações com gate de visualização.** A aba **Anotações** (`anotacoes`, `dados.anotacoes`)
   passa a seguir o **mesmo tratamento da História**: **filtragem server-side** em
   `FichaService.recuperarFicha` (não recuperar `anotacoes` para só-visualizador) + aba
   condicionada em `ABAS_FICHA` a `ehDono() || ehMestre()`. **Reusar o mecanismo de "campos
   privados por permissão" introduzido na `m3-48`** (não duplicar a lógica de omissão), inclusive
   no broadcast de tempo real.

## Critérios de Aceite

- Visualizador não consegue disparar nenhuma rolagem (atributo, preset, dano de arma); dono/mestre
  conseguem.
- "Tratar trauma" só aparece/funciona em modo edição.
- Revogar o acesso de um jogador que está com a ficha aberta o remove da tela em tempo real.
- Visualizador não vê a aba Anotações e o payload (REST + evento) não contém `anotacoes`.

## Fora de Escopo

- Um sistema completo de papéis por seção (só os gates acima); a granularidade fica no mínimo
  necessário (`podeVer`/`podeEditar`/`podeRolar` + campos privados).
- Endpoint de rolagem em si (é `m3-27`); aqui só o gate de permissão quando ele existir.

## Dependências

- `m3-04` (acesso de visualização), `m3-05`/`m3-08` (gateway + `TempoRealService`), `m3-12`
  (sanidade/traumas), `m3-48` (mecanismo de seção privada por permissão / História), `m3-32`
  (Anotações), `m3-27`/`m3-43` (rolagem — para o gate `podeRolar`).
