# Task 01 — plano de implementação

Spec proprietária: `../transcricoes-01-sessoes-e-contratos.spec.md`.
Desenho: `design.md`; D-01/contrato temporal D-05 aprovados pelo autor em 2026-10-14.
Método aplicado: execução direta nesta sessão, com testes focados e revisão do diff.
Implementação local no worktree `ContratadosRPG-transcricoes`, branch `feat/transcricoes-01`.
Este plano não autoriza publicar ou deploy.

## Sequência

1. Após aprovação, criar branch local de implementação derivada do commit documental,
   preservar a branch de revisão e mover spec/anexos da 01 para active juntos.
   Reler regras/contexto e fontes específicas antes da edição; conferir drift de
   master sem publicar. Usar isolamento local conforme skill `using-git-worktrees`.
2. Inventariar interfaces do módulo/exports e validar desenho contra repository/
   auth/OpenAPI reais. Aplicar `dto-conventions` e `gerenciamento-de-impacto`;
   registrar qualquer consumidor afetado além do recorte antes de mudar.
3. Testes de contrato temporal: 5000–7000ms com offset +2000 vira 7000–9000;
   offset negativo mantém bruto e permite tempo efetivo negativo; empate/sobreposição
   mantém identidades; correção null e vazia são diferentes. Validar valores
   inteiros, não finitos e fim menor que início. Definir funções/DTOs exatos no
   recorte ativo após aprovação do desenho, sem colocar domínio em shared/regras.
4. Testes de autorização da service: Mestre atual permitido; jogador/espectador,
   Mestre alheio e ADMIN/TESTER sem papel negados. Conta/token revogados continuam
   responsabilidade dos guards existentes, exercitados via API; não reescrever auth.
5. Implementar contratos readonly em shared/dtos/transcricao, enums/validators
   e exports. Compilar shared antes de usar o contrato no backend.
6. Implementar migration SQL no próximo número disponível e atualizar SCHEMA:
   sessão/faixa/execução/segmento, BaseEntity, enum de estado em tabela tipo_*,
   índices/constraints nomeados e seleção de execução pertencente à faixa.
   Testar UP/DOWN em banco descartável; não criar migration antes de aprovar modelo.
7. Implementar repository do novo módulo com SQL parametrizado, filtro de ativos
   e transações para exclusão/consistência. Testar ids trocados, vínculos inválidos,
   erro no meio de escrita e inacessibilidade dos filhos de sessão excluída.
8. Implementar service/controller/módulo com CRUD mínimo da sessão e metadados
   das faixas; input não confiável é validado no service. Arquivamento segue a
   escolha aprovada, sem criar restauração de excluído. Nenhum upload/inferência.
9. Registrar controller no decorator/mapa do gerador OpenAPI, gerar contratos,
   revisar operações/payloads/segurança/erros e testar documento efetivo.
10. Exercitar REST e Postgres, revisar diff completo e executar gates abaixo.
    Registrar evidências no anexo da 01; sem gates obrigatórios, manter active.
    Quando aprovada pelos gates, mover spec/anexos para done e registrar contexto.

## Gates previstos

- `npm run build --workspace=shared`.
- Testes focados shared/backend para novos contratos, autorização e persistência.
- `npm run openapi:gerar-contratos --workspace=backend` e teste de OpenAPI.
- Build dos workspaces afetados, `npm run lint`, testes integrados no fecho.
- `npm run repo:test`, `npm run repo:verificar` e verificador staged antes de commit.
- Verificar que diff não contém tasks cloud, áudio enviado, mudanças globais de auth,
  arquivos de saída bruta ou configuração de hospedagem.

## Pontos que a implementação não pode decidir silenciosamente

Arquivamento separado; unidade/arredondamento; cardinalidade execução por faixa;
seleção explícita por faixa; política de revisão editorial. O desenho apresenta
propostas concretas para esses pontos. Decisões Windows/reprodução/exportação
serão apresentadas somente antes de seus recortes dependentes, sem bloquear toda
fundação por questões da nuvem ou por framework ainda não necessário.

## Interfaces e arquivos do corte implementado

- `shared/src/dtos/transcricao/transcricao.dtos.ts`: SessaoTranscricao*Dto,
  FaixaTranscricao*Dto e value objects Execucao/Segmento; barrel e subpath no pacote.
- `shared/src/enums/tipo-execucao-transcricao-estado.enum.ts` e
  `shared/src/validators/transcricao.validators.ts`: estados/limites técnicos.
- `backend/src/modules/transcricao/transcricao-tempo.util.ts`:
  `montarCronologiaTranscricao(readonly SegmentoTranscricaoTempoDto[])` →
  `SegmentoTranscricaoCronologiaDto[]`; `resolverTextoTranscricao(SegmentoTranscricaoTextoDto)` → string.
- `transcricao.repository.ts`: criar/recuperar/listar/alterar/arquivar/excluirSessao
  e criar/recuperar/listarFaixas; DTOs readonly de entrada/saída, sem primitivos.
- `transcricao.service.ts`: mesmos verbos com DTO + JwtPayload, validação de
  metadados/ids e autorização por campanha; exceções 400/404; guards dão 401.
- `transcricao.controller.ts`/`transcricao.module.ts` e registro no AppModule:
  nove operações de metadados sob `/transcricao`; nenhuma recebe WAV.
- `0037 - Tabelas de transcricao.sql`: cinco tabelas, triggers de original,
  seleção consistente e arbitragem concorrente na faixa; FK composta.
- OpenAPI: decorator, TAGS_POR_CONTROLLER, contratos-gerados e respostas
  próprias de Transcrições (POST 201, demais 200; 400/401/404), sem mudar módulos antigos.

Casos adicionais da revisão independente: limites INTEGER antes do SQL;
criarFaixa/excluir raiz; selecionar/mudar estado, inclusive REPEATABLE READ;
rollback de falha em descendente. Testes e situação dos gates: `verificacao.md`.
A task permanece active enquanto gates globais preexistentes estiverem abertos.
