# transcricoes-09-nuvem-trabalhos-e-retencao.spec.md

> **Task 09/09** do guarda-chuva `transcricoes.spec.md`. **Etapa posterior à V1 local; não implementar no primeiro ciclo sem nova autorização.**

> **Estado: backlog BLOQUEADO; nuvem exige nova autorização mesmo após a V1 local.**
> Decisões pendentes, matriz de acesso e gates: [revisão](transcricoes/revisao.md). Anexos próprios: `transcricoes-09-nuvem-trabalhos-e-retencao/` no mesmo estado; evidência bruta em `.artifacts/transcricoes-09-nuvem-trabalhos-e-retencao/`.

## Objetivo

Integrar processamento em nuvem via credencial do próprio Mestre e armazenamento temporário de gravações com limpeza automática, preservando o editor, a sessão e as transcrições já existentes.

## Entregáveis

1. Submissão privada de WAVs à plataforma para transcrição remota e fila de execução com estados/erros, sem necessidade de aplicativo Windows; validar limites técnicos de rede/storage/provedor e reportar restrições reais sem introduzir cotas comerciais arbitrárias.
2. Integração do adaptador remoto com o contrato de segmentos e participantes, glossário de campanha quando suportado e offsets da linha do tempo, mantendo execuções alternativas separadas e correções protegidas.
3. Retenção configurável **por Mestre** de **24 horas (padrão), 7, 14 e 30 dias (máximo)** contados da conclusão do trabalho; exclusão antecipada; texto permanece após exclusão do WAV.
4. Limpeza de uploads abandonados/falhos após **24 horas de inatividade**, sem apagar objeto em processamento ativo. Considerar falhas parciais, retentativas, idempotência e execução robusta do trabalho de limpeza.
5. Objeto privado com autorização Mestre-scoped e URLs de acesso expiráveis, sem acesso público; status e prazo de exclusão visíveis ao Mestre. Informar retenção separada do provedor externo quando aplicável.
6. Instrumentação de limpeza (sem gravar conteúdo deletado), testes da política temporal e documentação operacional mínima.

7. **Bloqueada:** somente após 01–08 em `done/` e nova autorização explícita da fase nuvem. Infra atual serve imagens/textos publicamente (`/uploads` e URL R2 pública); não gravar WAV privado nesses caminhos. Propor armazenamento privado e autorização de leitura/download com URLs breves; formato/multipart/worker/agendador são D-07/D-08, não escolhas executadas nesta revisão.
8. Reter WAV de trabalho concluído pelos valores aprovados: 24h padrão, 7/14/30d, a partir da conclusão. Para abandonado/falho, 24h de inatividade. Proteção de trabalho ativo exige lease/heartbeat recuperável, não estado “ativo” eterno; definir crash/timeout e referência de múltiplos trabalhos ao mesmo objeto em D-08.
9. Deletar fisicamente blob privado e suas partes de upload quando expirar; metadados relacionais continuam em soft delete/auditoria mínima conforme projeto. Exclusão de blob não é DELETE SQL. Faxina de imagens órfãs com carência de 30d não satisfaz retenção de áudio. Expiração não garante purga pontual se agendador falha: registrar atraso, falha e retentativa.
10. Definir quando exclusão antecipada interrompe trabalho ativo, efeito de mudança da retenção sobre objetos existentes e destino da configuração na troca de Mestre (D-08). Não decidir esses comportamentos silenciosamente; política nunca se aplica aos WAVs locais do Mestre.

## Critérios de Aceite

- Upload WAV autorizado e transcrição via chave própria: resultado aparece nos mesmos editores/exports da V1; conta sem chave recebe orientação, não uso de chave da plataforma.
- Simular relógio/tempo: conclusão com 24h, 7d, 14d, 30d expira apenas no instante definido; inatividade de 24h remove abandonado; processamento ativo protegido até estado resolvido.
- Excluir áudio manualmente não remove texto; ausência de WAV mostra indisponibilidade de reprodução com transcrição editável.
- Usuários de outras campanhas não conseguem ler/upload/baixar gravações; storage não fica público. Provar remoção de objeto, não apenas ocultar na UI.
- Execução com falha de provedor, upload parcial e job duplicado não gera dados duplicados nem retém mídia indefinidamente.
- Gates de testes, lint, integração, verificação visual e segurança conforme padrão do projeto.

- Relógio controlado testa imediatamente antes/no/depois de cada prazo, retry de exclusão, crash do worker, lease expirado, multipart abandonado e objeto com referência ativa. Provar ausência física de blob/partes depois da limpeza bem-sucedida e persistência da transcrição.
- Confirmar inacessibilidade de WAV por URL pública, id trocado e credencial/URL expirada; antiga autorização não concede novos URLs após transferência de Mestre.
- Agendador/retry não deixam estado ativo infinito; medir atraso real da remoção. Excluir áudio não dispara reenvio automático de arquivo local. Testar falhas do provedor sem recorrer a chave/custo de inferência da plataforma.
- Aplicar os [gates comuns](transcricoes/revisao.md#gates-de-implementação) ao recorte desta task e registrar comandos, resultados e limites no anexo proprietário. Critérios são futuros: esta revisão documental não os executou.

## Fora de Escopo

- Assinaturas, créditos de IA pagos pela plataforma, políticas comerciais de armazenamento, consentimento customizado, notificações automáticas a participantes, processamento local em macOS/Linux.

## Dependências

- `transcricoes-08-nuvem-credenciais-byok.spec.md` e tasks 01–07 concluídas; infraestrutura de armazenamento real examinada e custo técnico documentado.

## Riscos e Mitigação

- Uploads de várias horas podem bater limites de serviços: implementar tratamento por multipart/chunks se o serviço exigir e reportar limites técnicos; não declarar tamanho máximo de produto sem decisão do autor.
- Exclusão por agendador falhando: medir sucesso e monitorar erros, garantir retentativas e nunca prometer exclusão se o objeto continuar presente.
