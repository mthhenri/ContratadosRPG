# Verificação — histórico e resposta atrasada

## Mudança

P-131 corrigido em `HistoricoRolagensJanela`: uma única operação neutraliza
cabeçalho, itens, paginação e indicadores de carga. GET inicial entregue depois
de revogação não inicia o histórico nem restaura nome; eventos posteriores não
repovoam a janela negada. Destruição cancela a assinatura inicial. Sem alteração
de template, SCSS, controles, contrato ou árbitro de permissão.

O componente é pequeno e continua com sua única responsabilidade; extrair uma
service para apenas essa transição local aumentaria o acoplamento. P-130 usará
a mesma operação, sem duplicar a limpeza, no commit seguinte.

## Testes e observação

- TDD: antes da correção, 3 regressões falharam e 5 testes passaram. Depois,
  **8/8 testes focados passaram**, incluindo cancelamento na destruição,
  resposta inicial atrasada, negação de refetch, revogação e evento posterior.
- Build de produção do frontend aprovado com `CI=true`, dois workers. Aviso
  existente de bundle inicial: 599,02 kB para orçamento de aviso de 450 kB;
  sem mudança de limite, dependência ou configuração de cache.
- `npm run lint` aprovado nos três workspaces, com avisos preexistentes de
  estilo, sem erros. O lint não foi usado como evidência de privacidade.
- `verify`: API/SPA exclusivas 3101/4301, Postgres local, campanha sintética 128,
  fichas 473/474, quatro contas próprias. GET real de ficha autorizado em 200
  foi retido no browser, o dono ocultou a ficha, então a resposta foi liberada.
  A primeira página de histórico negou a leitura e o cabeçalho ficou **Ficha**,
  sem identidade residual, em 1920×1080, 360×800, 960×1080 e 1366×768.
  Sentinela permaneceu; sem reload. Dono e mestre conservaram o histórico da
  própria ficha oculta/autorizada. Cenário permanece temporariamente para
  verificação das quatro specs seguintes, sem uso de dados reais.
- Capturas/JSON/logs locais em `.artifacts/fix-ficha-oculta-historico-resposta-atrasada/`,
  ignorados e ausentes do clone. Scripts não foram incorporados ao produto.

## Comparação pessoal e impacto

Análogo registrado antes de editar: a própria janela e `AnotacoesJanela`, usando
o mesmo `JanelaExternaCabecalho`. Inspeção pessoal das telas negadas desktop e
mobile e controle autorizado do mestre: shell, densidade, hierarquia, controles
e cores preservados; nenhuma UI genérica ou controle novo. Sem overflow; ações
canônicas Fechar/Voltar conservadas, com alvos móveis de 44px. Não houve
mudança de estilo nem necessidade de ampliar primitivo.

`impacto --simbolo HistoricoRolagensJanela`: rota e teste como alvos; referências
SCSS de anotações/caderno são falsos positivos e permanecem sem alterações.
Revisão manual do diff: só limpeza do estado da página e regressões do defeito;
arquivos concorrentes de ícones preservados fora do commit.

## Limites

Gate completo `CI=true npm run test --workspaces --if-present -- --watch=false`:
shared **1335**, backend **1220 aprovados/99 ignorados**, frontend **3552** e
normalizador **89** aprovados. Mensagens JSDOM de navegação não implementada
sem falha de teste. `repo:verificar` e revisão do índice executados antes do commit.

Não implementa P-130 nos outros leitores nem D-01/D-02/H-02. Erros transitórios
e revalidação da flutuante/página completa pertencem a P-130. Conteúdo recebido
antes da revogação e cópias externas não podem ser recolhidos.
