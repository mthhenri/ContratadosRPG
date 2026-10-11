import type { RegraPecaArvoreItemDto } from "@contratados-rpg/shared/dtos/livro";
import { TipoRegraPecaEnum as Tipo } from "@contratados-rpg/shared/enums";

import {
    campoInicialDe, construirLinhasSumario, destinoPorTeclado, opcoesDeInsercao, resolverDestino,
    tiposInseriveis,
} from "./oficina-estrutura";

function peca(id: number, tipo: Tipo, pai: number | null, ordem: number, nome: string): RegraPecaArvoreItemDto {
    const dados = tipo === Tipo.SECAO ? { titulo: nome, nivel: 2, glifo: null }
        : tipo === Tipo.PARAGRAFO ? { trechos: [] } : { nome };
    return { id, livroId: 1, pecaPaiId: pai, tipo, identificador: `id-${id}`, ancora: null, ordem,
        dados: dados as never, revisao: 1 };
}

/**
 * S1 > [S1a, P, S1b] · S2 · C > [H, A1, A2]
 */
function livro(): RegraPecaArvoreItemDto[] {
    return [
        peca(1, Tipo.SECAO, null, 0, "S1"),
        peca(2, Tipo.SECAO, 1, 0, "S1a"),
        peca(3, Tipo.PARAGRAFO, 1, 1, ""),
        peca(4, Tipo.SECAO, 1, 2, "S1b"),
        peca(5, Tipo.SECAO, null, 1, "S2"),
        peca(6, Tipo.CLASSE, null, 2, "C"),
        peca(7, Tipo.HABILIDADE, 6, 0, "H"),
        peca(8, Tipo.ARQUETIPO, 6, 1, "A1"),
        peca(9, Tipo.ARQUETIPO, 6, 2, "A2"),
    ];
}

describe("sumário da Oficina", () => {
    it("achata seções, classes e arquétipos na ordem de leitura, sem parágrafos nem habilidades", () => {
        const linhas = construirLinhasSumario(livro());
        expect(linhas.map((linha) => [linha.rotulo, linha.profundidade])).toEqual([
            ["S1", 0], ["S1a", 1], ["S1b", 1], ["S2", 0], ["C", 0], ["A1", 1], ["A2", 1],
        ]);
    });

    it("peça sem nome ainda aparece, com rótulo vazio", () => {
        const itens = [peca(1, Tipo.SECAO, null, 0, "")];
        expect(construirLinhasSumario(itens)[0].rotulo).toBe("");
    });
});

describe("o que se pode inserir", () => {
    it("dentro de classe só habilidade e arquétipo; dentro de arquétipo só habilidade", () => {
        expect(tiposInseriveis(Tipo.CLASSE)).toEqual([Tipo.HABILIDADE, Tipo.ARQUETIPO]);
        expect(tiposInseriveis(Tipo.ARQUETIPO)).toEqual([Tipo.HABILIDADE]);
    });

    it("na raiz e em seção cabem blocos, mas arquétipo não", () => {
        expect(tiposInseriveis(null)).toContain(Tipo.SECAO);
        expect(tiposInseriveis(Tipo.SECAO)).toContain(Tipo.PARAGRAFO);
        expect(tiposInseriveis(null)).not.toContain(Tipo.ARQUETIPO);
        expect(tiposInseriveis(Tipo.SECAO)).not.toContain(Tipo.ARQUETIPO);
    });

    it("peça que não tem filhos e roteiro não oferecem nada", () => {
        expect(tiposInseriveis(Tipo.PARAGRAFO)).toEqual([]);
        expect(tiposInseriveis(Tipo.ROTEIRO)).toEqual([]);
    });

    it("o menu pode ser restrito a um tipo (o botão de arquétipos da classe)", () => {
        expect(opcoesDeInsercao(Tipo.CLASSE, [Tipo.ARQUETIPO]).map((opcao) => opcao.id)).toEqual([Tipo.ARQUETIPO]);
    });

    it("o cursor pousa no nome ou no texto da peça nova", () => {
        expect(campoInicialDe(Tipo.SECAO)).toBe("titulo");
        expect(campoInicialDe(Tipo.HABILIDADE)).toBe("nome");
        expect(campoInicialDe(Tipo.ARQUETIPO)).toBeNull();
        expect(campoInicialDe(Tipo.NOTA)).toBe("trechos");
    });
});

describe("destino do arrastar", () => {
    const itens = livro();
    const linhas = construirLinhasSumario(itens);

    it("sobe uma seção da raiz para o começo", () => {
        // S2 (id 5) para antes de S1.
        const resultado = resolverDestino(itens, linhas, 5, 0, 0);
        expect(resultado).toEqual({ ok: true, destino: { pecaPaiId: null, indice: 0, profundidade: 0 }, semMudanca: false });
    });

    it("a profundidade segue o arrasto horizontal: entra como última filha da seção de cima", () => {
        // Solta S2 depois de S1b (ponto 3) com um nível a mais.
        const resultado = resolverDestino(itens, linhas, 5, 3, 1);
        expect(resultado).toEqual({ ok: true, destino: { pecaPaiId: 1, indice: 3, profundidade: 1 }, semMudanca: false });
    });

    it("o índice real pula as irmãs que o sumário não mostra", () => {
        // S1b (id 4) para antes de S1a: ponto 1, profundidade 1 → antes da irmã 2, índice 0.
        const resultado = resolverDestino(itens, linhas, 4, 1, 1);
        expect(resultado).toMatchObject({ ok: true, destino: { pecaPaiId: 1, indice: 0 } });
    });

    it("largar no mesmo lugar não é mudança", () => {
        const resultado = resolverDestino(itens, linhas, 4, 2, 1);
        expect(resultado).toMatchObject({ ok: true, semMudanca: true });
    });

    it("troca a ordem dos arquétipos dentro da classe", () => {
        // A2 (id 9) antes de A1 (id 8): filhos da classe sem A2 = [H, A1] → índice 1.
        const resultado = resolverDestino(itens, linhas, 9, 5, 1);
        expect(resultado).toMatchObject({ ok: true, destino: { pecaPaiId: 6, indice: 1 }, semMudanca: false });
    });

    it("recusa seção dentro de classe e diz por quê", () => {
        // S2 entre os arquétipos da classe: só cabe arquétipo; mais acima, nem a raiz serve entre eles.
        const resultado = resolverDestino(itens, linhas, 5, 4, 1);
        expect(resultado.ok).toBe(false);
        expect(resultado).toMatchObject({ motivo: expect.stringContaining("Seção não pode ficar dentro de classe") });
    });

    it("recusa arquétipo fora da classe", () => {
        // A1 antes de S1, na raiz.
        const resultado = resolverDestino(itens, linhas, 8, 0, 0);
        expect(resultado).toMatchObject({ ok: false, motivo: expect.stringContaining("Arquétipo") });
    });

    it("a peça que carrega filhos leva todos junto: não cabe dentro de si mesma", () => {
        // S1 (com S1a e S1b) solta depois de S1a: a posição só existe sem o que ela carrega.
        const resultado = resolverDestino(itens, linhas, 1, 0, 1);
        expect(resultado.ok).toBe(true);
        // Sem S1 e filhos, o sumário começa em S2: na posição 0 só cabe a raiz.
        expect(resultado).toMatchObject({ destino: { pecaPaiId: null } });
    });
});

describe("alternativa por teclado", () => {
    const itens = livro();
    const linhas = construirLinhasSumario(itens);

    it("subir e descer trocam de lugar com a irmã, sem mudar de pai nem entrar na vizinha", () => {
        // S2 sobe além de S1 (que tem filhas): continua na raiz.
        expect(destinoPorTeclado(itens, linhas, 5, "subir")).toMatchObject({
            ok: true, destino: { pecaPaiId: null, indice: 0 },
        });
        // S1 desce além de S2: continua na raiz, antes da classe.
        expect(destinoPorTeclado(itens, linhas, 1, "descer")).toMatchObject({
            ok: true, destino: { pecaPaiId: null, indice: 1 },
        });
        // A primeira filha de S1 não sobe para fora do pai.
        expect(destinoPorTeclado(itens, linhas, 2, "subir")).toMatchObject({ ok: false });
    });

    it("descer move depois da próxima linha", () => {
        expect(destinoPorTeclado(itens, linhas, 1, "descer")).toMatchObject({
            ok: true, destino: { pecaPaiId: null, indice: 1 }, semMudanca: false,
        });
    });

    it("subir no primeiro e descer no último avisam", () => {
        expect(destinoPorTeclado(itens, linhas, 1, "subir")).toMatchObject({ ok: false });
        expect(destinoPorTeclado(itens, linhas, 9, "descer")).toMatchObject({ ok: false });
    });

    it("avançar entra como última filha da irmã de cima; recuar sai para depois do pai", () => {
        expect(destinoPorTeclado(itens, linhas, 5, "avancar")).toMatchObject({
            ok: true, destino: { pecaPaiId: 1, indice: 3 },
        });
        expect(destinoPorTeclado(itens, linhas, 4, "recuar")).toMatchObject({
            ok: true, destino: { pecaPaiId: null, indice: 1 },
        });
    });

    it("avançar sem irmã de cima e recuar na raiz são recusados", () => {
        expect(destinoPorTeclado(itens, linhas, 1, "avancar")).toMatchObject({ ok: false });
        expect(destinoPorTeclado(itens, linhas, 5, "recuar")).toMatchObject({ ok: false });
    });

    it("destino proibido pela tabela é recusado com motivo (arquétipo não sobe para fora da classe)", () => {
        const resultado = destinoPorTeclado(itens, linhas, 8, "subir");
        expect(resultado).toMatchObject({ ok: false, motivo: expect.any(String) });
    });
});
