import type {
    NormalizadoArquetipos, NormalizadoClasse, NormalizadoHabilidade, NormalizadoSubclasse, Trechos,
} from "@contratados-rpg/shared/livro";
import { recuperarIconeIdentidade } from "../../blocos/regras-identidade-icone";
import { type Construtor, type PecaPdf, pecaComposta } from "../construtor";
import { GEOMETRIA, MIUDO, NOME, ROTULO } from "../estilos";
import { desenharIcone } from "../icones";
import { larguraDaColuna } from "../paginacao";
import { type Cor, PALETA_PDF } from "../paleta";
import { alturaDaLinha, desenharLinha, quebrarLinhas, trechosEmCorridas } from "../texto-rico";
import { type Aperto, SEM_APERTO, cartaoDeHabilidade } from "./habilidades";
import { pecaDeRotulo, pecaDeTitulo } from "./titulos";

function saude(
    construtor: Construtor, classe: Pick<NormalizadoClasse, "saude" | "progressao">,
): PecaPdf {
    const largura = (construtor.largura() - GEOMETRIA.vao) / 2;
    const caixa = (
        rotulo: string, cor: Cor, nome: string, inicial: Trechos, porNivel: Trechos,
    ) => ({
        rotulo,
        cor,
        icone: construtor.icone(nome),
        valor: quebrarLinhas(construtor.pincel,
            trechosEmCorridas(inicial, { ...NOME, tamanho: 13 }, { semCorRecurso: true }),
            largura - 8),
        nivel: quebrarLinhas(construtor.pincel, [
            { texto: "Por nível: ", estilo: { ...MIUDO, cor: PALETA_PDF.secundario } },
            ...trechosEmCorridas(porNivel, MIUDO, { semCorRecurso: true }),
        ], largura - 8),
    });
    const caixas = [
        caixa("VIDA INICIAL", PALETA_PDF.vida, "vida", classe.saude.vida, classe.progressao.vida),
        caixa("ENERGIA INICIAL", PALETA_PDF.energia, "energia",
            classe.saude.energia, classe.progressao.energia),
    ];
    const grande = alturaDaLinha(13, 1.2);
    const pequena = alturaDaLinha(MIUDO.tamanho);
    const altura = 7 + Math.max(
        ...caixas.map((c) => c.valor.length * grande + c.nivel.length * pequena));
    return {
        altura,
        espacoAntes: 2.4,
        desenhar: (contexto, x, y) => caixas.forEach((c, indice) => {
            const inicio = x + indice * (largura + GEOMETRIA.vao);
            contexto.pincel.retangulo(
                inicio, y, largura, altura, { preenchimento: PALETA_PDF.superficie });
            contexto.pincel.retangulo(inicio, y, 1, altura, { preenchimento: c.cor });
            if (c.icone) desenharIcone(contexto.pincel, c.icone, inicio + 4, y + 1.4, 2.8, c.cor);
            contexto.pincel.texto(
                c.rotulo, inicio + (c.icone ? 7.8 : 4), y + 3.6, { ...ROTULO, cor: c.cor });
            let posicao = y + 4.6;
            for (const linha of c.valor) {
                desenharLinha(contexto, linha, inicio + 4, posicao + grande * 0.78);
                posicao += grande;
            }
            for (const linha of c.nivel) {
                desenharLinha(contexto, linha, inicio + 4, posicao + pequena * 0.76);
                posicao += pequena;
            }
        }),
    };
}

/** Título com o ícone da classe, subclasse ou arquétipo, o mesmo do leitor. */
function tituloDeIdentidade(
    construtor: Construtor, nome: string, nivel: 2 | 3, largura: number, ancora?: string,
): PecaPdf {
    return pecaDeTitulo(construtor.pincel, nome, nivel, largura, ancora,
        construtor.icone(recuperarIconeIdentidade(nome)));
}

/** Classe em página própria: citação e recursos no topo, habilidades em duas colunas. */
export function blocoDeClasse(construtor: Construtor, classe: NormalizadoClasse): void {
    construtor.novaPagina();
    construtor.adicionar(
        tituloDeIdentidade(construtor, classe.nome, 2, construtor.largura(), classe.ancora),
        ...construtor.paragrafo(classe.citacao,
            { ...MIUDO, tamanho: 9, italico: true, cor: PALETA_PDF.secundario }),
        saude(construtor, classe),
        pecaDeRotulo("Habilidades de classe", ROTULO, 3.5),
    );
    construtor.emColunas(2, classe.habilidades.map(
        (habilidade) => cartaoDeHabilidade(construtor, habilidade, construtor.largura(2))));
    if (classe.filhos?.length) {
        classe.filhos.forEach((filho) => blocoDeArquetipos(construtor, filho, classe.arquetipos));
        return;
    }
    // Sem bloco de arquétipos, as habilidades iniciais ficam na própria classe.
    for (const arquetipo of classe.arquetipos) {
        construtor.adicionar(
            pecaDeRotulo(`Habilidade inicial · ${arquetipo.nome}`, ROTULO),
            cartaoDeHabilidade(
                construtor, arquetipo.habilidadeInicial, construtor.largura(), true));
    }
}

/** Subclasse de Experimento em página própria: custos, recursos, bônus e habilidades. */
export function blocoDeSubclasse(construtor: Construtor, bloco: NormalizadoSubclasse): void {
    construtor.novaPagina();
    const bonus = trechosEmCorridas(bloco.atributosBonus, MIUDO).map((corrida) => corrida.texto)
        .join("").trim().split(/\s+(?=\+\d)/).filter(Boolean);
    const custos = bloco.custos.flatMap((custo) => construtor.paragrafo(
        [{ tipo: "texto", texto: "• " }, ...custo], MIUDO, { espacoAntes: 0.6 }, construtor.largura() - 7));
    construtor.adicionar(
        tituloDeIdentidade(construtor, bloco.nome, 2, construtor.largura(), bloco.ancora),
        pecaDeRotulo(`Subclasse · ${bloco.classe}`, ROTULO, 0.6),
        ...construtor.paragrafo(bloco.citacao,
            { ...MIUDO, tamanho: 9, italico: true, cor: PALETA_PDF.secundario },
            { espacoAntes: 1 }),
        pecaComposta([pecaDeRotulo("Custo do experimento", { ...ROTULO, cor: PALETA_PDF.destaque }, 0), ...custos],
            (contexto, x, y, altura) => {
                contexto.pincel.retangulo(x, y, construtor.largura(), altura,
                    { preenchimento: PALETA_PDF.superficie });
                contexto.pincel.retangulo(
                    x, y, 0.9, altura, { preenchimento: PALETA_PDF.destaque });
            }, { cima: 1.6, baixo: 2, lado: 4 }, { espacoAntes: 2.4 }),
        saude(construtor, bloco),
        pecaDeRotulo("Atributos bônus", ROTULO),
        ...bonus.flatMap((item) => construtor.paragrafo([{ tipo: "texto", texto: item }], MIUDO)),
        pecaDeRotulo("Habilidade inicial", { ...ROTULO, cor: PALETA_PDF.aviso }),
        cartaoDeHabilidade(construtor, bloco.habilidadeInicial, construtor.largura(), true),
        pecaDeRotulo("Habilidades de subclasse", ROTULO, 3.5),
    );
    construtor.emColunas(2, bloco.habilidades.map(
        (habilidade) => cartaoDeHabilidade(construtor, habilidade, construtor.largura(2))));
}

/**
 * Tentativas, em ordem, para os três arquétipos caberem na página: primeiro só as linhas se
 * aproximam, depois a letra encolhe. 0,88 (7,4 pt) é o piso de leitura confortável.
 */
const APERTOS: readonly Aperto[] = [
    SEM_APERTO,
    { escala: 1, entrelinha: 1.24 },
    { escala: 0.96, entrelinha: 1.22 },
    { escala: 0.93, entrelinha: 1.2 },
    { escala: 0.9, entrelinha: 1.18 },
    { escala: 0.88, entrelinha: 1.18 },
];

const alturaDaColuna = (pecas: readonly PecaPdf[]): number =>
    pecas.reduce((soma, peca) => soma + peca.altura + (peca.espacoAntes ?? 0), 0);

/** Até três arquétipos lado a lado, cada um na própria coluna. */
export function blocoDeArquetipos(
    construtor: Construtor, bloco: NormalizadoArquetipos,
    iniciais: readonly {
        readonly nome: string; readonly habilidadeInicial: NormalizadoHabilidade;
    }[] = [],
): void {
    for (let inicio = 0; inicio < bloco.arquetipos.length; inicio += 3) {
        const grupo = bloco.arquetipos.slice(inicio, inicio + 3);
        const largura = larguraDaColuna(GEOMETRIA, grupo.length);
        const titulo = pecaDeTitulo(
            construtor.pincel, `Arquétipos · ${bloco.classe}`, 3, construtor.largura());
        const montar = (aperto: Aperto): PecaPdf[][] => grupo.map((arquetipo) => {
            const miudo = { ...MIUDO, tamanho: MIUDO.tamanho * aperto.escala };
            const texto = { entrelinha: aperto.entrelinha };
            const cartao = (habilidade: NormalizadoHabilidade, destaque = false) =>
                cartaoDeHabilidade(construtor, habilidade, largura, destaque, aperto);
            const inicial = iniciais.find((item) => item.nome === arquetipo.nome);
            return [
                tituloDeIdentidade(construtor, arquetipo.nome, 3, largura),
                ...construtor.paragrafo(arquetipo.citacao,
                    { ...miudo, italico: true, cor: PALETA_PDF.secundario }, texto, largura),
                pecaDeRotulo("Atributos bônus", ROTULO),
                ...construtor.paragrafo(arquetipo.atributosBonus, miudo, texto, largura),
                ...(inicial ? [
                    pecaDeRotulo("Habilidade inicial", { ...ROTULO, cor: PALETA_PDF.aviso }),
                    cartao(inicial.habilidadeInicial, true),
                ] : []),
                pecaDeRotulo("Habilidades de arquétipo", ROTULO),
                ...arquetipo.habilidades.map((habilidade) => cartao(habilidade)),
                ...(arquetipo.habilidadesGeraisMelhoradas.length ? [
                    pecaDeRotulo("Habilidades gerais melhoradas", ROTULO),
                    ...arquetipo.habilidadesGeraisMelhoradas.map(
                        (habilidade) => cartao(habilidade)),
                ] : []),
            ];
        });
        construtor.novaPagina();
        const disponivel =
            GEOMETRIA.base - GEOMETRIA.topo - titulo.altura - construtor.alturaPendente();
        const cabe = (colunas: readonly (readonly PecaPdf[])[]) =>
            colunas.every((coluna) => alturaDaColuna(coluna) <= disponivel);
        // Se nem no piso couber, a letra fica normal e a coluna continua na página seguinte.
        let colunas = montar(SEM_APERTO);
        for (const aperto of APERTOS.slice(1)) {
            if (cabe(colunas)) break;
            const tentativa = montar(aperto);
            if (cabe(tentativa)) colunas = tentativa;
        }
        construtor.adicionar(titulo);
        construtor.emParalelo(colunas);
    }
}
