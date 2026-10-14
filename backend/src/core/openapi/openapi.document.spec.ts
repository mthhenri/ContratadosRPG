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
            const segredoApp = operationId.startsWith("AplicativoController_") || ["VinculoController_estado", "VinculoController_desconectar"].includes(operationId);
            expect(operacao?.security).toEqual(segredoApp ? [{ dispositivo: [] }] : contrato.publica ? [] : [{ jwt: [] }]);
            const codigoSucesso = contrato.tag === "Transcrições" && contrato.metodo === "post"
                ? "201" : "200";
            expect((operacao?.responses[codigoSucesso] as { description?: string } | undefined)
                ?.description).toContain("StandardResponse");
        }
    });

    it("documenta as nove operações privadas de transcrição com status reais", () => {
        const documento = criarDocumentoDescoberto();
        enriquecerDocumentoOpenApi(documento);
        const contratos = Object.entries(operacoesContratosPublicos)
            .filter(([operationId]) => operationId.startsWith("TranscricaoController_"));
        expect(contratos).toHaveLength(9);
        for (const [, contrato] of contratos) {
            const caminho = contrato.caminho.replace(/:([A-Za-z]+)/g, "{$1}");
            const operacao = documento.paths[caminho][contrato.metodo as "get"]!;
            expect(operacao.responses[contrato.metodo === "post" ? "201" : "200"]).toBeDefined();
            expect(operacao.responses["400"]).toBeDefined();
            expect(operacao.responses["401"]).toBeDefined();
            expect(operacao.responses["404"]).toBeDefined();
            expect(operacao.responses["403"]).toBeUndefined();
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
