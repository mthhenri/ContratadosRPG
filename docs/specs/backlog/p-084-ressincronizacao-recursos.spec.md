# p-084-ressincronizacao-recursos.spec.md

> Task 3/6 de requests-correcoes. Origem: P-084; estado/ficha reproduzidos, demais recursos
> identificados estaticamente e exigem reprodução durante esta task.

## Objetivo

Após reconexão, recuperar o estado autorizado dos recursos carregados sem perder edições
locais, incluindo alterações cujos eventos ocorreram durante a queda.

## Entregáveis

1. Em `campanha/paginas/detalhe/campanha-detalhe-dados.service.ts`, coordenar recuperação de
   campanha/estado, membros, fichas, inventário já carregado e feed. Em detalhe-jogador,
   recuperar também documento selecionado mesmo que seu ID não mude.
2. Em `encontro/paginas/painel/encontro-painel-dados.service.ts` (ou sucessor em Cenas),
   incluir histórico de rolagens além do painel. Conferir prévia/espectador e janelas abertas:
   usar suas rotas/projeções autorizadas, nunca endpoints do mestre como fallback.
3. Reconciliar feed por ID sem duplicar eventos recebidos durante a recuperação nem ressuscitar
   itens excluídos por resposta antiga. Manter limite atual de histórico e recorte público/privado.
4. Preservar edição pendente e campos privados ao recuperar ficha: usar coordenação/merge
   de P-082; falha não deve marcar edição salva. Respostas de campanha/seleção anterior são ignoradas.
5. Se acesso for revogado durante a queda, limpar conteúdo que deixou de ser autorizado e
   apresentar o estado existente de acesso negado. Falha transitória permanece recuperável,
   sem loop de retries ilimitado. Recursos nunca abertos não precisam ser antecipados;
   inventário adiado da task 6 será invalidado para leitura na próxima abertura.

## Critérios de Aceite

- Dois usuários: confirmar socket fechado, alterar estado, dinheiro da ficha, item de inventário
  e rolagens durante a queda; reconectar sem reload. Dados carregados convergem ao servidor.
- Repetir com rolagem excluída e evento chegando durante GET lento: sem duplicação/ressurreição.
- Repetir com edição local pendente: conteúdo local não some e salva somente na ficha de origem.
- Jogador/espectador não recebem rolagem privada, anotações alheias ou dados de ficha sem acesso;
  testar revogação durante queda. Não basta observar ausência visual: conferir respostas.
- Testes focados das fontes de dados, feed e coordenação de ficha; navegador e gate comum.
  Documentar inventário/feed/Encontro efetivamente reproduzidos antes de encerrar P-084.

## Fora de Escopo

Polling periódico, replay durável de eventos, sincronização offline completa e histórico ilimitado.

## Dependências

p-082-ficha-autosave-e-selecao e p-083-reconexao-sem-carga-duplicada concluídas.
Fontes, compatibilidade Cenas e gates do guarda-chuva.
