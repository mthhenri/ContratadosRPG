import { describe, expect, it, vi } from "vitest";
import { planejarMigracao, executarMigracao, reemitirAvulsos } from "./migrar-avatares-ficha";

describe("transição dos avatares públicos", () => {
    const origem = "/uploads/agentes/antiga.png";
    const imagem = { caminho: origem, modificadoEm: new Date() };
    const ficha = { id: 9, caminho: origem };

    it("inclui órfãos e mantém somente avulso ativo, sem tocar documentos", () => {
        expect(planejarMigracao({
            fichas: [ficha], avulsos: ["/uploads/agentes/avulso.png"],
            avulsosReemitidos: new Set(["agentes/avulso.png"]),
            imagens: [imagem, { ...imagem, caminho: "/uploads/agentes/dev/orfa.png" },
                { ...imagem, caminho: "/uploads/agentes/avulso.png" }],
        })).toEqual([
            { origem, fichas: [ficha] },
            { origem: "/uploads/agentes/dev/orfa.png", fichas: [] },
        ]);
    });

    it("recusa origem compartilhada com avulso antes de escrever", () => {
        expect(() => planejarMigracao({ fichas: [ficha], avulsos: [origem],
            imagens: [imagem] })).toThrow("compartilhada");
    });

    it("não presume que avulso ativo nunca compartilhou URL com ficha excluída", () => {
        expect(() => planejarMigracao({ fichas: [], avulsos: [origem],
            imagens: [imagem] })).toThrow("reemissão");
    });

    it("reemite avulso em nova URL pública antes de permitir quarentena da antiga", async () => {
        const conteudo = new Uint8Array([1, 2]);
        const armazenamento = { lerImagem: vi.fn(async () => ({ conteudo, mimetype: "image/png" })),
            salvarImagem: vi.fn(async () => ({ caminho: "/uploads/agentes/nova.png" })) };
        const registrar = vi.fn(async () => undefined);
        const alterarReferencia = vi.fn(async () => undefined);
        await reemitirAvulsos({ referencias: [ficha], armazenamento,
            registros: [], registrar, alterarReferencia });
        expect(armazenamento.salvarImagem).toHaveBeenCalledWith(expect.objectContaining({ pasta: "AGENTES" }));
        expect(registrar.mock.invocationCallOrder[0])
            .toBeLessThan(alterarReferencia.mock.invocationCallOrder[0]);
        expect(alterarReferencia).toHaveBeenCalledWith(ficha, "/uploads/agentes/nova.png");
    });

    it("recusa referências externas desconhecidas e ignora ficha já privada", () => {
        expect(() => planejarMigracao({ fichas: [{ ...ficha,
            caminho: "https://alheio.test/agentes/a.png" }], avulsos: [], imagens: [] }))
            .toThrow("origem");
        expect(planejarMigracao({ fichas: [{ ...ficha, caminho: "/uploads/fichas/a.png" }],
            avulsos: [], imagens: [] })).toEqual([]);
    });

    function montar() {
        const conteudo = new Uint8Array([1, 2, 3]);
        const armazenamento = {
            lerImagem: vi.fn(async () => ({ conteudo, mimetype: "image/png" })),
            salvarImagem: vi.fn(async () => ({ caminho: "/uploads/fichas/nova.png" })),
            excluirImagem: vi.fn(async () => undefined),
        };
        return { armazenamento, registrar: vi.fn(async () => undefined),
            alterarReferencias: vi.fn(async () => undefined),
            validarOrigemDesvinculada: vi.fn(async () => undefined),
            registros: [], plano: [{ origem, fichas: [ficha] }] };
    }

    it("verifica cópia, registra destino, altera referências e só então remove origem", async () => {
        const cenario = montar();
        await executarMigracao(cenario);
        expect(cenario.registrar).toHaveBeenCalledTimes(2);
        expect(cenario.armazenamento.excluirImagem).toHaveBeenCalledWith({ caminho: origem });
        expect(cenario.registrar.mock.invocationCallOrder[0])
            .toBeLessThan(cenario.alterarReferencias.mock.invocationCallOrder[0]);
        expect(cenario.validarOrigemDesvinculada.mock.invocationCallOrder[0])
            .toBeLessThan(cenario.armazenamento.excluirImagem.mock.invocationCallOrder[0]);
    });

    it("não altera banco nem remove origem quando os bytes copiados divergem", async () => {
        const cenario = montar();
        cenario.armazenamento.lerImagem.mockResolvedValueOnce({
            conteudo: new Uint8Array([8]), mimetype: "image/png" });
        await expect(executarMigracao(cenario)).rejects.toThrow("divergente");
        expect(cenario.alterarReferencias).not.toHaveBeenCalled();
        expect(cenario.armazenamento.excluirImagem).not.toHaveBeenCalled();
    });

    it("conflito de referência ou novo vínculo conserva origem", async () => {
        const cenario = montar();
        cenario.alterarReferencias.mockRejectedValueOnce(new Error("conflito"));
        await expect(executarMigracao(cenario)).rejects.toThrow("conflito");
        expect(cenario.armazenamento.excluirImagem).not.toHaveBeenCalled();
        const outro = montar();
        outro.validarOrigemDesvinculada.mockRejectedValueOnce(new Error("vínculo novo"));
        await expect(executarMigracao(outro)).rejects.toThrow("vínculo novo");
        expect(outro.armazenamento.excluirImagem).not.toHaveBeenCalled();
    });
});
