import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CategoriaNpcEnum, HabilidadeTipoNpcEnum } from "../../enums";
import type { FichaNpcHabilidadeDto } from "../../dtos/ficha";
import { listarBibliotecaHabilidadesNpc } from "./biblioteca";
import { validarVolumeHabilidades } from "./habilidades";

const RAIZ = resolve(__dirname, "..", "..", "..", "..");
const SECOES: Readonly<Record<string, CategoriaNpcEnum>> = {
    Operativo: CategoriaNpcEnum.OPERATIVO, Veterano: CategoriaNpcEnum.VETERANO,
    Elite: CategoriaNpcEnum.ELITE, Lendário: CategoriaNpcEnum.LENDARIO,
};

/**
 * Lê a "Biblioteca de Referência" direto do Guia v4.2.0 — o documento é o oráculo, não o motor. O
 * documento é a cópia gerada do banco (m11-10): a seção é `#### ⬥`, a categoria `##### ⬦` e cada
 * habilidade sai em duas linhas (`Nome [Ex.: X]` e o corpo) ou numa só (`**Nome [Ex.: X]** [4 E] Ativa — …`).
 */
function lerBibliotecaDoGuia(): { categoria: CategoriaNpcEnum; habilidade: FichaNpcHabilidadeDto }[] {
    // O número da versão no nome do arquivo muda a cada publicação: acha pelo prefixo.
    const pasta = join(RAIZ, "docs", "core");
    const arquivo = readdirSync(pasta).find((nome) => /^guia_de_mestre-v[\d.]+\.md$/.test(nome))!;
    const guia = readFileSync(join(pasta, arquivo), "utf8")
        .replace(/\\([-+.()[\]*_])/g, "$1");
    const inicio = guia.indexOf("#### ⬥ Biblioteca de Referência");
    const fim = guia.indexOf("## ⬢ Guia de Criação de Missões");
    const linhas = guia.slice(inicio, fim).split(/\r?\n/).map((linha) => linha.trim());
    const entradas: { categoria: CategoriaNpcEnum; habilidade: FichaNpcHabilidadeDto }[] = [];
    let categoria: CategoriaNpcEnum | null = null;
    const registrar = (nomeNeutro: string, nomeNarrativo: string, custo: string | undefined, tipo: string,
        restricaoBruta: string | undefined, descricao: string): void => {
        if (!categoria) return;
        const restricao = restricaoBruta ? `${restricaoBruta[0].toUpperCase()}${restricaoBruta.slice(1)}.` : null;
        entradas.push({ categoria, habilidade: {
            nomeNeutro, nomeNarrativo,
            tipo: tipo === "Passiva" ? HabilidadeTipoNpcEnum.PASSIVA : HabilidadeTipoNpcEnum.ATIVA,
            ...(custo ? { custoEnergia: Number(custo) } : {}),
            descricao,
            ...(restricao ? { restricao } : {}),
        } });
    };
    for (let indice = 0; indice < linhas.length; indice++) {
        const secao = /^#{5} ⬦ (.+?)(?: \{#[^}]+\})?$/.exec(linhas[indice]);
        if (secao) { categoria = SECOES[secao[1]] ?? null; continue; }
        const emUmaLinha = /^\*\*(.+?) \[Ex\.: (.+?)\]\*\*(?: \[(\d+) E\])? (Passiva|Ativa)(?: \((.+?)\))? — (.+)$/.exec(linhas[indice]);
        if (emUmaLinha) {
            registrar(emUmaLinha[1], emUmaLinha[2], emUmaLinha[3], emUmaLinha[4], emUmaLinha[5], emUmaLinha[6]);
            continue;
        }
        const cabecalho = /^(.+?) \[Ex\.: (.+?)\](?: \[(\d+) E\])?$/.exec(linhas[indice]);
        if (!cabecalho || !categoria) continue;
        const corpo = /^(Passiva|Ativa)(?: \((.+?)\))? — (.+)$/.exec(linhas[indice + 1]);
        if (!corpo) throw new Error(`Corpo ausente após "${linhas[indice]}"`);
        registrar(cabecalho[1], cabecalho[2], cabecalho[3], corpo[1], corpo[2], corpo[3]);
    }
    return entradas;
}

describe("listarBibliotecaHabilidadesNpc", () => {
    it("transcreve a Biblioteca de Referência do Guia v4.2.0 na ordem do documento", () => {
        expect(listarBibliotecaHabilidadesNpc()).toEqual(lerBibliotecaDoGuia());
    });

    it("tem 4 Operativo, 4 Veterano, 6 Elite e 8 Lendário; Civil sem modelos", () => {
        const contagem = (categoria: CategoriaNpcEnum) =>
            listarBibliotecaHabilidadesNpc({ categoria }).length;
        expect([CategoriaNpcEnum.CIVIL, CategoriaNpcEnum.OPERATIVO, CategoriaNpcEnum.VETERANO,
            CategoriaNpcEnum.ELITE, CategoriaNpcEnum.LENDARIO].map(contagem)).toEqual([0, 4, 4, 6, 8]);
    });

    it("só Ativas têm custo de Energia", () => {
        for (const { habilidade } of listarBibliotecaHabilidadesNpc()) {
            expect(habilidade.custoEnergia !== undefined)
                .toBe(habilidade.tipo === HabilidadeTipoNpcEnum.ATIVA);
        }
    });

    it("um conjunto da própria Categoria pode compor um volume válido", () => {
        const operativo = listarBibliotecaHabilidadesNpc({ categoria: CategoriaNpcEnum.OPERATIVO })
            .map(({ habilidade }) => habilidade);
        expect(validarVolumeHabilidades({ categoria: CategoriaNpcEnum.OPERATIVO,
            habilidades: [operativo[0], operativo[2], operativo[3]] })).toEqual([]);
    });

    it("devolve cópias — alterar o retorno não altera a tabela", () => {
        const [primeira] = listarBibliotecaHabilidadesNpc({ categoria: CategoriaNpcEnum.ELITE });
        (primeira.habilidade as { descricao: string }).descricao = "alterada";
        expect(listarBibliotecaHabilidadesNpc({ categoria: CategoriaNpcEnum.ELITE })[0]
            .habilidade.descricao).not.toBe("alterada");
    });
});
