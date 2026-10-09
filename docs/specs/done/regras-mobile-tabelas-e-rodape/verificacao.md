# Verificação — tabelas e rodapé de Regras

Data: 09/10/2026. Execução direta pelo Codex, sem delegação.

## Fonte e responsabilidade

Pedido do autor e cinco capturas do Edge; spec da tarefa, `SYSTEM.SPEC.md`,
`CONVENTIONS.md`, `DESIGN.md` e handoff do tema. Mudanças são de apresentação no
frontend. Não alteram regras, DTOs, normalizador, Markdown ou dados publicados.
O leitor apenas importa a marca e reutiliza `voltarAoTopo()`: acréscimo local
seguro, sem nova responsabilidade no componente extenso.

## Referências visuais e controles

Análogos: leitor de Regras aprovado, itens de `RegrasModificacoes`, topbar,
`app-cartao` e controles de `shared/ui`. Mantidos shell, IBM Plex, superfícies,
filetes, hierarquia e densidade. Módulos usam cartão existente com título/índice.
Sumário e marca usam `app-botao` com variante/estilo/tamanho/posição de ícone;
topbar mantém a receita `topbar__item` que já fornece dimensões aos demais botões.
Ícone usa `app-icone`; marca usa `app-marca`. Nenhum primitivo novo.

## Correções e evidência ao vivo

Aplicação real em `localhost:4300`, navegador Chromium integrado, pelo `cua_repl`
conforme `verify`. Inspeção pessoal, sem aceitar screenshots de outro agente.

| Viewport | Recortes observados |
|---|---|
| 360×800 | Página e painel; abrir/fechar gaveta; Sistema/Guia; busca Conservador e resultado; amplificadores; cartões de módulos; tabelas Porte/Gancho; rolagem horizontal por teclado; rodapé e retorno ao topo. |
| 960×1080 | Página dos dois livros; tabela Porte; amplificadores e busca com Enter; rodapé; painel normal com amplificadores, cabeçalho e controles. |
| 1366×768 | Página dos dois livros; Porte; amplificadores, busca Enter/Esc, módulos em duas colunas e rodapé; painel com tabela de amplificadores. |
| 1920×1080 | Página dos dois livros; Porte; busca Conservador, resultado e limpeza; amplificadores, rodapé; abrir painel, sumário e navegação para amplificadores. |

Inventário DOM complementar: 14 tabelas comuns no Sistema e 29 no Guia;
contenção da página conferida nos quatro viewports. Inspeção visual concentrou-se
nas assinaturas afetadas e nas tabelas com texto longo/colunas largas; não se
afirma leitura integral de cada célula de ambos os livros.

- Amplificadores: conservam glifo e nome juntos em todos os viewports; no mobile,
  empilhamento ao lado e efeitos completos abaixo, sem rolagem lateral. Cabeçalho
  incompleto da fonte ganha rótulo de apresentação Empilhamento; reconhece também
  a célula vazia adicionada pelo normalizador. Cabeçalhos seguem disponíveis para
  tecnologia assistiva mesmo quando ocultos visualmente no mobile.
- Grades de módulos: o efeito acompanha seu título, preservando associação por
  coluna. Durante a inspeção, índice vazio do cartão foi corrigido com o slot
  canônico. Conferidos módulos V/IV no celular e conjunto V…I no desktop.
- Tabelas comuns: primeira coluna mobile limitada, texto longo quebra dentro dela.
  No fim da rolagem de Porte, Referência inicialmente ficava parcialmente coberta.
  Layout de colunas fixas resolveu; todos os exemplos aparecem completos ao lado
  do Porte. Foco do container visível ao usar as setas do teclado.
- Sumário: 50px no mobile e 42px no painel desktop, iguais à caixa do segmentado
  adjacente; ícone de menu canônico. Alvos mobile de pelo menos 44px.
- Topbar: ícone Regras e Simulação medidos na mesma cor de repouso
  `rgb(150, 155, 163)`, sem borda adicional; ativo mantém indicação canônica.
- Rodapé: marca própria e frase exata, crédito separado preservado. Clique na
  página retorna a `scrollY=0`; no painel retorna a `scrollTop=0` sem mover a página
  de fundo (`scrollY=79585` antes/depois). Foco visível nos links do crédito.

Comparação: parece parte do mesmo produto, controles e ícones canônicos, densidade
e hierarquia coerentes; sem formulário genérico, sem overflow horizontal da página.
Texto e foco respeitam os tokens existentes; contraste inspecionado no tema escuro.

Capturas locais, ignoradas pelo Git, em `.artifacts/regras-mobile-tabelas-e-rodape/`:
`amplificadores-mobile.jpg`, `modulos-mobile.jpg`, `rodape-mobile.jpg`,
`guia-mobile-rolagem.jpg`. Logs estão na mesma pasta.

## Gates automatizados

| Comando | Resultado |
|---|---|
| `npm run test --workspace=frontend -- --watch=false` | 234 arquivos, 3.147 testes passaram; 70 testes do normalizador passaram. |
| `npm run test --workspace=shared` | 69 arquivos, 1.157 testes passaram. |
| `npm run test --workspace=backend` | 53 arquivos, 994 testes passaram, um pulado. |
| `npm run build --workspace=frontend` | Passou; Sistema v4.1.4 e Guia v4.2.0 fiéis ao Markdown. Aviso de bundle inicial 590,05kB contra orçamento de 450kB. |
| `npm run lint` e lint final do frontend | Sem erros; avisos existentes (frontend: 27.010; shared: 5.891). |
| `npm run repo:verificar` | Passou após ignorar a pasta local dos anexos recebidos pelo chat. |

As primeiras execuções no sandbox falharam por cache/realpath `EPERM` e acesso à
fonte Google `ENOTFOUND`. Reexecutadas com autorização automática fora do sandbox,
passaram. Uma execução ampla detectou contagem de `window.scrollTo` da preparação
em um teste síncrono do leitor; o teste focado passou, e o teste foi tornado assíncrono
para aguardar a renderização e limpar os contadores antes da ação. Também passou
a verificar o botão da marca. Suíte completa final passou. Não foi adicionada
defesa de produção para esconder lacunas do jsdom.

Diff completo revisado contra spec e convenções. Buscas nas linhas adicionadas:
sem cores/fontes/raios hardcoded, `title`/estilo HTML locais, DTO/enum novo,
`ngModel`/`NgModule` ou nome com `atualizar`. Alterações concorrentes da task
`icones-recursos-sistema` preservadas. Commit autorizado pelo autor em continuação
do fecho; push/publicação não solicitados.

O primeiro gate de organização identificou somente as cinco capturas fornecidas
pelo autor em `.codex-remote-attachments/`. A pasta foi incluída no `.gitignore`,
como entrada local de evidência; arquivos preservados. Gate repetido com sucesso.
`git diff --check` sem problemas de whitespace. Preparação do commit restrita aos
arquivos da tarefa; gate `npm run repo:verificar -- --staged` exigido antes do commit.

## Limites

Viewports emulados em Chromium, sem Edge Android conectado, aparelho físico,
gestos reais de toque ou leitor de tela. Backend/Postgres não usados nas jornadas
públicas; testes do backend passaram. PDF e demais telas fora do escopo. Não há
pendência funcional ou visual identificada no recorte corrigido.
