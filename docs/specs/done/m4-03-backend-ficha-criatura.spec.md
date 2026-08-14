# m4-03-backend-ficha-criatura.spec.md

> Task 3/10 do milestone `m4-ficha-criatura-npc.spec.md`.

## Objetivo

Estender o módulo `ficha` (backend, já completo para `JOGADOR` desde `m3-03`/`m3-04`/
`m3-05`) para aceitar o tipo `CRIATURA`: criação restrita ao mestre, validação contra
`shared/regras/criatura`, e reaproveitamento **integral** dos mecanismos já existentes de
permissão/visibilidade/tempo real — nenhuma migration nova (a tabela `tipo_ficha` já tem
`CRIATURA` seedada desde `m3-02`; `ficha.dados JSONB` já é agnóstico de tipo).

## Entregáveis

1. **DTOs de operação da criatura** em `shared/src/dtos/ficha/` (`dto-conventions`):
   decidir e documentar nesta task se a criatura usa DTOs de operação **próprios**
   (`FichaCriaturaCriarDto`/`FichaCriaturaCriadaDto`/`FichaCriaturaResumoDto`…, alinhado
   com "dois contratos, não um" do milestone) ou se os DTOs de operação genéricos
   (`FichaCriarDto`/`FichaResumoDto`) passam a aceitar união de `dados` por `tipo`. O
   `FichaResumoDto` atual é jogador-específico (`classe`/`arquetipo`/`nivel` como colunas
   de listagem) — criatura não tem esses campos, então a listagem precisa de um recorte
   próprio (`na`/`vd`/`vidaAtual`/`vidaMaxima` em vez de classe/nível).
2. **`criarFicha` (ou variante)**: só o **mestre da campanha** cria ficha `CRIATURA`;
   dono = o próprio mestre (nunca um jogador); `UnauthorizedAccessException` caso um
   membro não-mestre tente. Sem "avulsa" nesta task — criatura sempre pertence a uma
   campanha (VD/NA são calibrados para o grupo daquela campanha); ficha solta fica fora de
   escopo até pedida.
3. **Validação contra `shared/regras/criatura`** (`m4-02`) antes de persistir —
   `validarFichaCriatura`, mesmo padrão de `validarDadosContraRegras` já usado para
   `JOGADOR` (branch por `tipo`).
4. **Visibilidade por padrão oculta**: o mecanismo já existente (§14 — dono vê, mestre vê
   tudo da campanha, outro membro só com linha em `usuario_ficha_acesso`) já cobre isso
   **sem mudança de código**, porque o dono de uma `CRIATURA` é o mestre e nenhum jogador
   recebe acesso automático. Confirmar com teste de service que um jogador não vê uma
   `CRIATURA` recém-criada até receber concessão (reusa `concederAcesso`/`m3-04`, sem
   duplicar).
5. **Tempo real**: reusar `emitirFichaCriada`/`emitirFichaAlterada` (`m3-05`) sem mudança
   de gateway — a sala é `campanha:<id>`, a permissão de quem recebe o quê já é arbitrada
   na service.
6. **Camadas**: controller burra, service com regra/permissão/validação, repository só SQL
   (reusa `FichaRepository`, sem duplicar `INSERT ... SELECT ... RETURNING`).
7. **Testes de service**: só mestre cria `CRIATURA`; validação rejeita ficha incoerente com
   `shared/regras/criatura`; jogador sem concessão não vê; jogador com concessão vê;
   edição só por dono (mestre) — reusa a matriz de permissões já testada, sem reduplicar
   casos de `JOGADOR`.

## Critérios de Aceite

- Mestre cria a ficha de exemplo "A Estátua" via API e o backend persiste/retorna os
  mesmos valores do documento (critério de aceite do milestone).
- Jogador não vê a criatura sem concessão; passa a ver após revelação (critério do
  milestone).
- SQL segue todas as regras (§10.2/§16); nenhuma regra de criação duplicada fora de
  `shared/regras/criatura` (critério do milestone).

## Fora de Escopo

- Frontend (`m4-04`).
- `NPC` (`m4-07`).
- Listagem/revelação dedicada no painel do mestre — a API de acesso já existe (`m3-04`);
  a **tela** de listagem/revelação é `m4-09`.

## Dependências

- `m4-01` (contrato), `m4-02` (`shared/regras/criatura`).
- M3 completo: `m3-03`/`m3-04`/`m3-05` (CRUD, acesso, tempo real — mecanismos reusados).
