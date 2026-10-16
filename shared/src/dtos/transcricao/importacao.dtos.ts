/** Contratos da task 02 (glossário, identidades, ajuste de faixa e pacote do motor): tempos em milissegundos, sem mídia, hash de áudio ou caminho local. */

/** Contrato TermoGlossarioTranscricaoCriarDto: termo por campanha, só dica de reconhecimento. */
export interface TermoGlossarioTranscricaoCriarDto {
    readonly campanhaId: number;
    readonly termo: string;
}

/** Contrato TermoGlossarioTranscricaoCriadoDto. */
export interface TermoGlossarioTranscricaoCriadoDto {
    readonly id: number;
    readonly campanhaId: number;
    readonly termo: string;
    readonly createdDate: string;
    readonly updatedDate: string;
}

/** Contrato TermoGlossarioTranscricaoAlterarDto. */
export interface TermoGlossarioTranscricaoAlterarDto {
    readonly id: number;
    readonly termo: string;
}

/** Contrato TermoGlossarioTranscricaoAlteradoDto. */
export interface TermoGlossarioTranscricaoAlteradoDto {
    readonly id: number;
    readonly campanhaId: number;
    readonly termo: string;
    readonly createdDate: string;
    readonly updatedDate: string;
}

/** Contrato TermoGlossarioTranscricaoExcluirDto. */
export interface TermoGlossarioTranscricaoExcluirDto {
    readonly id: number;
}

/** Contrato TermoGlossarioTranscricaoListarDto. */
export interface TermoGlossarioTranscricaoListarDto {
    readonly campanhaId: number;
}

/** Contrato TermoGlossarioTranscricaoResumoDto. */
export interface TermoGlossarioTranscricaoResumoDto {
    readonly id: number;
    readonly campanhaId: number;
    readonly termo: string;
    readonly createdDate: string;
    readonly updatedDate: string;
}

/** Contrato IdentidadeTranscricaoCriarDto: associação reutilizável nome de origem do arquivo → participante, por campanha. */
export interface IdentidadeTranscricaoCriarDto {
    readonly campanhaId: number;
    readonly nomeOrigem: string;
    readonly participante: string;
}

/** Contrato IdentidadeTranscricaoCriadaDto. */
export interface IdentidadeTranscricaoCriadaDto {
    readonly id: number;
    readonly campanhaId: number;
    readonly nomeOrigem: string;
    readonly participante: string;
    readonly createdDate: string;
    readonly updatedDate: string;
}

/** Contrato IdentidadeTranscricaoAlterarDto. */
export interface IdentidadeTranscricaoAlterarDto {
    readonly id: number;
    readonly participante: string;
}

/** Contrato IdentidadeTranscricaoAlteradaDto. */
export interface IdentidadeTranscricaoAlteradaDto {
    readonly id: number;
    readonly campanhaId: number;
    readonly nomeOrigem: string;
    readonly participante: string;
    readonly createdDate: string;
    readonly updatedDate: string;
}

/** Contrato IdentidadeTranscricaoExcluirDto. */
export interface IdentidadeTranscricaoExcluirDto {
    readonly id: number;
}

/** Contrato IdentidadeTranscricaoListarDto. */
export interface IdentidadeTranscricaoListarDto {
    readonly campanhaId: number;
}

/** Contrato IdentidadeTranscricaoResumoDto. */
export interface IdentidadeTranscricaoResumoDto {
    readonly id: number;
    readonly campanhaId: number;
    readonly nomeOrigem: string;
    readonly participante: string;
    readonly createdDate: string;
    readonly updatedDate: string;
}

/**
 * Contrato FaixaTranscricaoAlterarDto: confirma/corrige a identidade e ajusta o offset manual da faixa.
 * `silencioInicialMilissegundos` é só informativo (medido pelo app, nunca aplicado ao offset).
 */
export interface FaixaTranscricaoAlterarDto {
    readonly id: number;
    readonly participante: string;
    readonly identidadeConfirmada: boolean;
    readonly deslocamentoMilissegundos: number;
    readonly silencioInicialMilissegundos: number | null;
}

/** Contrato FaixaTranscricaoAlteradaDto. */
export interface FaixaTranscricaoAlteradaDto {
    readonly id: number;
    readonly identificador: string;
    readonly sessaoId: number;
    readonly nomeArquivo: string;
    readonly participante: string;
    readonly identidadeConfirmada: boolean;
    readonly deslocamentoMilissegundos: number;
    readonly silencioInicialMilissegundos: number | null;
    readonly execucaoSelecionadaId: number | null;
    readonly createdDate: string;
    readonly updatedDate: string;
}

/** Value object GlossarioEfetivoTranscricaoDto: o que foi de fato entregue ao motor; imutável por execução. */
export interface GlossarioEfetivoTranscricaoDto {
    readonly versao: 1;
    readonly termos: readonly string[];
}

/** Value object FaixaTrabalhoTranscricaoDto: uma faixa já confirmada, no contrato do motor. */
export interface FaixaTrabalhoTranscricaoDto {
    readonly identificador: string;
    readonly nomeArquivo: string;
    readonly participante: string;
    readonly deslocamentoMilissegundos: number;
    readonly silencioInicialMilissegundos: number | null;
}

/** Value object PacoteTrabalhoTranscricaoDto: seleção, mapeamentos, idioma, glossário e offsets de UMA sessão/campanha. */
export interface PacoteTrabalhoTranscricaoDto {
    readonly campanhaId: number;
    readonly sessaoId: number;
    readonly idioma: string;
    readonly glossario: readonly string[];
    readonly faixas: readonly FaixaTrabalhoTranscricaoDto[];
}
