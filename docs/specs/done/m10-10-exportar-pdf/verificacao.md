# M10-10 — Verificação da exportação nativa

Data: 2026-10-08. Implementação e gates concluídos; commit da M10-10 ainda não
solicitado. M10-09 commitada em `251455ad`, com gate staged e coautoria conferidos.

## Conformidade e responsabilidades

Botão `app-botao-icone`, tamanho compacto, tooltip/aria-label Exportar PDF, ao
lado do livro/versão no leitor compartilhado. O mesmo comando atende página,
painel e gaveta. Service cria projeção Angular sob demanda, espera fontes e
chama `window.print()`. `afterprint` destrói a projeção/restaura título e estado;
falha também limpa e permite repetir. Guarda global impede exports simultâneos.

Componente separado reutiliza renderer, sumário e contexto de IDs. Não copia DOM
com marcas de pesquisa nem depende da aba selecionada. Documento original não
é alterado. Abertura/tarjas formam capa com versão do asset, sem data; nota de
versão antiga da abertura é omitida. Definições Markdown de imagens embutidas
(`generico`, origem `[imageN]: <data:image/...>`) são metadados e são omitidas
somente nesta projeção; conteúdo genérico legível é conservado.

CSS exclusivo da exportação: A4, papel claro por cinco tokens `--papel-*` nas
fontes canônicas/runtime, margens com livro/versão e contador página/total.
Capítulos ⬢ e nove arquétipos começam em páginas próprias. Habilidades,
equipamentos, modificações, origens, verbetes curtos, notas/exemplos, itens de
ameaça e ataques evitam quebra interna. Containers maiores que uma página
fragmentam; tabelas longas preservam linhas e repetem cabeçalhos. Temas/NA/tarjas
conservam cores; topbar, leitor, painel/gaveta e controles ficam ocultos.

Leitor recebeu apenas injeção/comando. Não acrescentei responsabilidade extensa
ao componente existente. Parser, assets, regras, backend e shared não alterados.
Cabeçalhos exclusivos de impressão são excluídos da pesquisa com regressão.

## Aplicação real e comparação visual

Skills `design-fidelity`, `verify` e `pdf` aplicadas. Análogos: leitor M10-09,
primitivo de ícone existente e capa/modo PDF do exemplão M10. Inspeção pessoal
da UI renderizada em **1920×1080, 1366×768, 960×1080 e 360×800**, claro/escuro,
página Sistema com pesquisa e painel Guia com gaveta. Capturas após animação.

Controle usa API de densidade canônica, foco e alvo mobile de 44px. Densidade,
hierarquia, iconografia, contraste e shell permanecem iguais ao leitor aprovado;
não há receita de controle local nem overflow horizontal. Exportar/voltar
preserva termo, URL e leitura; projeção sem marcas, descarte e repetição
conferidos nos oito cenários. Falha do comando também coberta em teste.

PDFs gerados pelo motor nativo da aplicação servida em `127.0.0.1:4303`, A4,
fundos habilitados e cabeçalhos automáticos desabilitados. Navegadores:
**Chromium 148.0.7778.96** (motor Chrome; Google Chrome não instalado) e
**Microsoft Edge 154.0.4258.62**. Inspeção pessoal de todas as páginas rasterizadas
em folhas de contato, ampliando capa/sumário e trechos relevantes. Comparação
automatizada confirmou texto/paginação e **pixels idênticos em todas as páginas**
entre ambos os motores. O Guia exportado a partir de 360px também tem o mesmo
texto/paginação do exportado a partir de 1920px.

| Livro | Páginas | Evidências locais ignoradas pelo Git |
|---|---:|---|
| Sistema v4.1.3 | 109 | `.artifacts/m10-10-exportar-pdf/chrome-sistema.pdf`, `msedge-sistema.pdf` |
| Guia de Mestre v4.2.0 | 41 | `.artifacts/m10-10-exportar-pdf/chrome-guia.pdf`, `msedge-guia.pdf` |

Capa em uma página, tarjas sólidas, sumário hierárquico sem páginas, cabeçalho/
rodapé, capítulos e arquétipos em sequência, blocos/linhas inteiros, tabelas
legíveis e paleta dos oito NA conferidos. Sem páginas vazias ou base64 impresso.
Tabelas extensas e prosa maior que uma página continuam naturalmente; preservam
todo o texto. Último capítulo do Guia conserva o “EM BREVE...” da fonte.

Correções da inspeção: fundo escuro herdado pelo `html` nas margens; cabeçalhos
de impressão contaminando pesquisa; título de condição isolado no fim da página;
arquétipo iniciando no fim da página; definições técnicas de imagem no fim do
Sistema. Regeração/inspeção confirmaram as correções antes do fecho.

PDFs, rasters, capturas, scripts e logs em `.artifacts/m10-10-exportar-pdf/`;
`pdf-resumo.json`, `comparacao.json`, `gerar.log`, `ui.log` registram contagens.
Um subagente Codex (modelo da sessão), somente leitura, mapeou riscos dos blocos
ricos para impressão; inspeção e correções finais foram realizadas pelo principal.

## Gates e limites

- `npx ng test --watch=false --ts-config=tsconfig.m10-10-verificacao.json`,
  excluindo os dois specs do corpus antigo: **232 arquivos/3.119 testes passaram**.
- Após correções da projeção: recorte `regras-impressao.service.spec.ts`,
  **2 testes passaram** (inclui preservação de prosa/omissão de metadados).
- `npx ng build`: aprovado após correções, bundle inicial 589,47 kB;
  aviso de budget de 450 kB já existente, sem erro.
- `npm run lint`: nenhum erro; avisos legados dos três workspaces. ESLint do
  recorte alterado: nenhum erro/aviso. Prettier dos seis HTML/SCSS tocados: aprovado.
- `git diff --check` e `npm run repo:verificar`: aprovados no fecho.

P-105 impede regeneração limpa dos livros no prebuild por caminho antigo; usei
os assets canônicos locais já preparados e build direto. P-106 impede compilar
dois specs Angular do montador com ponteiros antigos; config temporária exclui
esses dois casos, arquivada em `.artifacts/` e removida do frontend. São limites
preexistentes registrados em PROBLEMS; não foram tratados nesta task. Shared e
backend não alterados, suas suítes não foram repetidas neste recorte de UI.

Para automatizar geração, a chamada de `window.print` foi interceptada após
montar a projeção; o PDF foi produzido pelo comando nativo do navegador. A
restauração foi observada pelo evento `afterprint` e simulada no cancelamento.
Não houve inspeção manual do diálogo do sistema ou impressora física; escolhas
do usuário no diálogo (escala/fundos/cabeçalhos) podem alterar a saída. O teste
comprova o PDF nativo A4 com as opções acima, não todos os dispositivos de impressão.

Limites da spec: sumário sem números de página e referências impressas pelo
nome da seção, sem “p. N”. PDF antigo continua disponível; remoção é M10-11.
Sem dependência de Paged.js. Nenhuma pendência de implementação deste recorte.
