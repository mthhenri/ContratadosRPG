# M10-07 — Verificação dos blocos ricos

08/10/2026. Implementação concluída, ainda sem commit. M10-06 commitada em
`5faec0f65b6ac17221bd7ffb26ba113cf3b26589`, gate staged e trailer Codex conferidos.

## Aceite da spec

| Entrega | Evidência e resultado |
|---|---|
| Dossiês | Três classes com ícone, citação, Vida/Energia e habilidades. Nove arquétipos selecionáveis por clique/teclado, habilidade inicial e melhorias gerais; três subclasses com ícones próprios. |
| Habilidades | Grupos consecutivos em duas colunas, uma no celular; ordem da fonte e links preservados. |
| Origens | Dois dossiês, grade de duas colunas que recolhe no celular. |
| Equipamentos | Lista densa, custo/dano/porte/peso e descrição curta; danos separados Uma/Duas Mãos. Modificações conservam ■□ e Bloqueia. |
| Fragmentos | Cinco cartões V → I, orientação fraco/forte; custo de Energia Máxima explícito e acessível. |
| Tabelas | Caixa de rolagem local, coluna inicial fixa e fade existentes reutilizados. Todas as tabelas dos dois livros conferidas no celular; Patentes/Nível de Criatura mantêm o renderer de dados, módulos/NA também têm suas apresentações ricas. |
| Guia | Roteiros numerados, identidade, dez atributos inclusive Social zero, cor e texto do modificador; categoria das habilidades de criatura. |
| A Estátua | Ficha completa com marca própria do NA, citação, saúde/defesa, resistências separadas, ataques e habilidades. Âncoras originais preservadas. |
| Ameaças | Oito níveis, marca própria ContratadosRPG e cores/fundos M10-04; Médio corresponde ao índice 3. Sem logo oficial nos NAs. |
| Recursos | Ícones preenchidos Vida/Energia/Defesa, `appTooltip` por extenso e foco de teclado. Vida opção A: coração cheio sem pulso, confirmado pelo autor. |

Somente apresentação: nenhum cálculo, DTO, normalizador, livro ou JSON alterado.
Subclasses continuam consumindo os trechos genéricos preservados pelo normalizador;
o leitor acrescenta o ícone aos três títulos reconhecidos, sem inventar novos campos.
Componentes específicos extraídos em `modules/regras/blocos/`; renderer somente encaminha
contratos e navegação. Imports recursivos Angular usam `forwardRef`.

## Gates automatizados

- Testes focados: 12 arquivos, 63 testes aprovados na integração inicial.
- Gate final Angular: **225 arquivos, 3.093 testes aprovados**, incluindo regressão da
  ficha sem ataques/regeneração duplicados e com âncoras preservadas. Comando em `frontend`:
  `npx ng test --watch=false --ts-config=tsconfig.m10-07-verificacao.json
  --exclude=src/app/shared/montador-rolagem-experimental/montador-blocos.spec.ts
  --exclude=src/app/shared/montador-rolagem-experimental/montador-pecas.spec.ts`.
  Configuração temporária arquivada nas evidências, removida da árvore de código.
- `npm run lint`: zero erros nos três workspaces; 5.890 avisos shared, 4.475 backend,
  27.077 frontend. Após correções finais, lint frontend repetido: zero erros, mesmos avisos.
- `npx ngc -p tsconfig.app.json --noEmit`: aprovado na integração inicial.
  Compilação dos templates/tipos novamente coberta pelo build e testes finais.
- Build de produção: `CI=true NG_BUILD_MAX_WORKERS=2 npx ng build`, aprovado;
  bundle inicial 581,93 kB, aviso de budget 450 kB, abaixo do limite de erro 1 MB.
- `git diff --check` e `npm run repo:verificar`: aprovados no fecho.

## App real e comparação visual

Skill `verify`, Chromium com barras reais e fontes IBM Plex. Aplicação pública própria
em `http://127.0.0.1:4301/regras/sistema` e `/regras/guia`, sem necessidade de mutação/API.
Servidor anterior na 4300 preservado. Assets existentes consumidos conforme limite P-105.

Principal inspecionou pessoalmente as capturas da aplicação nos quatro tamanhos:
**1920×1080, 1366×768, 960×1080 e 360×800**, em **claro e escuro**. Percorridos
classes/arquétipos, origens, equipamentos, modificações, cinco módulos, oito NAs,
roteiros, identidade/atributos e ficha completa. Inspeção adicional dos nove arquétipos,
teclado, tooltips de Energia/Vida/Defesa, tabelas, subclasses, saúde/ataques e trio em
14/16/24px nas duas bases. Página sem overflow nos oito cenários; Acadêmico e resistências
conferidos também dentro dos cartões móveis.

Análogos registrados antes da edição: página M10-06, ficha com chips/stats/abas e cada
bloco do exemplão M10, aba Protótipo. Resultado usa a mesma hierarquia mono/sans,
filetes e densidade, cartões/abas/chips/stats canônicos com inputs completos; aparência
coerente com o produto, sem formulário HTML genérico. Alvos de toque, foco e contraste
legíveis nas duas bases; paleta de NA mantém os fundos fixos aprovados.

A inspeção detectou números ocultos pelo reset global do roteiro, repetição da grade de
atributos, quebra do rótulo NA e trechos duplicados da ficha. Corrigidos e reconferidos.
Revisão independente encontrou dois P2: chips longos no Acadêmico/resistências e repetição
de regeneração/ataques. Bônus passam a texto de conteúdo, resistências a chips separados;
prosa explicativa preservada e ataques apresentados uma vez. Reconferência real aprovada.

## Limites e pendências externas

P-105/P-106 são anteriores e permanecem abertos: preparo limpo de assets/testes do
normalizador aponta para livro v4.1.3 ausente; dois specs Angular do montador e dois
arquivos shared têm ponteiros de corpus antigos. Por isso não se afirma que a cadeia
`npm run test`/prebuild completa está verde. Nenhum desses arquivos foi alterado.
Suítes shared/backend e normalizador já documentadas no gate M10-06 são reutilizadas,
pois esta tarefa não altera esses recortes. Não houve publicação nem push.

Primeira tentativa do build final esbarrou no acesso às fontes Google no sandbox;
reexecução autorizada fora dele passou. Uma execução de testes esbarrou no ambiente de
processos do sandbox; reexecução final passou. Logs JSDOM de canvas são preexistentes.

Trio: somente entrega 1 da spec avulsa concluída; adoção no restante do site e levantamento
de outros ícones continuam ativos. Próxima tarefa M10 é M10-08, painel e celular.

Evidências locais ignoradas: `.artifacts/m10-07-blocos-ricos/`, scripts `visual.cjs`,
`estados.cjs`, `conferencia-final.cjs`, `medidas.json`, capturas por base/tamanho/bloco;
logs `testes-final-2.log`, `build-final-2.log`, `lint.log`, `lint-final.log`,
`visual-final.log`, `estados-final-2.log` e `conferencia-final.log`.
