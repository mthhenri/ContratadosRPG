# transcricoes-01-sessoes-e-contratos.spec.md

> **Task 01/09** do guarda-chuva `transcricoes.spec.md`. Fundação de dados e autorizações, sem motor de reconhecimento nem UI extensa.

> **Estado: active; implementação autorizada pelo autor em 2026-10-14, desenho aprovado.**
> Decisões pendentes, matriz de acesso e gates: [revisão](../backlog/transcricoes/revisao.md). Anexos próprios: `transcricoes-01-sessoes-e-contratos/` no mesmo estado; evidência bruta em `.artifacts/transcricoes-01-sessoes-e-contratos/`.

## Objetivo

Criar a base persistente e os contratos de API para organizar sessões, faixas, participantes e resultados de transcrição por campanha, com autorização exclusiva do Mestre.

## Entregáveis

1. Inspeção dos módulos de campanha, documentos, autenticação, armazenamento e tabelas atuais; registrar a escolha de novas entidades e APIs no anexo `transcricoes-01-sessoes-e-contratos/design.md` sem duplicar a biblioteca existente por conveniência.
2. Modelo/migrations para sessão (referência à campanha), faixa, associação/offset temporal, execução de transcrição e segmentos com timestamps e texto bruto/corrigido. Precisão temporal suficiente para ordenação determinística; associar estados operacionais e rastreabilidade ao motor que gerou o resultado.
3. DTOs compartilhados, endpoints mínimos e verificações no service/repository conforme `SYSTEM.SPEC.md`/`CONVENTIONS.md`. Permissões são **MESTRE da campanha**, não papel global `ADMIN`/`TESTER`; não incluir vazamentos em listagens, websockets ou erros.
4. Contrato canônico independente do motor (local/nuvem) que preserve sobreposição de falas, idioma, nome da faixa, participante, offset, horários do áudio e texto original/edição vigente.
5. Excluir/arquivar sessão e artefatos de forma consistente com soft delete e políticas do projeto, respeitando dependências; não apagar resultado de outra sessão/campanha.

6. Antes da implementação, obter aprovação do desenho: distinguir sessão de gravação de `SessaoService` (login), `cena` (mesa) e `documento` (Biblioteca revelável). Recomendar módulo próprio de transcrições e raiz vinculada à campanha; não reutilizar `documento.revelado` nem publicar transcrição na Biblioteca. Cardinalidades, nomes e arquivamento exigem fechamento de D-01 em [revisão](../backlog/transcricoes/revisao.md).
7. Especificar no design as identidades estáveis locais/servidor de sessão, faixa, execução e segmento; separar execução selecionada, original imutável, correção vigente e revisão editorial. Fixar unidade/precisão temporal, fórmula de offset e desempate antes de worker/editor/exportador. SQL mantém BaseEntity, referências `tipo_*`, constraints nomeadas, parâmetros nomeados e soft delete; numeração de migration deriva da árvore no início da implementação, nunca do exemplo antigo `0009`.
8. Interfaces readonly em `shared/src/dtos/`, exports do pacote e enums compartilhados; validação explícita de entradas não confiáveis na service e constantes em `shared/validators`. O backend atual não liga `ValidationPipe` (P-003): não converter todos os DTOs nem habilitar pipe global nesta task. Registrar a divergência com SYSTEM §11 e submeter qualquer alteração global ao autor.
9. Contratos REST documentados pelo decorator canônico, cadastro no mapa `TAGS_POR_CONTROLLER` do gerador e revisão dos schemas/operações gerados. Não implementar agora endpoints BYOK, upload WAV ou jobs de nuvem. O contrato interoperável não autoriza infraestrutura da fase futura.
10. Matriz de acesso e vínculo hierárquico na service: conta viva e token atual, Mestre atual da campanha e pertencimento sessão→faixa→execução→segmento; reusar `CampanhaService.validarMembro`/`ehMestre` (`validarMestre` hoje é privado). Se usar eventos, apenas canal autorizado de Mestre após commit; nunca sala cheia, projeções/previas ou busca global.

## Critérios de Aceite

- Testes REST/service/repository cobrindo Mestre próprio, jogador, espectador, Mestre de campanha alheia, usuário desconectado e identificadores trocados; negar leitura/mutação de todos os não autorizados sem expor existência de recurso restrito.
- Fixtures com dois segmentos simultâneos conservam os dois, em ordem estável por timestamp e identificador de desempate; offsets positivos e negativos não alteram os tempos originais da faixa.
- Migração UP/DOWN valida no banco de testes, sem violar padrões do projeto; `docs/SCHEMA.md` atualizado se o modelo persistente mudar.
- `npm run build --workspace=shared`, testes backend/shared afetados e lint respectivo passam; auditoria de regressão às rotas existentes.

- Exercitar toda a [matriz de autorização](../backlog/transcricoes/revisao.md#matriz-de-autorização), inclusive ADMIN/TESTER sem MESTRE, token revogado, campanha/sessão excluída e troca de Mestre. Para recurso restrito, erro não distingue id existente de inexistente; 401 para falta de sessão válida. A enumeração do pacote dizia “últimos quatro”, mas todos os atores não autorizados são cobertos.
- Payloads com tipo errado, campos obrigatórios ausentes, valores não finitos, início maior que fim, ids de pais trocados e correção enviada pela ingestão são recusados sem 500 ou gravação parcial. Transações usam `TransacaoService`; eventos somente após commit.
- Rodar `npm run openapi:gerar-contratos --workspace=backend` e testes de `openapi.document.spec.ts`; provar que cada novo endpoint está presente, com segurança e erros reais, e que contratos internos/segredos não aparecem.
- Aplicar os [gates comuns](../backlog/transcricoes/revisao.md#gates-de-implementação) ao recorte desta task e registrar comandos, resultados e limites no anexo proprietário. Critérios são futuros: esta revisão documental não os executou.

## Fora de Escopo

- Upload de WAV, aplicativo Windows, inferência, fila offline, UI de revisão, exportação, nuvem ou retenção de áudio.
- Inventar novas permissões de campanha ou ampliar visibilidade para jogadores.

## Dependências

- `transcricoes.spec.md`; `docs/SYSTEM.SPEC.md`, `docs/SCHEMA.md`, `docs/CONVENTIONS.md`; autenticação e campanha existentes.

## Riscos e Mitigação

- Modelo de sessão conflitar com conceitos de `cena` ou `documento`: inspecionar domínios e manter responsabilidade explícita.
- Incluir dados brutos excessivos em eventos: eventos só notificam mudança, sem expor conteúdo a usuários sem autorização.
