import type {
    SegmentoTranscricaoCronologiaDto,
    SegmentoTranscricaoTempoDto,
    SegmentoTranscricaoTextoDto,
} from "@contratados-rpg/shared/dtos/transcricao";
import { BusinessException } from "../../core/exceptions";

/** Projeta a sessão sem mutar os tempos brutos nem eliminar sobreposição. */
export function montarCronologiaTranscricao(
    segmentos: readonly SegmentoTranscricaoTempoDto[],
): SegmentoTranscricaoCronologiaDto[] {
    return segmentos.map((segmento) => {
        const { inicioMilissegundos, fimMilissegundos, deslocamentoMilissegundos } = segmento;
        const inicioSessaoMilissegundos = inicioMilissegundos + deslocamentoMilissegundos;
        const fimSessaoMilissegundos = fimMilissegundos + deslocamentoMilissegundos;
        if (![inicioMilissegundos, fimMilissegundos, deslocamentoMilissegundos,
            inicioSessaoMilissegundos, fimSessaoMilissegundos].every(Number.isSafeInteger)
            || inicioMilissegundos < 0 || fimMilissegundos < inicioMilissegundos) {
            throw new BusinessException("Intervalo temporal inválido");
        }
        return { ...segmento, inicioSessaoMilissegundos, fimSessaoMilissegundos };
    }).sort((primeiro, segundo) =>
        primeiro.inicioSessaoMilissegundos - segundo.inicioSessaoMilissegundos
        || compararIdentificador(primeiro.faixaIdentificador, segundo.faixaIdentificador)
        || primeiro.inicioMilissegundos - segundo.inicioMilissegundos
        || compararIdentificador(primeiro.identificador, segundo.identificador));
}

/** Correção vazia é intencional; apenas null significa usar o original. */
export function resolverTextoTranscricao(segmento: SegmentoTranscricaoTextoDto): string {
    return segmento.textoCorrigido ?? segmento.textoOriginal;
}

function compararIdentificador(primeiro: string, segundo: string): number {
    return primeiro < segundo ? -1 : primeiro > segundo ? 1 : 0;
}
