# fix-ficha-oculta-leitores-apos-reconexao.spec.md

> Correção P-130, confirmada na retomada de 19/10/2026; sem implementação na auditoria.

## Objetivo

Retirar o documento e a identidade de uma ficha quando o leitor perde a
permissão durante a desconexão, assim que a conexão retorna e a autorização é
revalidada. Dono/mestre mantêm os respectivos direitos.

## Entregáveis

1. Revalidar a ficha flutuante aberta no `reconexao$`, independentemente do
   hospedeiro. Após 403/404, fechar e limpar o alvo/documento e impedir que
   resposta antiga ou reabertura pendente o restaure. Conferir os consumidores
   combate, Investigação e detalhe do mestre; não depender só do combatente
   ainda existir na grade ou de receber novamente `acessoRevogado$`.
2. Na página completa de jogador, tratar a negação no refetch de reconexão
   limpando o documento e usando o fluxo canônico de saída. Conferir também o
   caminho análogo de criatura por revogação de concessão, sem aplicar a regra
   de ocultação de jogador a criatura/NPC. Não tratar todo erro de rede/500
   como revogação; distinguir falha transitória de perda de autorização.
3. Na janela de histórico, centralizar o estado negado de modo que cabeçalho,
   itens, paginação e callbacks em voo não mantenham identidade depois de
   negação, inclusive por reconexão. Coordenar com a task da carga inicial.
4. Testes de regressão de resposta negada e atrasada, preservação de dono/mestre
   e transição visível→oculta→visível; evidência ao vivo com evento perdido.
   Artefatos e relatório seguem `SYSTEM.SPEC.md` §3.1.

## Critérios de Aceite

- Abrir A por B com concessão; derrubar API **isolada**; ocultar somente a ficha
  sintética no banco sem evento; subir API. GET por B é 403 e nenhuma janela,
  página ou cabeçalho continua exibindo A após a revalidação, sem reload.
- Repetir com revogação durante a queda e criatura concedida. Dono/mestre
  continuam lendo e a ficha volta a poder ser aberta quando o árbitro autoriza.
- Uma resposta anterior liberada após negação não repovoa o documento. Falha
  transitória tem estado coerente e permite nova tentativa.
- `verify` em 1920×1080/360×800 e viewports adicionais do contrato visual;
  testes focados, lint/build proporcionais e `repo:verificar` aprovados.

## Fora de Escopo

Reimplementar FO-01/02/03, trocar regra de concessão, avatar, rolagem pública,
médias, revelação de NPC/criatura ou censurar conteúdo já recebido fora do app.

## Dependências

- [Evidência P-130](../done/auditoria-ficha-oculta-retomada-cobertura/verificacao.md).
- `docs/SYSTEM.SPEC.md` §9/14, `docs/design/DESIGN.md`; skills `verify`,
  `tempo-real`, `gerenciamento-de-impacto` e `design-fidelity` quando aplicável.
- [Histórico inicial atrasado](../done/fix-ficha-oculta-historico-resposta-atrasada.spec.md)
  compartilha arquivo; coordenar sem duplicar a responsabilidade de estado negado.
