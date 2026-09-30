import { CategoriaNpcEnum, HabilidadeTipoNpcEnum } from "../../enums";
import type {
    NpcCategoriaConsultarDto, NpcVolumeHabilidadesDto, NpcVolumeHabilidadesValidarDto,
} from "../../dtos/ficha";

/** Guia de mestre — "Guia de Criação de NPCs" > Habilidades > Volume de Habilidades. */
const VOLUME: Readonly<Record<CategoriaNpcEnum, NpcVolumeHabilidadesDto>> = {
    [CategoriaNpcEnum.CIVIL]: {
        totalMinimo: 0, totalMaximo: 0, passivasMinimas: 0, ativasMaximas: 0, limitePorTurno: 0,
    },
    [CategoriaNpcEnum.OPERATIVO]: {
        totalMinimo: 2, totalMaximo: 3, passivasMinimas: 1, ativasMaximas: 2, limitePorTurno: 4,
    },
    [CategoriaNpcEnum.VETERANO]: {
        totalMinimo: 3, totalMaximo: 4, passivasMinimas: 2, ativasMaximas: 2, limitePorTurno: 4,
    },
    [CategoriaNpcEnum.ELITE]: {
        totalMinimo: 4, totalMaximo: 6, passivasMinimas: 3, ativasMaximas: 3, limitePorTurno: 5,
    },
    [CategoriaNpcEnum.LENDARIO]: {
        totalMinimo: 6, totalMaximo: 8, passivasMinimas: 4, ativasMaximas: 4, limitePorTurno: 6,
    },
};

/** Retorna cópia da tabela para que um consumidor não altere consultas futuras. */
export function obterVolumeHabilidadesPorCategoria(
    dto: NpcCategoriaConsultarDto,
): NpcVolumeHabilidadesDto {
    return { ...VOLUME[dto.categoria] };
}

/**
 * Valida composição, sem rastrear uso em combate. Passivas condicionais não contam como Ativas.
 * O limite por turno conta USOS de Ativas, inclusive repetições permitidas pela descrição;
 * não conta todas as habilidades do documento. A composição respeita também esse teto.
 */
export function validarVolumeHabilidades(dto: NpcVolumeHabilidadesValidarDto): readonly string[] {
    const volume = obterVolumeHabilidadesPorCategoria({ categoria: dto.categoria });
    const passivas = dto.habilidades.filter(
        (habilidade) => habilidade.tipo === HabilidadeTipoNpcEnum.PASSIVA,
    ).length;
    const ativas = dto.habilidades.filter(
        (habilidade) => habilidade.tipo === HabilidadeTipoNpcEnum.ATIVA,
    ).length;
    const violacoes: string[] = [];
    const total = dto.habilidades.length;
    if (total < volume.totalMinimo || total > volume.totalMaximo) {
        violacoes.push(`habilidades: total deve estar entre ${volume.totalMinimo} e ${volume.totalMaximo}`);
    }
    if (passivas < volume.passivasMinimas) {
        violacoes.push(`habilidades: mínimo de ${volume.passivasMinimas} passivas`);
    }
    if (ativas > volume.ativasMaximas) {
        violacoes.push(`habilidades: máximo de ${volume.ativasMaximas} ativas`);
    }
    if (ativas > volume.limitePorTurno) {
        violacoes.push(`habilidades: ativas excedem o limite por turno (${volume.limitePorTurno})`);
    }
    if (passivas + ativas !== dto.habilidades.length) {
        violacoes.push("habilidades: tipo deve ser PASSIVA ou ATIVA");
    }
    return violacoes;
}
