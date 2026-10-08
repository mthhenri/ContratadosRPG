# Precedência de ocultação sobre concessão de ficha de jogador

Origem: [FO-03 da auditoria](auditoria-ficha-oculta-todos-consumidores/ficha-oculta-todos-consumidores.md#fo-03--concessão-anterior-supera-ocultação-em-leitura-e-listagem). **Decisão obrigatória antes da implementação:** formalizar com o autor a precedência de `oculta` sobre acesso explícito histórico, como exigido pela spec investigativa. Comportamento atual confirmado; não é uma correção já aplicada ou autorizada pela auditoria.

## Objetivo

Tornar coerentes listagem, leitura direta, prévias e salas quando uma ficha JOGADOR de terceiro está oculta e tem concessão ativa. O contrato solicitado é ausência para terceiro; dono/mestre mantêm gestão.

## Entregáveis

1. Registrar a decisão de política na fonte normativa adequada antes de alterar comportamento: concessão fica armazenada e temporariamente ineficaz, é revogada, ou possui uma exceção explícita? Não assumir revogação destrutiva. Esclarecer campanha versus ficha avulsa e evitar mudar revelação de criaturas/NPCs.
2. Após decisão, corrigir árbitro `FichaService.avaliarVisibilidadePara` 1366–1400 e consultas `FichaRepository.listarVisiveisParaUsuario` 212–230 e agregado `CampanhaRepository.listarPorUsuario` 171–188. Hoje todas aceitam concessão sem examinar `oculta`; `CampanhaRepository.listarMembros` 443–447 já exclui oculta de terceiro. Preservar carteirinha visível sem conceder ficha completa.
3. Acompanhar `recuperarFichaParaAlvo` 297–326 / `listarFichasParaAlvo`, `CampanhaProjecaoService`, encontro, `RolagemService.listarPorFicha`, páginas completas/anotações/histórico e `CampanhaGateway.entrarSalaFicha` 135–154. Ao ocultar, impedir novas leituras e invalidar acesso anterior à sala `ficha:<id>` antes de entregar mudanças posteriores. Tratar leitor aberto, caches e respostas em trânsito usando a mesma decisão da service.

## Critérios de Aceite

Fixture A oculta com concessão a B: hoje GET lista inclui 12 e GET direto entrega nome. Com política decidida, lista/membros/preview/GET e ingresso em socket concordam. Testar M, A, B, S, mestre em prévia A/B/S, concessão antes/depois de ocultar, revogação e desocultar; registrar se a concessão retorna conforme decisão. Testar websocket já ingressado e reconexão, janela/flutuante aberta e resposta atrasada. Nada amplia acesso completo de ficha visível sem concessão. Se UI afetada, verify em 1920×1080/360×800 com análogo da própria ficha/painel.

## Fora de Escopo

Censura de texto livre, alteração de fórmulas, política de publicação de rolagens, remoção de membros e eliminação de arquivos de avatar já conhecidos. H-01/H-02 ainda requerem investigação para detalhar defeitos específicos além do árbitro.

## Dependências

Decisão de precedência do autor; SYSTEM.SPEC §14; dto-conventions se contratos mudarem; tempo-real. Integrar com [recorte do encontro](fix-ficha-oculta-identidade-encontro.spec.md) e [eventos da campanha](fix-ficha-oculta-eventos-campanha.spec.md), sem duplicar regra de permissão.
