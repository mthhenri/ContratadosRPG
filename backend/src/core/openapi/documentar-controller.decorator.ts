import { ApiTags } from "@nestjs/swagger";

/**
 * Agrupa uma controller REST na documentação OpenAPI sem levar metadados de domínio para o
 * `shared`. Os detalhes de cada operação são derivados do contrato público gerado em
 * `contratos-gerados.ts`.
 */
export const DocumentarController = (tag: string): ClassDecorator => ApiTags(tag);
