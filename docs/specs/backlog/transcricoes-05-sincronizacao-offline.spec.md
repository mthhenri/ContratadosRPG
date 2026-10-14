# transcricoes-05-sincronizacao-offline.spec.md

> **Task 05/09** do guarda-chuva `transcricoes.spec.md`. Entrega de resultados, offline e segurança de edição.

> **Estado: backlog; preparação documental. Implementação depende de aprovação expressa do autor.**
> Decisões pendentes, matriz de acesso e gates: [revisão](transcricoes/revisao.md). Anexos próprios: `transcricoes-05-sincronizacao-offline/` no mesmo estado; evidência bruta em `.artifacts/transcricoes-05-sincronizacao-offline/`.

## Objetivo

Sincronizar as transcrições geradas pelo aplicativo local com o site de maneira segura e idempotente, sem interromper a inferência offline e sem sobrescrever correções realizadas pelo Mestre.

## Entregáveis

1. Contrato de submissão de transcrição por faixa/execução, com identidade única estável por trabalho e proteção contra reenvio; validar permissão de Mestre e vínculo da sessão no backend antes de gravar resultados.
2. Outbox persistente no aplicativo: resultados concluídos aguardam autorização/conectividade, com retentativas, confirmação inequívoca do servidor e estados visíveis (`aguardando`, `sincronizando`, `sincronizado`, `falha`). Não descartar payload não confirmado.
3. Fluxo offline: tarefas autorizadas já presentes continuam mesmo sem internet; nova autorização/acesso ao servidor é exigida quando necessário, sem bypass de revogação.
4. Semântica de edição: texto original imutável, texto corrigido vigente sob propriedade do servidor; reenviar resultado idêntico não altera edição; nova execução gera **resultado alternativo separado** a ser explicitamente selecionado pelo Mestre, sem substituição automática.
5. Auditoria operacional mínima (IDs de execução, estado, falhas e confirmação), sem dados de transcrição e credenciais em logs.

6. Idempotência é garantida no banco, com unicidade transacional no escopo da execução/faixa e confirmação estável. Reenvio de mesma identidade/payload retorna confirmação anterior; mesma identidade com payload diferente gera conflito sem sobrescrever original/correção. Nova execução tem outra identidade, nunca deduplicação apenas por nome do WAV.
7. Tratar confirmação perdida, mensagens fora de ordem, duas submissões simultâneas e servidor que reinicia. Separar persistência do lote de sua marcação final; não exibir faixa incompleta como concluída. Tamanho técnico real do JSON e estratégia de lotes devem ser medidos/documentados sem inventar cotas comerciais.
8. Na reconexão, reler autorização da conta/dispositivo e Mestre atual, inclusive antes de devolver confirmação antiga. 401/403/recurso inacessível pausam outbox com orientação; erro transitório retenta com atraso controlado sem laço agressivo. Não perder resultados por exclusão de sessão/revogação; resolução manual da pendência fica sujeita a D-03.
9. A ingestão não aceita campos editoriais; o servidor resolve ids dos pais e aplica a política de execução selecionada da 01/06. Offline aprovado é o processamento local já autorizado, não promessa de site/editor disponível integralmente sem rede.

## Critérios de Aceite

- Teste E2E: dois WAVs processados, queda de conexão antes de enviar, reinício, retomada e sincronização posterior → uma única gravação por execução e conteúdo integral.
- Corrigir segmento pelo site, reenviar o mesmo resultado N vezes e depois outra execução: correção permanece intacta e novo resultado fica separado; teste concorrente valida transições.
- Testar expiração/revogação de vínculo, acesso à campanha revogado, sessão excluída, transferência de papel e tentativa de upload de outro usuário; todos exigem autorização atual.
- Testes de outbox com resposta HTTP perdida após commit no servidor, para comprovar idempotência real.
- Nenhuma chamada envia WAV no caminho de transcrição local.

- Submeter simultaneamente o mesmo resultado e simular resposta perdida após commit: contagem final única e confirmação inequívoca. Reenvio idêntico preserva correção; payload diferente na mesma chave falha; execução nova aparece separada.
- Falha durante lote não deixa faixa marcada concluída; retry recupera estado confirmado e não mistura segmentos de execuções distintas.
- Reconectar com tokenVersao antigo, dispositivo revogado, papel transferido ou sessão/campanha excluída impede leitura e escrita, inclusive do recibo anterior; resultado continua local, sem migrar automaticamente para outra campanha/conta.
- Aplicar os [gates comuns](transcricoes/revisao.md#gates-de-implementação) ao recorte desta task e registrar comandos, resultados e limites no anexo proprietário. Critérios são futuros: esta revisão documental não os executou.

## Fora de Escopo

- Áudio em cloud, sincronização dos próprios arquivos WAV, histórico completo de versões e mesclagem automática entre execuções alternativas.

## Dependências

- `transcricoes-01-sessoes-e-contratos.spec.md`, `transcricoes-03-agente-windows-e-vinculo.spec.md`, `transcricoes-04-motor-local-e-fila.spec.md`.

## Riscos e Mitigação

- Requisição bem-sucedida com resposta perdida: idempotência por chave/resultado no servidor, nunca por confiança no cliente.
- Edição durante sincronização: separar ingestão da escrita editorial e guardar original/atual separadamente.
