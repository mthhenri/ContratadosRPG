# Plano — médias no conjunto visível

1. Preservar as duas edições anteriores da Oficina local: banco de auditoria
   copiado, cópia de trabalho reconciliada com a publicada somente nesse banco.
   Acrescentar a política aprovada na introdução de Novo Agente, publicar 4.1.5
   pela API da Oficina e exportar pela ferramenta oficial. Produção não é alvo.
2. Reutilizar `FichaService.listarFichas` como árbitro do conjunto autorizado.
   Filtrar apenas jogador e agregar em função pura shared, sem duplicar a
   permissão em SQL nem recalcular na UI. Remover o agregado global obsoleto.
3. TDD de conjunto personalizado, vazio, tipos não jogador, médias fracionárias
   e negações; fórmulas de redução/arredondamento permanecem intactas.
4. Guia usa a média autorizada da API. Corrigir texto que inferia campanha vazia
   quando só não há fichas visíveis. Análogo: etapa Novo agente do próprio guia,
   mesmos controles, shell e aviso; nenhuma variante/controle novo.
5. Mapa impacto, REST A/B/M/S e concessão suspensa, guia nos quatro viewports,
   testes/build/lint proporcionais, revisão, contexto, done e commit próprio.

O recorte usa visibilidade individual efetiva (dono/concessão/mestre), não o
filtro global oculta=false. Prévia não consulta atualmente o agregado; se vier
a consultar, precisa usar a identidade do alvo.
