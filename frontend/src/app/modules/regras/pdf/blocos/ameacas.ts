import type {
    NormalizadoAtributos, NormalizadoFichaCriatura, NormalizadoHabilidadeCriatura,
    NormalizadoIdentidade, NormalizadoRoteiro, Trechos,
} from "@contratados-rpg/shared/livro";
import { type Construtor, type PecaPdf, pecaComposta } from "../construtor";
import { CORPO, MIUDO, NOME, ROTULO } from "../estilos";
import { type Cor, PALETA_PDF } from "../paleta";
import type { EstiloTexto } from "../pincel";
import { largurasAutomaticas, pecasDeTabela } from "../tabela";
import { type Corrida, alturaDaLinha, pecasDeTexto, trechosEmCorridas } from "../texto-rico";
import { type Caixa, fileirasDeCaixas } from "./caixas";

const CELULA: EstiloTexto = { ...MIUDO, tamanho: 8 };

const textoDe = (
    construtor: Construtor, valor: string, estilo: EstiloTexto, largura: number, antes = 0,
) =>
    construtor.paragrafo([{ tipo: "texto", texto: valor }], estilo,
        { espacoAntes: antes, justificar: false }, largura);

/** Etapas numeradas do roteiro de criação. */
export function pecasDasEtapas(construtor: Construtor, bloco: NormalizadoRoteiro): PecaPdf[] {
    const recuo = 7;
    return bloco.etapas.map((etapa, indice) => {
        const largura = construtor.largura() - recuo;
        const linhas = [
            ...construtor.paragrafo(etapa.titulo, NOME, {}, largura),
            ...construtor.paragrafo(etapa.descricao, CELULA, { espacoAntes: 0.4 }, largura),
        ];
        const peca = pecaComposta(linhas, (contexto, x, y, altura) => {
            contexto.pincel.texto(`${etapa.ordem}.`, x, y + 1 + alturaDaLinha(NOME.tamanho) * 0.76,
                { ...NOME, cor: PALETA_PDF.destaque });
            contexto.pincel.linha(x + recuo, y + altura, x + construtor.largura(), y + altura,
                PALETA_PDF.borda, 0.2);
        }, { cima: 1, baixo: 1.4, lado: recuo }, { espacoAntes: indice ? 1 : 2.4 });
        return peca;
    });
}

export function blocoDeIdentidade(construtor: Construtor, bloco: NormalizadoIdentidade): void {
    const linhas = bloco.campos.map((campo) => {
        const valor: Corrida[] = campo.nivel === undefined
            ? trechosEmCorridas(campo.valor, CELULA)
            : trechosEmCorridas([{ tipo: "nivel-ameaca", nivel: campo.nivel,
                texto: trechosEmCorridas(campo.valor, CELULA).map((corrida) => corrida.texto).join("") }], CELULA);
        return [[{ texto: campo.rotulo, estilo: { ...NOME, tamanho: 7.8 } }], valor];
    });
    const larguras = largurasAutomaticas(construtor.pincel, linhas, construtor.largura());
    construtor.adicionar(...pecasDeTabela(construtor.pincel,
        larguras.map((largura) => ({ largura })), [], linhas, construtor.largura(), 2));
}

export function blocoDeAtributos(construtor: Construtor, bloco: NormalizadoAtributos): void {
    const caixas: Caixa[] = bloco.atributos.map((atributo) => ({
        conteudo: (largura) => [
            ...textoDe(construtor, atributo.nome.toLocaleUpperCase("pt-BR"), ROTULO, largura),
            ...textoDe(construtor, String(atributo.valor), { ...NOME, tamanho: 15 }, largura),
            ...textoDe(construtor, `${atributo.modificador} ${atributo.bonus}`,
                { ...CELULA, tamanho: 7.4, cor: PALETA_PDF.secundario }, largura),
        ],
    }));
    construtor.adicionar(
        ...fileirasDeCaixas(construtor, caixas, Math.max(1, Math.min(5, caixas.length))));
}

export function cartaoDeHabilidadeDeCriatura(
    construtor: Construtor, bloco: NormalizadoHabilidadeCriatura, largura: number,
): PecaPdf {
    const linhas = [
        ...pecasDeTexto(construtor.pincel, [
            { texto: bloco.nome, estilo: NOME },
            { texto: `  ${bloco.categoria}`, estilo: { ...ROTULO,
                cor: bloco.categoria === "PASSIVA" ? PALETA_PDF.secundario : PALETA_PDF.destaque } },
        ], largura),
        ...construtor.paragrafo(bloco.trechos, MIUDO, { espacoAntes: 0.4 }, largura),
    ];
    return pecaComposta(linhas, (contexto, x, y) => {
        contexto.pincel.linha(x, y, x + largura, y, PALETA_PDF.borda, 0.2);
    }, { cima: 1.1, baixo: 0.8 }, { espacoAntes: 1.4 });
}

/** Vida, defesa, resistências e deslocamento da ficha de exemplo. */
export function pecasDeDefesa(
    construtor: Construtor, ficha: NormalizadoFichaCriatura,
    dito: (rotulo: string, valor: string | Trechos) => boolean,
): PecaPdf[] {
    const numero = (nome: string, valor: string, cor: Cor, icone: string): Caixa => ({
        barra: cor,
        icone: construtor.icone(icone),
        conteudo: (largura) => [
            ...textoDe(construtor, nome, ROTULO, largura),
            ...textoDe(construtor, valor, { ...NOME, tamanho: 12 }, largura, 0.8),
        ],
    });
    const linha = (nome: string, trechos: Trechos) => construtor.paragrafo(
        [{ tipo: "negrito", filhos: [{ tipo: "texto", texto: `${nome}: ` }] }, ...trechos],
        CORPO, { espacoAntes: 1.2 });
    return [
        ...(dito("Vida", ficha.vidaMaxima) && dito("Defesa", ficha.defesaBase)
            ? [] : fileirasDeCaixas(construtor, [
            numero("VIDA MÁXIMA", ficha.vidaMaxima, PALETA_PDF.vida, "vida"),
            numero("DEFESA BASE", ficha.defesaBase, PALETA_PDF.secundario, "defesa"),
        ], 2)),
        ...(dito("Resistências", ficha.resistencias) ? [] : linha("Resistências", ficha.resistencias)),
        ...(dito("Fraquezas", ficha.fraquezas) ? [] : linha("Fraquezas", ficha.fraquezas)),
    ];
}

export function pecasDeAtaques(construtor: Construtor, ficha: NormalizadoFichaCriatura): PecaPdf[] {
    return ficha.ataques.map((ataque) => {
        const largura = construtor.largura(2);
        const linhas = [
            ...textoDe(construtor, ataque.nome, NOME, largura),
            ...textoDe(construtor, `${ataque.acao} · Teste ${ataque.teste} · Dano ${ataque.dano}`,
                { ...CELULA, familia: "mono", cor: PALETA_PDF.destaque }, largura, 0.4),
            ...construtor.paragrafo(ataque.efeito, MIUDO, { espacoAntes: 0.4 }, largura),
        ];
        return pecaComposta(linhas, (contexto, x, y) => {
            contexto.pincel.linha(x, y, x + largura, y, PALETA_PDF.borda, 0.2);
        }, { cima: 1.1, baixo: 0.8 }, { espacoAntes: 1.4 });
    });
}
