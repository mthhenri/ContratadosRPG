# M10-05 — Verificação de app-gaveta

Data: 2026-10-08. [Spec](../m10-05-primitivo-gaveta.spec.md).

## Escopo e referência

Primitivo independente em `frontend/src/app/shared/ui/gaveta/`. API: `[(aberta)]`,
`lado` (`inicio`/`fim`), `rotulo` obrigatório e projeção. Integração no leitor é
M10-08, sem consumidor permanente nesta task. A criação do primitivo já estava
autorizada na spec; nenhuma ampliação de outro primitivo foi necessária.

Análogos escolhidos antes da implementação: `app-painel-flutuante` e menu mobile
da topbar. Inspeção do código: superfície/borda/sombra, cabeçalho de 54px,
13px/700 mono, controles compactos e alvos mobile de 44px. O véu usa a receita
de `app-modal` (`--bg` a 70%); sombra com geometria da família e cor derivada
do token. Sem cor/fonte/raio literal. Espaços usam os cinco degraus do tema.

Responsabilidade: somente apresentação, contenção, movimento e foco; nenhum
DTO, regra de jogo, permissão, SQL ou escrita em backend. Componente novo e
pequeno; não acrescenta responsabilidade a um componente extenso existente.

## Gates executados

| Comando | Resultado |
|---|---|
| `npx ng test --watch=false --include=src/app/shared/ui/gaveta/gaveta.component.spec.ts` | Primeira rodada identificou componente ausente e falhas externas P-106; compilador de testes inclui os demais specs mesmo com filtro de execução |
| Teste focado com tsconfig temporário restrito à gaveta | 8/8 aprovados; após correção de foco no navegador, 8/8 novamente |
| `npm run test --workspaces --if-present` | Shared: 67 arquivos/974 testes aprovados, dois arquivos não carregam por P-106; backend: 53 arquivos/994 testes aprovados, um ignorado; frontend: normalizador 34 aprovados/6 falhas de P-105, etapa Angular não alcançada |
| `npx ng test --watch=false --ts-config=tsconfig.gaveta-verificacao.json` com exclusão dos dois specs de P-106 | 214 arquivos, 3.060 testes aprovados; inclui a gaveta. Configuração temporária removida ao final |
| `npm run lint` | Aprovado, zero erros; avisos preexistentes: shared 5.890, backend 4.475, frontend 27.101 |
| `npx eslint src/app/shared/ui/gaveta/` | Aprovado sem avisos/erros |
| Prettier nos HTML/SCSS da gaveta | Aprovado |
| `npx ng build`, produção, `CI=true`, `NG_BUILD_MAX_WORKERS=2` | Aprovado; bundle inicial 560,55 kB, aviso do budget de 450 kB, abaixo do limite de 1 MB |

Vitest/Vite apresentaram EPERM no sandbox; testes e servidor reexecutados fora
dele. O primeiro build não conseguiu buscar Google Fonts no sandbox; produção
fora dele passou. Nenhuma dependência, configuração permanente ou budget alterado.
O prebuild/publicação dos livros continua limitado por P-105: build Angular direto
não certifica preparo dos livros em checkout limpo. As falhas P-106 já existiam
antes de escrever o componente; seus quatro ponteiros não foram corrigidos aqui.

Testes da gaveta cobrem model, projeção, nome acessível, inércia e ocultação fechada,
Esc/véu/botão, foco inicial/retorno, destruição, circulação Tab/Shift+Tab excluindo
controles ocultos/desabilitados e mudança de borda com conteúdo preservado.

## Aplicação real e comparação

Skills `design-fidelity` e `verify`. Angular real em `127.0.0.1:4300`, com estilos
globais, TemaService e primitivos reais, sem mocks de componente ou HTML estático.
Composição temporária: uma gaveta dentro de `app-painel-flutuante` e outra num
contêiner com a altura da viewport; conteúdo longo com botões canônicos. Por ser
primitivo sem dados/API, não exige banco, autenticação ou backend no cenário.
A entrada original foi restaurada byte a byte e a composição removida ao final.

Quatro viewports: **1920×1080, 1366×768, 960×1080 e 360×800**. Em cada um: fechada,
aberta nas bordas inicial/final, bases clara/escura (16 cenários de painel), além
de gaveta sobre a viewport (quatro cenários). Inspeção pessoal do agente principal
e medidas de contenção: nenhuma caixa ultrapassa o ancestral; uma faixa de texto
permanece visível; zero overflow horizontal e zero erros de página.

Teclado: foco na região ao abrir, Shift+Tab até o último controle, Tab de volta
ao fechar, retorno ao gatilho; Esc fecha somente a gaveta, mantendo o painel
flutuante aberto. Ponteiro: fechamento pelo véu e pelo botão em todos os cenários;
mobile usa toque real via Playwright e botão de 44×44px. Corpo longo rola sem
empurrar o cabeçalho; `prefers-reduced-motion: reduce` elimina a transição.
Pesos IBM Plex Mono 600/700 e Sans 400 carregados explicitamente antes das capturas
finais; fonte calculada do título conferida no navegador. Mesma família visual,
densidade e hierarquia do análogo; controles e foco canônicos,
texto legível nas duas bases, sem aparência de formulário genérico ou corte.

Achado real corrigido: `effect` tentava focar enquanto a classe de abertura e
`inert` ainda não estavam aplicados no navegador. jsdom não revelou o problema.
`afterRenderEffect` agora executa o foco depois do DOM visível; nova rodada de
testes e cenários reais confirmou o comportamento.

Evidências **locais, não distribuídas no clone** em `.artifacts/m10-05/`: capturas
fechada/aberta/viewport, `medidas.json`, scripts e logs dos gates. O relato registra
os resultados sem exigir acesso às imagens. Nenhuma evidência bruta foi versionada.

## Revisão e limites

Skill `convencoes-check`: leitura integral dos quatro arquivos novos e do diff
documental; API, arquitetura, tokens, inputs completos do botão e escopo conferidos.
Sem `fixed`, hex, fonte/raio hardcoded, `ngModel`, estilo inline ou dependência nova.
`npm run repo:verificar` e `git diff --check` aprovados; os espelhos de agentes/skills
não foram alterados. Após autorização do autor para o commit, recorte da task
preparado no índice e `npm run repo:verificar -- --staged` aprovado.
Dimensões 320px/85%, cabeçalho 54px, movimento 180ms e sombra são estrutura do
primitivo/análogo, não valores de tema duplicados. Commit autorizado pelo autor
após o fecho; sem push.

Gates da gaveta aprovados; suites integrais/preparo dos livros permanecem com
pendências externas explícitas **P-105 e P-106**. M10-04 segue ativa para aprovação
da prancha; M10-06 ainda depende dela. Uso de `app-gaveta` no leitor pertence à M10-08.
