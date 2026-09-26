# requests-inventario-sob-demanda.spec.md

> Task 6/6 de requests-correcoes. Oportunidade confirmada: inventário do esquadrão baixado
> com aba fechada, no desktop e mobile. Não é falha de autorização.

## Objetivo

Buscar inventário do esquadrão na primeira necessidade e mantê-lo consistente ao reabrir,
evitando tráfego por uma área que o usuário não consultou.

## Entregáveis

1. Separar em fonte de dados os estados não carregado, carregando, pronto, desatualizado
   e erro; lista vazia não representa todos esses estados. Mestre/jogador solicitam dados
   ao abrir a área de inventário; se ela iniciar visível, carregar normalmente.
2. Remover inventário da carga inicial quando painel está fechado. Primeira abertura dispara
   uma consulta compartilhada; cliques repetidos durante carga não duplicam GET.
3. Evento real de inventário com painel fechado só marca desatualizado. Ao abrir, um GET
   recupera o estado atual; sem invalidação, reabrir reutiliza o conteúdo da mesma campanha/sessão.
   Com painel aberto, recuperar após evento. Invalidar também na reconexão.
4. Mutação local que retorna inventário completo pode aplicar resposta; coordenar eco do
   evento para não perder alteração concorrente. Mudança de campanha/usuário ou perda de
   permissão limpa o estado. Recursos fechados não mantêm retry em segundo plano.
5. Reusar estados visuais existentes do inventário e shared/ui para carga/erro/retry.
   Operações que precisem do inventário antes de abrir o painel devem requisitá-lo
   explicitamente pela mesma fonte, sem acessar uma lista artificialmente vazia.

## Critérios de Aceite

- Entrar na campanha com Rolagens ativa: zero GETs de inventário até sua primeira necessidade.
  Abrir: um GET; fechar/reabrir sem mudança: zero adicionais.
- Outro usuário muda item com painel fechado: zero GET enquanto fechado; reabrir mostra
  valor correto após uma consulta. Repetir com vários eventos e reconnect enquanto fechado.
- Painel aberto durante mudança/reconnect converge sem duplicação por um mesmo gatilho;
  evento durante GET lento não se perde e exige nova leitura se necessário.
- Erro inicial permite retry ao usuário; vazio verdadeiro aparece somente depois de resposta
  vazia bem-sucedida. Trocar campanha não reaproveita itens anteriores.
- Testes da fonte de dados e consumidores; navegador em 1920×1080/360×800, comparação com
  painel existente para estados de carga/vazio/erro e gate comum.

## Fora de Escopo

Cache persistente, cache global entre campanhas, adiar outros painéis, paginação de inventário
e novos componentes visuais sem aprovação do autor.

## Dependências

p-084-ressincronizacao-recursos e p-086-estado-campanha-sem-refetch concluídas.
Fontes/gates do guarda-chuva; DESIGN e skills verify/design-fidelity para os estados visuais.
