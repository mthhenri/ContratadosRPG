import type {
    NpcCategoriaConsultarDto, NpcCategoriaReferenciaDto,
    NpcCooperacaoConsultarDto, NpcCooperacaoReferenciaDto,
} from "../../dtos/ficha";
import { CategoriaNpcEnum } from "../../enums";

/** Guia de mestre > NPC > Categoria; orientação, sem validar Nível pela faixa sugerida. */
const CATEGORIAS: Readonly<Record<CategoriaNpcEnum, NpcCategoriaReferenciaDto>> = {
    CIVIL: { categoria: CategoriaNpcEnum.CIVIL, rotulo: "Civil", nivelSugerido: "1–4",
        perfil: "Civis, acadêmicos teóricos e observadores passivos." },
    OPERATIVO: { categoria: CategoriaNpcEnum.OPERATIVO, rotulo: "Operativo", nivelSugerido: "3–8",
        perfil: "Operadores táticos, forças de contenção e combatentes qualificados." },
    VETERANO: { categoria: CategoriaNpcEnum.VETERANO, rotulo: "Veterano", nivelSugerido: "6–12",
        perfil: "Especialistas de alto escalão, ativos da COG e antagonistas regionais." },
    ELITE: { categoria: CategoriaNpcEnum.ELITE, rotulo: "Elite", nivelSugerido: "10–16",
        perfil: "Comandantes de operações especiais e cúpula estratégica da Fundação." },
    LENDARIO: { categoria: CategoriaNpcEnum.LENDARIO, rotulo: "Lendário", nivelSugerido: "14–20",
        perfil: "Arquitetos de facções e figuras no ápice da performance humana." },
};

/** Retorna perfil e rótulo canônicos, sem vincular Categoria a Cooperação. */
export function obterReferenciaCategoria(dto: NpcCategoriaConsultarDto): NpcCategoriaReferenciaDto {
    return { ...CATEGORIAS[dto.categoria] };
}

/** Guia de mestre > NPC > Nível de Cooperação, incluindo os limites entre faixas. */
export function obterReferenciaCooperacao(
    dto: NpcCooperacaoConsultarDto,
): NpcCooperacaoReferenciaDto {
    const valor = dto.cooperacao;
    if (!Number.isInteger(valor) || valor < 0 || valor > 10) {
        throw new RangeError("Cooperação deve ser inteira entre 0 e 10");
    }
    if (valor === 10) return { rotulo: "Amigável",
        social: "Fornece tudo que sabe, inclusive o que não parecia relevante.",
        combate: "Luta ao lado do grupo se solicitado." };
    if (valor >= 7) return { rotulo: "Colaborativo",
        social: "Responde perguntas diretas com honestidade.",
        combate: "Auxilia em combate; não ataca sem provocação." };
    if (valor >= 4) return { rotulo: "Neutro",
        social: "Confirma ou nega; fornece informações gerais.",
        combate: "Não inicia combate; reage se atacado ou ameaçado." };
    if (valor >= 2) return { rotulo: "Desconfiado",
        social: "Respostas vagas; pode omitir partes importantes.",
        combate: "Postura defensiva; foge se possível, luta se encurralado." };
    if (valor === 1) return { rotulo: "Evasivo",
        social: "Responde de forma tecnicamente correta, mas enganosa.",
        combate: "Ataca apenas para abrir fuga." };
    return { rotulo: "Hostil", social: "Recusa ou mente deliberadamente.",
        combate: "Engaja combate ativamente; não recua sem motivo externo." };
}
