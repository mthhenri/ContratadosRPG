# M10-09 — Verificação e fecho

08/10/2026. **Concluída**, sem commit nesta entrega. M10-08 commitada em
`95cdfad6`, gate staged aprovado e trailer Codex conferido.

## Entrega e responsabilidade

Campo no trilho/gaveta, resultados com caminho/trecho em lugar do sumário,
destaques no documento, contador/setas e Enter/Shift+Enter; Esc limpa antes de
fechar a gaveta. Pesquisa literal sem caixa/acento, mínimo de dois caracteres
como o exemplão, informado no campo. Outro livro abre com termo preservado.
Termo e ocorrência por livro são memória da sessão entre página e painel.

Função pura produz intervalos/trechos; adaptador projeta o texto do renderer
canônico, conserva nós originais do Angular e insere marcas temporárias seguras.
Não usa HTML interpolado do usuário. Tarjas vazias criam barreira, inclusive
impedindo casamento entre textos nos seus dois lados. Termos atravessam negrito
sem perder offsets; abas ocultas são pesquisadas e reveladas antes de medir.

Controlador por leitor cuida de marcas/navegação; componente próprio cuida do
campo/resultados. Extração mantém proporcional a responsabilidade do leitor
extenso. Livro alternativo usa cache/HTTP existente, projeção oculta/inert com
contexto de IDs próprio, sem observador de seção. Evita duplicar as receitas dos
blocos e contar tabelas auxiliares do AST que não viram texto apresentado.
Observador/âncoras consultam somente o documento visível; página de fundo não
rola nem altera URL por uma busca no painel. Sem novo primitivo, backend, DTO,
fórmula, parser ou asset.

## Referência e inspeção pessoal

Análogo registrado antes da edição: busca da Biblioteca M9-05 (`app-campo`,
Reactive Forms, ícone busca), texto destacado seguro de `modules/documento`;
shell/trilhos/gaveta do leitor aprovado M10-08 e protótipo M10. Campo compacto,
botões de resultado secundário/texto/pequeno, outro livro secundário/link/pequeno,
setas/limpar com `app-botao-icone` compacto e tooltips; vazio com primitivo
compacto. Receita local só organiza conteúdo dos controles canônicos.

Principal inspecionou pessoalmente a aplicação real pela skill `verify`, em
Chromium com barras de rolagem habilitadas, nos quatro tamanhos abaixo, em
**claro e escuro**:

| Viewport | Estados percorridos |
|---|---|
| 1920×1080 | campo/trilho, destaque, Enter/Shift+Enter, outro livro, Esc, vazio, painel/gaveta/setas |
| 1366×768 | mesmos estados, resultados longos com rolagem e painel na altura menor |
| 960×1080 | mesmos estados, trilhos intermediários e painel com gaveta |
| 360×800 | campo/resultados na gaveta, vazio, outro livro, Esc antes de fechar, painel/folha e setas |

MORRENDO: 29 no Sistema e cinco no Guia, contagem do atalho igual à do destino.
nivel de ameaca: cinco no Guia, sem exigir acento. Consulta sem resultado mostra
o estado vazio canônico e desabilita setas. Enter avança uma ocorrência;
Shift+Enter volta uma; Esc remove marcas e restaura sumário. Seleção por clique
fecha gaveta e rola até o destaque. Ricochete revela a aba Mercenário inicialmente
oculta; medição final confirmou seu destaque em y=111px, abaixo do contador
(52–95px). Consulta curta `de` e expressão literal `[.*]` conferidas.

Página/painel mantêm índice ao abrir/fechar; painel muda índice sem alterar URL
de fundo. IDs únicos incluem títulos e abas da projeção oculta. Nenhum overflow
horizontal da página nos oito cenários. Comparação pessoal confirmou família
visual, densidade, hierarquia, controles/ícones canônicos, foco e contraste;
alvos de toque seguem os primitivos mobile, sem formulário genérico.

Correções verificadas: propagação de Enter duplicado; linha de leitura inclui
contador; medição da topbar em pixels, pois token usa rem; projeção oculta com
IDs/contexto separados e fora da navegação; conservação da seleção entre
hospedeiros e guarda contra rolagem da página de fundo. Regressões de teclado,
IDs e topbar incluídas. Revisão independente por subagente Codex, mesmo modelo
da sessão, encontrou os três primeiros riscos; principal corrigiu e realizou
integralmente a inspeção final.

## Gates, revisão e limites

- `npx ng test --watch=false --ts-config=tsconfig.m10-09-verificacao.json`, com
  exclusão de `montador-blocos.spec.ts` e `montador-pecas.spec.ts`: **231 arquivos,
  3.117 testes passaram**. Config temporária arquivada nos artefatos e removida
  do frontend. Avisos jsdom/canvas não falharam testes.
- Função pura e projeção: termos reais dos dois livros, caixa/acento, offsets
  UTF-16, acento decomposto, expressão literal, repetições, vazio, tarjas,
  negrito, restauração dos nós Angular e revelação de aba. Gate amplo inclui
  esses casos e regressões do leitor. Recorte inicial: 11 testes passaram;
  regressão adicional de topbar incluída no passe amplo final.
- `npm run lint`: **zero erros** nos três workspaces, avisos legados (shared
  5.890, backend 4.475, frontend 27.087). Lint final dos arquivos TS tocados/novos:
  zero erros/avisos. Prettier somente nos quatro HTML/SCSS tocados.
- `npx ng build`: passou em CI; initial **589,03 kB**, mesmo aviso preexistente
  do budget de 450 kB, abaixo do limite de erro de 1 MB. Pesquisa permanece no
  corpo carregado por demanda, não aumenta o initial.
- Diff completo e arquivos novos revisados contra spec/convenções: fronteiras,
  normalização, tarjas, controle de assinaturas, restauração do DOM, isolamento
  de IDs/âncoras, memória e APIs dos primitivos. Buscas do recorte sem novo DTO,
  enum, formulário template-driven, tooltip nativo, cor/fonte/raio hardcoded ou
  `innerHTML` de produção. `innerHTML` somente monta fixtures de teste.
- `git diff --check` e `npm run repo:verificar`: aprovados no fecho.

P-105/P-106 permanecem fora da task: prebuild do normalizador e corpus de quatro
specs legados usam caminhos antigos. Angular direto consumiu assets locais já
preparados; não valida regeneração limpa do corpus, nem suíte sem exclusões.
Shared/backend não mudaram e preservam evidência M10-06 (974 shared passaram,
dois casos antigos falharam; 994 backend passaram, um skip). P-104 contornado
com CI/cache conforme verificações anteriores. P-107 não pertence à pesquisa.

Evidências locais ignoradas em `.artifacts/m10-09-pesquisa-regras/`: `visual.log`,
capturas `{base}-{width}-{resultados,vazio,painel-gaveta,painel-texto}.png`,
`arquetipo-revelado.png`, `estados.log`, `testes-amplos.log`, `testes-focados.log`,
`build.log`, `lint.log`, `lint-final-recorte.log`, `formato-final.log`,
`repo-verificar.log`, `diff-check.log` e config temporária de teste.

Pendências obrigatórias desta tarefa: **nenhuma**. Próxima: M10-10, exportar PDF
por impressão nativa. Nenhum push realizado.
