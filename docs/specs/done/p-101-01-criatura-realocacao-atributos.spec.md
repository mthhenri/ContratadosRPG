# p-101-01-criatura-realocacao-atributos.spec.md

> Task 1/3 da P-101. Execução conjunta autorizada e concluída em 2026-10-06.

## Objetivo

Permitir a realocação de até três pontos no total a partir de vários atributos da
Criatura, incluindo atributos negativos, conforme Guia v4.2.0 > Realocação de Pontos.

## Entregáveis

1. Compor validação/saldo em `shared/regras/criatura`, com teto por VD, orçamento de
   Pontos de Ajuste e soma dos pontos retirados abaixo da base limitada a três no total.
   Não basta trocar mínimo0 por base−3 em cada controle: isso permitiria três por atributo.
   Distinguir validação de distribuição inicial da edição posterior de snapshots.
2. Adequar `validarRealocacaoAtributos` e seu contrato compartilhado conforme convenções
   de DTO; atualizar criação/validação backend quando seu fluxo exigir distribuição.
   Preservar ficha antiga; não redistribuir pontos ou zerar negativos automaticamente.
3. Assistente `criar-criatura.page.ts`: retirar clamp `Math.max(0, base−3)` e contas
   locais duplicadas; consumir consulta compartilhada para mínimo, saldo e erros.
   Exibir saldo/limite de realocação com os primitivos existentes, sem controles locais.
4. Confirmar tratamento de atributo negativo na rolagem existente e seus consumidores:
   não transformar modificador fixo em D20, nem fabricar quantidade negativa de dados.
   Fonte Sistema > atributo zero/desvantagem prevalece no contrato de execução.

## Critérios de Aceite

- Base1: retirar dois de Social (−1) e um de Medicina (0) devolve três pontos;
  retirada de quatro no total é rejeitada, mesmo distribuída entre atributos distintos.
- Atributos que recebem pontos respeitam o teto; o orçamento inicial não aumenta
  além dos pontos efetivamente devolvidos. Inteiros e casos inválidos cobertos.
- Testes de shared e integração do assistente/REST; build shared antes do app real;
  builds/lint/suítes afetadas no gate integrado de P-101, sem repetir sem mudança.
- Análogo: assistente atual de Criatura, controles de atributo/saldo aprovados.
  Principal aplica `verify`/`design-fidelity` nos quatro viewports `1920×1080`,
  `360×800`, `960×1080`, `1366×768`: negativo, múltiplas origens, orçamento/teto inválido,
  confirmação e reabertura. Sem overflow, controles canônicos, foco/contraste/alvos corretos.

## Fora de Escopo

- Editar Guia, recalcular todas as fichas antigas, DT e Cadência.
- Interpretar incoerência do exemplo A Estátua como autorização de ponto extra.

## Dependências

- Guia v4.2.0 > Atributos/Realocação (`:421–439`), Sistema > Testes/desvantagem.
- P-101 e matriz da [revisão](../../reviews/m4-19-revisao-guia-v4.2.0.md).

## Fecho — 2026-10-06

Consulta/validação compartilhada implementada e consumida pelo guia e criação REST.
Até três retirados no total, negativos e distribuição exata aceitos; quatro retirados,
teto, fração e orçamento inválidos rejeitados. Edição posterior preserva snapshots.
Rolagem de negativo já correta, confirmada com novos casos; preview simbólico adequado.
Na inspeção real, corrigido clamp que deixava digitação e estado divergentes.
Gates amplos e jornadas nos quatro viewports aprovados; dados sintéticos e temporários
limpos. [Fecho integrado e evidências](../../reviews/p-101-verificacao.md).
