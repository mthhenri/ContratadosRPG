# P-097 — revisão após publicação do Sistema v4.1.3

## Fonte e mudança

Pedido do autor em 2026-10-06: conferir o Sistema recém-publicado e corrigir o
necessário; o Guia de Mestre será enviado posteriormente. A publicação substitui
o pedido anterior de aguardar a regra do crítico. Fonte: `docs/core/sistema-v4.1.3.md`,
“Crítico e Margem de Crítico”, linhas 1227–1233; “Cura”, linha 1316.

Comparação por parágrafo, normalizando espaços e escapes da exportação, contra
`HEAD:docs/core/sistema-v4.1.0.md`: os três parágrafos da seção Crítico são as únicas
mudanças de conteúdo. As demais diferenças são formatação. O cabeçalho interno
continua identificando versão 4.1.1; o nome publicado é 4.1.3. O agente consome os
arquivos publicados sem alterar seu conteúdo nem a versão do aplicativo.

## Contrato e interpretação do produto

- Todos os testes têm margem natural 1. Teste de atributo, incluindo o de ataque,
  soma +2 uma vez quando o dado resultante é crítico. A nova redação removeu
  “para cada crítico”. O produto mantém um dado e os descartados não são resultado.
- Dano/cura com resultado em dados continua usando o comando de crítico para
  dobrar dados e valores. Cura mantém a exceção de Patente/Nível. Não se dobra
  automaticamente um pool genérico só por possuir `cm`.
- No motor existente, a fórmula identifica o teste, sem acrescentar modo ao DTO:
  um único pool positivo de d20 com `kh1`/`kl1`, sem explosão/implosão e sem tipos
  de dano em qualquer parcela. Outros pools permanecem genéricos. Essa é a
  tradução da notação de teste já documentada no produto, não uma regra nova
  para somar resultados de vários dados. Margem explícita prevalece sobre 1.
- O bônus é uma contribuição identificada como `CRÍTICO` no detalhamento existente;
  PROF/NIV, bônus planos e dados mantidos permanecem discriminados.

| Pool mantido com PROF 9 | Margem | Resultado | Bônus |
|---|---|---|---|
| `[20,20,9]`, maior 20 | 1 | 31 | +2 uma vez |
| `[20,9,8]`, maior 20 | 1 | 31 | +2 |
| `[19,20,8]`, maior 20 | 2 | 31 | +2 |
| `[19,9,8]`, maior 19 | 2 | 30 | +2 |
| `[20,3]`, menor 3 | 1 | 12 | nenhum |
| `[20,20]`, menor 20 | 1 | 31 | +2 |

O resultado 33 e a soma dos críticos do pool eram interpretações da auditoria
anterior e ficam superados pela publicação. Fórmulas antigas persistidas não
são regravadas; resultados históricos permanecem como foram registrados.

## Consumidores e escopo

`rolarFormula`, `rolarInterpretada` e `rolarPasso` convergem no motor puro
`shared/regras/rolagem`. Jogador direto, iniciativa, presets, rolagem rápida,
painéis e fórmulas de ataque recebem a regra ao usar a notação de teste.
O caminho de Criatura também consome o mesmo motor; não precisa compensação
local. Não são alterados contratos, formulários, fórmulas específicas de NPC,
acesso ou privacidade: m4-19 aguarda a nova versão do Guia de Mestre.

Execução delimitada em `p-097-01-critico-e-sistema-v4.1.3.spec.md`; fixtures
P-095/P-096 continuam em specs separadas e não são corrigidas nesta rodada.

Implementação e gates concluídos: [verificação](../p-097-01-critico-e-sistema-v4.1.3/p-097-verificacao.md).


> Organização em 2026-10-08: capturas e saídas brutas citadas neste registro
> são evidências locais em `.artifacts/`, não distribuídas no clone. A migração
> preserva os resultados e limites originais e não executa novamente os gates.
