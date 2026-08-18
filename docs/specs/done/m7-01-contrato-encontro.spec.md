# m7-01-contrato-encontro.spec.md

> Task 1/8 do milestone `m7-encontro-combate.spec.md`.

## Objetivo

Fechar em código o **contrato compartilhado** do Encontro de Combate: enums e DTOs em
`shared/src/`, mais o desenho das tabelas em `SCHEMA.md`. Pura camada `shared/` + documentação:
sem migration executada, sem service, sem endpoint, sem frontend, sem `shared/regras/encontro`
(isso é `m7-02`).

## Entregáveis

1. **Enums novos** em `shared/src/enums/` (string enum, valores `SCREAMING_SNAKE_CASE` iguais aos
   nomes):
   - `EncontroStatusEnum` (`MONTAGEM`/`ATIVO`/`ENCERRADO`) — **tem** tabela de referência
     `tipo_encontro_status` (coluna relacional, §10.3).
   - `CombatenteOrigemEnum` (`FICHA`/`AVULSO`) — de onde vem o combatente.
   - `EncontroEventoTipoEnum` (`RODADA_INICIADA`/`DANO`/`CURA`/`ENERGIA`/`CONDICAO_APLICADA`/
     `CONDICAO_EXPIRADA`/`ESTADO_ALTERADO`/`COMBATENTE_ADICIONADO`/`COMBATENTE_REMOVIDO`) —
     conteúdo do log, JSONB, **sem** tabela `tipo_*`.
   - **Reusar** `CadenciaEnum` e `TipoFichaEnum` — não redefinir (proibição #21).
2. **DTOs** em `shared/src/dtos/encontro/` (novo diretório + `index.ts`; novo subpath
   `./dtos/encontro` no `package.json` do shared, seguindo o padrão dos existentes):
   - Encontro: `EncontroCriarDto`, `EncontroCriadoDto`, `EncontroRecuperarDto { id }`,
     `EncontroRecuperadoDto` (estado completo: status, rodada, turno, combatentes, ordem da rodada,
     eventos), `EncontroAlteradoDto` (payload de broadcast), `EncontroIniciarDto`,
     `EncontroEncerrarDto`, `EncontroResumoDto` (listagem).
   - Combatente: `EncontroCombatenteAdicionarDto`, `EncontroCombatenteAdicionadoDto`,
     `EncontroCombatenteRemoverDto`, `EncontroCombatenteIniciativaAtribuirDto`,
     `EncontroCombatenteIniciativaAtribuidaDto`, `EncontroCombatenteResumoDto`.
   - Condição: `EncontroCombatenteCondicaoAtribuirDto`, `EncontroCombatenteCondicaoRemoverDto`.
   - Turno: `EncontroTurnoAvancarDto`, `EncontroTurnoVoltarDto`.
   - Value objects: `OrdemTurnoDto` (`{ combatenteId, ocorrencia }` — um slot da rodada),
     `EncontroEventoDto` (tipo, rodada, turno, texto, combatenteId opcional),
     `CondicaoCombatenteDto` (nome, `rodadasRestantes: number | null`, `perdeTurno: boolean`).
3. **`interface readonly` pura**, como todo DTO do shared — **sem class-validator**
   (`CONTEXT.md` §5). Validação estrutural documentada campo a campo aqui; validação de regra é do
   service (`m7-03`/`m7-04`).
4. **`SCHEMA.md`** — nova seção descrevendo `tipo_encontro_status`, `encontro`,
   `encontro_combatente` e `encontro_evento` (colunas, FKs, índices, invariante de **um encontro
   não-encerrado por campanha** via índice parcial único), no mesmo formato das seções existentes.
   O DDL executável é da `m7-03`.
5. Vida/Energia de combatente **com ficha não são replicadas** no contrato do encontro: o resumo do
   combatente carrega os valores **lidos da ficha**; só o avulso tem `vidaMaxima`/`vidaAtual`
   próprios (decisão "fonte única" do milestone).

## Critérios de Aceite

- `npm run build -w shared` compila; DTOs exportados pelo subpath `./dtos/encontro`
- Nenhum DTO redefinido em `backend/`/`frontend/`; nenhum enum duplicado
- Nomes conferidos contra `.agents/skills/dto-conventions/SKILL.md` (complemento antes do verbo)
- `SCHEMA.md` descreve as 4 tabelas e a invariante de encontro único por campanha
- `npm run lint -w shared` limpo

## Dependências

- Nenhuma além do estado atual do `shared`
