# Auditoria — o que do livro não se edita na Oficina

> Anexo de [`oficina-edicao-de-listas.spec.md`](../oficina-edicao-de-listas.spec.md). Levantamento de
> 2026-10-13, feito **antes** da edição de listas (as listas aparecem como lacuna e foram corrigidas na
> mesma task). Princípio do autor: nada do **conteúdo** do livro pode ficar fora da Oficina.

## Método e limites

1. **Ao vivo, nos dois livros** (Sistema 1049 peças, Guia 367), Oficina ligada, com um script que percorre
   todo nó de texto dentro de uma peça e descarta o que está em campo editável (`app-oficina-texto`,
   `input`, `select`, `button`). Sobra o que a tela só mostra. Isso separa o **conteúdo** (texto rico que
   é lido do `dados`) dos rótulos fixos do desenho (ex.: "Atributos bônus", "// Nota", "Vida inicial").
2. **No código**, campo a campo do `dados` de cada tipo de peça (`shared/src/dtos/livro/livro-peca-dados.dtos.ts`)
   contra os caminhos que a Oficina grava (`campo=`, `[caminho]`, `alterarCampo`, `alterarMatriz`).
3. **Limite:** vários editores só aparecem com a peça **selecionada** (valor de atributo da ficha de
   criatura, faixas, grades). A varredura ao vivo viu a tela sem seleção; esses casos foram conferidos
   no código, não um a um na tela. Campos de **estrutura** (posição, nível da seção, tipo) são decididos
   pelo arrastar do sumário e pelo "+", e não entram aqui como conteúdo.

## Lacunas de conteúdo (nenhum caminho de edição)

| # | Peça | O que não se edita | No livro | Observação |
|---|---|---|---|---|
| 1 | `LISTA` | texto de cada item, adicionar e remover item | Sistema 18, Guia 17 | **Corrigida nesta task.** Era o caso do "Interrupção externa". |
| 2 | `ABERTURA` | `titulo` (">>>> Registro de documentação oficial"), `trechos` (o texto do registro) e `selo` | 1 por livro | `RegrasAbertura` desenha título como texto e o corpo em `app-regras-inline` sem peça. É o texto de abertura do livro. |
| 3 | `MODULOS` | `modulos[].nivel` (V, IV, III…) e `modulos[].energiaMaxima` (−3, −7, −12…) | Sistema 1 | `RegrasModulos` só lê. São números de regra (Energia Máxima consumida). |
| 4 | `NIVEIS_AMEACA` | `niveis[].nivel` e `niveis[].referenciaImagem` | Sistema 1 | A `descricao` de cada nível **é** editável; número e imagem de referência não. |
| 5 | `GENERICO` | `motivo` e `trechos` | nenhum hoje | Tem renderer (`regras-generico`), sem editor; fica como risco para importações futuras. |

## Lacunas menores e decisões a tomar

| Peça | Campo | Situação |
|---|---|---|
| `LISTA` | `ordenada`, `inicio`; criar sublista a partir de um item | Sem controle (estrutura/apresentação). Fora do escopo da task; pedir se quiser. |
| `SECAO` | `glifo`, `nivel` | O nível muda ao recuar/avançar no sumário; o glifo acompanha o nível. Não há campo próprio. |
| `HABILIDADE` | `glifo`, `inicial`, `melhorada` | Marcas estruturais (habilidade inicial/melhorada do arquétipo); só a Reação tem botão. |
| `TERMOS` | `variante` (atributos/maestrias/penalidades/verbetes) | Define como o bloco é desenhado; não editável depois de criado. |
| `GRADE` | `apresentacao`, `colunas`, `nota`/`variante` dos itens de referência, `emPares` da tabela | Apresentação; conteúdo (células e títulos) é editável. |
| `FICHA_CRIATURA` | rótulos de `identidade[].rotulo`, nome dos 10 `atributos[].nome` | Rótulos padronizados; os valores e o texto são editáveis. |
| `EQUIPAMENTO` | `danos[].rotulo` (DANO / UMA MÃO / DUAS MÃOS) | Enum fechado; o texto do dano é editável. |
| Capa | título "Contratados" e subtítulo | Texto fixo da marca, gerado pela projeção; a versão vem do número da versão. |

## O que a varredura confirmou como editável

Parágrafo, nota, exemplo, fórmula, seção (título), habilidade (nome, custo, Reação, efeito), classe,
arquétipo, subclasse, origem, termos, equipamentos/modificações/amplificadores (todos os campos de texto),
tabela e grade genérica (células, linhas), faixas, grade de referência, ficha de criatura (nome, atributos,
ataques, textos), habilidade de criatura, roteiro (etapas). Textos que só aparecem em modo leitura
(rótulos como "Atributos bônus", "Habilidade inicial", "// Exemplo") são do desenho, não do livro.

## Ordem sugerida para as próximas specs

1. **Abertura** — é texto autoral do livro e ninguém consegue corrigi-lo hoje.
2. **Módulos** e **Níveis de ameaça** (número/imagem) — dados de regra.
3. Controles de lista (`ordenada`, `inicio`, sublista) e demais campos estruturais, se o autor quiser.
