# p-086-estado-campanha-sem-refetch.spec.md

> Task 5/6 de requests-correcoes. Origem: P-086.

## Objetivo

Aplicar o estado Na Base/Em Missão recebido da mutação ou evento sem buscar novamente
campanha e inventário quando seus demais dados não mudaram.

## Entregáveis

1. No consumidor de estado de `campanha-detalhe-dados.service.ts`, filtrar campanha
   e aplicar `naBase` do evento preservando os demais campos; ajustar mestre/prévia
   quando forem consumidores do mesmo fluxo.
2. Resposta da mutação e eco do evento são idempotentes e não produzem GET adicional.
   Impedir que carga inicial/recuperação anterior ao evento restaure estado antigo.
3. Preservar carregamento inicial, recuperação por reconexão e invalidação por evento real
   de inventário. Falha de mutação usa feedback existente e não deixa estado otimista incorreto.
   Backend continua autorizando escrita de inventário conforme estado; não mudar essa regra.

## Critérios de Aceite

- Clique do mestre Na Base → Em Missão → Na Base: jogador/mestre convergem sem reload.
  Por alteração bem-sucedida: um PUT do autor, zero GETs de campanha/inventário causados pelo evento.
- Evento de outra campanha não altera a atual; resposta/evento duplicados não geram tráfego.
- Evento chega durante GET lento: valor novo permanece após leitura antiga terminar.
- Alterar item de inventário ainda propaga; reconexão ainda recupera estado perdido.
- Testes focados e captura em dois clientes, desktop/mobile; gate comum do guarda-chuva.

## Fora de Escopo

Carregamento inicial sob demanda (task 6), mudanças de permissões, novo endpoint e redesign.

## Dependências

Nenhuma obrigatória. Integrar com P-084 preservando sua ressincronização.
Fontes e gates do guarda-chuva; contrato existente de estado em shared.
