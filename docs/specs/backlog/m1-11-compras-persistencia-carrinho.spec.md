# m1-11-compras-persistencia-carrinho.spec.md

> Task 11/14 do milestone `m1-calculadora-paridade.spec.md`.

## Objetivo

Completar a paridade da aba compras com **persistência do carrinho** e **exportar/importar
por código compartilhável** (entregável 4 da milestone).

## Entregáveis

1. **Persistência em localStorage** do estado do carrinho (`saveCmpState`/`loadCmpState`):
   o carrinho sobrevive a reload/reabertura da página.
2. **Exportar/importar por código compartilhável** (`exportarCarrinho`, `importarCarrinho`,
   modais de código — `abrirModalExportarCodigo`, `copiarCodigoCarrinho`, `abrirModalImportar`):
   gerar um código copiável e reconstruir o carrinho a partir dele.
3. **Compatibilidade com códigos do site antigo** se viável — caso contrário, **documentar a
   quebra** (no próprio spec/CONTEXT e num aviso ao usuário na UI de importação).

## Critérios de Aceite

- Carrinho persiste entre sessões via localStorage.
- Código exportado por uma sessão é importável em outra reproduzindo o mesmo carrinho.
- Compatibilidade com códigos antigos confirmada **ou** a quebra documentada explicitamente.

## Fora de Escopo

- Regras/cálculo de compras (m1-05) e a página base do carrinho (m1-10).

## Dependências

- `m1-10-pagina-compras.spec.md`.
