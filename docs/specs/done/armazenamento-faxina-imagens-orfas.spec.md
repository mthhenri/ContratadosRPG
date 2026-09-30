# armazenamento-faxina-imagens-orfas.spec.md

> Task solta — `IDEAS.md` I-038. Promove a ideia: apagar do armazenamento as imagens que nenhuma
> linha viva referencia.

## Objetivo

Um comando de manutenção que cruza o armazenamento (disco local ou R2) com o banco e remove as
imagens órfãs — avatares de ficha/avulso e imagens de documento cujas linhas foram excluídas ou
cuja imagem foi trocada por fora do fluxo normal —, respeitando uma carência que preserva a
recuperabilidade do soft delete.

## Entregáveis

1. `ArmazenamentoProvedor.listarImagens({ pasta })` nas duas implementações (`local`: `readdir` +
   `mtime`; `r2`: `ListObjectsV2` paginado + `LastModified`), devolvendo `caminho` no **mesmo
   formato que `salvarImagem` persiste** (para cruzar direto com `imagem_url`) e `modificadoEm`.
2. `tools/armazenamento/faxinar-imagens.ts`, com `npm run armazenamento:faxinar --workspace=backend
   -- [--apagar] [--carencia-dias=30]`:
   - **Referenciado** = `imagem_url` de `ficha`, `imagem_url_avulso` de `encontro_combatente` e
     `imagem_url` de `documento`, todos com `is_deleted = false`.
   - **Órfã** = arquivo em `AGENTES`/`DOCUMENTOS` não referenciado **e** modificado há mais de
     `carencia-dias` (padrão 30). Dentro da carência, o arquivo fica (o soft delete continua
     recuperável).
   - **Simulação por padrão**: sem `--apagar` só lista o que apagaria. `PATCHNOTES` nunca é tocada.
   - **Trava de sanidade**: com zero referências vivas e arquivos no armazenamento, aborta (banco
     errado/vazio) em vez de apagar tudo.
3. A lógica de decisão é uma função pura testada (`decidirFaxina`), separada do I/O do `main`.

## Critérios de Aceite

- Testes: decisão (referenciada, órfã fora/dentro da carência, pasta `PATCHNOTES` ignorada, trava
  de sanidade), `listarImagens` local (diretório real temporário) e R2 (cliente S3 simulado, com
  paginação).
- `npm run lint --workspace=backend` (inclui `tsc`) e `npm run test --workspace=backend` verdes.
- Ao vivo, no armazenamento local: um arquivo órfão antigo é listado em simulação, preservado
  dentro da carência e apagado com `--apagar` (apenas ele).

## Fora de Escopo

- Agendar o comando como job (cron/Cloud Scheduler): fica manual.
- Apagar imagem no soft delete de documento/ficha (`m9-02` manteve de propósito).
- Tornar a URL revogável (decisão da M9).

## Dependências

`m9-02` (documento com imagem), `m3-62` (avatar) — nenhuma pendente.

## Riscos e Mitigação

- Ação destrutiva em produção: simulação por padrão, carência e trava de sanidade; o relatório
  imprime cada caminho antes de apagar.
- Upload em curso (arquivo gravado, linha ainda não): a carência de dias cobre a janela.
