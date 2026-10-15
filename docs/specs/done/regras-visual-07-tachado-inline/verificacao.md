# Verificação — regras-visual-07 (tachado inline)

## O que mudou

Novo trecho de texto rico `tachado` (`LivroTrechoDto`, mesmo formato de `negrito`/`italico`), projetado pelo
normalizador a partir do token `del` do Markdown, renderizado como `<del>` por `regras-inline`, devolvido como `~~…~~`
pela exportação, tratado pelo diff de texto rico e pelo editor da Oficina (monta `<del>`, lê `<del>`/`<s>`/`<strike>`).
Consumidores avaliados (lista fechada por busca de `"negrito"`): `livro-trecho.dtos`, `diff-texto-rico`,
`exportar-markdown`, `regras-inline`, `oficina-trechos`, `normalizar-regras.mjs`. O editor de Markdown dos chats
(`editor-markdown`) usa só o estilo `negrito`/`italico` de botão e não consome o trecho — sem impacto.

## Testes

- `node --test frontend/scripts/*.test.mjs`: 89 aprovados, 3 falhas **preexistentes** (`bandeja-dados-privada`,
  `inventario-esquadrao`, `ui-11-tokens-acabamento` falham igual sem as alterações).
- `ng test --include=src/app/modules/regras`: 49 arquivos, 302 testes aprovados (novos: `<del>` com composição em negrito e
  texto pesquisável; ida e volta do editor com `<del>`/`<s>`).
- `shared`: `exportar-markdown` aprovado (novo caso do `~~`); `tsc` do app e build do `shared` limpos; `eslint` nos
  arquivos tocados sem erro (o `eslint .` do frontend falha por erros preexistentes em `oficina-texto.component.ts`).
- Teste de projeção do Guia (`regras-guia`) ajustado: a referência textual passou a tratar `del` como `strong`/`em`.

## Ao vivo (app real, API local na 3100, SPA na 4300)

O banco local tem o `~~` literal dentro de um trecho `texto` (a fonte foi importada antes do token existir). Para observar
o renderer sem alterar dados, a resposta de `/livros/guia` foi reescrita no navegador (trecho `texto` → `texto` +
`tachado` + `texto`), exatamente o que o normalizador produz.

- Guia → Introdução em 1920×1080: `<del>` com `text-decoration-line: line-through`, cor herdada do texto, `display: inline`,
  quebra em duas linhas sem ruptura; nenhum `~` no texto visível.
- Pesquisa por `torturar` com o trecho tachado: o destaque (`mark`) fica **dentro** do `<del>` e continua riscado; o
  resultado também aparece na lista. Conferido em 960×1080.
- Composição com negrito/itálico coberta por teste de componente.

## Limites (item aberto)

- **Dado em produção:** o livro publicado no banco ainda contém `~~torturar psicologicamente~~` como texto literal; o
  normalizador só vale para novas importações. Enquanto o dado não for corrigido, o site de produção continua mostrando os
  delimitadores — ver `P-120` (reescopado). A correção do dado é do autor (Oficina/migração) e não foi aplicada.
- A Oficina ainda não tem botão/atalho para aplicar tachado; ela preserva o trecho existente na ida e volta.
- Capturas de tela do painel do navegador saíram corrompidas (blocos repetidos); a verificação visual usou geometria e
  estilos computados do DOM, sem imagem. 1366×768 e 360×800 não foram observados para o tachado (renderer idêntico em
  todas as larguras).
