# M10-02 — Verificação dos casos explícitos do normalizador

Fontes: Sistema v4.1.3 e Guia de Mestre v4.2.0 em `docs/core/`; contrato da
[spec](../specs/done/m10-02-normalizador-casos-explicitos.spec.md) e formatos da aba
Protótipo do `docs/design/propostas/m10-regras-exemplao.html`. Sem alteração de UI.

## Implementação e preservação

O núcleo mantém a hierarquia, os ids/âncoras e os links da M10-01. Reconhecedores
separados em `frontend/scripts/regras-personagens.mjs`, `regras-equipamentos.mjs`
e `regras-guia.mjs` aceitam assinaturas fechadas; formatos incompletos ou desconhecidos
continuam genéricos com linha de origem. Os tipos vivem em `regras.model.ts`.

Cada tabela rica conserva `cabecalho`/`linhas` para auditoria, inclusive células vazias,
e campos próprios para o leitor consumir. Estes campos de auditoria não são uma segunda
lista para renderizar ou indexar. Os dossiês agrupam a tabela de arquétipos em `filhos`,
com iniciais no dossiê e bônus/habilidades/melhoradas na tabela de cada trio.
Roteiros e ficha completa conservam a árvore original em `filhos`, além dos campos
estruturados. O teste independente de cobertura percorre essa fonte uma única vez;
os testes por caso conferem também os campos estruturados, não só a cópia de auditoria.

Nenhuma fórmula é avaliada. Módulos têm `energiaMaxima`, não custo de uso.
Uma/Duas Mãos tem dois danos escritos, com rótulos UMA MÃO/DUAS MÃOS.
Empilhamento ■□ e Bloqueia permanecem próprios. Habilidades de criatura usam
PASSIVA/ATIVA/DE GATILHO sem campo de Energia. NA tem vocabulário fechado,
sem dedução de VD, cor ou poder. Referências contraditórias permanecem texto.

A Estátua conserva Vida `30 × 35 = 1.050`, Defesa `15 + VD ÷ 2 = 30`, resistências,
fraquezas, regeneração, porte, deslocamento, cadência, ataques/efeitos e três habilidades.
O Esmagamento tem `3D12+4 [Físico]` no livro; o valor diferente do exemplão não foi
copiado. Falta de identidade, um dos dez atributos/modificadores, Vida Máxima,
ataque válido ou valor de saúde/movimento impede a ficha completa: fallback integral
com aviso. Os demais nós e âncoras continuam disponíveis dentro desse fallback.

## Contagem contra os documentos

| Caso | Sistema | Guia |
|---|---:|---:|
| Classes / tabelas de dossiê | 3 | 0 |
| Arquétipos / habilidades iniciais | 9 / 9 | 0 |
| Habilidades de classe / específicas / gerais melhoradas | 56 / 54 / 18 | 0 |
| Origens | 2 em 1 tabela | 0 |
| Módulos com Energia Máxima | 5 em 1 tabela | 0 |
| Equipamentos | 100 em 9 tabelas | 0 |
| Modificações | 67 em 7 tabelas | 0 |
| Classificação de ameaça com imagem e nível | 8 em 1 tabela | 0 |
| Roteiros | 0 | 2: 13 etapas de Ameaças, 15 de NPCs |
| Ficha de identidade rótulo/valor | 0 | 1, com 10 campos |
| Grade de atributos/modificadores | 0 | 1, com 10 atributos |
| Habilidades de criatura | 0 | 3: duas PASSIVAS, uma DE GATILHO |
| Ficha completa | 0 | 1: A Estátua |

As duas origens escritas são Bombeiro e Alpinista Profissional. Não há nove origens
na fonte. Classes são Combatente, Especialista e Suporte. Os três Experimentos são
subclasses, com outra assinatura; continuam integralmente genéricos, conforme a lista
explícita e o fallback da task, sem serem confundidos com dossiê de Classe.

Equipamentos por categoria: Corpo a Corpo 6, Explosivos 7, Armas de Fogo 6,
Munições 12, Proteções/Escudos 9, Exóticos 7, Armazenamento 8, Operacionais 23,
Medicinais 22. Modificações nas primeiras sete categorias: 16/9/10/12/10/4/6.
Fixtures literais cobrem cada uma; nomes e campos de todos os itens foram comparados
às respectivas linhas do Markdown. Há 21 novas fixtures, incluindo Guia e classificação.

## Avisos remanescentes — todos justificados

Total: **41**, antes 71 na M10-01: **32 no Sistema e 9 no Guia**.
Não existe link interno sem destino nos livros atuais.

### Sistema — 17 tabelas fora das assinaturas explícitas

| Linha | Conteúdo | Justificativa do fallback |
|---:|---|---|
| 262 | Descrição dos atributos em pares | Grade narrativa de atributos de agente, não grade de valores/modificadores de criatura |
| 276 | Maestrias | Grade de efeitos, sem assinatura de dossiê/habilidade com custo |
| 313 | Sequelas | Grade numerada de condições/efeitos |
| 526 | Experimento Bestial | Subclasse, sem trio de arquétipos nem gerais melhoradas da Classe |
| 531 | Experimento Artificial | Mesmo motivo: assinatura própria de Subclasse |
| 536 | Experimento Híbrido | Mesmo motivo: assinatura própria de Subclasse |
| 764 | Deslocamento por Destreza | Cartões de faixas/valores, sem cabeçalho de tabela de dados |
| 857 | Saúde de Civil | Layout de fórmulas de Vida/Energia e nota, não Classe |
| 1223 | DTs de referência | Grade de cartões, sem cabeçalho de tabela de dados |
| 1365 | Ordem de bônus | Duas células narrativas longas |
| 1566 | Alcances | Grade narrativa de rótulo/descrição |
| 1832 | Patente → níveis de função | Grade de faixas sem cabeçalho de dados |
| 1839 | Funções de aposentadoria | Dossiês narrativos com efeitos, não Origens |
| 1854 | Patente → pontos do sucessor | Grade de faixas sem cabeçalho de dados |
| 1936 | Potencializadores V → I | Efeitos de módulo; não a grade de consumo de Energia Máxima |
| 1948 | Construtores V → I | Efeitos de módulo; mesmo motivo |
| 1965 | Afinidade → nível de criatura | Grade de conversão, sem a assinatura de classificação com imagem/NA numérico |

São conteúdos preservados pela política explícita de fallback, não conteúdo descartado
nem falhas de reconhecimento de equipamentos/classes/origens/módulos de consumo.
Não se ampliou a lista da task com heurísticas ou novos tipos não especificados.

### Sistema — 8 definições de imagem

Linhas **2036, 2038, 2040, 2042, 2044, 2046, 2048, 2050**: blocos Markdown `def`
contendo imagens base64 exportadas do Docs. A classificação já fornece nível e referência
da imagem; as definições ficam genéricas, integrais. Desenho/substituição do ícone SCP
é M10-04 e renderização é M10-07. Nenhum decodificador/imagem foi acrescentado nesta task.

### Colisões de âncora — 7 no Sistema e 9 no Guia

Sistema: **854, 865, 868, 871, 1578, 1619, 1670**. Guia:
**810, 872, 917, 956, 970, 1017, 1023, 1039, 1047**.
Títulos repetidos são legítimos entre classes/capítulos. O núcleo usa sufixos estáveis,
mantém a primeira resolução de id do Docs e avisa; não se reescreveram os livros.

As três tabelas de dados do Guia antes classificadas conservadoramente como layout
(Object Class/NA aproximado, Perfil/Ataques recomendados, Papel/Usos/Custo relativo)
agora têm esquemas explícitos de dados, sem alerta de layout.

## Verificações

- `npm run test:regras --workspace=frontend`: **56/56** na versão final; inclui
  checkJs/contrato TypeScript, publicação determinística, preservação de pontuação/texto
  dos dois livros, unicidade de todas as âncoras e rastreamento de todos os links da M10-01.
- `npm run test --workspaces --if-present`: shared **69 arquivos / 1.157 testes**;
  backend **53 arquivos / 994 testes + 1 skipped**; Angular **215 arquivos / 3.053 testes**.
  Gate amplo seguido dos testes focados finais das correções do normalizador.
- `npm run lint`: **zero erros**, 27.101 avisos preexistentes no código concorrente.
  Passe final com ESLint nos oito scripts e no modelo: **zero erros e avisos**.
- `npm run build --workspace=frontend`: produção aprovada em modo de CI do Angular,
  com `CI=true` e `NG_BUILD_MAX_WORKERS=2`, sem alteração de configuração do repositório.
  Tentativas com cache local registraram falha nativa do processo (3221225477);
  reduzir workers/desativar TypeScript paralelo não resolveu. O modo CI desativa cache
  local conforme `@angular/build/src/utils/normalize-cache.js`; a causa nativa exata não
  foi demonstrada. Contorno registrado em `PROBLEMS.md` P-104. Budget inicial mantém
  aviso preexistente: 557,18 kB contra 450 kB, sem aumento de limite.
- `npm run prestart --workspace=frontend`: aprovado; PDFs/worker e dois JSONs preparados.
  JSONs do `public/regras/` comparados aos de `dist/frontend/browser/regras/` por SHA256:
  Sistema **1.920.571 bytes**, `09d1b783d8563fc8dcdb695fc40c0b8ebdac90dd274a28e8bcfd752c0cd540c5`;
  Guia **458.446 bytes**, `ba15d420364a088b5aa9f6d80050a65a2fe9262ffba26a40cfe267e45be5c4ce`.
  Nenhuma divergência; assets gerados seguem ignorados pelo git.
- Sandbox: primeira suíte ampla teve EPERM de realpath em workers; build teve bloqueio
  de rede no download das fontes já configuradas. Gates reexecutados fora do sandbox.
- Revisão independente: corrigidos três cenários reproduzidos — próximo rótulo tratado
  como valor ausente na ficha; prefixo `ameaça altamente` tratado como NA Alto; escapes
  separando o número contraditório de uma referência NA. Regressões dos três incluídas.
- Diff revisto pela skill `convencoes-check`: somente scripts/modelo/pacote/fixtures e
  documentação de M10. Não há fórmula calculada, regra de domínio duplicada, DTO novo,
  dependência nova nem UI. Gate visual não se aplica à task sem UI.

Delegação: dois workers no modelo padrão implementaram personagens e equipamentos;
um revisor independente no modelo padrão revisou o normalizador integrado. O principal
integrou, conferiu fonte/campos/contagens, corrigiu os achados e executou os gates.
Alterações concorrentes preservadas. Autor autorizou o commit específico da M10-02
em 2026-10-08; a troca posterior dos livros para Sistema v4.1.4 fica fora dele. Sem push.

Fecho: todos os gates da M10-02 cumpridos. Renderização é M10-07; os 41 avisos
acima correspondem a fallback explícito ou diagnósticos legítimos, sem requisito
de reconhecimento desta task pendente. A falha nativa de cache permanece contornada,
com build de produção confirmado no modo de CI.
