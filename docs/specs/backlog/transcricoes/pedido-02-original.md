# Pedido 2 para ChatGPT Work — implementar V1 local (USAR SOMENTE APÓS APROVAÇÃO)

**PRÉ-CONDIÇÃO:** o autor aprovou as specs revisadas do módulo Contratados Transcriber e autorizou expressamente a implementação. Se essa condição não estiver atendida, **não implemente**; retorne ao pedido de validação.

Trabalhe no repositório https://github.com/mthhenri/ContratadosRPG e implemente **somente a V1 local** do Contratados Transcriber, conforme specs aprovadas em `docs/specs/backlog/transcricoes.spec.md` e tasks **01–07**, obedecendo às dependências.

1. Leia integralmente `AGENTS.md`/`CLAUDE.md`, `docs/SYSTEM.SPEC.md`, `docs/CONVENTIONS.md`, `docs/SCHEMA.md`, `docs/design/DESIGN.md`, `.agents/skills/task-flow/SKILL.md`, `docs/specs/TEMPLATE.spec.md`, specs aprovadas e código relevante. Detecte alterações desde a revisão anterior e reporte conflitos antes de modificar.
2. Para cada task, mova-a de `backlog` para `active`, planeje somente no anexo proprietário `docs/specs/active/<tarefa>/`, implemente o escopo exato e verifique com testes específicos. Não execute uma spec guarda-chuva diretamente. Não misture código das tasks 08–09, que são etapa nuvem futura.
3. Entregue aplicação auxiliar Windows com instalador, vínculo seguro à conta, abertura pelo site na sessão; Faster-Whisper com seleção automática/avançada GPU/CPU; fila por arquivo persistente e cancelável; continuidade offline e sincronização segura. WAVs locais não devem subir ao servidor.
4. Integre sessões privadas dos Mestres, associações das faixas Craig, offsets temporais, glossário por campanha, editor individual/consolidado de correções sincronizadas e exportações TXT/SRT/JSON/ZIP. Preserve textos brutos e correções contra reenvio.
5. Evite prometer reprodução direta no site de arquivo que existe apenas no disco local: implemente o fluxo previsto na spec aprovada e documente indisponibilidade da mídia.
6. Use padrões de autorização no backend (não apenas guarda frontend), DTOs `shared`, controller/service/repository NestJS e componentes/tokens Angular atuais; confira middleware JWT, papéis de campanha, Storage e schema. Qualquer novo endpoint requer revisão de contratos e geração OpenAPI conforme convenções.
7. Valide fluxo E2E e casos negativos descritos nas specs. Rode testes e lint pertinentes, `npm run repo:test`/`npm run repo:verificar` e verificação de UI real em `1920×1080` e `360×800` (skill `verify`). Para o Windows, diferencie teste em GPU física, CPU física e simulação. Se não puder validar um gate obrigatório, mantenha a task aberta e explique.
8. Faça o fecho de cada task com movimentação de spec/anexos e atualizações de `docs/context/` exatamente como `task-flow` determina. Não publique `master`, não faça deploy, não mescle PR e não introduza novos requisitos de produto sem autorização do autor. Prepare PRs por tarefas ou grupos coerentes, aguardando revisão.

Ao terminar, apresente resumo das alterações, artefatos de instalação disponíveis, testes e verificação executados, pendências/limites e links dos PRs. Não declare suporte nuvem implementado.
