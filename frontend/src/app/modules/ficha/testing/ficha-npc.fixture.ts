import type { FichaNpcRecuperadaDto } from "@contratados-rpg/shared/dtos/ficha";
import { CategoriaNpcEnum, TipoFichaEnum } from "@contratados-rpg/shared/enums";

/** Documento Civil válido com snapshots deliberadamente distintos dos valores de criação. */
export function criarFichaNpcTeste(): FichaNpcRecuperadaDto {
    return {
        id: 8, campanhaId: 2, usuarioId: 4, tipo: TipoFichaEnum.NPC,
        nome: "Helena", cor: null, imagemUrl: null, imagemFoco: null, oculta: true,
        dados: {
            identidadeNarrativa: { nome: "Helena", funcao: "Médica de campo" },
            categoria: CategoriaNpcEnum.CIVIL, nivel: 3, cooperacao: 5,
            atributos: { destreza: 1, forca: 1, luta: 0, pontaria: 0, vigor: 2,
                intelecto: 2, medicina: 1, sentidos: 1, social: 1, vontade: 1 },
            vidaMaxima: 77, vidaAtual: 91, defesaBase: 18, bloquear: 23, esquivar: 21,
            energia: { maxima: 0, atual: 0, recargaPorTurno: null },
            condicoes: { morrendo: false },
            habilidades: [], sanidade: { sequelas: [], traumas: [] },
            condutaCombate: { gatilhosFuga: "Civis em perigo", prioridadesAlvo: "Feridos",
                reacaoFerimentoSevero: "Buscar abrigo" },
            anotacoes: "Informação privada do mestre",
        },
    };
}
