# Eventos de campanha sem identidade de ficha oculta

Origem: [FO-02 da auditoria](../../auditorias/ficha-oculta-todos-consumidores.md#fo-02--eventos-identificam-ficha-oculta-para-a-sala-ampla).

## Objetivo

Evitar que eventos da sala ampla revelem nome, identificadores ou recursos de uma ficha oculta de terceiro. Manter a atualização dos recortes autorizados do mestre/dono e a limpeza do que antes era visível.

## Entregáveis

1. Revisar a decisão de emissão em `FichaService.criarFicha` 160–205 / `atribuirCampanha` 1245–1254 / `alterarFicha` 508–520 e emissão `CampanhaGateway.emitirFichaCriada` 365–388, `emitirFichaVisibilidadeAlterada` 345–348 e `emitirFichaRemovidaDaCampanha` 335–338. Causa: resumo e ids são enviados uma vez para toda sala, independente de ocultação. Definir invalidador sem identidade ou emissão por observador autorizada pela service; gateway só transporta.
2. Ajustar contratos em `shared/src/dtos/ficha/ficha-operacao.dtos.ts` (`FichaVisibilidadeAlteradaDto` 551+, `FichaCampanhaRemovidaDto` 574+) apenas se necessário, seguindo dto-conventions. Auditar também flags de `ficha:recortes-alterados`: não acrescentar fichaId; documentar eventual inferência residual de atividade sem identidade.
3. Adequar assinantes em `TempoRealService`, `CampanhaDetalheDadosService` 210–231, `CampanhaPreviaJogadorDadosService` 175+, e grade da cena sem iniciativa. O cliente refaz GET autorizado e remove seleção/leitor quando necessário; filtragem local não substitui autorização de payload.

## Critérios de Aceite

B conectado à campanha recebe hoje `{ fichaId: 12, campanhaId: 4 }` ao ocultar; vincular ficha já oculta chama broadcast de resumo completo. Testar com sockets reais de mestre, dono, outro jogador e espectador: criar/vincular oculta, ocultar previamente visível, mover/retirar, desocultar, alterações de estado e reconexão. B não recebe identidade da oculta, mestre/dono se atualizam e o estado antes visível desaparece sem recarregar. Testes de gateway verificam payload e destinatário, não só nome de evento. Gate visual via verify em 1920×1080/360×800 se modificar comportamento exibido.

## Fora de Escopo

Evento público de rolagem (D-01), apresentação de turno invisível e mudanças em conta/membro. Não alterar produção nem corrigir durante auditoria.

## Dependências

SYSTEM.SPEC §9/14 e skill tempo-real; consultar [fix-ficha-oculta-concessao-e-leitura](fix-ficha-oculta-concessao-e-leitura.spec.md) para destinatários com concessão. Preservar emissão pós-persistência e salas separadas do espectador.
