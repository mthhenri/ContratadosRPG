# m4-07-backend-ficha-npc.spec.md

> Task 7/10 do milestone `m4-ficha-criatura-npc.spec.md`.

## Objetivo

Estender o módulo `ficha` (backend) para aceitar o tipo `NPC`, espelhando exatamente o que
`m4-03` fez para `CRIATURA` — mesma reutilização de permissão/visibilidade/tempo real, sem
migration nova (`tipo_ficha` já tem `NPC` seedado desde `m3-02`).

## Entregáveis

1. **DTOs de operação do NPC** em `shared/src/dtos/ficha/`, seguindo a decisão já tomada
   em `m4-03` sobre DTOs próprios vs. união genérica — manter a mesma abordagem para
   consistência entre os dois tipos (não reabrir a decisão sem motivo).
2. **`criarFicha` (ou variante)**: só o mestre da campanha cria ficha `NPC`; dono = o
   próprio mestre; sem "avulsa" (mesma decisão de `m4-03`).
3. **Validação contra `shared/regras/npc`** (`m4-06`) antes de persistir, branch por
   `tipo` no mesmo ponto onde `CRIATURA`/`JOGADOR` já são validados.
4. **Visibilidade por padrão oculta** — mesmo mecanismo reusado sem mudança de código
   (dono = mestre, jogador só vê com concessão via `usuario_ficha_acesso`).
5. **Tempo real** — reusa `emitirFichaCriada`/`emitirFichaAlterada` sem mudança de
   gateway.
6. **Testes de service**: só mestre cria `NPC`; validação rejeita NPC incoerente com
   `shared/regras/npc` (cap de atributo por Categoria, volume de habilidades); jogador
   sem concessão não vê; jogador com concessão vê.

## Critérios de Aceite

- Mestre cria um NPC por Categoria da Biblioteca de Referência via API e o backend
  persiste/retorna os valores calculados corretos (critério de aceite do milestone).
- Jogador não vê o NPC sem concessão; passa a ver após revelação.
- SQL segue todas as regras (§10.2/§16); nenhuma regra de criação duplicada fora de
  `shared/regras/npc`.

## Fora de Escopo

- Frontend (`m4-08`).
- Listagem/revelação dedicada no painel do mestre (`m4-09`).

## Dependências

- `m4-05` (contrato), `m4-06` (`shared/regras/npc`).
- `m4-03` (padrão de extensão do módulo `ficha` já estabelecido para `CRIATURA` — reusar a
  mesma abordagem de DTOs de operação e branch de validação).
