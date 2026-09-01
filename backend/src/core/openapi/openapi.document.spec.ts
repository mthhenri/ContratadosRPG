import { describe, expect, it } from "vitest";
import type { OpenAPIObject } from "@nestjs/swagger";
import { gerarContratosOpenApi } from "../../../tools/gerar-openapi-contratos";
import { operacoesContratosPublicos } from "./contratos-gerados";
import { enriquecerDocumentoOpenApi } from "./openapi.document";

function criarDocumentoDescoberto(): OpenAPIObject {
    const paths: OpenAPIObject["paths"] = {};
    for (const [operationId, contrato] of Object.entries(operacoesContratosPublicos)) {
        const caminho = contrato.caminho.replace(/:([A-Za-z]+)/g, "{$1}");
        paths[caminho] ??= {};
        paths[caminho][contrato.metodo] = {
            operationId,
            responses: {},
        };
    }
    return {
        openapi: "3.0.3",
        info: { title: "Contratados RPG API", version: "0.0.1" },
        paths,
        components: { securitySchemes: { jwt: { type: "http", scheme: "bearer" } } },
    };
}

describe("documentação OpenAPI", () => {
    it("gera os contratos a partir dos DTOs e controllers atuais", () => {
        const contratosAtuais = gerarContratosOpenApi();
        expect(operacoesContratosPublicos).toEqual(contratosAtuais.operacoes);
    });

    it("cobre toda a matriz REST com segurança, schemas e envelope corretos", () => {
        const documento = criarDocumentoDescoberto();
        enriquecerDocumentoOpenApi(documento);

        expect(documento.components?.securitySchemes?.jwt).toMatchObject({
            type: "http",
            scheme: "bearer",
        });
        expect(documento.components?.schemas?.StandardResponse).toBeDefined();
        expect(documento.components?.schemas?.ErroResposta).toBeDefined();
        expect(documento.components?.schemas?.UsuarioCriarDto).toBeDefined();

        for (const [operationId, contrato] of Object.entries(operacoesContratosPublicos)) {
            const caminho = contrato.caminho.replace(/:([A-Za-z]+)/g, "{$1}");
            const operacao = documento.paths[caminho]?.[contrato.metodo as "get"];
            expect(operacao, `${contrato.metodo.toUpperCase()} ${caminho}`).toBeDefined();
            expect(operacao?.operationId).toBe(operationId);
            expect(operacao?.tags).toEqual([contrato.tag]);
            expect(operacao?.security).toEqual(contrato.publica ? [] : [{ jwt: [] }]);
            expect(operacao?.responses["200"]?.description).toContain("StandardResponse");
        }
    });

    it("marca uploads como multipart e rotas públicas sem cadeado", () => {
        const documento = criarDocumentoDescoberto();
        enriquecerDocumentoOpenApi(documento);
        const upload = documento.paths["/ficha/{id}/imagem"]?.post;
        expect(upload?.requestBody).toMatchObject({
            content: { "multipart/form-data": { schema: { properties: { arquivo: { format: "binary" } } } } },
        });
        expect(documento.paths["/health"]?.get?.security).toEqual([]);
        expect(documento.paths["/autenticacao/login"]?.post?.security).toEqual([]);
    });
});
