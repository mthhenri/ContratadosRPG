# Usabilidade 01 — Contexto para escolher classes

> Task 1/6 da revisão pública de 09/10/2026; achado U-01 do [relatório](../backlog/usabilidade-classes-condicoes-2026-10-09/RELATORIO.md). Quebra em specs solicitada pelo autor. Prioridade alta.

## Objetivo

Ajudar a pessoa a entender o papel e as consequências de uma opção antes de escolhê-la em
Simulação → Agente / Civil. Tornar claras as diferenças entre classe, arquétipo, subclasse e Civil.

## Entregáveis

1. Orientação curta junto do seletor Classe / Registro, indicando o que a escolha modifica.
2. Resumo da opção selecionada: papel, recursos relevantes, benefícios/restrições e relação
   com classe/arquétipo/subclasse, conforme o Sistema vigente; ligação direta à seção das Regras.
3. Comparação enxuta das opções, permitindo avaliar diferenças sem alternar o seletor e
   memorizar os números. Conservar acesso à explicação completa e à Ajuda operacional.
4. Análogo, proposta visual e verificação em `usabilidade-01-escolha-classes/`; saídas brutas
   em `.artifacts/usabilidade-01-escolha-classes/`.

## Critérios de Aceite

Ao abrir a página, é possível identificar a finalidade da escolha e a diferença entre as
categorias. Ao selecionar Combatente, Especialista, Suporte, cada Experimento e Civil, o resumo
corresponde à fonte, explica restrições e oferece link funcional para a regra correspondente.
Não sugerir combinações de classe/subclasse que o domínio não permita.

Os mesmos inputs mantêm os mesmos resultados numéricos, limites e reajustes automáticos da
calculadora. Interface usa `shared/ui/`, tokens e densidade existentes; ausência de primitivo
exige decisão do autor antes de ampliar/criar. Análogo inicial: cartões numerados da Simulação
e resumo de classe das Regras, inspecionados antes de editar.

Usar `verify` na aplicação em 1920×1080, 1366×768, 960×1080 e 360×800: escolha inicial, todas
as categorias, comparação, Ajuda, link às Regras, foco/teclado e mobile sem overflow.
Registrar comparação com o análogo, testes proporcionais, build, lint e `repo:verificar`.

## Fora de Escopo

Alterar regras/fórmulas, automatizar criação de ficha, mudar permissões ou redesenhar o catálogo
de arquétipos (task 02). Não pressupor que a revisão original cobriu telas autenticadas.

## Dependências

`docs/SYSTEM.SPEC.md`, `docs/CONVENTIONS.md`, `docs/design/DESIGN.md` e handoff de tema;
`docs/core/sistema-v4.1.4.md`, Classes e Arquétipos/Subclasse/Civil; implementação vigente da
calculadora e `shared/regras`. A task 02 não bloqueia esta implementação.
