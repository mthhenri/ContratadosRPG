# Ausência de agente oculto nos recortes de encontro

Origem: [FO-01 da auditoria](../../auditorias/ficha-oculta-todos-consumidores.md#fo-01--identidade-da-ficha-oculta-na-iniciativa), confirmado REST/WS em 2026-09-29.

## Objetivo

Outro jogador e espectador não recebem o combatente ligado à ficha JOGADOR oculta. Dono e mestre conservam sua visão. Preservar o comportamento de revelação de criatura/NPC.

## Entregáveis

1. Recorte na service dona, antes da serialização, distinguindo ficha JOGADOR oculta de combatente sem concessão de números. Locais da revisão-base da auditoria: `backend/src/modules/encontro/encontro.service.ts`, `montarEstado` 1051–1054, `montarEstadoParaUsuario` 1091–1109, `recuperarEncontroAbertoRedigido` 1148–1161; `encontro-revelacao.ts`, `ocultarCombatente` 43–88 e `ocultarNaoRevelados` 103–125. Dados de ocultação vêm de `EncontroRepository` 202–220; acesso continua arbitrado por FichaService.
2. Coerência de `combatentes`, `ordemRodada`, turno, contagens e eventos após recorte. Definir apresentação durante turno de agente invisível sem ids órfãos, placeholder ou nome. Não alterar a ordem real conduzida pelo mestre. Essa apresentação precisa de discussão visual antes de implementar caso os componentes atuais não cubram o estado.
3. Cobertura dos consumidores `cartao-combatente`, `resumo-combatente`, `iniciativa-leitura`, páginas mestre/jogador e painel espectador, `EncontroPainelDadosService`, GET legado, prévias de jogador/espectador e emissão por usuário de `CampanhaGateway.emitirEncontroAlterado` 586–612.

## Critérios de Aceite

Reproduzir campanha 4/ficha 12/encontro 2, ou cenário sintético equivalente: A oculta, B sem concessão, espectador S. Hoje B/S recebem nome/fichaId; após correção ambos ausentes de payload/listagem/ordem. M/A continuam vendo. Exercitar transições, GET direto, socket, prévias e reconexão. Testes de `encontro-revelacao.spec.ts` exigem ausência de identidade e coerência da ordem, preservando criatura/NPC revelada e não revelada. Se houver UI alterada, usar `verify`, análogo aprovado dos próprios painéis e comparação em 1920×1080/360×800, inclusive turno invisível.

## Fora de Escopo

Rolagens públicas, biblioteca, histórico de cenas e censura de texto livre. Não executar esta correção como parte da auditoria.

## Dependências

Contrato do autor na auditoria; SYSTEM.SPEC §14; skill tempo-real. Resolver a precedência de concessão em [fix-ficha-oculta-concessao-e-leitura](fix-ficha-oculta-concessao-e-leitura.spec.md) antes de validar o cenário com concessão anterior. A remoção de oculta sem concessão já é requisito aprovado; não depende de D-01/D-02.
