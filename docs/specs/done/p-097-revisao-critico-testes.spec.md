# p-097-revisao-critico-testes.spec.md

> Revisão concluída em 2026-10-06 após publicação pelo autor do Sistema v4.1.3.
> Contrato e comparação em [revisão P-097](p-097-revisao-critico-testes/p-097-sistema-v4.1.3.md).
> A orientação de aguardar abaixo registra o escopo original; o pedido posterior
> de corrigir conforme o documento autoriza a execução separada
> `p-097-01-critico-e-sistema-v4.1.3.spec.md`. Esta revisão não alterou código.

> Task de revisão de regras, originada da auditoria m4-19 e de `PROBLEMS.md` P-097.
> Decisão do autor em 2026-10-06: **revisar antes de corrigir**, pois a regra pode mudar.
> Esta spec não autoriza implementar +2 em todo teste nem somar todos os críticos agora.

## Objetivo

Definir a abrangência e a contagem do crítico de teste antes de corrigir o motor.
Confrontar o documento vigente, a nova versão que o autor está preparando e o
comportamento do produto, registrando a escolha do autor sem transformar a hipótese
da auditoria em regra aprovada.

## Entregáveis

1. Revalidar os trechos de Testes, Crítico, ataques e dano do Sistema e as remissões do
   Guia de Mestre. A versão hoje lida (`sistema-v4.1.0.md:1806–1812`) fala em “todos os
   testes”, distingue dano de teste de atributo e diz “para cada crítico”. Registrar
   o que é texto explícito e o que é interpretação; conferir novamente as linhas e
   versões ao retomar. A nova publicação do autor prevalece quando incorporada como
   fonte canônica do projeto.
2. Mapear os consumidores: teste de atributo de Jogador/Criatura/NPC, teste de ataque,
   fórmulas/presets e rolagem de dano. Separar margem informativa de bônus mecânico de
   teste e do comando de dobrar dano, sem presumir que `cm` sozinho identifica um teste.
3. Apresentar ao autor decisões concretas: bônus em todos os testes de atributo,
   incluindo ataque, ou outro recorte; +2 uma vez ou por cada crítico; contagem antes
   ou depois de `kh`/`kl`; efeito da margem ampliada e da desvantagem. Comparar pelo
   menos `[20,20,9]`, `[20,9,8]`, `[19,20,8]` com margem ampliada e um teste que mantém
   o menor. Não escolher política sozinho pelo fato de o produto manter um dado.
4. Registrar o contrato escolhido com exemplos de resultado e fonte canônica. Se houver
   alteração documental pelo agente, mostrar o diff e obter aprovação expressa; se o
   autor publicar a regra pronta, consumir o documento sem reescrevê-lo.
5. Preparar uma spec de implementação delimitada pelo contrato aprovado, identificando
   motor compartilhado, consumidores e testes de regressão. A implementação será uma
   task posterior; não alterar o motor durante esta revisão.

## Critérios de Aceite

- Relatório distingue regra vigente, hipótese da auditoria de 05/10 e decisão nova do autor.
- Abrangência, contagem, descarte e exemplos têm escolha explícita registrada; pendência
  sem escolha fica aberta, não é preenchida com a recomendação anterior.
- Fórmulas de dano e de teste têm contratos separados, preservando os efeitos pretendidos.
- Resultado 33 para `[20,20,9] + 9` aparece como consequência da interpretação anterior,
  não como expectativa obrigatória de implementação antes da escolha.
- A spec de implementação só é preparada com contrato resolvido. Nenhum código do motor,
  consumidor ou teste automatizado é alterado nesta task de revisão.
- P-097 permanece aberto até a execução e verificação da correção aprovada; revisão
  documental sozinha não prova correção do produto.

## Fora de Escopo

- Aplicar +2 automaticamente, mudar contagem de `criticos` ou alterar dano agora.
- Forçar a regra anterior na nova versão do autor; editar `docs/core/` sem aprovação.
- Compensar o bônus somente no NPC ou misturar esta task às fixtures P-095/P-096.
- Implementação de ataque/dano de NPC ou outras mecânicas fora do contrato aprovado.

## Dependências

- Documento revisado do autor ou decisão explícita sobre qual versão rege a correção.
- `docs/core/sistema-v4.1.0.md`, `docs/core/guia_de_mestre-v4.0.0.md`,
  `docs/SYSTEM.SPEC.md`, `docs/CONVENTIONS.md` e skill `regras-do-jogo`.
- [Auditoria m4-19](m4-19-npc-testes-de-atributo-regra-e-rolagem/m4-19-auditoria.md), especialmente a reprodução de
  `rolagem.ts` e a distinção entre regra escrita e motor atual.

## Riscos e Mitigação

- “Mantém só um dado” não resolve a contagem: a nova regra precisa dizer se o bônus
  considera o pool original ou somente os mantidos. A aprovação deve tratar isso.
- Pools genéricos de dano também aceitam margem/keep; corrigir o total indiscriminadamente
  pode contaminar dano. Delimitar os consumidores antes da spec de implementação.
