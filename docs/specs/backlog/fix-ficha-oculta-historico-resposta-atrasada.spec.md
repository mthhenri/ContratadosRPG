# fix-ficha-oculta-historico-resposta-atrasada.spec.md

> Correção P-131, confirmada com GET real atrasado em 19/10/2026.

## Objetivo

Impedir que o nome de uma ficha fique no cabeçalho da janela de histórico quando
a primeira resposta autorizada chega depois de a leitura ter sido retirada.

## Entregáveis

1. Conferir a sequência inicial de `HistoricoRolagensJanela`: carga de ficha,
   ingresso em salas e primeira página de histórico. Garantir que uma negação
   posterior neutralize toda identidade da ficha, inclusive `contexto`.
2. Impedir que callbacks anteriores à negação ou à destruição restaurem nome,
   itens e paginação; compartilhar o tratamento do estado negado com P-130.
3. Adicionar regressão da primeira resposta retida, ocultação/revogação antes
   do ingresso na sala e resposta de histórico 403, além de controle autorizado
   de dono/mestre. Registrar execução real e limites junto desta spec.

## Critérios de Aceite

- GET de ficha realmente autorizado é retido no navegador; o dono oculta a
  ficha; liberar o GET e observar a negação da primeira página do histórico.
  Cabeçalho fica neutro, corpo negado, sem nome/id/itens antigos visíveis.
- Caminhos de primeira página, paginação, revogação online e reconexão
  convergem no mesmo estado negado; sem necessidade de reload.
- Verificação em 1920×1080/360×800 com `verify`, regressões focadas e gates
  proporcionais, incluindo `repo:verificar`.

## Fora de Escopo

Mudar o árbitro de permissão, impedir o recebimento retroativo de bytes já
autorizados, reformular histórico ou a política de publicação de rolagens.

## Dependências

- [Evidência P-131](../done/auditoria-ficha-oculta-retomada-cobertura/verificacao.md).
- [P-130](fix-ficha-oculta-leitores-apos-reconexao.spec.md), coordenação no
  arquivo compartilhado; `docs/SYSTEM.SPEC.md` §9/14 e `docs/design/DESIGN.md`.
