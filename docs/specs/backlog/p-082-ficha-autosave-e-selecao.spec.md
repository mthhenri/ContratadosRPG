# p-082-ficha-autosave-e-selecao.spec.md

> Task 1/6 de requests-correcoes. P-082, prioridade alta; gravação incorreta reproduzida.

## Objetivo

Garantir que uma edição seja salva somente na ficha em que foi feita e que a tela apresente
apenas a última ficha selecionada, independentemente da ordem de respostas.

## Entregáveis

1. Em `frontend/src/app/modules/ficha/ficha-edicao.service.ts`, vincular cada intenção de
   salvamento a ID, documento e revisão local da origem. O debounce não pode consultar o ID
   de uma seleção posterior. Serializar escritas da mesma ficha; não cancelar uma escrita
   enviada presumindo que o servidor a desfez. Uma resposta anterior não apaga edição posterior.
2. Em `campanha/paginas/detalhe-jogador/detalhe-jogador.page.ts`, coordenar a troca:
   se há edição pendente, antecipar seu envio e concluir a gravação antes de trocar; durante
   isso não permitir edição concorrente nem outra troca efetiva. Se falhar, manter ficha e
   edição de origem com indicação de falha/retry pelos padrões existentes. Sem descarte silencioso.
3. Ao iniciar a leitura da nova ficha, retirar o documento antigo da região editável e usar
   carregamento existente. Cancelar/ignorar leituras obsoletas por ID/geração; loading, erros,
   base de merge e respostas de escrita também pertencem à mesma origem.
4. Auditar os consumidores de FichaEdicaoService para manter o comportamento em ficha completa
   e embutida. Ao destruir o consumidor, não deixar resposta tardia alterar outra instância;
   não ampliar esta task para um sistema geral de rascunhos persistentes.
5. Regressões automatizadas com relógio controlado e respostas reordenadas, seguidas dos
   cenários reais abaixo. Avaliar extração da coordenação para service se a página extensa
   ganharia nova responsabilidade; não duplicar a fila em cada consumidor.

## Critérios de Aceite

- Alfa $123: editar para $456 e selecionar Beta antes de 500 ms, com GET Beta atrasado 1,5 s.
  Há PUT apenas para Alfa com seus dados; leitura posterior comprova Alfa $456 e Beta intacta.
- Repetir sem atraso: a edição de Alfa não se perde e nenhum PUT desnecessário vai para Beta.
- Selecionar Beta → Alfa com respostas invertidas: última seleção vence; nome, dados, link
  Abrir completa e autorização de edição correspondem todos a Alfa.
- Simular falha do PUT: seleção não muda, edição continua recuperável, retry salva a origem.
  Simular falha/403/404 do GET: não mostrar documento anterior como se fosse a nova ficha.
- Duas edições durante gravação lenta: persistir a mais recente, sem resposta antiga apagar
  seu estado ou marcar pendência como salva antes da confirmação correspondente.
- Evento remoto/reconexão durante edição respeita merge existente e campos privados (P-080).
- Testes focados do service/página e gate comum do guarda-chuva. Navegador mestre/jogador
  em desktop/mobile; registrar URLs e corpos de teste e confirmar persistência por leitura.

## Fora de Escopo

Reduzir GETs por eventos, alterar permissões, substituir autosave por botão manual,
implementar versionamento otimista no backend ou recuperação de dados históricos.

## Dependências

Nenhuma outra task deste pacote. Fontes e gates de requests-correcoes.spec.md; relatório P-082.
