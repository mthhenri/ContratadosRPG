# p-096-fixture-resumo-rolagem-deterministica.spec.md

> Task avulsa de `PROBLEMS.md` P-096. Preparada em 2026-10-06 por pedido do autor;
> **somente especificação nesta rodada, sem execução autorizada agora**.

## Objetivo

Eliminar a intermitência do teste de listagem de rolagens para espectador causada por
comparar duas chamadas de fixture que leem instantes diferentes do relógio. Preservar
a comparação completa da resposta e a prova da permissão de espectador.

## Entregáveis

1. Tornar determinística a fixture `criarResumo()` em
   `backend/src/modules/rolagem/rolagem.service.spec.ts`: `createdDate` recebe uma data
   fixa por padrão, mantendo a possibilidade de sobrescrita explícita.
2. No caso “m8-02: aceita ESPECTADOR”, criar o resumo uma vez e usar a mesma fixture
   como resposta do repository e como valor esperado. Manter igualdade completa do DTO,
   inclusive `createdDate`, e a expectativa de `ehMestre: false`.
3. Conferir os demais casos que usam `criarResumo()` no mesmo arquivo; datas deixam de
   variar por tempo de execução, sem mudanças na autorização ou listagem real.
4. Registrar o resultado em `HISTORY.md` e retirar P-096 de Ativos somente depois dos
   gates; mover esta spec para `done/` apenas no fecho da implementação futura.

## Critérios de Aceite

- A fixture não consulta o relógio real para preencher `createdDate`.
- Repository e expectativa do cenário de espectador usam o mesmo resumo estável.
- `toEqual` continua verificando o DTO completo; sem matcher que ignore a data.
- O teste mantém os parâmetros `campanhaId`, `usuarioId` e `ehMestre: false` e as
  demais asserções de autorização existentes.
- Rodar `npm run test --workspace=backend -- rolagem.service.spec.ts`.
- No gate de integração, suíte completa de backend e lint, incluindo seu typecheck
  de specs. Se implementada junto de P-095, consolidar o gate amplo conforme `task-flow`.
- Diff restrito a testes e documentação; nenhuma mudança de produção.

## Fora de Escopo

- Alterar datas retornadas pela API, permissões, repository ou regras de visibilidade.
- Ignorar `createdDate`, adicionar sleeps/retries ou corrigir outros testes de passagem.
- Correção de P-095/P-097 ou regra de NPC.
- Implementar a correção nesta rodada de elaboração da spec.

## Dependências

- Nenhuma dependência de regra do jogo ou da m4-19.
- `docs/SYSTEM.SPEC.md`, `docs/CONVENTIONS.md`, skill `task-flow` e registro P-096.
