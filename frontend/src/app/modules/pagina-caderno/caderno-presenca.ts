import type { CampanhaMembroFichaResumoDto } from "@contratados-rpg/shared/dtos/campanha";

/** Reserva estável de identidade, preservada da presença original (P-039). */
const PALETA_PRESENCA: readonly string[] = [
    "#f97316", "#22c55e", "#38bdf8", "#a855f7",
    "#eab308", "#ec4899", "#14b8a6", "#f43f5e",
];

/** A ficha mais recente vence; empate usa maior id, independentemente da ordem da API. */
export function resolverCorParticipante(
    usuarioId: number,
    fichas: readonly CampanhaMembroFichaResumoDto[],
): string {
    let fichaMaisRecente: CampanhaMembroFichaResumoDto | null = null;
    let dataMaisRecente = Number.NEGATIVE_INFINITY;
    for (const ficha of fichas) {
        const data = Date.parse(ficha.updatedDate);
        if (!Number.isFinite(data)) continue;
        if (data > dataMaisRecente ||
            (data === dataMaisRecente && ficha.id > (fichaMaisRecente?.id ?? -1))) {
            fichaMaisRecente = ficha;
            dataMaisRecente = data;
        }
    }
    return fichaMaisRecente?.cor || PALETA_PRESENCA[Math.abs(usuarioId) % PALETA_PRESENCA.length];
}
