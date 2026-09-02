import type { RolagemVisibilidadeEnum } from '../../enums';
import type { ResultadoRolagemDto } from '../../regras/rolagem';

/**
 * DTOs de **operação** do módulo `rolagem` (m3-27) — persistência das rolagens disparadas a
 * partir de uma ficha. Seguem a fórmula `Entidade + Complemento? + Verbo + Dto`
 * (CONVENTIONS): entrada no infinitivo, saída no particípio, `Interno` marca o que trafega
 * apenas entre service e repository.
 *
 * `resultado` **reusa** `ResultadoRolagemDto` de `shared/regras/rolagem` — nenhum tipo novo de
 * resultado (proibições #26/#27). Não há mais campo `modo`: a gramática v3/v4 do motor (m3-29/
 * m3-46) já expressa tudo na própria fórmula — persistir um campo que o motor aposentou seria
 * gravar um conceito morto.
 */

/**
 * Entrada do registro de uma rolagem — o `fichaId` vem da rota (`@Param`, injetado no DTO pela
 * controller). `visibilidade` decide quem além do autor enxerga a rolagem (`PUBLICA` = todos os
 * membros da campanha; `PRIVADA` = autor + mestre).
 */
export interface RolagemRegistrarDto {
  readonly rotulo: string;
  /**
   * Expressão de dados usada na rolagem (ex.: `2d6+3[Físico]`), exibida como legenda discreta no
   * histórico/feed. `null` quando quem registra não a informa — o teste de Atributo direto (o
   * rótulo já é o nome do atributo) nunca a envia.
   */
  readonly formula: string | null;
  readonly visibilidade: RolagemVisibilidadeEnum;
  readonly resultado: ResultadoRolagemDto;
}

/** Entrada de uma rolagem livre atribuída a um combatente avulso do encontro. */
export interface RolagemAvulsoRegistrarDto extends RolagemRegistrarDto {
  readonly encontroId: number;
  readonly combatenteId: number;
}

/**
 * Entrada interna do `RolagemRepository.registrarRolagem` — `campanhaId`/`usuarioId` já resolvidos
 * pela service a partir da ficha (dono da rolagem = quem a disparou, não necessariamente o dono da
 * ficha — um visualizador com acesso concedido também pode rolar). Só service ↔ repository.
 */
export interface RolagemInternoRegistrarDto {
  readonly fichaId: number | null;
  readonly encontroCombatenteId: number | null;
  readonly campanhaId: number | null;
  readonly usuarioId: number;
  readonly rotulo: string;
  readonly formula: string | null;
  readonly visibilidade: RolagemVisibilidadeEnum;
  readonly resultado: ResultadoRolagemDto;
}

/**
 * Item de listagem/feed — usado tanto pelo histórico da ficha (`GET /ficha/:id/rolagem`) quanto
 * pelo feed da campanha (`GET /campanha/:id/rolagem`) e como saída do próprio registro. `nomeAutor`/
 * `nomeFicha` vêm de `JOIN` (nunca duplicados como coluna) — a listagem sempre resolve os dois.
 * `createdDate` chega como string ISO (serialização padrão do `StandardResponse` sobre `Date`).
 */
export interface RolagemResumoDto {
  readonly id: number;
  readonly fichaId: number | null;
  readonly encontroCombatenteId: number | null;
  readonly campanhaId: number | null;
  readonly usuarioId: number;
  readonly nomeAutor: string;
  readonly nomeFicha: string;
  readonly rotulo: string;
  readonly formula: string | null;
  readonly visibilidade: RolagemVisibilidadeEnum;
  readonly resultado: ResultadoRolagemDto;
  readonly createdDate: string;
  /**
   * Cor de identidade visual da ficha autora (m3-61) — "pega carona" no mesmo `JOIN ficha` que já
   * resolve `nomeFicha` (`RolagemRepository`). `null` sem cor definida: quem exibe cai no
   * `--accent` de quem visualiza (`var(--cor-ficha, var(--accent))`).
   */
  readonly corFicha: string | null;
}

/**
 * Entrada da listagem do histórico de uma ficha — o `fichaId` vem do `@Param`. Exige permissão de
 * **visualização** da ficha (§14, reusa `FichaService.recuperarFicha` — quem pode ver a ficha pode
 * ver o histórico dela). Paginado (`executarConsultaPaginada`, §10.5), mais recente primeiro.
 */
export interface RolagemListarDto {
  readonly fichaId: number;
}

/** Entrada interna da listagem paginada do histórico — `pagina`/`itensPorPagina` já resolvidos. */
export interface RolagemInternoListarDto {
  readonly fichaId: number;
  readonly pagina: number;
  readonly itensPorPagina: number;
}

/**
 * Entrada da listagem do feed de uma campanha — o `campanhaId` vem do `@Param`. Exige ser
 * **membro** da campanha (mesmo gate de `FichaService.listarFichas`); o recorte de visibilidade
 * (`PRIVADA` só para o autor ou o mestre) é resolvido na service/repository, nunca no frontend.
 */
export interface RolagemCampanhaListarDto {
  readonly campanhaId: number;
}

/** Entrada interna da listagem do feed — `ehMestre` já resolvido pela service (papel do solicitante). */
export interface RolagemCampanhaInternoListarDto {
  readonly campanhaId: number;
  readonly usuarioId: number;
  readonly ehMestre: boolean;
}
