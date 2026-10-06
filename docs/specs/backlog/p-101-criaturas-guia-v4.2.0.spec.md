# p-101-criaturas-guia-v4.2.0.spec.md

> Task avulsa de PROBLEMS P-101. Adequação das mudanças de Criaturas encontradas ao
> revisar o Guia novo. **Somente especificação; nenhuma implementação nesta rodada.**
> Dividida em [P-101-01](p-101-01-criatura-realocacao-atributos.spec.md),
> [P-101-02](p-101-02-criatura-dt-e-modificadores.spec.md) e
> [P-101-03](p-101-03-criatura-referencias-e-cadencia.spec.md).
> Executar as tasks numeradas futuramente, não este guarda-chuva diretamente.

## Objetivo

Confrontar motor, criação e ficha de Criatura com as mudanças do Guia v4.2.0 e adequar
os consumidores das regras confirmadas, preservando fichas antigas e decisões do autor.

## Entregáveis

1. Antes de editar, completar a matriz documento → regra → consumidores, com foco nas
   alterações: realocação de até três pontos no total a partir de mais de um atributo,
   possibilidade de negativo, modificador somado ao resultado (não ao atributo/pool),
   DT `10 + atributo + trunc(modificador / 2)` e turnos extras ao fim quando faltarem
   posições para intercalar. A revisão inicial confirmou que `validarRealocacaoAtributos`
   ainda rejeita negativos; não presumir que os demais caminhos estejam todos errados.
   Inventário posterior confirmou: sobra de turnos ao fim já implementada em
   `shared/regras/encontro/ordem.ts`, com teste específico; não refazer esse algoritmo.
2. Centralizar em shared as adequações necessárias e inventariar consumidores na criação,
   ficha, rolagem, backend e Encontro. DT não deve usar `calcularDtAtributo` do agente/NPC
   nem arredondar metade negativa para baixo: exemplo `2, -3` → **11**. Distinguir
   regra de teste já correta em `criatura-rolagem.ts` do antigo helper Atributo Efetivo;
   remover usos mecânicos indevidos, sem aplicar migração cega em snapshots editáveis.
3. Atualizar provas do exemplo A Estátua às alterações confirmadas (fraqueza Explosão 26,
   Esmagamento 3D12+4 e DT Força 17). Preservar a fórmula geral que dá Fraco +5 em VD30;
   exemplo ainda mostra +6. Registrar também a inconsistência de Social: base2 → zero
   retira dois, enquanto a narrativa diz três redistribuídos. Não reescrever o Guia
   nem ajustar fórmulas para fazê-las coincidir com exemplos contraditórios.
4. Para divergência autoral sem decisão aplicável, apresentar o caso e manter o recorte
   aberto. Mudanças em telas exigem análogo aprovado, primitivos e gates de `verify`/
   `design-fidelity` nos quatro viewports; não reinventar controles.
5. Registrar o que foi confirmado, corrigido e ficou pendente; P-101 só sai de Ativos
   depois de concluir os recortes obrigatórios, com testes/builds/lint e evidências visuais
   quando houver UI. Tasks 01→02→03 preparadas; consolidar gate amplo ao integrar,
   sem repetir comandos idênticos se não houver mudança relevante.

## Critérios de Aceite

- Realocação negativa válida dentro do orçamento de três pontos e teto aceito;
  retirar de vários atributos não multiplica esse orçamento. Casos inválidos continuam rejeitados.
- DT: atributo5/modificador12 →21; atributo2/modificador−3 →11;
  Estátua Força3/modificador9 →17. Mesma regra compartilhada em todos os consumidores.
- Modificador não altera quantidade de D20/atributo base; regra já correta preservada.
- Intercalação mantém ordem existente e posiciona sobra no fim conforme fonte; verificar
  comportamento real antes de alterar o Encontro.
- Matriz cobre cada mudança sem marcar consumidor como corrigido apenas por atualizar
  um comentário ou snapshot. Fichas antigas preservadas; gates proporcionais ao recorte.

## Fora de Escopo

- Executar nesta rodada; UI/regras de NPC (m4-19/P-100), mudanças autorais em docs/core,
  reescrever specs em done ou migrar todos os ataques livres para o exemplo novo.
- Mudar fórmulas gerais para encaixar números incoerentes do exemplo.

## Dependências

- Guia v4.2.0 > Criaturas > Realocação, Modificadores, DT, Cadência e A Estátua.
- `docs/SYSTEM.SPEC.md`, `docs/CONVENTIONS.md`, `docs/SCHEMA.md`, `docs/design/`.
- Decisão histórica de m4-02: fórmula geral vence exemplo; [revisão inicial](../../reviews/m4-19-revisao-guia-v4.2.0.md).
