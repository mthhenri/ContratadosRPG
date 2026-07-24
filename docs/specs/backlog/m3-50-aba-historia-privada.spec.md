# m3-50-aba-historia-privada.spec.md

> Task 47 do milestone `m3-ficha-jogador.spec.md`. Lote de refino da ficha (`m3-40`…`m3-56`).

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Objetivo

Adicionar uma aba **"História"** à ficha, visível **apenas ao mestre e ao jogador dono**. Para os
demais (acesso de visualização) a aba **não aparece** e **os dados nem são recuperados** para a
tela. Esta task também **introduz o mecanismo de "seção privada por permissão"** reusado pela
`m3-51` (Anotações).

## Entregáveis

1. **Contrato.** Novo campo `historia?: string` em `FichaJogadorDadosDto`
   (`shared/src/dtos/ficha/ficha.dtos.ts`) — conteúdo de jogo, mora no JSONB `dados`. Atualizar
   `docs/SCHEMA.md`.
2. **Filtragem server-side (essencial).** Em `FichaService.recuperarFicha`
   (`backend/src/modules/ficha/ficha.service.ts`), **omitir `historia` do payload** quando o
   solicitante é **só-visualizador** (não dono, não mestre) — não basta esconder no front, o dado
   não pode trafegar. Introduzir um utilitário reusável de "campos privados por permissão"
   (usado também pela `m3-51` para `anotacoes`) para não duplicar a lógica de omissão.
3. **Aba condicional.** Estender a union `AbaFicha` + a lista `ABAS_FICHA` + `ehAbaFicha`
   (`ficha-visualizacao.component.ts` ~linhas 98-118) com o id `historia`, **exibido só quando**
   `ehDono() || ehMestre()` (`visualizar.page.ts` ~linhas 144-158). Painel
   `@if (abaAtiva() === 'historia')` no HTML, com editor de texto no padrão de Anotações
   (`m3-32`).
4. **Tempo real.** A `historia` participa da persistência debounced/merge como os demais campos,
   mas o evento `ficha:alterada` para um visualizador **não** deve vazar `historia` (mesma regra
   de omissão do item 2 aplicada ao broadcast quando o destinatário é só-visualizador — ou
   emitir sem o campo).

## Critérios de Aceite

- Dono e mestre veem a aba História e editam o texto; persiste e sobrevive a reload.
- Um visualizador com acesso **não vê** a aba e o payload recebido **não contém** `historia`
  (verificar na resposta REST e no evento de tempo real).
- Revogar/conceder acesso não expõe a `historia` a quem não é dono/mestre.

## Fora de Escopo

- Gate de Anotações (é a `m3-51`, que reusa o mecanismo introduzido aqui).
- Rich text/anexos na História (texto simples, padrão Anotações).

## Dependências

- `m3-03`/`m3-04` (CRUD + permissão de visualização/acesso), `m3-11` (abas), `m3-32` (editor de
  Anotações — padrão de texto), `m3-05`/`m3-08` (tempo real).
