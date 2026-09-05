# p-046-gate-codigo-convite-recuperar-campanha.spec.md

> Task solta. Origem: `docs/context/PROBLEMS.md` `P-046`.

## Objetivo

`recuperarCampanha` (`GET /campanha/:id`) deve devolver `codigoConvite`/`codigoConviteEspectador`
somente para o `MESTRE` da campanha — `null` para `JOGADOR` — igual ao recorte que
`CampanhaResumoDto` (listagem) já aplica.

## Entregáveis

1. `shared/src/dtos/campanha/campanha.dtos.ts`: `CampanhaRecuperadaDto.codigoConvite` e
   `codigoConviteEspectador` passam de `string` para `string | null`, com o comentário da
   interface atualizado (hoje documenta explicitamente o recorte antigo — "não gateado por
   papel").
2. `backend/src/modules/campanha/campanha.service.ts`: `recuperarCampanha` usa
   `this.ehMestre(membroEncontrado.papel)` para devolver os dois campos como `null` quando o
   chamador não é mestre, mantendo o restante do DTO intacto.
3. `backend/src/modules/campanha/campanha.service.spec.ts`: atualizar o teste "devolve a campanha
   quando o usuário é membro" (papel `JOGADOR`) para esperar os dois códigos `null`, e acrescentar
   um teste cobrindo o `MESTRE` recebendo os códigos preenchidos.
4. Frontend: confirmar que nenhum consumidor depende de valor não-nulo para não-mestre. Já
   verificado nesta spec — `detalhe.page.html` só renderiza `codigoConvite`/
   `codigoConviteEspectador` dentro de `@if (ehMestre())` — nenhuma mudança de template esperada;
   rodar a suíte do frontend para confirmar que a tipagem `string | null` não quebra nada.

## Critérios de Aceite

- `npm run test --workspace=shared` (interface só, sem lógica — sem teste dedicado esperado).
- `npm run test --workspace=backend -- campanha.service.spec.ts` cobrindo `MESTRE` (campos
  preenchidos) e `JOGADOR` (campos `null`).
- `npm run build --workspace=shared && npm run build --workspace=backend` sem erro de tipo.
- `npm run test --workspace=frontend` sem regressão (tipagem `string | null` não quebra
  `detalhe.page`).

## Fora de Escopo

- Qualquer mudança em `CampanhaResumoDto`, `listarPorUsuario` ou na projeção do espectador —
  já corretos.
- Auditar outros DTOs por vazamento de dado sensível — fora do recorte desta task.

## Dependências

Nenhuma.
