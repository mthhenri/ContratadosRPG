# dev-02-cenario-dev-completo.spec.md

> Task avulsa: enriquecer as fixtures reproduzíveis do ambiente de desenvolvimento.

## Objetivo

Fazer com que o seed de desenvolvimento gere campanhas prontas para demonstração, com missões
descritas, fichas de agente com identidade e inventário preenchidos e criaturas utilizáveis pelo
mestre. Os documentos de jogo persistidos precisam obedecer aos contratos e regras já existentes.

## Entregáveis

1. Descrições narrativas de missão para as duas campanhas de `CENARIO_DEV`.
2. Identidade completa para cada ficha de jogador: Personalidade, habilidade Base, as duas
   Fortificações, Origem com duas Formações, Especialidade e Saber de Campo; a habilidade Base
   fica materializada em `habilidades` nos níveis abaixo de 7.
3. Itens de catálogo realistas nos inventários, com peso e propriedades válidas, preservando os
   cálculos derivados da ficha e aplicando os efeitos persistidos das Formações.
4. Criaturas de teste pertencentes aos mestres de cada campanha, incluindo a Estátua do exemplo
   do Guia do Mestre, validadas pelo motor compartilhado.
5. Testes de cenário que cobrem os novos documentos e reset da base DEV após a atualização.

## Critérios de Aceite

1. `npm run test --workspace=backend -- tools/database/cenario-dev.spec.ts` passa e comprova
   identidade, itens, descrições e validade das criaturas.
2. `npm run db:reset:dev --workspace=backend` conclui e reporta 5 usuários, 2 campanhas,
   10 membros, 8 fichas e 3 criaturas.
3. A inspeção da base recém-criada confirma que os JSONBs das oito fichas possuem identidade e
   inventário não vazio, e que as descrições de campanha foram atualizadas.

## Fora de Escopo

- Alterar schema, migrations, contratos públicos ou regras do motor compartilhado.
- Criar NPCs, encontros ou conteúdo de produção.
- Alterar fichas que não pertençam ao banco local de desenvolvimento.

## Dependências

- `docs/specs/done/dev-01-reset-seed-desenvolvimento.spec.md`.
- `docs/core/sistema-v4.1.0.md` (Identidade, Formação e Equipamentos).
- `docs/core/guia_de_mestre-v4.0.0.md` (Exemplo de Ficha Completa).

## Riscos e Mitigação

O seed persiste JSONB diretamente, portanto deve reproduzir o fluxo canônico de materialização da
habilidade de Personalidade e aplicação de Formação, sem copiar regras de cálculo. Os testes
validam o documento final e a criatura passa por `validarFichaCriatura`.
