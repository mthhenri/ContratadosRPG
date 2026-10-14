/** Limites técnicos de metadados; não são cotas de áudio/inferência. */
export const TRANSCRICAO_TITULO_MAXIMO = 120;
export const TRANSCRICAO_NOME_MAXIMO = 255;
/** Maior inteiro exato do contrato JSON/TypeScript, também imposto no SQL. */
export const TRANSCRICAO_TEMPO_MAXIMO = Number.MAX_SAFE_INTEGER;

/** PK/FK SERIAL/INTEGER do PostgreSQL: evitar erro de intervalo antes do SQL. */
export const TRANSCRICAO_ID_MAXIMO = 2147483647;
