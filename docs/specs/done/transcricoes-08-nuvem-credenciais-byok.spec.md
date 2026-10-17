# transcricoes-08-nuvem-credenciais-byok.spec.md

> **ABANDONADA em 2026-10-17 por decisão expressa do autor.** Integração desativada;
> arquivamento não significa entrega concluída. O fluxo Python pessoal permanece local.
> Este aviso substitui os estados e autorizações anteriores preservados abaixo.
> Ver [desativação](transcricoes-desativacao.spec.md).

> **Task 08/09** do guarda-chuva `transcricoes.spec.md`. **Etapa posterior à V1 local; não implementar no primeiro ciclo sem nova autorização.**

> **Estado: backlog BLOQUEADO; nuvem exige nova autorização mesmo após a V1 local.**
> Decisões pendentes, matriz de acesso e gates: [revisão](transcricoes/revisao.md). Anexos próprios: `transcricoes-08-nuvem-credenciais-byok/` no mesmo estado; evidência bruta em `.artifacts/transcricoes-08-nuvem-credenciais-byok/`.

## Objetivo

Permitir que cada Mestre configure de forma segura suas próprias credenciais de provedor para transcrição em nuvem, mantendo-as privadas e dissociadas de credenciais de outros Mestres.

## Entregáveis

1. Proposta técnica documentada de provedores de speech-to-text compatíveis (API, custos pagos pelo usuário, idioma, limites técnicos e timestamps), sujeita à escolha/aprovação do autor antes de comprometer contratos de negócio.
2. Configuração Mestre-scoped de provedor e credenciais com proteção em trânsito/em repouso, sem exibição posterior da chave completa, sem logs e com teste, rotação e revogação. Definir e documentar quem chama o provedor (servidor ou cliente), sem enviar credenciais a terceiros inesperados.
3. Interface de configuração e status no site, acessível apenas a Mestres autorizados e com falhas inteligíveis quando chave inválida, serviço indisponível ou saldo insuficiente.
4. Adaptador/contrato de saída compatível com resultados locais, sem substituir segmentos já corrigidos.

5. **Bloqueada:** conclusão da 07 não autoriza a 08 automaticamente. Fechar D-07 por nova autorização específica: provedor, executor, escopo da chave por usuário/campanha, custódia, cifra/chave mestra, rotação, revogação e tratamento da transferência do papel Mestre. Não transferir chave pessoal junto da campanha nem reutilizar JWT web como credencial do provedor.
6. Registrar ameaça e custos de operação/armazenamento além da inferência BYOK. Chave não aparece em leitura completa, URL, OpenAPI de resposta, evento ou observabilidade; exclusão da credencial impede novos trabalhos conforme política aprovada. Nenhuma credencial é criada/coletada nesta revisão.

## Critérios de Aceite

- Mestre A não lê nem usa credencial de Mestre B, jogador ou espectador; testes também cobrem URLs/API e logs.
- Testes de chave válida/inválida/revogada e mudança de provedor; nenhum segredo em payload de leitura, evento WS ou rastreamento.
- Resultado de transcrição simulado do provedor converte ao contrato da V1 sem alteração da revisão ou exportação já existentes.
- Gates de segurança, testes, lint e verificação visual do projeto.

- Gate futuro inclui transferência de Mestre e chave antiga em trabalho/retry: nova conta não usa chave pessoal de outra. Testar recuperação indevida, rotação concorrente, leitura mascarada e logs/erros do SDK sem segredo.
- Revisão de ameaça aprovada antes de código; provas simuladas não certificam provedor real. UI futura usa os quatro viewports, bases e primitivos canônicos; não gerar campo de configuração cloud na V1.
- Aplicar os [gates comuns](transcricoes/revisao.md#gates-de-implementação) ao recorte desta task e registrar comandos, resultados e limites no anexo proprietário. Critérios são futuros: esta revisão documental não os executou.

## Fora de Escopo

- Créditos pagos pela plataforma, assinatura, subsídio, armazenamento permanente de WAV, envio de áudio e execução do job remoto (task 09).

## Dependências

- `transcricoes-07-exportacao-e-fecho-v1.spec.md` concluída; `docs/SYSTEM.SPEC.md`, arquitetura de armazenamento e autenticação vigentes.

## Riscos e Mitigação

- Chaves BYOK não podem ficar legíveis para outro usuário nem vazar em operações: revisão de ameaça/fluxo de credenciais antes da implementação.
- Cada provedor tem retenção/custos próprios: informar que a política de áudio da plataforma não substitui termos do provedor.
