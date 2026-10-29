# Verificação — SQL dos repositórios

- Revisão estática dos 20 repositórios de módulos e da base; alterações concentradas nas consultas
  compactadas identificadas e em quatro INSERTs sem RETURNING.
- Busca adicional por linhas de pelo menos 120 caracteres com cláusulas SQL: sem ocorrências.
- `npm run test --workspace=backend`: 1.360 testes passaram, 100 ignorados.
- `npm run build --workspace=backend`: aprovado.
- `npm run lint --workspace=backend`: aprovado com 5.137 avisos.
- `npm run repo:verificar`: aprovado.
- Os testes de integração PostgreSQL ignorados não foram executados; migrations e seeds não foram
  revisados nesta tarefa.
