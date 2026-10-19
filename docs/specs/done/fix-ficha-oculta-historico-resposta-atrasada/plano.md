# Plano — histórico e resposta atrasada

Execução direta, uma spec por vez, conforme autorização do autor.

Objetivo: impedir restauração de identidade após negação na janela de histórico.
Arquitetura: manter a autorização no backend; centralizar a limpeza local da página.
Stack: Angular, RxJS, Vitest, aplicação local Nest/Postgres.
Spec: [P-131](../fix-ficha-oculta-historico-resposta-atrasada.spec.md).

- [x] Escrever regressões de GET inicial atrasado, primeira página/paginação negada,
  revogação antes da resposta, eventos posteriores e destruição. Observar falha.
- [x] Centralizar estado negado na página existente, sem criar responsabilidade nova.
- [x] Rodar regressões, suíte frontend, lint e build proporcionais.
- [x] Observar GET real retido e controle autorizado em quatro viewports; conferir
  pessoalmente 1920×1080/360×800 e registrar limites.
- [x] Atualizar contexto, mover spec/anexos juntos, conferir índice e commitar com coautoria.

Análogo: a própria janela de histórico e `AnotacoesJanela`, ambas com
`JanelaExternaCabecalho`: shell horizontal, título mono, ações Fechar/Voltar,
conteúdo neutro após negação. Sem mudança de template, estilo, ícone ou primitivo.

Impacto: `npm run impacto -- --simbolo HistoricoRolagensJanela`: rota própria e
teste são pedido; referências SCSS de anotações/caderno são falsos positivos
de nome, sem mudança de CSS. P-130 reutilizará a limpeza, em commit posterior.
Foco: identidade residual; resposta depois da revogação/destruição; paginação
em voo; rolagem recebida depois da negação; controles autorizados de dono/mestre.
