# Verificação — cor de identidade do colaborador

Data: 2026-10-09. [Spec](../caderno-cor-identidade-colaborador.spec.md).

## Resultado

Inicial, cursor e seleção do Caderno do Esquadrão usam a cor da ficha própria alterada
mais recentemente na campanha. Empate usa maior id. Datas inválidas são ignoradas; sem
ficha válida ou sem cor na escolhida, permanece a reserva estável original por usuário.

O resumo autorizado de membros ganhou `updatedDate`, vindo de `ficha.updated_date`.
O SQL mantém os predicados de membro, posse, ocultação, concessão e exclusão lógica;
não há migration, novo endpoint ou ampliação de permissões. A escolha é apresentação
local em `caderno-presenca.ts`, usando o DTO compartilhado, sem regra de jogo duplicada.

O serviço colaborativo mantém o mesmo documento e Awareness. Relê membros ao abrir,
ao receber alteração de ficha própria e ao reconectar; participa das salas dessas
fichas somente enquanto ativo, liberando suas referências ao fechar. Releituras antigas
não restauram uma data anterior. A janela externa também acompanha as invalidações
de membros da campanha. O transporte e o broadcast geral não foram ampliados.

A escolha foi extraída para função pura. O acréscimo local ao serviço fica dentro da
responsabilidade já existente de sessão/presença; o componente apenas encaminha membros.

## Aplicação real e comparação visual

Stack real: PostgreSQL, API em 3100, Angular em 4300. Dois usuários em contextos Chromium
independentes, três fichas em campanha temporária e uma página compartilhada. O endpoint
real devolveu datas válidas nas três fichas. Criar/editar usou as APIs existentes.

Análogo aprovado: Caderno atual, painel flutuante e janela externa, usando o mesmo
`CadernoConteudo` e `app-editor-markdown`. Nenhum template, estilo ou controle foi criado;
os primitivos existentes e seus inputs permanecem os do análogo.

| Viewport | Painel | Janela externa | Evidência observada |
|---|---|---|---|
| 1920×1080 | aprovado | aprovado | presença azul/roxa, cursor e seleção roxos |
| 1366×768 | aprovado | aprovado | mesmas cores e editor compartilhado |
| 960×1080 | aprovado | aprovado | mesmas cores e editor compartilhado |
| 360×800 | aprovado | aprovado | navegação mobile, presença, cursor e seleção |

As oito capturas foram inspecionadas pessoalmente pelo agente principal. Shell, densidade,
hierarquia, espaçamento, iconografia, estados e responsividade correspondem ao Caderno
aprovado; os controles continuam os primitivos canônicos, sem aspecto de formulário genérico.
Sem overflow horizontal (largura do documento igual à do viewport em todos os recortes).
Foco de edição e seleção observados; controles mobile mantêm seus alvos existentes de 44px.
A seleção remota usa transparência da mesma cor do cursor; não altera a cor do texto.

Alterar a ficha verde mais antiga fez ela tornar-se a mais recente: a presença do outro
usuário mudou para verde sem reload. Alterar novamente a ficha roxa fez a identidade
voltar a roxo. Edição compartilhada, cursor e seleção continuaram funcionais.

Reconexão real: encerrou-se somente o transporte de um cliente de teste; alterou-se
a cor de sua ficha temporária enquanto desconectado e reconectou-se o cliente. O outro
usuário recebeu a nova cor amarela. A referência do `Y.Doc` permaneceu igual, a sentinela
da página permaneceu presente e o estado retornou a `SINCRONIZADO`. Captura inspecionada.
O servidor e as sessões do autor não foram reiniciados.

A primeira tentativa visual foi interrompida pelo reload do servidor de desenvolvimento
durante a geração de assets do build. A rodada completa foi repetida após o build e passou,
sem erros de JavaScript. Evidências brutas, scripts e capturas ficam exclusivamente em
`.artifacts/caderno-cor-identidade-colaborador/`, ignorada pelo Git.

## Gates

- `npm run build --workspace=shared`: aprovado.
- `npm run build --workspace=backend`: aprovado.
- `npm run build --workspace=frontend`: aprovado após a alteração final; aviso de orçamento
  inicial, 593,49 kB para limite de 450 kB. Os livros derivados continuam fiéis ao Markdown.
- `npm run test --workspace=shared`: 69 arquivos, 1157 testes aprovados.
- `npm run test --workspace=backend`: 53 arquivos, 995 aprovados e 1 ignorado.
- `npm run test --workspace=frontend -- --watch=false`: 236 arquivos, 3189 aprovados;
  inclui a verificação dos livros. O teste novo da janela teve o mock de reconexão corrigido
  para `Subject<void>` antes dessa rodada final.
- `npm run lint`: aprovado, zero erros e 27152 avisos no repositório; não representa
  saneamento dos avisos globais de convenções.
- Cobertura focada: data/ordem/fuso/empate/reserva; ficha própria versus outro membro;
  troca durante edição, resposta antiga, liberação de salas, fechar/reabrir, inatividade,
  reconexão e invalidações da janela. Teste do repositório protege o recorte do SQL.
- `git diff --check`: aprovado. `npm run repo:test`: 7 casos aprovados; a primeira
  execução restrita não permitiu criar o repositório temporário de um caso, que passou
  ao executar com acesso ao diretório temporário. `npm run repo:verificar`: organização
  e espelhos aprovados na árvore local.

Campanha, três fichas e página temporárias removidas pelas APIs de exclusão lógica após
conferir os ids e a campanha proprietária. Alterações concorrentes fora deste recorte
foram preservadas; não foram incluídas como entrega ou certificação desta tarefa.

Limites: Chromium com emulação de viewport; a tarefa altera identidade, sem recertificar
todos os comportamentos históricos do editor ou as outras três frentes legadas.
Nenhuma pendência funcional deste recorte. Commit autorizado pelo autor após o fecho;
publicação permanece fora deste recorte.
