# m3-24-backend-identidade-imutabilidade.spec.md

> Task 24 do milestone `m3-ficha-jogador.spec.md`. Segunda das três da **Identidade**
> (`m3-23` contrato+motor → `m3-24` backend → `m3-25` frontend).

> **Regras de jogo:** `docs/core/sistema-v4.1.0.md` §⬡ Identidade. **O documento vence**
> (proibição #27).

## Objetivo

Ensinar o backend a validar a **forma** do bloco `identidade` e a impor a **imutabilidade** que o
documento exige: *"Assim que receber a descrição e efeito de sua personalidade, ela não poderá mais
ser mudada"* e *"Uma vez definida, a Origem não pode ser alterada."*

Sem frontend.

## Entregáveis

### 1. Validação de forma em `FichaService.validarDadosContraRegras`

A m3-10 afrouxou a validação: o backend **não trava mais faixas** do estado, só **forma** (camada 1)
e a regra de **Maestria**. A Identidade entra nessa camada 1 — forma, não faixa:

- `personalidade`, quando não-nula, é **uma única palavra** (o documento: *"uma única palavra que
  seja um adjetivo"*). Sem espaço interno; aparada.
- `origem`, quando não-nula, tem **exatamente 2** entradas em `formacao`.
- `FichaFormacaoDto.bonus` não-nulo precisa existir em `FormacaoBonusEnum`; se a definição em
  `FORMACOES` exige parâmetro, `parametro` não pode ser nulo.
- `FichaFormacaoDto.texto` é obrigatório sempre — inclusive no bônus custom (`bonus: null`).
- `especialidade.efeito` precisa existir em `EspecialidadeEfeitoEnum`.

Reusa o catálogo de `shared/regras/identidade` (m3-23). **Nenhuma regra reimplementada no backend**
(proibições #26/#28).

### 2. Imutabilidade em `FichaService.alterarFicha`

Regra escolhida pelo autor: **trava para o dono, o mestre passa**.

- Se `identidade.personalidade` **já estava definida** (não-nula) na ficha persistida e o payload a
  altera, e o autor é o **dono** (não o mestre da campanha) → `BusinessException`.
- Idem, independentemente, para `identidade.origem`.
- O **mestre** da campanha altera as duas livremente — é ele quem as constrói, e um erro de digitação
  precisa de conserto. O sistema não tem histórico/versão de ficha (decisão adiada na
  `SYSTEM.SPEC`), então uma trava total tornaria o dado irrecuperável pelo app.

**Campo a campo:** travar a Personalidade **não** trava a Origem. Definir pela primeira vez (de
`null` para um valor) é sempre permitido, inclusive ao dono.

A regra vive na **service**, único árbitro (§14, proibição #28). O papel na campanha já vem do
`CampanhaRepository`, como em `validarPermissaoEdicao`.

## Critérios de Aceite

- Dono altera Personalidade já definida → `BusinessException`; mestre altera → 200.
- Dono altera Origem já definida → `BusinessException`; mestre altera → 200.
- Dono **define** Personalidade/Origem pela primeira vez (era `null`) → 200.
- Travar uma não trava a outra.
- Forma inválida (personalidade com duas palavras, `formacao` com 1 ou 3 entradas, `bonus` fora do
  enum, parâmetro faltando onde a definição exige) → `BusinessException`.
- Ficha **sem** `identidade` (anterior à m3-23) continua sendo aceita e alterada normalmente.
- Testes de service cobrindo cada linha acima; verificação ao vivo contra o Postgres, no padrão das
  m3-03/m3-04 (a receita está em `.claude/skills/verify/SKILL.md`).

## Fora de Escopo

- Qualquer UI (`m3-25`).
- Aplicar o delta de Formação aos derivados: quem aplica é quem edita (o front, no padrão de
  `ajustarClasse`); o backend só valida forma. **Não** recalcular derivados no backend — a m3-10
  inverteu esse princípio ("o motor não recalcula sobre as edições").
- Validar o **conteúdo** dos bônus (ex.: "os dois bônus de Formação não podem afetar o mesmo atributo
  com o mesmo propósito"). São restrições de autoria do Mestre, em texto livre no documento, sem
  função pura que as decida — validá-las seria reimplementar regra. Mesmo tratamento que a m3-03 deu
  aos "stacks de modificação por patente".

## Dependências

- `m3-23` (contrato `FichaIdentidadeDto` e catálogo `FORMACOES`).
- `m3-03` (CRUD da ficha, `validarDadosContraRegras`, `validarPermissaoEdicao`).
