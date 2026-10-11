# RV-05 — Verificação

## Análogo e recorte registrados antes da implementação

Abas canônicas `Abas`/`Aba` do próprio leitor em 1920×1080, inspecionadas no
código e na aplicação real. Shell em superfície com borda/raio do primitivo,
gap/padding de 4px, ícone e nome com gap de 8px, mono 10px uppercase e ativo
em accent com texto contrastante. Seleção, roving tabindex, setas/Home/End,
ARIA e foco ficam nos primitivos existentes; painéis/conteúdo no consumidor.

Reprodução em 360×800: barra de 265px, três alvos de 83×44px; Mercenário e
Vanguarda têm overflow interno e encostam ícone/texto nas fronteiras.
Composição proposta: permitir quebra entre abas, largura mínima intrínseca
de nome+ícone e altura mínima canônica de toque. Só layout/tamanho locais,
sem mudar API, tipografia, cores, estados, teclado ou catálogo. O painel
estreito deve responder pela largura do contêiner, inclusive em desktop.
Não é necessário ampliar a biblioteca: os primitivos já contêm toda a
seleção e semântica; o consumidor define sua distribuição.

Coordenação: `usabilidade-02-consulta-arquetipos` permanece no backlog;
não reorganizar catálogo, adicionar resumo/comparação ou destinos.

## Implementação e comparação

Somente o template e SCSS de `RegrasArquetipos`: classes BEM de distribuição,
`flex-wrap: wrap`, largura mínima `max-content` e altura de toque por container
query usando `$bp-mobile`/`$alvo-toque` do handoff. APIs de Abas/Aba, ícones,
fonte mono 10px, cores, seleção e relações ARIA permanecem canônicas.
Não foi criada responsabilidade no componente nem ampliado um primitivo;
normalização, JSONs, regras e catálogo não foram alterados.

Comparação pessoal na aplicação real: mesma superfície, densidade, hierarquia,
espaçamento interno e estados do análogo desktop. Em 360px os três grupos
ocupam duas linhas (2+1), em lugar dos três alvos comprimidos; na página os
dois primeiros têm aproximadamente 127×44px e o último 257×44px. Nome e
ícone completos, sem reduzir fonte ou esconder rótulo. Desktop mantém a
composição em linha; foco com contorno canônico visível e seleção em accent.
Não houve divergência visual adicional que exigisse mudança de código.

## Cobertura ao vivo — skill verify

SPA local em `http://localhost:4300/regras/sistema`, base escura e destaque
vermelho. Página e painel compartilham o mesmo renderer. Inspeção pessoal
dos três grupos, com os nove estados selecionados e seus conteúdos:

| Viewport | Página | Painel normal | Painel maximizado |
|---|---|---|---|
| 1920×1080 | 9 seleções | 9 seleções | 9 seleções |
| 1366×768 | 9 seleções | 9 seleções | 9 seleções |
| 960×1080 | 9 seleções | 9 seleções | 9 seleções |
| 360×800 | 9 seleções | 9 seleções | indisponível no mobile |

99 registros de geometria: nenhuma barra ou aba com `scrollWidth > clientWidth`,
fonte sempre 10px e altura mínima de 44px nos contêineres mobile. O painel
normal desktop estreito mantém todos os nomes/ícones. Capturas dos nove
arquétipos mobile e dos três grupos em cada configuração desktop documentam
a inspeção; medições complementam, não substituem, a observação visual.

Na página mobile, setas direita/esquerda, volta da última para a primeira,
Home/End e Shift+Tab → Tab conferidos nos três grupos, com seleção e foco
no mesmo alvo e roving tabindex. No painel mobile, seta Mercenário →
Vanguarda e retorno por Tab a Acadêmico conferidos, com foco visível.
Pesquisa “Classificação de Campo” após selecionar Engenheiro revelou
Acadêmico tanto na página quanto no painel, fechou o sumário e destacou
o trecho integral. IDs/`aria-controls` continuam ligados aos painéis.

Evidências brutas em `.artifacts/regras-visual-05-abas-arquetipos-mobile/`:
`medicoes.json`, `teclado.json`, capturas `escuro-<largura>-<superficie>-<nome>.png`,
`escuro-360-pagina-final-Mercenario.png`, capturas de foco/busca e logs.
Algumas capturas de troca rápida registram a transição de cor anterior;
seleção final foi conferida após estabilizar e não é inferida só da imagem.
Overrides de viewport removidos e aba temporária encerrada após a inspeção.

## Gates e limites

- `npm run test --workspace=frontend -- --watch=false`: 88 testes de
  normalização e 3219 testes Angular (244 arquivos) passaram. Reutilizados
  testes de seleção/Abas; nenhum comportamento novo exige teste adicional.
  Dois avisos existentes de navegação não implementada no jsdom.
- `npm run build --workspace=frontend`: passou, incluindo fidelidade dos dois
  JSONs. Aviso preexistente de bundle inicial: 594,00kB, 144,00kB acima de 450kB.
- `npm run lint`: três workspaces, zero erros; 27350 avisos existentes no
  frontend. Formatação dos dois arquivos alterados conferida com Prettier.
- Passe `convencoes-check`: diff HTML/SCSS integral revisado contra os cinco
  aceites; buscas de hardcodes de cor/fonte/raio, title/style nativos e
  formulários legados sem acertos. Layout BEM local usa os primitivos existentes.
- `git diff --check`, `npm run repo:verificar` e modo `--staged`: gates do fecho.

Cobertura visual desta task na base escura; contraste na base clara é a RV-09.
Não é auditoria de todos os estados do leitor, nem de backend, autenticação,
deploy ou PDF. A consulta/reorganização de arquétipos continua na
`usabilidade-02`; P-124 e RV-06…10 permanecem abertos. P-118 corrigido.
