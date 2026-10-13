# oficina-edicao-blocos-restantes.spec.md

> Task avulsa, fatiável, aberta em 2026-10-13 a partir da [auditoria](../done/oficina-edicao-de-listas/auditoria-ineditaveis.md)
> da `oficina-edicao-de-listas`. Origem: `P-125` em `PROBLEMS.md`. Princípio do autor: **nada do conteúdo do
> livro pode ficar fora do alcance da Oficina.** Fecha as lacunas de conteúdo que a `m11-08` e a edição de listas
> deixaram.

## Objetivo

Tornar editáveis no próprio lugar, na Oficina, todos os blocos do livro que hoje só se leem: **Abertura**,
**Módulos**, **Níveis de ameaça** (número e imagem de referência) e **Genérico**; e decidir com o autor o que
fazer com os campos estruturais listados na auditoria.

## Entregáveis

Uma fatia por bloco, na ordem abaixo (cada uma com teste, verificação ao vivo e fecho próprios). Análogo
aprovado de todas: o próprio bloco no leitor + o padrão de edição da `m11-06`/`m11-08` (`RegrasRoteiro`,
`RegrasFaixas`, `RegrasLista`: `app-oficina-texto` ou `app-regras-inline` com `peca` + `caminho`, `alterarCampo`).

1. **Abertura** (`ABERTURA`: `titulo`, `trechos`, `selo`). `RegrasAbertura` hoje desenha o título como texto e
   o corpo em `app-regras-inline` sem peça, e quebra `trechos` em parágrafos por linha em branco. A edição tem de
   preservar essa forma (o itálico externo é a marca da abertura na fonte; ver o comentário do componente) e gravar
   de volta em `trechos` sem perder a marca. Título e selo: texto simples. É a de maior prioridade: é texto autoral
   do livro que ninguém corrige hoje (1 por livro, Sistema e Guia).
2. **Módulos** (`MODULOS`: `modulos[].nivel`, `modulos[].energiaMaxima`). `RegrasModulos` só lê. Editar o nível (texto
   curto: V, IV, III…) e a Energia Máxima (número inteiro ≥ 0, `app-step-input` como nos atributos da ficha de
   criatura); adicionar e remover módulo com o bloco selecionado. Pendência de validador: nível vazio ou número
   inválido.
3. **Níveis de ameaça** (`NIVEIS_AMEACA`: `niveis[].nivel`, `niveis[].referenciaImagem`). A `descricao` já é editável.
   Editar o número do nível (0–7, o selo `NA n` acompanha) e a referência da imagem; adicionar e remover nível.
   Pendência: nível repetido ou fora do intervalo. **Pergunta aberta ao autor:** `referenciaImagem` é um nome de
   arquivo/URL ou um identificador interno? Decidir antes de implementar o campo (texto livre vs. seletor).
4. **Genérico** (`GENERICO`: `motivo`, `trechos`). Nenhum no livro hoje; só editar `trechos` no lugar (`motivo` é
   metadado da importação, mostrar como nota somente leitura). Reclassificar para tipo próprio segue fora de escopo
   (decisão do autor, como na `m11-08`).
5. **Campos estruturais** — só depois de o autor decidir caso a caso, porque mudam apresentação e não texto:
   `LISTA` (`ordenada`, `inicio`, criar sublista a partir de um item), `SECAO` (`glifo`/`nivel`), `HABILIDADE`
   (`glifo`, `inicial`, `melhorada`), `TERMOS.variante`, `GRADE` (`apresentacao`, `colunas`, `nota`/`variante`,
   `emPares`), rótulos de `FICHA_CRIATURA` (`identidade[].rotulo`, nome dos atributos) e `EQUIPAMENTO.danos[].rotulo`.
   Cada um que o autor quiser vira fatia; os demais ficam registrados como decisão (`CONTEXT.md` §5), não como defeito.
6. **Reauditar** ao fim, com o mesmo método da auditoria (varredura ao vivo dos dois livros com a peça
   selecionada, que a primeira não fez), para provar que não sobrou conteúdo sem edição; atualizar
   `auditoria-ineditaveis.md` por um novo relatório e fechar `P-125`.
7. Atualizar `docs/context/MEMORY.md` com onde cada bloco é editado.

## Critérios de Aceite

- Por fatia: testes do componente (campo no caminho certo, adicionar/remover quando houver), validador cobrindo as
  pendências novas e ida e volta (editar, salvar, recarregar, ler e renderizar igual).
- **Gate visual por fatia** com `verify` em `1920×1080` e `360×800`: estados de leitura, edição, vazio, pendência e
  salvo; comparação com o bloco no leitor (a edição não muda o desenho); sem overflow; foco e alvos de toque.
  Exercitar também o que a auditoria só viu no código (peça **selecionada**).
- Cada controle usa o primitivo de `shared/ui/` com a API completa; lacuna de primitivo → parar e perguntar ao autor.
- Fatia concluída = bloco editável sem sair do livro; fatia sem gate visual fica aberta.
- Lint e testes de `shared` e `frontend` (e `backend` se tocado) verdes ao fim de cada fatia; `npm run repo:verificar`.

## Fora de Escopo

Núcleo da edição (`m11-06`), inserção/estrutura (`m11-07`), comparador e publicação (`m11-09`); listas (já feitas);
mudar o desenho dos blocos no leitor; reclassificar blocos `GENERICO`; o texto fixo da capa ("Contratados"), que é da
marca e não do livro; rótulos de desenho ("Atributos bônus", "// Nota", "Vida inicial").

## Dependências

`oficina-edicao-de-listas`, `m11-06`, `m11-07`, `m11-08` em `done/`. Resposta do autor sobre `referenciaImagem` (fatia 3)
e sobre quais campos estruturais (fatia 5) valem a pena.

## Riscos e Mitigação

- **Abertura perde a marca de itálico ao ser regravada.** `RegrasAbertura` achata o itálico externo para desenhar; a
  edição tem de operar sobre os `trechos` originais, não sobre os parágrafos derivados. Teste de ida e volta
  obrigatório.
- **Editar o dado de regra errado de Módulos/Níveis muda o jogo.** São números de regra (Energia Máxima, nível de
  ameaça): o validador deve recusar valor inválido, e a edição passa pela publicação normal (rascunho → versão).
