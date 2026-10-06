# pn-06-reiniciar-cache-patchnotes.spec.md

> Task solta, continuação do guarda-chuva `patchnotes-versao-sistema.spec.md` (`pn-01`…`pn-05`).
> Pedido direto do autor (2026-10-05).

## Objetivo

Dar ao `ADMIN` um botão discreto na página `/patchnotes` que esvazia o cache em memória dos
patchnotes na API (`PatchnoteService`, TTL de 24 h) e recarrega a página com o conteúdo atual do
armazenamento — sem reiniciar nem redeployar a API. Hoje uma correção de nota publicada no R2 sem
deploy só aparece depois do TTL.

## Entregáveis

1. **DTO** `PatchnoteCacheReiniciadoDto { entradasRemovidas: number }` em
   `shared/src/dtos/patchnote/` (sem DTO de entrada: a operação não recebe dados).
2. **Backend**: `PatchnoteService.reiniciarCache()` esvazia o `Map` do cache e devolve quantas
   entradas saíram; `POST /patchnote/cache/reiniciar` no `PatchnoteController`, **não** público,
   com `@TiposPermitidos(TipoUsuarioEnum.ADMIN)` (mesmo padrão de `DELETE /rolagem/:id`). Controller
   fino, sem `Cache-Control`. Contratos OpenAPI regenerados.
3. **Frontend — serviço**: `PatchnoteService.reiniciarCache()` (POST) e opção de leitura que ignora o
   cache do navegador (`max-age=300` das rotas públicas) para a recarga logo depois do reinício —
   sem isso o navegador serviria a cópia antiga por até 5 min.
4. **Frontend — página**: no canto superior direito do cabeçalho de `/patchnotes`, um
   `app-botao-icone tamanho="padrao"` com ícone `atualizar`, `aria-label` e `appTooltip`, visível
   **só** quando `SessaoService.usuario()?.tipo === ADMIN` (a página é pública; visitante e
   não-admin não veem nada). Ao clicar: desabilita enquanto roda, chama o endpoint, recarrega índice
   e nota aberta sem cache do navegador e mostra toast de sucesso com o número de entradas
   removidas. Erro HTTP segue o toast genérico do interceptor.
   Análogo aprovado: botão "Regenerar convite" de `detalhe-mestre.page.html` (ação unitária de
   ícone `atualizar` ao lado de um conteúdo).

## Critérios de Aceite

1. Testes do service (reiniciar esvazia, conta as entradas e a próxima leitura volta ao
   armazenamento) e do controller (repassa; metadado `TiposPermitidos` = `[ADMIN]`; não é `@Public`).
2. Testes do frontend: botão ausente para visitante e para `NORMAL`, presente para `ADMIN`; clique
   chama o serviço, recarrega e notifica.
3. Suítes e lint de `shared`, `backend` e `frontend` verdes; `openapi.document.spec.ts` verde.
4. Ao vivo (`verify`): `POST` sem token → 401, com `NORMAL` → 403, com `ADMIN` → 201 (status padrão de `POST` no Nest); a página em
   `1920×1080` e `360×800` como ADMIN (botão no canto, tooltip, estado de carregando) e como
   visitante (sem botão).

## Fora de Escopo

- Reorganização do layout da página (spec própria — `pn-revisao-pagina-patchnotes.spec.md`).
- Reinício de qualquer outro cache da API (hoje o de patchnotes é o único em memória).
- Propagar o reinício entre instâncias (ver Riscos).

## Dependências

`pn-03` e `pn-04` concluídas.

## Riscos e Mitigação

- **Várias instâncias da API** (Cloud Run pode escalar): o cache é por processo, então o reinício
  só esvazia a instância que atendeu o `POST`. Com uma instância (cenário atual) o efeito é total.
  Aceito e documentado em `CONTEXT.md`; um cache compartilhado é ideia, não esta task.
- **Cache do navegador** mascarando o resultado: mitigado pelo entregável 3.
