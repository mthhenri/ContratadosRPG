# p-101-02-criatura-dt-e-modificadores.spec.md

> Task 2/3 da P-101. Execução conjunta autorizada e concluída em 2026-10-06.

## Objetivo

Disponibilizar a DT de cada atributo de Criatura pela fórmula do Guia novo e eliminar
usos mecânicos indevidos do antigo Atributo Efetivo, preservando o teste já correto.

## Entregáveis

1. Consulta pura em `shared/regras/criatura`: `10 + atributo base + trunc(modificador/2)`.
   Calcular modificador pela função/tabela existente. Não reutilizar a DT de agente/NPC
   nem usar `floor` na metade negativa. Contratos em shared/dtos conforme convenções.
2. Inventariar usos de `calcularAtributoEfetivo`: ficha, assistente, referências e testes.
   Substituir cada uso mecânico indevido pelo atributo base, bônus fixo ou DT adequada.
   Não alterar Vida/Defesa/atributo base pela existência de modificador de teste.
3. Mostrar DT nos atributos da ficha/assistente e nas referências pertinentes usando
   padrão de nome/sigla/DT aprovado no NPC/Jogador. `criatura-rolagem.ts` já usa
   atributo para D20 e modificador no total: preservar essa composição, sem reescrever
   ataques livres persistidos ou interpretar texto narrativo de habilidades.
4. Backend/regras/páginas consomem a mesma consulta quando precisarem da DT. Inventariar
   Encontro e resumos para alterar apenas consumidores reais; sem adicionar campos
   persistidos para valor derivado por contexto.

## Critérios de Aceite

- Atributo5, modificador12 → DT21; atributo2, modificador−3 → DT11;
  Estátua Força3, modificador9 → DT17. Modificador−1 contribui zero à metade.
- Teste Luta5/Forte12 continua cinco D20, mantém maior e soma12; não rola17 D20.
- Atributos negativos permitidos pela P-101-01 continuam distintos da DT e do bônus.
- Testes puros e dos consumidores afetados; gate amplo de P-101 consolidado.
- Análogos aprovados: atributos atuais de Criatura + apresentação nome/DT de NPC/Jogador.
  `verify`/`design-fidelity` nos quatro viewports, criação/consulta/edição/leitor,
  bônus positivo/negativo e zero; principal compara UI, controles e ausência de overflow.

## Fora de Escopo

- Alterar fórmulas de agente/NPC, tabela de modificadores ou fontes.
- Deduzir/dobrar dano/cura posteriores a um teste; migrar fórmulas livres ou criar
  automação que lê condições/DT a partir de texto de ataque.

## Dependências

- Guia v4.2.0 > Modificadores/DT (`:457–492`); SCHEMA/design/convenções.
- P-101-01 antes do fecho integrado quando os consumidores precisarem de negativo.

## Fecho — 2026-10-06

Consulta pura de DT e DTO canônico implementados em shared; antigo Atributo Efetivo
removido após inventário. Guia e ficha apresentam DT, inclusive durante edição e para
leitor autorizado; bônus permanece separado do atributo/pool. Encontro e resumos não
precisam de campo derivado novo. Vida/Defesa/fórmulas livres preservadas por provas REST
e salvamento/reabertura real. Gates e comparação pessoal nos quatro viewports aprovados.
[Fecho integrado e evidências](p-101-criaturas-guia-v4.2.0/p-101-verificacao.md).
