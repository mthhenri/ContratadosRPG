import type { FichaCriaturaDadosDto } from './ficha-criatura.dtos';

/**
 * DTOs de **operação** da ficha de criatura (`m4-03`) — o CRUD restrito ao mestre, sobre
 * `FichaCriaturaDadosDto` (`m4-01`/`m4-02`). Seguem a mesma fórmula `Entidade + Complemento? +
 * Verbo + Dto` de `ficha-operacao.dtos.ts` (entrada no infinitivo, saída no particípio).
 *
 * ── Decisão de abertura da m4-03: contratos de operação próprios, não união ──────────────
 * A task deixou em aberto se a criatura reaproveita `FichaCriarDto`/`FichaResumoDto` (com
 * `dados` virando união por tipo) ou ganha DTOs de operação próprios. Optou-se por **DTOs
 * próprios** (`FichaCriaturaCriarDto`/`FichaCriaturaCriadaDto`/…), pela mesma razão que já
 * fechou "dois contratos, não um" para o documento de jogo em si (m4-01): a forma diverge o
 * suficiente (criatura não tem `classe`/`nivel`/`identidade.origem` de jogador; sempre pertence
 * a uma campanha; dono é sempre o mestre) que uma união teria que ser desfeita com type-guards
 * espalhados pela `FichaService` inteira — inclusive em código de m3-10/m3-24/m3-40/m3-50 já
 * testado e específico do formato de jogador (`aplicarSnapshotDeMaximos`,
 * `validarImutabilidadeIdentidade`, `validarContratoSomenteMestre`…), sem ganho real. O
 * `FichaResumoDto` já é jogador-específico por construção (`classe`/`arquetipo`/`nivel` como
 * colunas de listagem) — confirmando que um recorte de listagem próprio (`FichaCriaturaResumoDto`)
 * seria mesmo necessário caso a listagem de criaturas entrasse em escopo aqui. **Não entrou**: a
 * m4-03 não lista entregável de listagem (a tela é `m4-09`); o tipo fica para quando for preciso.
 *
 * ── Camada de persistência é o único ponto de fronteira entre os dois mundos ─────────────
 * `FichaRepository` continua único e sem duplicação (entregável 6): `criarFicha`/`recuperarPorId`/
 * `alterarFicha`/`excluirFicha` já são SQL agnóstico de forma do JSONB (nenhuma dessas queries lê
 * campo de jogo específico — só `colunasResumo()`, usada pelas listagens, é jogador-específica, e
 * não é tocada por esta task). A ponte de tipos entre `FichaCriatura*Dto` (contrato público desta
 * task) e `Ficha*Dto`/`FichaInterno*Dto` (contrato interno do repositório, ainda desenhado só
 * para jogador) é feita só dentro de `FichaService`, num cast documentado — trocar a interface
 * pública do repositório para uma união exigiria tocar `FichaRepository` inteiro (e seus testes)
 * por um ganho que não é pedido nesta task; o `dados` armazenado já é JSONB — o contrato TS do
 * repositório sempre foi uma promessa de forma, não uma garantia de runtime, para jogador também.
 *
 * ── Acesso/exclusão/revogação: nenhum DTO próprio ────────────────────────────────────────
 * `FichaExcluirDto`/`FichaAcesso*Dto` já são agnósticos de tipo (nunca tocam `dados`) — reusados
 * tal como estão pelas mesmas rotas `DELETE /ficha/:id` e `/ficha/:id/acesso*` (entregável 4/6).
 */

/**
 * Entrada de criação — sempre dentro de uma campanha (`campanhaId` obrigatório: VD/NA são
 * calibrados para o grupo daquela campanha; sem "avulsa" nesta task). Sem `usuarioId`: o dono é
 * **sempre** o mestre autenticado (§14 — "criar criatura/NPC": mestre irrestrito, demais nunca;
 * diferente de jogador, aqui não existe delegação de dono). `dados` é validado contra
 * `shared/regras/criatura` (`validarFichaCriatura`) antes de persistir.
 */
export interface FichaCriaturaCriarDto {
  readonly campanhaId: number;
  readonly nome: string;
  /** Cor de identidade visual (m3-61) — mesmo campo/formato de `FichaCriarDto.cor`. */
  readonly cor?: string | null;
  readonly dados: FichaCriaturaDadosDto;
}

/** Saída de criação — a ficha de criatura criada (identidade/posse + documento de jogo). */
export interface FichaCriaturaCriadaDto {
  readonly id: number;
  readonly campanhaId: number;
  readonly usuarioId: number;
  readonly nome: string;
  readonly cor: string | null;
  /** Sempre `null` na criação — mesmo fluxo de upload em dois passos de `FichaCriadaDto.imagemUrl`. */
  readonly imagemUrl: string | null;
  readonly dados: FichaCriaturaDadosDto;
}

/**
 * Entrada de recuperação individual — `id` vem do `@Param`, injetado pela controller (recuperação
 * individual sempre `{ id }`, nunca primitivo).
 */
export interface FichaCriaturaRecuperarDto {
  readonly id: number;
}

/** Saída da recuperação individual — a ficha de criatura completa. */
export interface FichaCriaturaRecuperadaDto {
  readonly id: number;
  readonly campanhaId: number;
  readonly usuarioId: number;
  readonly nome: string;
  readonly cor: string | null;
  readonly imagemUrl: string | null;
  /** Ficha oculta (m3-65) — mesmo campo de `FichaRecuperadaDto.oculta`. */
  readonly oculta: boolean;
  readonly dados: FichaCriaturaDadosDto;
}

/**
 * Entrada pública da alteração completa — `nome` + documento de jogo `dados`. Só o dono (o
 * mestre) pode alterar (§14, `validarPermissaoEdicao` — reusada sem mudança).
 */
export interface FichaCriaturaAlterarDto {
  readonly nome: string;
  readonly cor?: string | null;
  readonly oculta?: boolean;
  readonly dados: FichaCriaturaDadosDto;
}

/** Entrada interna — `id` injetado pela controller a partir do `@Param` (nunca `alterar(id, dados)`). */
export interface FichaCriaturaInternoAlterarDto extends FichaCriaturaAlterarDto {
  readonly id: number;
}

/** Saída da alteração — a ficha de criatura alterada. */
export interface FichaCriaturaAlteradaDto {
  readonly id: number;
  readonly campanhaId: number;
  readonly usuarioId: number;
  readonly nome: string;
  readonly cor: string | null;
  readonly imagemUrl: string | null;
  readonly oculta: boolean;
  readonly dados: FichaCriaturaDadosDto;
}
