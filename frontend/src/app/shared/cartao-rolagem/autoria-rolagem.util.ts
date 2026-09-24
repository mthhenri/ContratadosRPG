import type { RolagemResumoDto } from "@contratados-rpg/shared/dtos/rolagem";

/** Origem exibida quando a rolagem é avulsa do mestre na campanha (sem ficha nem combatente). */
export const ORIGEM_ROLAGEM_MESTRE = "Mestre";

/**
 * Linha de autoria do cartão de rolagem (`[autor]` de `app-cartao-rolagem`) — fonte única
 * para o histórico lateral, o painel do espectador e os feeds do detalhe da campanha
 * (P-076). Monta `nomeAutor · nomeFicha` (ficha ou combatente avulso) ou `nomeAutor · Mestre`
 * quando `nomeFicha` é `null` (rolagem rápida do mestre na campanha). Com
 * `mostrarFicha = false` (histórico de uma ficha, onde a ficha já é o contexto) sai só o
 * autor. Puro: não toca DOM nem estado.
 */
export function montarAutoriaRolagem(
  rolagem: Pick<RolagemResumoDto, "nomeAutor" | "nomeFicha">,
  mostrarFicha = true,
): string {
  if (!mostrarFicha) return rolagem.nomeAutor;
  return `${rolagem.nomeAutor} · ${rolagem.nomeFicha ?? ORIGEM_ROLAGEM_MESTRE}`;
}
