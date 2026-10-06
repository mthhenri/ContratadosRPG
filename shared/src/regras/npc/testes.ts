import { CategoriaNpcEnum } from "../../enums";
import type { FichaAtributosDto, FichaNpcDadosDto, NpcCategoriaConsultarDto,
    NpcCompetenciasDto, NpcTesteAtributoDto } from "../../dtos/ficha";
import { interpretarFormula, rolarInterpretada, type RolarDado } from "../rolagem";

const COMPETENCIAS: Readonly<Record<CategoriaNpcEnum, NpcCompetenciasDto>> = {
    [CategoriaNpcEnum.CIVIL]: { quantidade: 0, dados: 0, faces: 0 },
    [CategoriaNpcEnum.OPERATIVO]: { quantidade: 2, dados: 1, faces: 4 },
    [CategoriaNpcEnum.VETERANO]: { quantidade: 3, dados: 1, faces: 6 },
    [CategoriaNpcEnum.ELITE]: { quantidade: 4, dados: 2, faces: 6 },
    [CategoriaNpcEnum.LENDARIO]: { quantidade: 5, dados: 3, faces: 6 },
};
export const CHAVES_ATRIBUTOS_NPC: readonly (keyof FichaAtributosDto)[] = [
    "destreza", "forca", "luta", "pontaria", "vigor", "intelecto", "medicina",
    "sentidos", "social", "vontade",
];

export function obterCompetenciasPorCategoria(dto: NpcCategoriaConsultarDto): NpcCompetenciasDto {
    return { ...COMPETENCIAS[dto.categoria] };
}

/** Ausência é legado; exigir seleção apenas na criação/configuração explícita. */
export function validarCompetenciasNpc(dados: FichaNpcDadosDto, exigir = false): readonly string[] {
    const competencias = dados.competencias;
    if (competencias === undefined && !exigir) return [];
    if (!Array.isArray(competencias)) return ["competências: selecione os atributos da Categoria"];
    const violacoes: string[] = [];
    const { quantidade } = obterCompetenciasPorCategoria(dados);
    if (competencias.length !== quantidade) violacoes.push(`competências: selecione ${quantidade} atributos`);
    if (new Set(competencias).size !== competencias.length) violacoes.push("competências: atributos não podem repetir");
    if ((competencias as readonly unknown[]).some((chave) => !CHAVES_ATRIBUTOS_NPC.includes(chave as keyof FichaAtributosDto)
        || !(dados.atributos[chave as keyof FichaAtributosDto] > 0))) violacoes.push("competências: use somente atributos base positivos e válidos");
    return violacoes;
}

export function validarAjustesTesteNpc(dados: FichaNpcDadosDto): readonly string[] {
    const violacoes: string[] = [];
    for (const campo of ["dadosTeste", "modificadoresTeste"] as const) {
        const mapa = dados[campo];
        if (mapa === undefined) continue;
        if (typeof mapa !== "object" || mapa === null || Array.isArray(mapa)
            || Object.entries(mapa).some(([chave, valor]) =>
                !CHAVES_ATRIBUTOS_NPC.includes(chave as keyof FichaAtributosDto) || !Number.isInteger(valor))) {
            violacoes.push(`${campo}: use chaves de atributo e valores inteiros`);
        }
    }
    return violacoes;
}

/** A conta com fonte usa a desvantagem do motor; não usa a forma legada ATR±n. */
export function comporFormulaTesteAtributoNpc(dto: NpcTesteAtributoDto): string {
    const { dados, atributo } = dto;
    const ajusteDados = dados.dadosTeste?.[atributo] ?? 0;
    const fixo = dados.modificadoresTeste?.[atributo] ?? 0;
    const competencia = obterCompetenciasPorCategoria(dados);
    const temCompetencia = dados.atributos[atributo] > 0 && dados.competencias?.includes(atributo);
    const fonte = ajusteDados === 0 ? atributo : `((${atributo}${ajusteDados > 0 ? "+" : ""}${ajusteDados}))`;
    const formula = `${fonte}d20kh1cm${dto.margemCritico ?? 1}+NIV`
        + (fixo === 0 ? "" : `${fixo > 0 ? "+" : ""}${fixo}`)
        + (temCompetencia && competencia.dados > 0 ? `+${competencia.dados}d${competencia.faces}` : "");
    return (dto.repeticoes ?? 1) > 1 ? `(${formula})#${dto.repeticoes}` : formula;
}

/** Contexto explícito da ação; não classifica nem dispara dano/cura futuros. */
export function rolarTesteAtributoNpc(dto: NpcTesteAtributoDto, rolarDado?: RolarDado) {
    const formula = interpretarFormula(comporFormulaTesteAtributoNpc(dto)).formula;
    if (!formula) return null;
    return rolarInterpretada(formula, dto.dados.atributos, undefined, dto.dados.nivel,
        rolarDado, false, true);
}
