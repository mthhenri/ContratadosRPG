import { IMAGEM_MIMES_PERMITIDOS } from './imagem.validators';

/**
 * Limites públicos do documento de campanha (M9), compartilhados pelas camadas da aplicação: o
 * cliente valida antes de enviar, o backend valida de verdade e a migration espelha título e
 * conteúdo em CHECK.
 */
export const DOCUMENTO_TITULO_MAXIMO = 120;
export const DOCUMENTO_CONTEUDO_MAXIMO = 100_000;
/** Maior que o avatar da ficha (2 MB): um documento de imagem costuma ser mapa, carta ou foto. */
export const DOCUMENTO_IMAGEM_TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024;
export const DOCUMENTO_IMAGEM_MIMES_PERMITIDOS: readonly string[] = IMAGEM_MIMES_PERMITIDOS;
