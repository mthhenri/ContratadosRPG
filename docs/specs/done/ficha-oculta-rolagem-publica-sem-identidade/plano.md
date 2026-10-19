# Plano — rolagem pública sem identidade

Objetivo: redigir identidade estruturada segundo o observador, preservando
publicação, resultados, texto autoral e conta. Sem alterar fórmulas ou registros.

Arquitetura: `FichaService` conserva o árbitro; serviço específico de identidade
de rolagem aplica o recorte a REST/projeções/WS. Gateway transporta o callback
por usuário, como no encontro. Invalidadores de rolagem só levam campanhaId;
clientes cancelam respostas anteriores e refazem o recorte.

- [x] TDD do feed reservado e rótulo neutro; confirmar falha no comportamento atual.
- [x] DTOs explícitos no shared e service de recorte; projeções usam alvo/null
  espectador, nunca privilégio do mestre requisitante.
- [x] WS por usuário e exclusão sem fichaId quando reservado; invalidadores sem
  identidade ao mudar visibilidade/vínculo e emissão somente depois do save.
- [x] Consumidores de feeds/cartões/prévias/janelas/notificações; cancelar GETs
  anteriores à invalidação, sem inferir permissão no browser.
- [x] REST/WS/app real em papéis e quatro viewports, rolagem antiga/nova, feed
  carregado, resposta atrasada, exclusão e reconexão; gates dos três workspaces.
- [x] Revisão, evidências, contexto, spec/anexos para done e commit separado.

Impacto inicial: `impacto --simbolo RolagemResumoDto` encontrou 32 consumidores e
17 testes; todos os feeds e suas apresentações são pedido/acompanha explícitos.
Contrato OpenAPI deve ser regenerado. Nenhum controle visual novo: análogo é o
cartão de rolagem atual/avulsa do mestre, com a mesma linha de autoria; somente
o rótulo neutro distingue origem reservada de “Mestre”.

Mapeamento independente de consumidores frontend delegado em leitura apenas,
sem iniciar outra spec, para preservar contexto e cobrir respostas em voo.

Fecho: ver verificacao.md. Painel/janela preservam teto anterior de 50 itens usando a projeção segura; não ampliam o histórico para consultas ilimitadas.
