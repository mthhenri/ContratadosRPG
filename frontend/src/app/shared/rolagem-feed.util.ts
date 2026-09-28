import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';

/**
 * Reconcilia o feed de rolagens depois de uma releitura completa (reconexão, P-084) — a resposta
 * do servidor é a base, mas a releitura pode ter sido disparada antes de uma exclusão que só
 * chegou por socket enquanto o GET ainda estava em voo (`idsExcluidos`, alimentado à parte por
 * quem assina `rolagemExcluida$` durante toda a vida do consumidor, não só durante o GET): sem
 * filtrar por ele, a resposta antiga ressuscitaria a rolagem já removida na tela. Da mesma forma,
 * um registro que chegou por socket **durante** o GET pode não constar ainda na resposta (a
 * consulta já estava em trânsito) — `atual` cobre esse caso, preservado por id sem duplicar o que
 * a resposta já trouxer. Reordena pela data mais recente primeiro, a mesma convenção do feed.
 */
export function mesclarFeedRolagens(
  servidor: readonly RolagemResumoDto[],
  atual: readonly RolagemResumoDto[],
  idsExcluidos: ReadonlySet<number>,
): readonly RolagemResumoDto[] {
  const idsServidor = new Set(servidor.map((rolagem) => rolagem.id));
  const extras = atual.filter(
    (rolagem) => !idsServidor.has(rolagem.id) && !idsExcluidos.has(rolagem.id),
  );
  return [...extras, ...servidor.filter((rolagem) => !idsExcluidos.has(rolagem.id))].sort((a, b) =>
    a.createdDate < b.createdDate ? 1 : a.createdDate > b.createdDate ? -1 : 0,
  );
}
