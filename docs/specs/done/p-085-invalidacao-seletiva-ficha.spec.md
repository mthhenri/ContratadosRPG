# p-085-invalidacao-seletiva-ficha.spec.md

> Task 4/6 de requests-correcoes. Origem: P-085.

## Objetivo

Evitar recarregar membros e fichas da campanha por alterações que não modificam esses
recortes, mantendo cartões, condições e permissões sincronizados.

## Entregáveis

1. Na service dona da mutação de ficha, comparar estado persistido anterior/posterior e
   emitir invalidadores apenas para recortes afetados, após sucesso. Remover do
   `backend/src/core/gateway/campanha.gateway.ts` a decisão incondicional de que toda
   ficha alterada implica condições alteradas; gateway permanece transporte.
2. Considerar todas as mutações: PUT completo, ajustes de vitalidade/condições, operações
   de inventário e demais métodos que emitem ficha alterada. Condição automática também
   conta como mudança. Ausente/false equivalentes não devem gerar falso positivo.
3. Coordenar `campanha-detalhe-dados.service.ts` e prévia para não reler listas por todo
   `ficha:alterada`. Invalidar conforme os campos realmente presentes em resumos de ficha
   e membros (inclusive nome, vida/energia e condições). Preferir invalidadores mínimos e
   GET autorizado quando necessário; não replicar projeção/permissão de backend no frontend.
   Se contrato novo for necessário, defini-lo em shared conforme dto-conventions.
4. Agrupar invalidações da mesma mutação/rajada por recurso; resposta antiga não substitui
   resultado mais recente. Não suprimir alteração ocorrida enquanto GET está em andamento:
   marcar nova invalidação e recuperar novamente quando necessário.
5. Preservar `ficha:alterada` para quem usa documento, omissão de privados, recuperação
   completa de dono/mestre (P-080) e ponte de sincronização com Encontro/Cenas.

## Critérios de Aceite

- Editar apenas dinheiro ou anotações: zero GETs das listas de fichas/membros nos painéis.
  GET completo de ficha para preservar privados continua permitido onde necessário.
- Alterar nome/vida/condição: cartões e carteirinhas refletem os valores em todos os papéis
  autorizados. Para uma mutação isolada, no máximo um GET por lista realmente afetada.
- Membro sem acesso à ficha vê condições permitidas sem receber documento privado.
  Criatura/avulsa não provoca recarga de carteirinha de jogador sem alteração nesse recorte.
- Erro da mutação não emite invalidadores; duas mutações durante leitura lenta não deixam
  a segunda fora do resultado. Testar emissor, transportador e consumidores.
- Dois clientes no navegador, captura antes/depois e gate comum. Comparar o cenário
  dinheiro: antes eram quatro GETs de listas; depois devem ser zero.

## Fora de Escopo

Suprimir todos os broadcasts, ampliar dados de sala, remover refetch de privados,
otimizar sincronização interna de Encontro e mudar regras de condições.

## Dependências

Nenhuma task obrigatória do pacote. Integrar sequencialmente com P-083/P-084 devido aos
consumidores compartilhados. Fontes e gates do guarda-chuva e skill tempo-real.
