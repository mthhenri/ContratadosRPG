import {
    DocumentBuilder,
    SwaggerModule,
    type OpenAPIObject,
    type OperationObject,
    type ReferenceObject,
    type ResponseObject,
    type SchemaObject,
} from "@nestjs/swagger";
import type { INestApplication } from "@nestjs/common";
import { operacoesContratosPublicos, schemasContratosPublicos } from "./contratos-gerados";

const NOME_SEGURANCA_JWT = "jwt";

const DESCRICOES_TAG: Readonly<Record<string, string>> = {
    "Operação": "Verificações operacionais públicas da API.",
    "Autenticação": "Registro e criação de sessão JWT.",
    "Usuários": "Perfil, credenciais e administração de contas.",
    "Campanhas": "Campanhas, membros, estado e inventário do esquadrão.",
    "Fichas": "Fichas, vitalidade, acervo, imagens, acessos e inventário.",
    "Rolagens": "Registro e históricos de rolagens de dados.",
    "Caderno": "Páginas privadas, caderno do esquadrão e busca de campanha.",
    "Encontros": "Encontros de combate, combatentes, turnos, recursos e condições.",
};

type Schema = SchemaObject | ReferenceObject;

interface OperacaoContrato {
    readonly tag: string;
    readonly publica: boolean;
    readonly requestSchema?: string;
    readonly responseSchema: string;
}

function schemaDados(nome: string): Schema {
    if (nome === "null") {
        return { type: "object", nullable: true, description: "Sempre null nesta operação." };
    }
    const array = /^(.+)\[\]$/.exec(nome);
    if (array) {
        return { type: "array", items: schemaDados(array[1]) };
    }
    const paginado = /^PaginatedResult<(.+)>$/.exec(nome);
    if (paginado) {
        return {
            type: "object",
            required: ["itens", "totalItens", "paginaAtual", "totalPaginas"],
            properties: {
                itens: { type: "array", items: schemaDados(paginado[1]) },
                totalItens: { type: "integer", example: 1 },
                paginaAtual: { type: "integer", example: 1 },
                totalPaginas: { type: "integer", example: 1 },
            },
        };
    }
    if (nome in schemasContratosPublicos) {
        return { $ref: `#/components/schemas/${nome}` };
    }
    return { type: "object", additionalProperties: true };
}

function exemploDados(nome: string): unknown {
    if (nome === "null") return null;
    if (nome === "{ status: string }") return { status: "ok" };
    if (nome.endsWith("[]")) return [];
    if (nome.startsWith("PaginatedResult<")) {
        return { itens: [], totalItens: 0, paginaAtual: 1, totalPaginas: 1 };
    }
    return {};
}

function resumoOperacao(operationId: string): string {
    const metodo = operationId.replace(/^[A-Za-z]+Controller_/, "");
    return metodo
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/^./, (letra) => letra.toUpperCase());
}

function respostaSucesso(nomeSchema: string): ResponseObject {
    return {
        description: "Resposta bem-sucedida no envelope StandardResponse.",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    required: ["sucesso", "dados", "mensagem"],
                    properties: {
                        sucesso: { type: "boolean", enum: [true] },
                        dados: schemaDados(nomeSchema),
                        mensagem: { type: "string", example: "Operação realizada com sucesso." },
                    },
                },
                examples: {
                    sucesso: {
                        value: {
                            sucesso: true,
                            dados: exemploDados(nomeSchema),
                            mensagem: "Operação realizada com sucesso.",
                        },
                    },
                },
            },
        },
    };
}

function respostaErro(descricao: string): ResponseObject {
    return {
        description: descricao,
        content: {
            "application/json": { schema: { $ref: "#/components/schemas/ErroResposta" } },
        },
    };
}

function possuiIdentificador(caminho: string): boolean {
    return caminho.includes("{");
}

function ajustarParametrosCaminho(caminho: string, operacao: OperationObject): void {
    const nomes = [...caminho.matchAll(/\{([^}]+)\}/g)].map((resultado) => resultado[1]);
    const parametros = operacao.parameters ?? [];
    for (const nome of nomes) {
        const existente = parametros.some((parametro) =>
            "$ref" in parametro ? false : parametro.in === "path" && parametro.name === nome,
        );
        if (!existente) {
            parametros.push({
                name: nome,
                in: "path",
                required: true,
                schema: nome === "itemId" ? { type: "string" } : { type: "integer" },
            });
        }
    }
    operacao.parameters = parametros;
}

function configurarUpload(operacao: OperationObject): void {
    operacao.requestBody = {
        required: true,
        content: {
            "multipart/form-data": {
                schema: {
                    type: "object",
                    required: ["arquivo"],
                    properties: { arquivo: { type: "string", format: "binary" } },
                },
                encoding: { arquivo: { contentType: "image/jpeg, image/png, image/webp" } },
            },
        },
    };
    operacao.description = `${operacao.description ?? ""} Aceita JPEG, PNG ou WEBP de até 2 MiB.`.trim();
}

/**
 * Cria e completa o documento com a ponte runtime dos contratos compartilhados. As interfaces
 * de `shared` continuam sendo a fonte de verdade; este módulo não valida nem altera a API.
 */
export function criarDocumentoOpenApi(app: INestApplication): OpenAPIObject {
    const configuracao = new DocumentBuilder()
        .setTitle("Contratados RPG API")
        .setDescription(
            "Documentação da API REST. A escrita continua exclusivamente por HTTP; Socket.IO "
            + "é broadcast-only e não faz parte deste documento OpenAPI.",
        )
        .setVersion("0.0.1")
        .setOpenAPIVersion("3.0.3")
        .addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "JWT" }, NOME_SEGURANCA_JWT)
        .build();
    const documento = SwaggerModule.createDocument(app, configuracao, { autoTagControllers: false });
    enriquecerDocumentoOpenApi(documento);
    return documento;
}

/** Aplica respostas, segurança e schemas ao documento já descoberto pelo Nest. */
export function enriquecerDocumentoOpenApi(documento: OpenAPIObject): void {
    documento.components ??= {};
    documento.components.schemas = {
        ...documento.components.schemas,
        ...(schemasContratosPublicos as unknown as Record<string, SchemaObject | ReferenceObject>),
        StandardResponse: {
            type: "object",
            required: ["sucesso", "dados", "mensagem"],
            properties: {
                sucesso: { type: "boolean", enum: [true] },
                dados: { type: "object", nullable: true, additionalProperties: true },
                mensagem: { type: "string" },
            },
        },
        ErroResposta: {
            type: "object",
            required: ["sucesso", "dados", "mensagem", "erros"],
            properties: {
                sucesso: { type: "boolean", enum: [false] },
                dados: { type: "object", nullable: true, example: null },
                mensagem: { type: "string", example: "Recurso não encontrado" },
                erros: { type: "array", items: { type: "string" } },
            },
        },
    };
    documento.components.responses = {
        ...documento.components.responses,
        ErroResposta: {
            description: "Falha no envelope padronizado pela GlobalExceptionFilter.",
            content: {
                "application/json": {
                    schema: { $ref: "#/components/schemas/ErroResposta" },
                    example: {
                        sucesso: false,
                        dados: null,
                        mensagem: "Recurso não encontrado",
                        erros: [],
                    },
                },
            },
        },
    };
    documento.tags = Object.entries(DESCRICOES_TAG).map(([name, description]) => ({ name, description }));

    for (const [caminho, item] of Object.entries(documento.paths)) {
        for (const [metodo, operacao] of Object.entries(item as Record<string, unknown>)) {
            if (!operacao || typeof operacao !== "object" || !("operationId" in operacao)) continue;
            const operation = operacao as OperationObject;
            const contrato = operacoesContratosPublicos[
                operation.operationId as keyof typeof operacoesContratosPublicos
            ] as OperacaoContrato | undefined;
            if (!contrato) continue;

            operation.tags = [contrato.tag];
            operation.summary = resumoOperacao(operation.operationId ?? "Operação");
            operation.description ??= "Consulte as regras de permissão da service do domínio.";
            operation.security = contrato.publica ? [] : [{ [NOME_SEGURANCA_JWT]: [] }];
            ajustarParametrosCaminho(caminho, operation);
            if (contrato.requestSchema && metodo !== "get") {
                operation.requestBody = {
                    required: true,
                    content: {
                        "application/json": { schema: schemaDados(contrato.requestSchema) },
                    },
                };
            }
            if (caminho.endsWith("/imagem") && metodo === "post") {
                configurarUpload(operation);
            }
            operation.responses = { "200": respostaSucesso(contrato.responseSchema) };
            if (contrato.requestSchema) operation.responses["400"] = respostaErro("Entrada inválida.");
            if (!contrato.publica) {
                operation.responses["401"] = respostaErro("JWT ausente, inválido ou expirado.");
                operation.responses["403"] = respostaErro("Usuário autenticado sem a permissão exigida.");
            }
            if (possuiIdentificador(caminho)) {
                operation.responses["404"] = respostaErro("Recurso identificado pela rota não foi encontrado.");
            }
        }
    }
}

/** Registra Swagger UI e JSON bruto fora do interceptor de respostas de negócio. */
export function configurarDocumentacaoOpenApi(app: INestApplication): void {
    const documento = criarDocumentoOpenApi(app);
    SwaggerModule.setup("api/docs", app, documento, {
        jsonDocumentUrl: "api/docs-json",
        raw: ["json"],
    });
}
