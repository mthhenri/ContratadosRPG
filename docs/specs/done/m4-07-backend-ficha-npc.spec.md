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
   próprio mestre. Seguir também a decisão posterior já fechada na `m4-11`: criação solta
   por quem é mestre de alguma campanha e atribuição posterior apenas à campanha da qual
   o dono é mestre. Não manter a restrição antiga de `m4-03` que a `m4-11` superou.
3. **Validação contra `shared/regras/npc`** (`m4-06`) antes de persistir, branch por
   `tipo` no mesmo ponto onde `CRIATURA`/`JOGADOR` já são validados.
4. **Visibilidade por padrão oculta** — mesmo mecanismo reusado sem mudança de código
   (dono = mestre, jogador só vê com concessão via `usuario_ficha_acesso`).
5. **Tempo real** — reusa `emitirFichaCriada`/`emitirFichaAlterada` sem mudança de
   gateway.
6. **Testes de service**: só mestre cria `NPC`; validação rejeita NPC incoerente com
   `shared/regras/npc` (cap de atributo por Categoria, volume de habilidades); jogador
   sem concessão não vê; jogador com concessão vê.
7. **Recuperação e alteração tipadas de NPC** para a futura ficha `m4-08b`, preservando
   snapshots editáveis, tipo e documento; leitor com concessão não altera. Conferir suporte
   dos endpoints genéricos de imagem/cor/enquadramento sem duplicar contrato de identidade.
   Usar a validação de composição entregue em `m4-06`, conforme a tabela do guia, sem
   recalcular snapshots nem exigir marcador de exceção Civil. Resolver a representação de
   Morrendo antes de disponibilizar controles de condição na ficha.

## Critérios de Aceite

- Mestre cria um NPC por Categoria da Biblioteca de Referência via API e o backend
  persiste/retorna os valores calculados corretos (critério de aceite do milestone).
- Jogador não vê o NPC sem concessão; passa a ver após revelação.
- SQL segue todas as regras (§10.2/§16); nenhuma regra de criação duplicada fora de
  `shared/regras/npc`.
- Testar criação solta/atribuição conforme `m4-11`, recuperação, alteração por mestre,
  rejeição de alteração por leitor e preservação de máximos editados sem recálculo.

## Fora de Escopo

- Frontend (`m4-08`).
- Listagem/revelação dedicada no painel do mestre (`m4-09`).

## Dependências

- `m4-05` (contrato), `m4-06` (`shared/regras/npc`).
- `m4-03` (padrão de extensão do módulo `ficha` já estabelecido para `CRIATURA` — reusar a
  mesma abordagem de DTOs de operação e branch de validação).
- `m4-11` (decisão posterior de criação solta e atribuição), `docs/design/FICHA-NPC.md`
  (necessidades da consulta/edição, sem autoridade sobre mecânica).
