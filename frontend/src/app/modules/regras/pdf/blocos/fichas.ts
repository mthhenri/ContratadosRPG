import type {
    NormalizadoModulos, NormalizadoNiveisAmeaca, NormalizadoOrigens, Trechos,
} from "@contratados-rpg/shared/livro";
import { separarBonusDeFormacao } from "../../blocos/regras-texto";
import type { RegrasTrecho } from "../../regras.model";
import type { Construtor } from "../construtor";
import { MIUDO, NOME, ROTULO } from "../estilos";
import { PALETA_PDF } from "../paleta";
import type { EstiloTexto } from "../pincel";
import { pecasDeTexto, trechosEmCorridas } from "../texto-rico";
import { type Caixa, fileirasDeCaixas } from "./caixas";

const secundario: EstiloTexto = { ...MIUDO, italico: true, cor: PALETA_PDF.secundario };

const rotulo = (
    construtor: Construtor, valor: string, largura: number, antes = 1.8,
) => construtor.paragrafo(
    [{ tipo: "texto", texto: valor.toLocaleUpperCase("pt-BR") }], ROTULO, { espacoAntes: antes }, largura);

export function blocoDeOrigens(construtor: Construtor, bloco: NormalizadoOrigens): void {
    const caixas: Caixa[] = bloco.origens.map((origem) => ({
        conteudo: (largura) => {
            const texto = (trechos: Trechos, estilo = MIUDO) =>
                construtor.paragrafo(trechos, estilo, {}, largura);
            return [
                ...pecasDeTexto(
                    construtor.pincel,
                    [{ texto: origem.nome, estilo: { ...NOME, tamanho: 9.4 } }], largura),
                ...construtor.paragrafo(origem.citacao, secundario, { espacoAntes: 1 }, largura),
                ...rotulo(construtor, "Formação", largura),
                ...separarBonusDeFormacao(origem.formacao as readonly RegrasTrecho[])
                    .flatMap((bonus) => texto(bonus)),
                ...rotulo(construtor, "Especialidade", largura),
                ...texto(origem.especialidade),
                ...rotulo(construtor, "Saber de Campo", largura),
                ...texto(origem.saberCampo),
            ];
        },
    }));
    construtor.adicionar(...fileirasDeCaixas(construtor, caixas, 2));
}

export function blocoDeModulos(construtor: Construtor, bloco: NormalizadoModulos): void {
    const colunas = Math.max(1, Math.min(5, bloco.modulos.length));
    const caixas: Caixa[] = bloco.modulos.map((modulo) => ({
        conteudo: (largura) => [
            ...rotulo(construtor, "Módulo", largura, 0),
            ...pecasDeTexto(
                construtor.pincel,
                [{ texto: modulo.nivel, estilo: { ...NOME, tamanho: 16 } }], largura),
            ...pecasDeTexto(construtor.pincel, [{ texto: `−${modulo.energiaMaxima} E`,
                estilo: { ...NOME, cor: PALETA_PDF.energia } }], largura),
            ...pecasDeTexto(construtor.pincel,
                [{ texto: "Energia Máxima", estilo: { ...MIUDO, tamanho: 7 } }], largura),
        ],
    }));
    construtor.adicionar(
        ...fileirasDeCaixas(construtor, caixas, colunas),
        ...construtor.paragrafo([{ tipo: "texto", texto: "← mais fraco · mais forte →" }],
            { ...MIUDO, tamanho: 7, cor: PALETA_PDF.secundario }, { espacoAntes: 0.8 }));
}

export function blocoDeNiveisDeAmeaca(
    construtor: Construtor, bloco: NormalizadoNiveisAmeaca,
): void {
    const caixas: Caixa[] = bloco.niveis.map((nivel) => ({
        conteudo: (largura) => [
            ...pecasDeTexto(construtor.pincel, trechosEmCorridas(
                [{ tipo: "nivel-ameaca", nivel: nivel.nivel, texto: `NA ${nivel.nivel}` }], MIUDO), largura),
            ...construtor.paragrafo(nivel.descricao, MIUDO, { espacoAntes: 1.2 }, largura),
        ],
    }));
    construtor.adicionar(...fileirasDeCaixas(construtor, caixas, 2));
}
