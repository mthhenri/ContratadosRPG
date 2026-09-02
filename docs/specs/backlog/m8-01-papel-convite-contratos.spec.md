# m8-01-papel-convite-contratos.spec.md

> Task 1/6 do módulo `m8-espectadores-campanha.spec.md`.

## Objetivo

Preparar o banco e os contratos compartilhados para o terceiro papel de campanha e seu convite
independente, sem mudar ainda os fluxos REST ou as telas.

## Entregáveis

1. Migration SQL que insere `ESPECTADOR` em `tipo_campanha_membro_papel`, sem alterar os vínculos
   ativos atuais, e atualiza `TipoCampanhaMembroPapelEnum` no `shared`.
2. A mesma migration adiciona `campanha.codigo_convite_espectador`, preenche um valor único para
   cada campanha existente, torna a coluna obrigatória e cria índice único parcial equivalente ao
   convite de jogador. Criação de campanha passa a fornecer os dois códigos explicitamente no
   `INSERT ... SELECT`; não usar `DEFAULT`.
3. DTOs de campanha passam a representar os dois convites somente nos recortes autorizados ao
   mestre. `CampanhaResumoDto`/`CampanhaRecuperadaDto` documentam o novo campo; respostas para
   jogador/espectador mantêm ambos os códigos como `null`/ausentes conforme o contrato atual.
4. Criar contratos de operação para regenerar especificamente o convite de espectador e para o
   mestre alterar `JOGADOR ↔ ESPECTADOR` de um membro. O DTO público da entrada continua contendo
   apenas `codigoConvite`; nenhum DTO permite que o cliente informe o papel desejado.
5. Atualizar `SCHEMA.md`, `SYSTEM.SPEC.md` e testes do `shared` que assumem a enumeração binária,
   deixando explícita a diferença entre papel global e papel por campanha.

## Critérios de Aceite

- Uma migração nova aplicada sobre o banco atual preserva todos os membros e cria exatamente um
  convite de espectador não nulo e único por campanha.
- O build/teste do `shared` cobre `ESPECTADOR` e os DTOs expostos; build do backend confirma que
  nenhum import/contrato de campanha ficou binário por acidente.
- O diff de schema usa tabela de referência, FKs, parâmetros e convenções de migration do projeto.

## Fora de Escopo

- Endpoint que aceita o código, mudança de papel efetiva, WebSocket ou interface.
- Alterar permissões de ficha/rolagem; isso é `m8-02`.

## Dependências

- `docs/SCHEMA.md`, `docs/SYSTEM.SPEC.md`, `docs/CONVENTIONS.md` e skill `sql-migrations`.
- `m2-01-migrations-tabelas-contas-campanha` e `m2-05-campanha-convite-membros`.

## Riscos e mitigação

- A coluna obrigatória não pode quebrar criação de campanha existente: atualizar geração e INSERT
  na mesma task da migration, e testar criação após migrar.
