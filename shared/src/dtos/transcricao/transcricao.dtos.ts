import type { TipoExecucaoTranscricaoEstadoEnum } from "../../enums";

/** Contrato SessaoTranscricaoCriarDto: tempos em milissegundos, sem mídia ou credenciais. */
export interface SessaoTranscricaoCriarDto {
    readonly campanhaId: number;
    readonly titulo: string;
}

/** Contrato SessaoTranscricaoCriadaDto: tempos em milissegundos, sem mídia ou credenciais. */
export interface SessaoTranscricaoCriadaDto {
    readonly id: number;
    readonly identificador: string;
    readonly campanhaId: number;
    readonly titulo: string;
    readonly arquivada: boolean;
    readonly createdDate: string;
    readonly updatedDate: string;
}

/** Contrato SessaoTranscricaoRecuperadaDto: tempos em milissegundos, sem mídia ou credenciais. */
export interface SessaoTranscricaoRecuperadaDto {
    readonly id: number;
    readonly identificador: string;
    readonly campanhaId: number;
    readonly titulo: string;
    readonly arquivada: boolean;
    readonly createdDate: string;
    readonly updatedDate: string;
}

/** Contrato SessaoTranscricaoResumoDto: tempos em milissegundos, sem mídia ou credenciais. */
export interface SessaoTranscricaoResumoDto {
    readonly id: number;
    readonly identificador: string;
    readonly campanhaId: number;
    readonly titulo: string;
    readonly arquivada: boolean;
    readonly createdDate: string;
    readonly updatedDate: string;
}

/** Contrato SessaoTranscricaoRecuperarDto: tempos em milissegundos, sem mídia ou credenciais. */
export interface SessaoTranscricaoRecuperarDto {
    readonly id: number;
}

/** Contrato SessaoTranscricaoAlterarDto: tempos em milissegundos, sem mídia ou credenciais. */
export interface SessaoTranscricaoAlterarDto {
    readonly id: number;
    readonly titulo: string;
}

/** Contrato SessaoTranscricaoAlteradaDto: tempos em milissegundos, sem mídia ou credenciais. */
export interface SessaoTranscricaoAlteradaDto {
    readonly id: number;
    readonly identificador: string;
    readonly campanhaId: number;
    readonly titulo: string;
    readonly arquivada: boolean;
    readonly createdDate: string;
    readonly updatedDate: string;
}

/** Contrato SessaoTranscricaoArquivamentoAlterarDto: tempos em milissegundos, sem mídia ou credenciais. */
export interface SessaoTranscricaoArquivamentoAlterarDto {
    readonly id: number;
    readonly arquivada: boolean;
}

/** Contrato SessaoTranscricaoArquivamentoAlteradaDto: tempos em milissegundos, sem mídia ou credenciais. */
export interface SessaoTranscricaoArquivamentoAlteradaDto {
    readonly id: number;
    readonly identificador: string;
    readonly campanhaId: number;
    readonly titulo: string;
    readonly arquivada: boolean;
    readonly createdDate: string;
    readonly updatedDate: string;
}

/** Contrato SessaoTranscricaoExcluirDto: tempos em milissegundos, sem mídia ou credenciais. */
export interface SessaoTranscricaoExcluirDto {
    readonly id: number;
}

/** Contrato SessaoTranscricaoListarDto: tempos em milissegundos, sem mídia ou credenciais. */
export interface SessaoTranscricaoListarDto {
    readonly campanhaId: number;
    readonly arquivadas?: boolean;
}

/** Contrato SessaoTranscricaoInternoCriarDto: tempos em milissegundos, sem mídia ou credenciais. */
export interface SessaoTranscricaoInternoCriarDto {
    readonly campanhaId: number;
    readonly titulo: string;
    readonly identificador: string;
}

/** Contrato FaixaTranscricaoCriarDto: tempos em milissegundos, sem mídia ou credenciais. */
export interface FaixaTranscricaoCriarDto {
    readonly sessaoId: number;
    readonly nomeArquivo: string;
    readonly participante: string;
    readonly deslocamentoMilissegundos: number;
}

/** Contrato FaixaTranscricaoInternoCriarDto: tempos em milissegundos, sem mídia ou credenciais. */
export interface FaixaTranscricaoInternoCriarDto {
    readonly sessaoId: number;
    readonly nomeArquivo: string;
    readonly participante: string;
    readonly deslocamentoMilissegundos: number;
    readonly identificador: string;
}

/** Contrato FaixaTranscricaoCriadaDto: tempos em milissegundos, sem mídia ou credenciais. */
export interface FaixaTranscricaoCriadaDto {
    readonly id: number;
    readonly identificador: string;
    readonly sessaoId: number;
    readonly nomeArquivo: string;
    readonly participante: string;
    readonly deslocamentoMilissegundos: number;
    readonly identidadeConfirmada: boolean;
    readonly silencioInicialMilissegundos: number | null;
    readonly execucaoSelecionadaId: number | null;
    readonly createdDate: string;
    readonly updatedDate: string;
}

/** Contrato FaixaTranscricaoResumoDto: tempos em milissegundos, sem mídia ou credenciais. */
export interface FaixaTranscricaoResumoDto {
    readonly id: number;
    readonly identificador: string;
    readonly sessaoId: number;
    readonly nomeArquivo: string;
    readonly participante: string;
    readonly deslocamentoMilissegundos: number;
    readonly identidadeConfirmada: boolean;
    readonly silencioInicialMilissegundos: number | null;
    readonly execucaoSelecionadaId: number | null;
    readonly createdDate: string;
    readonly updatedDate: string;
}

/** Contrato FaixaTranscricaoRecuperadaDto: tempos em milissegundos, sem mídia ou credenciais. */
export interface FaixaTranscricaoRecuperadaDto {
    readonly id: number;
    readonly identificador: string;
    readonly sessaoId: number;
    readonly nomeArquivo: string;
    readonly participante: string;
    readonly deslocamentoMilissegundos: number;
    readonly identidadeConfirmada: boolean;
    readonly silencioInicialMilissegundos: number | null;
    readonly execucaoSelecionadaId: number | null;
    readonly createdDate: string;
    readonly updatedDate: string;
}

/** Contrato FaixaTranscricaoListarDto: tempos em milissegundos, sem mídia ou credenciais. */
export interface FaixaTranscricaoListarDto {
    readonly sessaoId: number;
}

/** Contrato FaixaTranscricaoRecuperarDto: tempos em milissegundos, sem mídia ou credenciais. */
export interface FaixaTranscricaoRecuperarDto {
    readonly id: number;
}

/** Contrato ExecucaoTranscricaoRecuperarDto: tempos em milissegundos, sem mídia ou credenciais. */
export interface ExecucaoTranscricaoRecuperarDto {
    readonly id: number;
}

/** Contrato ExecucaoTranscricaoDto: tempos em milissegundos, sem mídia ou credenciais. */
export interface ExecucaoTranscricaoDto {
    readonly id: number;
    readonly identificador: string;
    readonly faixaId: number;
    readonly estado: TipoExecucaoTranscricaoEstadoEnum;
    readonly motor: string;
    readonly versaoMotor: string;
    readonly idioma: string;
    readonly configuracao: Readonly<Record<string, unknown>>;
}

/** Contrato SegmentoTranscricaoDto: tempos em milissegundos, sem mídia ou credenciais. */
export interface SegmentoTranscricaoDto {
    readonly id: number;
    readonly identificador: string;
    readonly execucaoId: number;
    readonly inicioMilissegundos: number;
    readonly fimMilissegundos: number;
    readonly textoOriginal: string;
    readonly textoCorrigido: string | null;
    readonly revisao: number;
}

/** Contrato SegmentoTranscricaoTextoDto: tempos em milissegundos, sem mídia ou credenciais. */
export interface SegmentoTranscricaoTextoDto {
    readonly textoOriginal: string;
    readonly textoCorrigido: string | null;
}

/** Contrato SegmentoTranscricaoTempoDto: tempos em milissegundos, sem mídia ou credenciais. */
export interface SegmentoTranscricaoTempoDto {
    readonly identificador: string;
    readonly faixaIdentificador: string;
    readonly inicioMilissegundos: number;
    readonly fimMilissegundos: number;
    readonly deslocamentoMilissegundos: number;
}

/** Contrato SegmentoTranscricaoCronologiaDto: tempos em milissegundos, sem mídia ou credenciais. */
export interface SegmentoTranscricaoCronologiaDto {
    readonly identificador: string;
    readonly faixaIdentificador: string;
    readonly inicioMilissegundos: number;
    readonly fimMilissegundos: number;
    readonly deslocamentoMilissegundos: number;
    readonly inicioSessaoMilissegundos: number;
    readonly fimSessaoMilissegundos: number;
}
