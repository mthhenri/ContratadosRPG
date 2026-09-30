import { CategoriaNpcEnum } from "../../enums";
import type {
    NpcAtributosValidarDto, NpcCategoriaConsultarDto, NpcPontosLimiteDto,
} from "../../dtos/ficha";

/** Guia de mestre — "Guia de Criação de NPCs" > Construção Mecânica > Atributos. */
const PONTOS_LIMITE: Readonly<Record<CategoriaNpcEnum, NpcPontosLimiteDto>> = {
    [CategoriaNpcEnum.CIVIL]: { pontosDistribuir: 2, limite: 2 },
    [CategoriaNpcEnum.OPERATIVO]: { pontosDistribuir: 6, limite: 3 },
    [CategoriaNpcEnum.VETERANO]: { pontosDistribuir: 11, limite: 4 },
    [CategoriaNpcEnum.ELITE]: { pontosDistribuir: 17, limite: 5 },
    [CategoriaNpcEnum.LENDARIO]: { pontosDistribuir: 24, limite: 6 },
};

/** Todos iniciam em 1; a criação de Civil inicia Luta/Pontaria em 0, salvo exceção do mestre. */
export function obterPontosELimitePorCategoria(dto: NpcCategoriaConsultarDto): NpcPontosLimiteDto {
    return { ...PONTOS_LIMITE[dto.categoria] };
}

/**
 * Valida valores inteiros não negativos e o cap. Não trava Luta/Pontaria de Civil:
 * desbloqueio e justificativa são decisões do mestre (m4-06), sem marcador de permissão aqui.
 * Pontos de criação são orientação do distribuidor, não uma trava sobre o estado salvo.
 */
export function validarAtributosCategoria(dto: NpcAtributosValidarDto): readonly string[] {
    const { limite } = obterPontosELimitePorCategoria({ categoria: dto.categoria });
    const violacoes: string[] = [];
    for (const [atributo, valor] of Object.entries(dto.atributos)) {
        if (!Number.isInteger(valor) || valor < 0) {
            violacoes.push(`${atributo}: deve ser inteiro não negativo`);
        } else if (valor > limite) {
            violacoes.push(`${atributo}: valor acima do limite (${limite})`);
        }
    }
    return violacoes;
}
