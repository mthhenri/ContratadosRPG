# Decisões aprovadas e distinção de fases — Contratados Transcriber

**Origem:** conversa do autor de 2026-10-14. **Estado:** material de handoff, não código implementado. A fonte final das decisões é o autor; o Work deve alertar sobre inconsistências e pedir aprovação para decisões novas de produto.

## V1 local — aprovado

- Todas as campanhas: ferramenta privativa dos Mestres, integrada ao site.
- App instalável Windows 64-bit, vinculado à conta, aberto pelo site na sessão; inferência local na GPU NVIDIA compatível ou CPU.
- Craig/Discord, WAVs individuais; associação sugerida/confirmada e lembrada por campanha; offset temporal validado e ajustável por faixa; sobreposição preservada.
- Glossário **por campanha**, termo como contexto; modo automático + avançado.
- Fila persistente, progresso/cancelamento, preservar concluídos e retomar pendentes por arquivo; offline com sincronização automática posterior, sem duplicação.
- Texto original e texto editado preservados; visualização por faixa e consolidada, edição sincronizada, player quando arquivo acessível, revisão manual simples.
- Exportação individual e consolidada TXT/SRT/JSON; ZIP de todos os arquivos.
- Site protege correções contra reenvio e mantém resultados de nova execução separados.

## Etapa nuvem — aprovado como futuro desenvolvimento, após V1 local

- Mestre fornece sua própria chave API; plataforma não paga inferência dos usuários.
- WAVs enviados à nuvem ficam temporários e privados. Retenção **24 horas padrão**, configurável para **7, 14 ou 30 dias**, após conclusão; Mestre pode excluir antes.
- Uploads abandonados ou falhos eliminados após **24 horas de inatividade**, exceto enquanto trabalho ativo usa o áudio; transcrição persistente.

## Expansões intencionalmente fora das tarefas iniciais

- macOS/Linux, portátil, navegador WebGPU, glossário global e por sessão.
- Detecção automática de trechos suspeitos, alucinações, reprocessar intervalo, checkpoints intra-arquivo, comparador/histórico completo de versões.
- Compartilhamento com jogadores, resumos gerados por IA, consentimento/notificações específicos e cotas comerciais.

## Pontos técnicos a investigar sem inventar decisão de produto

1. Instalador e stack do agente Windows; vínculo via código/fluxo seguro e protocolo local.
2. Reprodução pelo site de áudio que permanece **somente no PC**: reanexação manual ou ponte autenticada com aplicativo ativo; o site hospedado não possui permissão automática de abrir disco local.
3. Qualidade e compatibilidade de Faster-Whisper, CUDA/cuDNN/CPU em máquinas variadas; aferir melhoria com corpus representativo.
4. Semântica exata de alinhamento Craig e padrões de exportação WAV; usar arquivos de teste reais autorizados, mantendo sigilo.
5. Tratamento de uploads nuvem para arquivos grandes e restrições do provedor e do storage, **sem criar cotas comerciais agora**.
6. Política segura para armazenar/usar API keys BYOK e integração de provedores (seleção posterior).
7. Regras de consentimento/aviso legais gerais, se aplicáveis, permanecem obrigação de avaliação mínima de conformidade; funcionalidades próprias de notificação foram adiadas.

## Fontes do repositório consultadas

- `docs/SYSTEM.SPEC.md` (constituição técnica e política documental §3.1).
- `docs/specs/TEMPLATE.spec.md` e `docs/specs/README.md` (estrutura de spec).
- `.agents/skills/task-flow/SKILL.md` (abertura, gates e fecho).
- `docs/CONVENTIONS.md`, `docs/SCHEMA.md`, `docs/design/DESIGN.md`.
- `frontend/src/app/app.routes.ts`, `frontend/src/app/modules/campanha/campanha.routes.ts`, `frontend/src/app/modules/documento/documento.routes.ts`, `backend/src/app.module.ts` (módulos e navegação atuais).
- `transcrever.py` do Google Drive do autor como referência histórica do motor atual.

**Importante:** as specs deste pacote ainda são propostas para revisão; não fazem parte do repositório GitHub até que sejam adicionadas numa branch pelo Work ou pelo mantenedor.
