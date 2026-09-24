# p-076-rolagem-rapida-mestre-campanha.spec.md

> Task solta que corrige `P-076` (`docs/context/PROBLEMS.md`): a rolagem rápida do mestre na
> página da campanha responde 500 em toda rolagem desde o commit `169ed1e2` (I-027).

## Objetivo

O mestre consegue rolar pela "Rolagem rápida" da página da campanha: a rolagem é salva sem ficha
nem combatente, entra no feed de quem pode vê-la, e cada cartão mostra "Mestre" como origem.

## Contexto

O CHECK `chk_rolagem_origem` exige **exatamente um** entre `ficha_id` e `encontro_combatente_id`
(`(ficha_id IS NOT NULL) <> (encontro_combatente_id IS NOT NULL)`).
`RolagemService.registrarRolagemAvulsaDaCampanha` grava os dois nulos, então o `INSERT` falha e o
filtro global devolve 500. O teste da service ("registra uma rolagem sem ficha nem combatente quando
o autor é mestre") passa porque o repositório é mockado e o CHECK nunca roda. Nenhum teste do
backend passa por um Postgres real.

Alternativa descartada com o autor (2026-09-24): prender a rolagem a um combatente "Mestre" fixo.
`encontro_combatente.encontro_id` é `NOT NULL`, e a campanha fora de combate não tem encontro. O
combatente fictício apareceria na trilha, na grade e na ordem de turnos da Iniciativa. Também não
dá para prender à ficha do mestre, que pode não existir. "Mestre" fica só na exibição
(entregável 3), sem linha fictícia no banco.

`SYSTEM.SPEC.md` (matriz de permissões) já dá ✅ ao mestre em "Rolar/registrar rolagem"; nada muda
em permissão, visibilidade ou tempo real.

## Entregáveis

1. **Migration `0030 - Rolagem avulsa da campanha.sql`** (conferir o número livre com
   `ls backend/src/database/migrations/ | sort | tail -1` antes de criar). O `UP` remove
   `chk_rolagem_origem` e a recria, com o mesmo nome, como:
   `NOT (ficha_id IS NOT NULL AND encontro_combatente_id IS NOT NULL) AND (ficha_id IS NOT NULL
   OR encontro_combatente_id IS NOT NULL OR campanha_id IS NOT NULL)`. Ou seja: no máximo um
   entre ficha e combatente, e nenhum dos dois só quando a rolagem pertence a uma campanha. O
   `DOWN` restaura a expressão anterior e traz um comentário avisando que ele falha enquanto houver
   linha avulsa, inclusive soft-deletada. Sem `BEGIN`/`COMMIT`.
2. **Contrato `RolagemResumoDto.nomeFicha: string | null`** em `shared/src/dtos/rolagem/`. O
   comentário diz que `null` significa rolagem avulsa do mestre na campanha, sem ficha nem
   combatente. `npm run build --workspace=shared` e
   `npm run openapi:gerar-contratos --workspace=backend` regeneram
   `backend/src/core/openapi/contratos-gerados.ts`, que nunca é editado à mão. O SQL do repositório
   continua `COALESCE(ficha.nome, encontro_combatente.nome_avulso)`: o texto "Mestre" não vai para o
   SQL.
3. **"Mestre" como origem, num só lugar.** Uma função pura no frontend monta a linha de autoria do
   cartão de rolagem: `nomeAutor · nomeFicha`, ou `nomeAutor · Mestre` quando `nomeFicha` é `null`.
   Quem já omite a ficha (`mostrarFicha = false` na ficha) continua mostrando só o autor. Os quatro
   pontos que hoje montam essa linha à mão passam a usá-la:
   - `historico-rolagens-sidebar.component.ts` (`metaAutor`);
   - `detalhe-mestre.page.html:343`;
   - `detalhe-jogador.page.html:561`;
   - `espectador.page.ts:170`.

   Com isso, nenhum cartão exibe "· null". `corFicha` continua `null` e o cartão usa o
   `--accent` já documentado no DTO.
4. **Testes.**
   - Service: o teste existente continua valendo.
   - Frontend: a função pura cobre ficha, combatente avulso, rolagem do mestre e `mostrarFicha =
     false`. Cada um dos quatro consumidores ganha um caso com `nomeFicha: null`.
   - Página do mestre: o teste confirma que a rolagem avulsa chega ao feed com "Mestre".
5. **`docs/SCHEMA.md`, seção `rolagem`, alinhada ao schema real:**
   - `ficha_id` passa a ser anulável;
   - entram a coluna `encontro_combatente_id` e o novo `chk_rolagem_origem`, com as três origens
     (ficha, combatente avulso, avulsa do mestre na campanha);
   - o parágrafo de emissão em tempo real passa a descrever o gateway atual: rolagem `PRIVADA` só
     na sala do mestre (`campanha.gateway.ts`), e não "privada nunca é emitida".

## Critérios de Aceite

1. `npm run db:migrate`, `db:rollback` e `db:migrate` de novo rodam sem erro no banco de dev
   limpo de linhas avulsas.
2. No Postgres real (`psql`), três casos confirmam a regra:
   - `INSERT` com os dois nulos e `campanha_id` preenchido passa;
   - `INSERT` com os dois nulos e `campanha_id` nulo é recusado por `chk_rolagem_origem`;
   - `INSERT` com ficha **e** combatente é recusado.

   As linhas de teste são soft-deletadas depois.
3. **Ao vivo** (skill `verify`, 1920×1080 e 360×800): o mestre rola `1d20` pela Rolagem rápida
   da campanha.
   - Pública: aparece sem recarregar, como `Codex · Mestre`, no feed do mestre, do jogador e do
     espectador, e na janela externa da campanha. Não aparece toast de erro.
   - Privada: só o mestre a vê, inclusive depois de recarregar.
   - Nenhum cartão, em nenhuma das oito visões de histórico da I-027, mostra "null".
4. Testes focados, suítes de `shared`, `backend` e `frontend`, lint e build passam sem erro novo.
   O aviso de budget preexistente (`P-004`) é relatado à parte.
5. `P-076` sai de `PROBLEMS.md` e o relato vai para `HISTORY.md`.

## Fora de Escopo

- Combatente ou ficha fictícia "Mestre", e qualquer mudança em encontro/Iniciativa.
- Mudar permissão, visibilidade ou o roteamento de salas do gateway (só a documentação em
  `SCHEMA.md` é corrigida).
- Montar infraestrutura de testes de repositório contra um Postgres real. É a lacuna que deixou o
  defeito passar; se valer a pena, vira ideia em `IDEAS.md`, não diff desta task.
- Mudar o visual do cartão de rolagem além do texto da linha de autoria.
- "Última rolagem" dos cartões de ficha: a rolagem avulsa não tem `fichaId` e continua não
  entrando ali.

## Dependências

- `docs/specs/done/i-027-rolagens-janela-contextos.spec.md` (origem da rolagem rápida do mestre
  e das oito visões de histórico).
- `docs/SYSTEM.SPEC.md` (matriz de permissões), `docs/SCHEMA.md` (seção `rolagem`), skill
  `sql-migrations`.

## Riscos e Mitigação

- **`DOWN` bloqueado em produção:** depois do deploy, qualquer rolagem avulsa gravada, mesmo
  soft-deletada, impede o rollback. O comentário no `DOWN` deixa isso explícito. Reverter exige
  decidir antes o destino dessas linhas; não se apaga dado para destravar uma migration.
- **Relaxar demais o CHECK:** uma expressão que só troque `<>` por "no máximo um" aceitaria
  rolagem sem ficha, sem combatente e sem campanha, uma linha que nenhum histórico mostra. O
  terceiro termo (`campanha_id IS NOT NULL`) e o critério 2 existem para impedir isso.
- **Mock escondendo o banco de novo:** teste unitário verde não prova nada sobre o CHECK. Os
  critérios 2 e 3 rodam contra o Postgres real e são obrigatórios.
