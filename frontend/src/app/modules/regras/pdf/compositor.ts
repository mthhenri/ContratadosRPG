import type { NormalizadoDocumento } from "@contratados-rpg/shared/livro";
import type { RegrasSumarioItem } from "../regras-sumario";
import { desenharCapa } from "./capa";
import { Construtor } from "./construtor";
import { desenharConteudo } from "./despacho";
import { GEOMETRIA, MIUDO, PAGINA, ROTULO } from "./estilos";
import type { DesenhoDeIcone } from "./icones";
import { type Pagina, paginar } from "./paginacao";
import { PALETA_PDF } from "./paleta";
import type { ContextoDeDesenho, Pincel } from "./pincel";
import { entradasDoSumario, gruposDoSumario } from "./sumario";

/** O logo vem fora do conteúdo do livro; a licença exige o crédito (`public/marcas/LICENCA.md`). */
export const CREDITO_DO_LOGO = "Logo SCP: far2; versão de alta resolução por Aelanna; vetor de "
    + "Vizorsols e BmboB. Adaptado para ContratadosRPG. Licença CC BY-SA 3.0.";

export interface OpcoesDoLivro {
    readonly pincel: Pincel;
    /** Logo em PNG (data URL). */
    readonly logo?: string;
    /** Ícones do site já lidos (`desenhoDeIcone`); sem eles ficam os símbolos. */
    readonly icones?: Readonly<Partial<Record<string, DesenhoDeIcone>>>;
    /** Documento cujas entradas vão no sumário, quando o gerado é só um recorte dele. */
    readonly sumarioDe?: NormalizadoDocumento;
}

export interface LivroComposto {
    readonly paginas: number;
    readonly paginaDaAncora: ReadonlyMap<string, number>;
}

function cabecalhoERodape(
    pincel: Pincel, documento: NormalizadoDocumento, numero: number, capitulo: string,
): void {
    const direita = GEOMETRIA.esquerda + GEOMETRIA.largura;
    const rotulo = { ...ROTULO, negrito: false };
    if (capitulo) {
        const texto = capitulo.toLocaleUpperCase("pt-BR");
        const largura = pincel.medir(texto, rotulo) + (rotulo.espacamento ?? 0) * texto.length;
        pincel.texto(texto, direita - largura, 11, rotulo);
    }
    const base = PAGINA.altura - 9;
    pincel.linha(GEOMETRIA.esquerda, base - 4, direita, base - 4, PALETA_PDF.borda, 0.2);
    pincel.texto(`Contratados RPG · ${documento.titulo} · v${documento.versao}`,
        GEOMETRIA.esquerda, base, rotulo);
    const pagina = { ...ROTULO, tamanho: 7.6, cor: PALETA_PDF.texto };
    pincel.texto(String(numero), direita - pincel.medir(String(numero), pagina), base, pagina);
}

/** Pagina primeiro e desenha depois: o sumário já sai com o número definitivo de cada página. */
export function comporLivro(
    documento: NormalizadoDocumento, opcoes: OpcoesDoLivro,
): LivroComposto {
    const { pincel } = opcoes;
    // A capa já mostra o primeiro registro; o resto, mesmo antes do 1º capítulo, entra no livro.
    const registroDaCapa = documento.filhos.find((bloco) => bloco.tipo === "abertura");
    const construtor = new Construtor(pincel, opcoes.icones);
    desenharConteudo(construtor, documento.filhos.filter((bloco) => bloco !== registroDaCapa));
    construtor.adicionar(...construtor.paragrafo(
        [{ tipo: "texto", texto: CREDITO_DO_LOGO }],
        { ...MIUDO, tamanho: 6.8, cor: PALETA_PDF.secundario }, { espacoAntes: 6 }));

    const paginas = paginar(construtor.concluir(), GEOMETRIA);
    const sumario = paginar(gruposDoSumario(pincel, opcoes.sumarioDe ?? documento), GEOMETRIA);
    const antes = 1 + sumario.length;
    const paginaDaAncora = new Map<string, number>();
    paginas.forEach((pagina, indice) => pagina.postas.forEach((posta) =>
        posta.peca.ancoras?.forEach((ancora) => {
            if (!paginaDaAncora.has(ancora)) paginaDaAncora.set(ancora, antes + indice + 1);
        })));

    const contexto: ContextoDeDesenho = {
        pincel, paginaDaAncora: (ancora) => paginaDaAncora.get(ancora),
    };
    // A folha nasce branca: na base escura o fundo precisa ser pintado em todas.
    const pintarFundo = () => pincel.retangulo(0, 0, PAGINA.largura, PAGINA.altura,
        { preenchimento: PALETA_PDF.fundo });
    pintarFundo();
    desenharCapa(contexto, documento, opcoes.logo);
    let numero = 1;
    const desenhar = (pagina: Pagina<ContextoDeDesenho>, capitulo: string): void => {
        pincel.novaPagina();
        numero += 1;
        pintarFundo();
        pagina.postas.forEach((posta) => posta.peca.desenhar(contexto, posta.x, posta.y));
        cabecalhoERodape(pincel, documento, numero, capitulo);
    };
    sumario.forEach((pagina) => desenhar(pagina, ""));
    paginas.forEach((pagina) => desenhar(pagina, pagina.capitulo));

    pincel.marcador("Capa", 1);
    pincel.marcador("Sumário", 2);
    const marcar = (itens: readonly RegrasSumarioItem[], pai?: unknown): void => {
        for (const item of itens) {
            const pagina = paginaDaAncora.get(item.ancora);
            const no = pagina === undefined ? pai : pincel.marcador(item.titulo, pagina, pai);
            marcar(item.filhos, no);
        }
    };
    marcar(entradasDoSumario(documento));
    return { paginas: numero, paginaDaAncora };
}
