# Pedido 1 para ChatGPT Work — revisar as specs e preparar PR documental

Trabalhe no repositório **https://github.com/mthhenri/ContratadosRPG** (branch padrão `master`) e avalie o pacote de specs anexo `contratados-transcriber-specs.zip`.

**Objetivo único deste pedido: validação documental e proposta de integração das specs. Não implemente funcionalidade, migration, componente, aplicativo, infraestrutura nem credencial. Não faça deploy nem mescle PR.**

1. Leia **integralmente** `AGENTS.md`/`CLAUDE.md`, `docs/SYSTEM.SPEC.md`, `docs/CONVENTIONS.md`, `docs/SCHEMA.md`, `docs/design/DESIGN.md`, `docs/specs/TEMPLATE.spec.md`, `docs/specs/README.md`, `.agents/skills/task-flow/SKILL.md` e fontes adicionais pertinentes.
2. Confronte o pacote com a árvore **atual** do repositório: papéis de campanha e autorização, modelo de campanha/sessão/cena/documento, uso de storage, arquitetura Angular/NestJS, contrato OpenAPI e convenções DTO/migrations, localização de specs e tarefas abertas. Identifique conflitos com specs existentes, com a política de arquivos ou com as decisões aprovadas.
3. Trate `DECISOES-E-PENDENCIAS.md` como registro do que o autor decidiu. **Preserve decisões de produto.** Para cada ambiguidade técnica, ofereça recomendações e consequências; não altere comportamento, política de retenção, acesso ou fases sem autorização.
4. Revise as specs `transcricoes.spec.md` e `transcricoes-01`…`09`: dependências executáveis, recorte de tarefas, critérios de aceite verificáveis, riscos reais, testes e gates visuais, matriz de autorização, ausência de envio de áudio local ao servidor e consistência da edição sincronizada. Respeite o modelo `docs/specs/TEMPLATE.spec.md` e a skill `task-flow`.
5. Garanta **prioridade local**, com tarefas 01–07 para a V1 e 08–09 **bloqueadas** até nova aprovação do autor para a etapa nuvem. Preservar chaves próprias (BYOK) na etapa de nuvem, defaults de retenção 24h/7d/14d/30d e inatividade 24h.
6. Identifique, mas não implemente, o mecanismo para reprodução de WAV local ao revisar no site; site hospedado não tem acesso arbitrário ao disco do Mestre. Confira que as specs não prometem tal acesso.
7. Entregue uma análise objetiva dos ajustes necessários. Se o acesso e as regras do repositório permitirem, prepare **branch e PR exclusivamente documental**, com as specs revisadas em `docs/specs/backlog/` e os documentos auxiliares nos locais canônicos; **não faça merge**. Se não puder preparar PR, entregue diff/arquivos prontos com destinos precisos.
8. Reporte o que foi verificado efetivamente versus o que continua pendente; execute verificações documentais não destrutivas permitidas. **Não declare nenhuma tarefa de implementação concluída.**

Ao terminar, apresente: links dos arquivos/PR ou pacote, mapa das tasks e dependências, conflitos detectados e **decisões pendentes que exigem aprovação do autor**. Não avance para implementação automaticamente.
