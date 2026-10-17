# transcricoes.spec.md

> **ABANDONADA em 2026-10-17 por decisão expressa do autor.** Integração desativada;
> arquivamento não significa entrega concluída. O fluxo Python pessoal permanece local.
> Este aviso substitui os estados e autorizações anteriores preservados abaixo.
> Ver [desativação](transcricoes-desativacao.spec.md).

> **Guarda-chuva — Contratados Transcriber.** Decisões do autor consolidadas em 2026-10-14. **Não implementar diretamente:** dividir pelas tasks `transcricoes-01` a `transcricoes-09` abaixo, cada uma com spec própria. A numeração identifica a sequência do módulo, não uma prioridade concorrente aos milestones existentes.

> **Estado: proposta em backlog.** Aprovar documentação não autoriza implementação. Tasks 01–07 formam a primeira entrega local; 08–09 ficam bloqueadas até nova autorização.
> Registro original preservado em [decisões](transcricoes/decisoes-originais.md); [revisão e mapa](transcricoes/revisao.md).

## Objetivo

Integrar ao ContratadosRPG uma ferramenta de transcrição de sessões de RPG multifaixa, voltada a Mestres de qualquer campanha. A primeira entrega processa áudio **localmente por aplicativo Windows instalado**, vinculado à conta no site; uma etapa seguinte acrescenta transcrição **na nuvem com chave de API do próprio Mestre**, mantendo sessões, editor e resultados no mesmo produto.

## Decisões de produto fechadas (autor, 2026-10-14)

1. **Público e acesso:** recurso utilizável por Mestres das respectivas campanhas; gravações, transcrições, edição e exportação são privadas do papel `MESTRE`. Jogadores e espectadores não recebem dados, metadados sensíveis nem meios de acesso por URL/API. Não confundir papel global de conta com papel de campanha.
2. **Arquitetura híbrida:** os motores local e nuvem terão uma representação de saída interoperável, sem dependência do provedor no editor. Ordem obrigatória: **local primeiro, nuvem em etapa posterior**.
3. **Distribuição local:** aplicativo auxiliar **Windows com instalador** e vinculação à conta Contratados. Não exigir instalação manual de Python; GPU NVIDIA quando suportada, CPU como alternativa. macOS e Linux são futuro.
4. **Acionamento integrado:** Mestre abre campanha/sessão no site e aciona **Abrir no aplicativo**. A aplicação local importa os arquivos e processa; o site administra os resultados. Não enviar os WAVs locais à plataforma só para usar a GPU local.
5. **Entrada prioritária:** gravações do bot **Craig (Discord), faixas separadas em WAV**. Suportar associação por arquivo/participante e múltiplas faixas; outros formatos/fontes são uma extensão viável sem assumí-los como garantidos. Não exigir que o participante seja obrigatoriamente um usuário cadastrado.
6. **Sincronismo:** verificar alinhamento dos WAVs e preservar silêncios/timestamps absolutos; oferecer ajuste manual de deslocamento **por faixa**; permitir falas simultâneas na consolidação. Não declarar alinhamento automático perfeito sem validação.
7. **Identificação:** sugerir associação automática por nomes de arquivo/associações existentes da campanha; Mestre confirma ou corrige antes de iniciar. Reutilizar mapeamentos confirmados nas sessões seguintes.
8. **Vocabulário:** **glossário por campanha** com gestão pelo Mestre e utilização contextual pelo motor, sem substituições automáticas indiscriminadas. Glossário global e por sessão são futuras funcionalidades.
9. **Configuração do motor:** modo automático como padrão, com opções avançadas (modelo, CPU/GPU, idioma, parâmetros de reconhecimento e VAD). Português como padrão sugerido, alterável. Registrar configurações efetivas de cada execução; qualidade e hardware determinam compatibilidade, sem garantia universal de execução do mesmo modelo.
10. **Fila local:** persistente, progresso por arquivo, cancelamento, isolamento de falhas, preservação de arquivos concluídos e retomada dos pendentes. Recuperação **por arquivo**, não checkpoints internos.
11. **Offline:** trabalho local continua durante a perda de conexão, preservando fila e resultados em disco; ao retornar a conexão, sincronização automática e idempotente, condicionada à autorização válida. Nenhum resultado local é eliminado antes de confirmação do servidor.
12. **Visualizações:** transcrições **individual e cronológica consolidada** sobre os mesmos segmentos, com edição sincronizada; cada segmento associa faixa/participante, início, fim, texto original do motor e texto corrigido.
13. **Revisão V1:** manual simples, com navegação por timestamp e reprodução do trecho de áudio quando disponível. Reprodução de WAV local **não deve presumir acesso do site ao disco**: exigir reabrir/selecionar arquivo ou acesso autorizado pelo aplicativo em execução; a UX precisa explicar quando a mídia estiver indisponível.
14. **Histórico:** proteger edições feitas no site contra reenvio/reprocessamento; reprocessamento gera resultado separado. Histórico completo de versões e comparação avançada são futuros.
15. **Exportações:** TXT, SRT e JSON, por faixa ou consolidadas, e ZIP com o conjunto da sessão, usando correções vigentes, sem perder o texto bruto na persistência.
16. **Motor em nuvem (etapa posterior):** cada Mestre usa **sua própria chave de API**. Não impor custo de inferência ao dono da plataforma. A definição dos provedores e do modelo seguro de credenciais pertence à avaliação técnica da task de nuvem.
17. **Áudio enviado à plataforma (somente para etapa nuvem):** armazenamento **temporário e privado**, exclusão automática; Mestre escolhe entre **24 horas (padrão), 7, 14 e 30 dias (máximo)** após conclusão. Exclusão antecipada é possível; texto/transcrição persistem.
18. **Uploads abandonados/falhos:** excluir após **24 horas de inatividade**, exceto enquanto processamento efetivamente ativo utilizar o objeto. Medir/instrumentar execução da limpeza; guardar somente metadados mínimos de auditoria sem conservar conteúdo deletado.
19. **Limites/cotas:** não introduzir nesta fase regras comerciais de franquia, cota por Mestre ou tamanhos máximos arbitrários; restrições técnicas reais devem ser verificadas e tratadas com mensagens compreensíveis.
20. **Privacidade adicional:** formulários de consentimento, notificações a participantes e gestão avançada ficam fora de escopo, **sem dispensa** de autenticação, autorização, controle de acesso, armazenamento privado e não exposição de segredos.

## Entregáveis

1. Fundação de sessões, faixas, estados de trabalho, identidade dos participantes, resultados e autorização Mestre-scoped (`transcricoes-01`).
2. Importação/mapeamento de faixas, glossário por campanha e regras de sincronização/offsets (`transcricoes-02`).
3. Aplicativo Windows distribuível, vínculo seguro da conta e abertura contextual a partir do site (`transcricoes-03`).
4. Motor Faster-Whisper local, configurações automáticas/avançadas e fila resiliente (`transcricoes-04`).
5. Integração, sincronização offline e proteção contra sobrescrita das correções (`transcricoes-05`).
6. Editor, visualizações individual/consolidada, alinhamento e reprodução contextual (`transcricoes-06`).
7. Exportação TXT/SRT/JSON/ZIP e fluxo integral de uso no site (`transcricoes-07`).
8. Configuração de credenciais BYOK em nuvem, independente dos motores de saída (`transcricoes-08`, **etapa posterior**).
9. Submissão de áudio à nuvem, transcrição remota e limpeza/retention (`transcricoes-09`, **etapa posterior**).

### Ordem de implementação revisada

`01 → 03 → 02 → 04 → 05 → 06 → 07`. A 02 importa no app: depende do shell/vínculo entregue na 03; a 03 não depende da 02. Números e recortes de produto foram preservados. Todas continuam em backlog. Após aprovação específica da fase nuvem e V1 local concluída: `07 → 08 → 09`.

Antes de iniciar cada task, fechar as decisões que a bloqueiam no [mapa de revisão](transcricoes/revisao.md#mapa-final-de-implementação); não executar a guarda-chuva nem o pedido 2 original automaticamente.

## Critérios de Aceite

- As tasks 01–07 passam pelo fluxo `backlog → active → done`, testes, lint, verificação documental e gate visual do projeto; o guarda-chuva não é usado como substituto de specs executáveis.
- Jornada local E2E verificável: Mestre autenticado abre sessão no site → abre aplicativo Windows vinculado → importa WAVs de Craig → confirma mapeamento/alinhamento → transcreve na GPU compatível ou CPU → enfrenta queda de rede → sincroniza sem duplicar → edita no site → exporta arquivos individuais e consolidados.
- Cenários negativos exercitados: jogador/espectador ou Mestre de outra campanha sem acesso; fechamento do agente; reenvio; nova transcrição; segmento com horário sobreposto; mídia local indisponível; sessão sem fala; WAV de duração diferente.
- Confirmar que a etapa local não exige armazenar WAV no servidor e que credenciais/tokens não entram no protocolo de abertura ou nos logs.
- As tasks 08–09 comprovam, em separado e **depois da V1 local**, BYOK, exclusão em prazos configurados e limpeza de uploads inativos; sem considerar nuvem entregue enquanto pendente.
- Para implementação Angular, respeitar `docs/design/DESIGN.md`, análogo visual aprovado e skill `verify`, incluindo `1920×1080`, `1366×768`, `960×1080` e `360×800`, bases clara/escura. Aplicativo Windows também requer inspeção real de estados de erro, fila, offline e acessibilidade conforme escopo de sua spec.

## Fora de Escopo

- macOS/Linux, aplicativo portátil e execução no navegador por WebGPU.
- Glossário global ou por sessão; correções automáticas silenciosas; IA geradora de resumos da história.
- Identificação automática por diarização de uma única faixa misturada; Craig multifaixa já identifica fontes.
- Detecção automática de alucinações/trechos suspeitos, retranscrição selecionada e checkpoints por trecho.
- Histórico recuperável completo, comparador de versões e compartilhamento com jogadores.
- Cotas comerciais, preços, cobrança, créditos da plataforma, fluxo específico de consentimento e notificações aos participantes.
- Qualquer mudança narrativa, regras do RPG ou arquivos canônicos de missões.

## Dependências

- Constituição `docs/SYSTEM.SPEC.md`, convenções `docs/CONVENTIONS.md`, visual `docs/design/DESIGN.md`, esquema `docs/SCHEMA.md` e fluxo `.agents/skills/task-flow/SKILL.md`.
- Contratos de autenticação/autorização, campanha, armazenamento e biblioteca de documentos existentes; **inspecionar** código atual antes de escolher pontos de extensão.
- Base técnica do script de referência `transcrever.py` mencionado no pacote, mas não anexado nem localizado no repositório nesta revisão (obter acesso antes da comparação histórica da 04) (Faster-Whisper `small`, CPU INT8, VAD, exportações); referência histórica, **não** motor V1 definitivo.
- Tasks 01–07 são prioridade local. Tasks 08–09 só avançam por solicitação posterior do autor.

## Riscos e Mitigação

- **Site não acessa automaticamente WAV local:** separar fluxo de reprodução pelo aplicativo/reseleção de arquivo; comunicar indisponibilidade.
- **Formato Craig e linha do tempo:** validar WAVs reais/fixtures autorizadas antes de assumir offset zero; oferecer correção manual.
- **Hardware variável e instalador:** selecionar modelos conforme recursos e validar dependências CUDA/cuDNN e alternativa CPU no Windows sem prometer compatibilidade irrestrita.
- **Exposição de segredos e conteúdo do Mestre:** autorizações efetivas no servidor e uploads privados; nunca confiar apenas no guard Angular.
- **Complexidade de feature transversal:** nenhuma task implementa funcionalidades de task posterior; decisões técnicas em aberto devem ser documentadas e submetidas ao autor quando afetarem produto, custos ou segurança.
