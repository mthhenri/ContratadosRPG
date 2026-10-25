# seed-dev-npcs-e-completude.spec.md

> Task avulsa solicitada pelo autor: reset local com NPCs e revisão dos dados padrão.

## Objetivo

Recriar a base local de desenvolvimento com NPCs utilizáveis nas duas campanhas e completar as lacunas dos exemplos existentes.

## Entregáveis

1. Três NPCs por campanha, pertencentes ao mestre: Civil, Operativo e Elite, com identidade, atributos, competências, equipamentos, habilidades, saúde, energia, sanidade e conduta coerentes com o guia.
2. Agentes com atributos dentro do orçamento, pacote inicial, escolhas de progressão e Iniciativa; saúde calculada após as habilidades. Ataques das criaturas com tipos de dano explícitos.
3. Seed transacional e idempotente com testes de completude e privacidade dos NPCs.
4. Reset efetivo somente da base local autorizada, preservando e restaurando as publicações dos livros de regras; documentação do cenário e relatório nesta pasta de anexos.

## Critérios de Aceite

- Validadores canônicos aprovam os seis NPCs e as três criaturas; cálculos dos agentes usam shared/regras.
- Testes do cenário, persistência e reset passam; lint e build do backend passam; `npm run repo:verificar` passa.
- Base recriada contém duas campanhas, oito agentes, três criaturas e seis NPCs; repetição do seed não duplica registros. NPCs não são compartilhados automaticamente.
- Publicações restauradas mantêm seu conteúdo; consulta real confirma o cenário.

## Fora de Escopo

Alterações de UI, regras, schema, geração de retratos e publicação de versão. Nenhum banco remoto ou de outro projeto é alvo do reset.

## Dependências

`docs/SYSTEM.SPEC.md`, `docs/CONVENTIONS.md`, `docs/core/sistema-v4.1.5.md`, `docs/core/guia_de_mestre-v4.2.0.md` e os validadores em shared/regras.
