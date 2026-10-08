# M10-08 — Verificação e fecho

08/10/2026. **Concluída**, sem commit nesta entrega. M10-07 commitada em
`348f76f2`, com gate staged aprovado e trailer Codex conferido.

## Entrega e arquitetura

Topbar e cabeçalho da ficha flutuante abrem uma única consulta global de Regras.
`RegrasLeitor` apresenta o mesmo documento na página e no painel; `RegrasPage`
conserva a responsabilidade pela URL e `RegrasFlutuante` pelos comandos da janela.
`RegrasLeituraStore` lembra livro/seção por documento durante a sessão da aplicação.
Não há persistência dessa memória após recarregar a aplicação, nem a spec a exige.
HTTP e cache continuam em `RegrasService`, com um pedido por livro. O painel é
carregado por `@defer` no primeiro uso; não baixa os livros antes de abrir.

Painel normal usa texto e gaveta local; maximizado no desktop usa dois trilhos.
Página no celular usa a mesma gaveta, com sumário acima da camada de texto e véu
confinado. ↗ abre a página na seção atual; mudar Sistema/Guia recupera a seção de
cada um. Links internos rolam e focam somente o hospedeiro de leitura.

Responsabilidades extraídas da página, sem acrescentar regras de domínio. O
cabeçalho extenso da ficha recebe apenas uma ação que encaminha ao service global;
nenhum conteúdo, cache ou estado de Regras é duplicado na ficha. Nenhum primitivo,
parser, asset, DTO, backend, fórmula ou permissão foi alterado. Pesquisa é M10-09;
antigo leitor permanece para remoção na M10-11 e downloads provisórios preservados.

## Referência e inspeção pessoal

Análogo registrado antes da edição: Biblioteca flutuante M9-11/M9-12, observado
no código e na campanha real. Mesmo primitivo de janela, superfície, cabeçalho,
densidade, minimizar/maximizar/abrir página; corpo reaproveita o leitor M10-07 e
gaveta M10-05. Botões, segmentado, cartão, esqueleto e erro usam os primitivos
canônicos com inputs/receitas correspondentes. Sumário conserva links nativos de
navegação e a receita já aprovada da página/patchnotes.

Aplicação real Angular/NestJS/Postgres dirigida com a skill `verify`, Chromium
com barras de rolagem visíveis. Agente principal inspecionou pessoalmente as
capturas renderizadas; o relato do agente delegado não substituiu essa inspeção.

| Viewport | Bases | Estados e entradas conferidos |
|---|---|---|
| 1920×1080 | claro/escuro | topbar, ficha, gaveta, seção, maximizar/restaurar, ↗, Biblioteca |
| 1366×768 | claro/escuro | mesmos estados; altura e comandos sem corte |
| 960×1080 | claro/escuro | mesmos estados; largura intermediária e dois trilhos |
| 768×1024 | claro/escuro | mesmos estados; viewport adicional exigido pela spec |
| 360×800 | claro/escuro | topbar/ficha, folha, gaveta na página/painel, seção, ↗, Biblioteca |

Texto ocupa a largura disponível no celular; controle com alvo de toque canônico.
Documento e sumário rolam localmente no painel; não há overflow horizontal da
página. Maximização no celular não existe, seguindo o contrato de folha do
primitivo. Comparação confirmou família visual, densidade e hierarquia do produto,
controles/ícones canônicos, contraste e foco; não há formulário HTML genérico.

Percorridos Sistema → Vida → Guia → Exemplo de Ficha Completa → Sistema; minimizar,
resize, reabrir, maximizar/restaurar e ↗ preservam a seção de cada livro. Página e
painel simultâneos não duplicam IDs de títulos nem controles das abas. Links no
texto, abertos pela ficha, focam o título sem mudar a rota da campanha. Gaveta
fecha por Esc mantendo janela aberta; Tab/Shift+Tab circulam dentro, véu fecha e
foco volta ao gatilho. Carga suspensa, falha de transporte e retry observados em
1920 escuro e 360 claro; retry recupera o documento.

Correções na integração: ignorar área invisível ao observar resize de painel
minimizado (não gravar a última seção); IDs locais por instância para convivência
com página; foco após render para respeitar `inert`/retorno da gaveta; linha de
leitura considera toolbar mobile; título mobile sem kicker para evitar aperto no
cabeçalho. Testes de regressão cobrem área invisível e isolamento de IDs.

Dados sintéticos de conta/campanha/ficha criados por REST e removidos por soft
delete ao finalizar os cenários, incluindo tentativas interrompidas. Primeiro
fixture foi corrigido para cumprir os campos obrigatórios do contrato; seletor da
ficha usa seu atributo acessível porque seu ancestral é `aria-hidden` no componente
preexistente, registrado como P-107 em `PROBLEMS.md`. Biblioteca foi aberta após
fechar a ficha quando a janela cobria a
ação da campanha. Nenhuma alteração desse comportamento legado integra o escopo.

## Gates e revisão

- `npx ng test --watch=false --ts-config=tsconfig.m10-08-verificacao.json`
  com exclusão dos dois specs antigos do montador: **230 arquivos, 3.107 testes
  passaram**. Config temporária arquivada nos artefatos e removida do frontend.
- Recorte inicial: 46 testes passaram; teste posterior de leitor/layout: 20
  passaram. Gate amplo final acima inclui ambos. Avisos jsdom/canvas não falharam
  testes. Uma tentativa do runner no sandbox falhou ao renomear cache; repetida
  fora da restrição, sem falha de testes.
- `npm run lint`: **zero erros** nos três workspaces, com avisos preexistentes
  (shared 5.890, backend 4.475, frontend 27.088 no passe amplo). Único aviso novo
  do leitor era aspas no teste, corrigido; lint final do recorte sem avisos.
- `npx ng build --configuration production`: passou; initial **589,03 kB**,
  aviso do budget de 450 kB, abaixo do limite de erro de 1 MB. Download do corpo
  por `@defer` reduziu o initial de 714,60 kB do corte inicial.
- `ngc -p tsconfig.app.json --noEmit`: passou na integração inicial; build e
  runner finais recompilaram os ajustes posteriores.
- Revisão completa do diff, inclusive arquivos novos: responsabilidades,
  isolamento de âncoras, escopo de rolagem, memória, lazy/cache, receitas dos
  primitivos e ausência de cores/fontes/raios hardcoded novos conferidos.
  `git diff --check` e `npm run repo:verificar`: aprovados no fecho.

P-105/P-106 permanecem separados: corpus antigo ausente afeta prebuild do
normalizador e quatro specs legados (dois Angular, dois shared). Build usa Angular
direto e os assets locais já preparados, como M10-06/07; não valida regeneração
do corpus. Shared/backend não receberam mudança e conservam evidências M10-06
(974 shared passaram, dois casos antigos falharam; 994 backend passaram, um skip).
Não se afirma suíte completa sem exclusões nem correção desses problemas.

Delegação útil: subagente Codex, mesmo modelo da sessão, assumiu casca/pontos de
entrada e fez revisão independente da extração. Encontrou o risco do resize de
painel invisível; principal corrigiu, testou e fez o gate visual integral.

Evidências locais ignoradas em `.artifacts/m10-08-painel-flutuante-e-celular/`:
`visual.log`, `medidas.json`, capturas `{base}-{width}-*`,
`ficha-final.log` (desktop/notebook), `ficha-complemento.log` (demais),
`ficha-*`/`analogo-*`, `estados.log`, `carga-*`/`erro-*`, `testes-final.log`,
`lint.log`, `lint-final-recorte.log`, `build-final.log`, `diff-check.log` e
`repo-verificar.log`. Relatório registra o resultado mesmo sem essas imagens.

Pendências obrigatórias desta tarefa: **nenhuma**. Próxima do milestone: M10-09
(pesquisa). Commit da M10-08 aguarda autorização própria; nenhum push realizado.
