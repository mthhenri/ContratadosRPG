# Plano — leitores após reconexão

Objetivo: aplicar 403/404 de revalidação ao documento aberto, sem tomar rede/500
por revogação. Execução direta; spec anterior commitada em `0c0f4b25`.

Arquitetura: operador RxJS local do módulo de ficha para cancelar consultas
superadas e tratar negação; páginas mantêm seus fluxos de saída e merge; filho
da flutuante revalida e informa o pai, que fecha também o alvo pendente.

- [x] TDD: 403/404, transitório com nova tentativa, resposta superada e revogação
  em voo nos leitores de jogador/criatura e histórico.
- [x] Implementar operador, revalidação no filho, fechamento pelo pai, limpeza
  terminal nas páginas e erro transitório no histórico.
- [x] Testes focados, integração e lint/build; medir consumidores da flutuante.
- [x] App real: ocultação e revogação de criatura durante queda de API isolada;
  dono/mestre mantidos, reabertura autorizada, quatro viewports.
- [x] Revisar, documentar, mover spec/anexos e commitar separadamente.

Análogo: estados canônicos das próprias páginas/ficha flutuante e saída por
revogação online; sem novo layout/controle. Demais hospedeiros: combate mestre/
jogador, Investigação e detalhe mestre são pedido/acompanha expressamente
cobertos. `impacto --simbolo FichaFlutuanteConteudo` encontrou o pai e seus
testes; não há API externa ou primitivo a ampliar.

Limites: autorização segue no backend; HTTP 403/404 define negação, erro transitório
é tratado sem apagar concessão. P-131 fornece a transição neutra do histórico.
