import type {
    NormalizadoConteudo, NormalizadoFichaCriatura, NormalizadoHabilidade, NormalizadoLista, Trechos,
} from "@contratados-rpg/shared/livro";
import { recuperarIconeIdentidade } from "../blocos/regras-identidade-icone";
import {
    blocoDeAtributos, blocoDeIdentidade, cartaoDeHabilidadeDeCriatura, pecasDasEtapas,
    pecasDeAtaques,
    pecasDeDefesa,
} from "./blocos/ameacas";
import { blocoDeArquetipos, blocoDeClasse, blocoDeSubclasse } from "./blocos/classes";
import {
    blocoDeAmplificadores, blocoDeEquipamentos, blocoDeModificacoes,
} from "./blocos/equipamentos";
import { blocoDeModulos, blocoDeNiveisDeAmeaca, blocoDeOrigens } from "./blocos/fichas";
import { cartaoDeHabilidade } from "./blocos/habilidades";
import { blocoDeFaixas, blocoDeGrade, blocoDeTabela } from "./blocos/tabelas";
import { blocoDeTermos, pecasDoTexto } from "./blocos/textos";
import { pecaDeRotulo, pecaDeTitulo } from "./blocos/titulos";
import type { Construtor, PecaPdf } from "./construtor";
import { CORPO, MIUDO, NOME, ROTULO } from "./estilos";
import { PALETA_PDF } from "./paleta";
import { alturaDaLinha, pecasDeTexto, trechosEmCorridas } from "./texto-rico";

/** Tipo de bloco que o gerador ainda não sabe desenhar: melhor falhar que sumir com conteúdo. */
export class BlocoSemDesenho extends Error {
    constructor(readonly tipo: string) {
        super(`O PDF ainda não desenha o bloco "${tipo}".`);
        this.name = "BlocoSemDesenho";
    }
}

const RECUO_DE_LISTA = 5;
/** A partir de quantas letras um valor já é específico o bastante para valer sozinho. */
const VALOR_ESPECIFICO = 20;
const DISTANCIA_DO_NOME = 40;

function pecasDeLista(construtor: Construtor, lista: NormalizadoLista, recuo: number): PecaPdf[] {
    return lista.itens.flatMap((item, indice) => {
        const marca = lista.ordenada ? `${lista.inicio + indice}.` : "•";
        const pecas = item.flatMap((bloco): PecaPdf[] => {
            switch (bloco.tipo) {
                case "paragrafo":
                case "formula":
                case "nota":
                case "exemplo":
                    return pecasDoTexto(
                        construtor, bloco, construtor.largura(), recuo + RECUO_DE_LISTA);
                case "lista":
                    return pecasDeLista(construtor, bloco, recuo + RECUO_DE_LISTA);
                default:
                    throw new BlocoSemDesenho(`${bloco.tipo} dentro de lista`);
            }
        });
        const [primeira, ...resto] = pecas;
        if (!primeira) return [];
        const marcada: PecaPdf = {
            ...primeira,
            desenhar: (contexto, x, y) => {
                primeira.desenhar(contexto, x, y);
                contexto.pincel.texto(marca, x + recuo, y + alturaDaLinha(CORPO.tamanho) * 0.76,
                    { ...CORPO, negrito: lista.ordenada });
            },
        };
        return [marcada, ...resto];
    });
}

/** Ficha de exemplo do Guia, na ordem em que o leitor a mostra. */
function fichaDeCriatura(construtor: Construtor, ficha: NormalizadoFichaCriatura): void {
    desenharConteudo(construtor, ficha.filhos.filter((filho) => filho.tipo !== "secao"));
    const campo = (rotulo: string) =>
        ficha.identidade.campos.find((item) => item.rotulo === rotulo);
    const nivel = ficha.identidade.campos.find((item) => item.nivel !== undefined)?.nivel ?? 0;
    construtor.adicionar(
        ...pecasDeTexto(construtor.pincel, trechosEmCorridas(
            [{ tipo: "nivel-ameaca", nivel, texto: `NA ${nivel}` }], MIUDO), construtor.largura()),
        pecaDeTitulo(construtor.pincel, ficha.nome, 3, construtor.largura()),
        ...construtor.paragrafo(campo("Conceito")?.valor ?? [],
            { ...MIUDO, italico: true, cor: PALETA_PDF.secundario }));

    const normalizar = (texto: string) => texto.toLocaleLowerCase("pt-BR").replace(/[^\p{L}\p{N}]/gu, "");
    let apoioDaParte = "";
    /**
     * Campo que o texto de apoio da seção já diz não é desenhado de novo. Um valor curto ("Médio")
     * aparece em qualquer frase, por isso só conta com o nome do campo logo antes dele.
     */
    const dito = (rotulo: string, valor: string | Trechos): boolean => {
        const texto = typeof valor === "string"
            ? valor : trechosEmCorridas(valor, MIUDO).map((corrida) => corrida.texto).join("");
        const apoio = normalizar(apoioDaParte);
        const procurado = normalizar(texto);
        if (!procurado) return true;
        const nome = normalizar(rotulo);
        if (procurado.length >= VALOR_ESPECIFICO || procurado.includes(nome)) {
            return apoio.includes(procurado);
        }
        for (let em = apoio.indexOf(procurado); em >= 0; em = apoio.indexOf(procurado, em + 1)) {
            if (apoio.slice(Math.max(0, em - DISTANCIA_DO_NOME), em).includes(nome)) return true;
        }
        return false;
    };
    /** Divisor da ficha (com a âncora da seção) e o texto de apoio que o leitor mantém. */
    const parte = (titulo: string): void => {
        apoioDaParte = "";
        const secao = ficha.filhos.find((filho) => filho.tipo === "secao" && filho.titulo === titulo);
        construtor.adicionar(pecaDeTitulo(construtor.pincel, titulo, 4, construtor.largura(),
            secao?.tipo === "secao" ? secao.ancora : undefined));
        if (secao?.tipo !== "secao") return;
        const apoio = secao.filhos.filter((filho) => {
            if (["identidade", "atributos", "habilidade-criatura"].includes(filho.tipo)) return false;
            if (titulo !== "Ações, Ataques e Habilidades" || filho.tipo !== "paragrafo") return true;
            const texto = trechosEmCorridas(filho.trechos, MIUDO).map((corrida) => corrida.texto).join("");
            return texto.trim() !== "Habilidades Especiais"
                && !ficha.ataques.some((ataque) => texto.includes(`${ataque.nome} |`));
        });
        apoioDaParte = apoio.map((filho) => "trechos" in filho
            ? trechosEmCorridas(filho.trechos, MIUDO).map((corrida) => corrida.texto).join("") : "").join(" ");
        desenharConteudo(construtor, apoio);
    };

    parte("Identidade");
    blocoDeIdentidade(construtor, ficha.identidade);
    parte("Atributos");
    blocoDeAtributos(construtor, ficha.atributos);
    parte("Saúde, Defesa e Resistências");
    construtor.adicionar(...pecasDeDefesa(construtor, ficha, dito));
    parte("Regeneração e Deslocamento");
    for (const [nome, trechos] of [["Regeneração", ficha.regeneracao], ["Porte", ficha.porte],
        ["Deslocamento", ficha.deslocamento]] as const) {
        if (dito(nome, trechos)) continue;
        construtor.adicionar(...construtor.paragrafo(
            [{ tipo: "negrito", filhos: [{ tipo: "texto", texto: `${nome}: ` }] }, ...trechos],
            CORPO, { espacoAntes: 1.2 }));
    }
    parte("Ações, Ataques e Habilidades");
    if (!dito("Cadência", ficha.cadencia)) {
        construtor.adicionar(...construtor.paragrafo(
            [{ tipo: "texto", texto: `Cadência ${ficha.cadencia}` }],
            { ...NOME, tamanho: 8.4 }, { espacoAntes: 1.6 }));
    }
    construtor.adicionar(pecaDeRotulo("Ataques", ROTULO));
    construtor.emColunas(2, pecasDeAtaques(construtor, ficha));
    if (ficha.habilidades.length) {
        construtor.adicionar(pecaDeRotulo("Habilidades especiais", ROTULO));
        construtor.emColunas(2, ficha.habilidades.map(
            (habilidade) => cartaoDeHabilidadeDeCriatura(
                construtor, habilidade, construtor.largura(2))));
    }
}

/** Distribui cada bloco para quem o desenha; o `switch` é exaustivo sobre os tipos do `shared/`. */
export function desenharConteudo(
    construtor: Construtor, blocos: readonly NormalizadoConteudo[],
): void {
    for (let indice = 0; indice < blocos.length; indice++) {
        const bloco = blocos[indice];
        switch (bloco.tipo) {
            case "secao":
                if (bloco.nivel === 1) construtor.novaPagina(bloco.titulo);
                construtor.adicionar(pecaDeTitulo(
                    construtor.pincel, bloco.titulo, bloco.nivel, construtor.largura(),
                    bloco.ancora,
                    bloco.nivel === 2
                        ? construtor.icone(recuperarIconeIdentidade(bloco.titulo)) : undefined));
                desenharConteudo(construtor, bloco.filhos);
                break;
            case "paragrafo":
            case "formula":
            case "nota":
            case "exemplo":
                construtor.adicionar(...pecasDoTexto(construtor, bloco, construtor.largura()));
                break;
            case "lista":
                construtor.adicionar(...pecasDeLista(construtor, bloco, 0));
                break;
            case "habilidade": {
                const vizinhas: NormalizadoHabilidade[] = [bloco];
                while (blocos[indice + 1]?.tipo === "habilidade") {
                    vizinhas.push(blocos[++indice] as NormalizadoHabilidade);
                }
                const colunas = vizinhas.length > 1 ? 2 : 1;
                construtor.emColunas(colunas, vizinhas.map((habilidade) =>
                    cartaoDeHabilidade(construtor, habilidade, construtor.largura(colunas))));
                break;
            }
            case "termos":
                blocoDeTermos(construtor, bloco);
                break;
            case "classe":
                blocoDeClasse(construtor, bloco);
                break;
            case "arquetipos":
                blocoDeArquetipos(construtor, bloco);
                break;
            case "equipamentos":
                blocoDeEquipamentos(construtor, bloco);
                break;
            case "modificacoes":
                blocoDeModificacoes(construtor, bloco);
                break;
            case "capa":
                // É a primeira página, desenhada à parte.
                break;
            case "abertura":
                // Um registro além do que está na capa.
                construtor.adicionar(
                    pecaDeTitulo(construtor.pincel, bloco.titulo, 4, construtor.largura()),
                    ...construtor.paragrafo(bloco.trechos, CORPO, { espacoAntes: 1.6 }));
                break;
            case "tabela":
                blocoDeTabela(construtor, bloco);
                break;
            case "grade":
                blocoDeGrade(construtor, bloco);
                break;
            case "faixas":
                blocoDeFaixas(construtor, bloco);
                break;
            case "subclasse":
                blocoDeSubclasse(construtor, bloco);
                break;
            case "origens":
                blocoDeOrigens(construtor, bloco);
                break;
            case "amplificadores":
                blocoDeAmplificadores(construtor, bloco);
                break;
            case "modulos":
                blocoDeModulos(construtor, bloco);
                break;
            case "niveis-ameaca":
                blocoDeNiveisDeAmeaca(construtor, bloco);
                break;
            case "identidade":
                blocoDeIdentidade(construtor, bloco);
                break;
            case "atributos":
                blocoDeAtributos(construtor, bloco);
                break;
            case "habilidade-criatura":
                construtor.adicionar(
                    cartaoDeHabilidadeDeCriatura(construtor, bloco, construtor.largura()));
                break;
            case "ficha-criatura":
                fichaDeCriatura(construtor, bloco);
                break;
            case "roteiro":
                desenharConteudo(construtor, bloco.introducao ?? []);
                construtor.adicionar(...pecasDasEtapas(construtor, bloco));
                desenharConteudo(construtor, bloco.conclusao ?? bloco.filhos);
                break;
            case "generico":
                if (bloco.trechos.length) {
                    construtor.adicionar(...pecasDoTexto(
                        construtor, { tipo: "paragrafo", trechos: bloco.trechos }, construtor.largura()));
                } else if (!bloco.filhos?.length) {
                    construtor.adicionar(...construtor.paragrafo(
                        [{ tipo: "texto", texto: bloco.origemMarkdown }], CORPO, { espacoAntes: 1.6 }));
                }
                desenharConteudo(construtor, bloco.filhos ?? []);
                break;
            default: {
                const desconhecido: never = bloco;
                throw new BlocoSemDesenho((desconhecido as { tipo: string }).tipo);
            }
        }
    }
}
