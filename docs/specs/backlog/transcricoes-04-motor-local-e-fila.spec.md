# transcricoes-04-motor-local-e-fila.spec.md

> **Task 04/09** do guarda-chuva `transcricoes.spec.md`. Inferência local e processamento resiliente.

> **Estado: backlog; preparação documental. Implementação depende de aprovação expressa do autor.**
> Decisões pendentes, matriz de acesso e gates: [revisão](transcricoes/revisao.md). Anexos próprios: `transcricoes-04-motor-local-e-fila/` no mesmo estado; evidência bruta em `.artifacts/transcricoes-04-motor-local-e-fila/`.

## Objetivo

Transcrever WAVs individuais no computador do Mestre com Faster-Whisper, oferecendo configurações automáticas/avançadas e fila persistente, cancelável e recuperável por arquivo.

## Entregáveis

1. Worker local de inferência com suporte a GPU NVIDIA compatível e fallback CPU; estratégia de detecção da disponibilidade real (driver, CUDA/cuDNN, memória e modelo) e erros legíveis. Utilizar script `transcrever.py` do autor como caso de migração, não copiar configuração `small/cpu/int8` como padrão universal.
2. Modo automático sugerindo melhor configuração compatível; modo avançado permitindo modelo, CPU/GPU, idioma, VAD e parâmetros de decodificação com validação. Registrar modelo efetivo, idioma, parâmetros, backend e versão para reprodutibilidade. Português sugerido inicialmente, alterável.
3. Glossário por campanha aplicado como **contexto** de reconhecimento sem impor texto não dito; silêncios e segmentos vazios não são preenchidos com frases inventadas por pós-processamento.
4. Fila local armazenada em disco, com estados por faixa, progresso exibido, cancelamento e erro isolado; fechar/reabrir o aplicativo preserva tarefas pendentes e resultados concluídos. Interromper um WAV no meio pode exigir começar aquele WAV do início.
5. Persistência local dos segmentos produzidos com início/fim, texto bruto e metadados da execução; preparação para sincronização posterior, sem perda de resultados em desconexão.
6. Bateria de comparação documentada do `small` usado anteriormente versus configuração automática no novo motor, com trechos reais somente mediante autorização e sem publicar áudio privado no Git.

7. Worker consome contrato da 01 e lote confirmado da 02; caminho relativo/absoluto é local ao app e não executa comandos derivados do arquivo. Persistir estado por arquivo atomicamente e separar concluído, falho, cancelado/interrompido e pendente; saída parcial não é resultado final.
8. Modelo já instalado deve operar offline; baixar modelo/dependência faltante exige rede e mensagem explícita. Registrar origem, versão/integridade e licença dos binários/modelos na documentação de distribuição aprovada, sem prometer execução offline no primeiro download.
9. Tratar arquivo removido/alterado após importação, disco cheio, falta de memória GPU/CPU, runtime incompatível e queda do processo durante gravação. Recuperação valida integridade antes de retomar por arquivo; concluídos permanecem identificáveis e preservados.

## Critérios de Aceite

- Execução demonstrada em Windows com GPU NVIDIA compatível e em caminho CPU físico, com seleção automática/fallback funcional; simulação é evidência complementar e não fecha hardware não observado.
- Fila de múltiplos arquivos: concluir A, interromper B, reabrir app → A permanece concluído, B pode recomeçar e C segue pendente; falha em uma faixa não elimina outras.
- Cancelamento não publica arquivo parcialmente transcrito como concluído; estado/saída são consistentes após reinicialização.
- Progresso comunicado como estimativa quando não for mensurável de forma estrita; teste de sessão com silêncio longo e falas simultâneas em faixas distintas.
- Testes do worker/armazenamento local e validação manual do uso real com múltiplos WAVs de duração representativa; resultados e limites anotados, sem inventar taxa de erro garantida.

- Windows físico CPU e GPU NVIDIA compatível são gates da V1; VM/mocks provam instalação/transições, não desempenho/compatibilidade CUDA. Se hardware obrigatório faltar, task continua aberta, com lista do que foi simulado.
- Testar reinício abrupto durante persistência, disco cheio e falha/OOM do worker: A concluído não muda, B incompleto não sincroniza como concluído, C continua pendente. Cancelamento/retry não gera duas execuções finais da mesma tentativa.
- Comparação com baseline `small` usa o mesmo corpus, transcrição de referência e configurações registradas (tempo, memória, erros de termos e WER/CER se referência disponível). Não escolher padrão universal nem limiar de qualidade sem evidência/aprovação; script histórico ausente é limite registrado.
- Aplicar os [gates comuns](transcricoes/revisao.md#gates-de-implementação) ao recorte desta task e registrar comandos, resultados e limites no anexo proprietário. Critérios são futuros: esta revisão documental não os executou.

## Fora de Escopo

- Nuvem/API paga, detecção automática de alucinações, revisão editorial automática, retranscrição de trechos e recuperação intra-arquivo.
- Suporte obrigatório a todas as GPUs e garantia de tempo de transcrição.

## Dependências

- `transcricoes-02-importacao-e-glossario.spec.md`; `../done/transcricoes-03-agente-windows-e-vinculo.spec.md`; Faster-Whisper e runtime do aplicativo validados em hardware alvo.

## Riscos e Mitigação

- CUDA/cuDNN no hardware variado: checagem antes da inferência, alternativa CPU explícita e diagnóstico sem stack trace para usuário final.
- Longas gravações: iterar/consumir segmentos sem reter tudo desnecessariamente na RAM; gravar resultados de forma resistente a falhas.
