# m10-01-normalizador-nucleo.spec.md

> Task do milestone `m10-regras.spec.md`. Primeira da fila; não depende de outra task.
> Sem UI: entrega o formato canônico que as tasks de leitor (`m10-06`+) consomem.

## Objetivo

Converter, no build, `docs/core/sistema-v4.1.3.md` e `docs/core/guia_de_mestre-v4.2.0.md` numa
árvore tipada em JSON — o **formato canônico** — servida estaticamente pelo frontend, cobrindo as
convenções gerais do texto. Os casos que dependem de estrutura específica (tabelas de layout,
equipamentos, blocos do Guia, ficha rica) ficam na `m10-02`; aqui eles caem no bloco genérico sem
perder conteúdo.

## Entregáveis

1. **Contrato.** `frontend/src/app/modules/regras/regras.model.ts` com os tipos da árvore:
   documento (`id`: `sistema` | `guia`, título, versão), seções aninhadas com nível (⬢ capítulo,
   ⬡ título, ⬥ subtítulo, ⬦ verbete), âncora e filhos; blocos (parágrafo, lista, nota, exemplo,
   tabela de dados, habilidade, genérico); trechos inline (texto, negrito, itálico, tarja, link
   interno com âncora de destino, link externo). Tipos união discriminados por `tipo`. É a fonte de
   verdade da forma; o script não inventa campo fora dele.
2. **Script** `frontend/scripts/normalizar-regras.mjs` (mesmo padrão de `preparar-documentos.mjs`),
   chamado no `prestart` e no `prebuild` do `frontend/package.json`, gravando um JSON por documento
   em `frontend/public/regras/`. Nome do arquivo de origem continua vindo da versão vigente (hoje
   `sistema-v4.1.3.md`/`guia_de_mestre-v4.2.0.md`); a versão exibida sai do nome.
3. **Regras do núcleo** (conferir cada uma contra o `.md` real antes de implementar):
   - Hierarquia pelos glifos ⬢ ⬡ ⬥ ⬦ no início do título (com ou sem `#`/negrito da exportação).
   - **Âncoras** derivadas do título sem o glifo (`vida`, `gerais`); colisão no mesmo documento
     recebe sufixo estável e gera aviso. Os ids do Docs (`{#⬡-gerais}`) são lidos só para traduzir
     links.
   - **Links internos:** `[Página 34](#⬡-gerais)` e equivalentes viram link interno para a âncora do
     site, com o **nome da seção** como texto (nunca "Página N"). Link para âncora inexistente =
     aviso no build e texto puro.
   - **Sumário do Docs** (o bloco `⬢ Sumário` com números de página) é descartado.
   - **Habilidade:** linha com custo `\[N E\]` (escapado pela exportação) e marca opcional
     `(Reação)` → bloco habilidade com nome, custo, reação e texto. Glifo ◈/◻ no nome é
     preservado como dado, não como texto.
   - **Nota:** tabela de uma célula. **Exemplo:** parágrafo que começa com "Exemplo:" (em itálico na
     exportação); "(Exemplo: …)" no meio de frase continua inline.
   - **Tarja:** sequências de █ viram trecho `tarja` com o comprimento preservado.
   - **Tabela de dados:** tabela Markdown comum (cabeçalho + linhas). Tabela que não é dado e não é
     caso da `m10-02` vira bloco genérico **com aviso** — nenhum conteúdo some.
   - Escapes da exportação (`\-`, `\[`, `\.`) e tabulações do sumário são limpos.
4. **Avisos do build:** lista legível no console (documento, linha de origem, motivo). Não
   quebram o build nesta task; a contagem aparece no fim.
5. **Testes** em `frontend/scripts/` com `node --test`, usando trechos reais copiados dos `.md`
   como fixtures (um por regra acima), mais um teste que roda sobre os dois documentos inteiros e
   confere: zero exceção, toda seção com âncora única, todo link interno resolvido ou avisado.

## Critérios de aceite

- `npm run build --workspace=frontend` gera `public/regras/sistema.json` e `guia.json`.
- Nenhum trecho de texto do `.md` (fora do sumário descartado) desaparece: o teste de cobertura
  compara o texto plano de entrada e saída.
- Avisos listados e explicados no fecho da task (quais são esperados até a `m10-02`).

## Fora de escopo

Casos da `m10-02`; qualquer UI; remoção do PDF; ingestão de `.docx`.
