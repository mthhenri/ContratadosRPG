# Revisão independente da task 03

Revisor `review_transcricao_03`, somente leitura, uma rodada sobre o diff da base
`d7e6892e` e todos os arquivos novos. Fonte: spec/design aprovado. Dois P2:

- Pedido pendente podia receber 401 no DELETE de dispositivo e perder segredo
  local sem cancelar pedido, permitindo confirmação posterior. Corrigido com
  cancelamento por prova do segredo, transação que serializa com confirmação e
  preservação do segredo caso revogação não seja confirmada. RED em
  `PendingLinkTests.test_401_during_pending_disconnect_does_not_forget_unrevoked_secret`;
  GREEN em desktop, SQL e REST, inclusive confirmação que vence a corrida.
- Pedido confirmado no browser, antes do refresh, podia ter segredo sobrescrito
  por novo vínculo. Corrigido ao impedir substituição enquanto houver segredo ou
  pedido anterior sem desconexão. RED em
  `PendingLinkTests.test_confirmed_but_not_refreshed_secret_is_never_overwritten`;
  GREEN no núcleo e suíte Qt.

Sem segunda revisão. Correções verificadas pelo implementador com testes reais;
revisor não recertificou host Windows ou capturas. Nenhum achado menor deferido.

Não julgados: build/instalação Windows, DPAPI nativa, IPC, desinstalação, antivírus,
licenças empacotadas e DPI — gates abertos, não bugs demonstrados. Arquivamento
preserva o contrato da 01 (distinto de exclusão, não revoga acesso), sem nova
semântica introduzida nesta task. Consequência: sessão arquivada sai da listagem
padrão; acesso autorizado por ID conserva a semântica já aprovada.
