# Ambiente de desenvolvimento

## Banco local reproduzível

O comando abaixo **apaga sem backup** o volume PostgreSQL local deste repositório, recria o schema
pelas migrations e popula fixtures determinísticas:

```bash
npm run db:reset:dev
```

O reset recusa execução antes de chamar Docker se o ambiente não for exatamente o alvo local
canônico: `APP_AMBIENTE=development`, `DB_HOST=localhost` ou `127.0.0.1`,
`DB_NOME=contratados_rpg`, `DB_USUARIO=postgres` e `ARMAZENAMENTO_PROVEDOR=local`. Serviço e volume
não são argumentos configuráveis; o comando opera somente sobre o `docker-compose.yml` desta raiz.

Se uma etapa falhar depois da remoção do volume, execute novamente `npm run db:reset:dev`. O fluxo é
fail-fast e essa repetição é o procedimento oficial de recuperação.

Para reconciliar somente as fixtures, sem remover o volume nem outros dados locais:

```bash
npm run db:seed:dev
```

O seed é idempotente e transacional. Ele não reescreve migrations históricas nem altera a senha da
conta `senhor.contratados`.

## Contas padrão

| Login | Senha | Uso |
|---|---|---|
| `senhor.contratados` | credencial pessoal existente | mestre da campanha própria e jogador da campanha do Codex |
| `codex.dev` | `contratados.dev` | mestre da campanha própria e jogador da campanha do Matheus |
| `jogador.stub.1` | `contratados.dev` | jogador stub nas duas campanhas |
| `jogador.stub.2` | `contratados.dev` | jogador stub nas duas campanhas |

Essas credenciais compartilhadas são exclusivamente locais. O guard impede a execução do seed em
produção ou contra banco remoto.

## Cenário criado

- `Campanha do Matheus`: Matheus é mestre; Codex e os dois stubs são jogadores.
- `Campanha do Codex`: Codex é mestre; Matheus e os dois stubs são jogadores.
- Cada campanha contém uma ficha de agente de Matheus, Codex e de cada um dos dois stubs.
- As oito fichas são diferentes entre as campanhas, têm cores de identidade distintas e conteúdo
  calculado pelo motor atual de `shared/regras`.
- Cada campanha também ganha ao menos uma criatura de teste (`CENARIO_DEV.criaturas`), sempre de
  posse do mestre daquela campanha e validada contra `shared/regras/criatura` — sem NPCs nem
  imagens nas fixtures.

Os convites determinísticos são `DEVMT001` e `DEVCD001`. IDs seriais não fazem parte do contrato do
cenário e não devem ser assumidos por testes ou ferramentas.
