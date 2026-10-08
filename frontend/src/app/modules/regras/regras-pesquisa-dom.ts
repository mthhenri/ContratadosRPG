import { RegrasOcorrenciaPesquisa, RegrasTextoPesquisa } from "./regras-pesquisa";

export interface RegrasTextoProjetado extends RegrasTextoPesquisa {
    readonly nos: readonly { no: Text; inicio: number; fim: number }[];
}

const IGNORAR = "button, svg, [aria-hidden='true'], .regras__credito";

/** Projeção já feita pelo renderer: nenhuma tabela-fonte auxiliar vira ocorrência duplicada. */
export function projetarTextosPesquisa(raiz: HTMLElement): readonly RegrasTextoProjetado[] {
    const grupos = new Map<Node, { texto: string; nos: RegrasTextoProjetado["nos"][number][] }>();
    const walker = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
        const no = walker.currentNode as Text;
        if (!no.data.trim() && !no.parentElement?.closest("app-regras-inline")) continue;
        let ignorado = false;
        for (let pai = no.parentElement; pai && pai !== raiz; pai = pai.parentElement) {
            if (pai.matches(IGNORAR)) { ignorado = true; break; }
        }
        if (ignorado) continue;
        let grupo: Node = no;
        for (let pai = no.parentElement; pai && pai !== raiz; pai = pai.parentElement) {
            if (pai.matches("app-regras-inline")) grupo = pai;
        }
        const atual = grupos.get(grupo) ?? { texto: "", nos: [] };
        const inicio = atual.texto.length;
        atual.texto += no.data;
        atual.nos.push({ no, inicio, fim: atual.texto.length });
        grupos.set(grupo, atual);
    }
    // Tarjas são elementos vazios. Separam os nós adjacentes, impedindo casar através delas.
    return [...grupos.entries()].map(([grupo, valor]) => {
        const elemento = grupo instanceof Element ? grupo : grupo.parentElement!;
        const caminho: string[] = [];
        let ancora: string | null = null;
        for (let secao = elemento.closest("app-regras-secao"); secao;
            secao = secao.parentElement?.closest("app-regras-secao") ?? null) {
            const titulo = secao.querySelector<HTMLElement>("[data-ancora-regras]");
            if (titulo) {
                ancora ??= titulo.dataset["ancoraRegras"] ?? null;
                caminho.unshift(titulo.textContent?.trim() ?? "");
            }
        }
        if (grupo instanceof Element && grupo.querySelector(".regras-inline__tarja")) {
            const nos: RegrasTextoProjetado["nos"][number][] = [];
            let texto = "", anterior: Text | null = null;
            for (const item of valor.nos) {
                if (anterior) {
                    const intervalo = document.createRange();
                    intervalo.setStartAfter(anterior); intervalo.setEndBefore(item.no);
                    if (intervalo.cloneContents().querySelector(".regras-inline__tarja")) {
                        texto += "\uFFFC";
                    }
                }
                const inicio = texto.length; texto += item.no.data;
                nos.push({ no: item.no, inicio, fim: texto.length }); anterior = item.no;
            }
            return { texto, nos, caminho, ancora };
        }
        return { ...valor, caminho, ancora };
    });
}

export interface RegrasMarcasPesquisa {
    readonly marcas: readonly (readonly HTMLElement[])[];
    limpar(): void;
}

/** Conserva os Text originais do Angular; só insere irmãos temporários, nunca innerHTML. */
export function destacarPesquisa(
    textos: readonly RegrasTextoProjetado[], ocorrencias: readonly RegrasOcorrenciaPesquisa[],
): RegrasMarcasPesquisa {
    const marcas: HTMLElement[][] = ocorrencias.map(() => []);
    const originais: { no: Text; texto: string; inseridos: Node[] }[] = [];
    const porTexto = new Map<number, { ocorrencia: RegrasOcorrenciaPesquisa; numero: number }[]>();
    ocorrencias.forEach((ocorrencia, numero) => {
        const locais = porTexto.get(ocorrencia.textoIndice) ?? [];
        locais.push({ ocorrencia, numero }); porTexto.set(ocorrencia.textoIndice, locais);
    });
    textos.forEach((texto, indice) => {
        const locais = porTexto.get(indice) ?? [];
        for (const item of texto.nos) {
            const intervalos = locais.filter(({ ocorrencia }) =>
                ocorrencia.inicio < item.fim && ocorrencia.fim > item.inicio);
            if (!intervalos.length) continue;
            const original = item.no.data, inseridos: Node[] = [];
            let posicao = 0;
            const inserir = (no: Node): void => {
                item.no.before(no); inseridos.push(no);
            };
            for (const { ocorrencia, numero } of intervalos) {
                const inicio = Math.max(0, ocorrencia.inicio - item.inicio);
                const fim = Math.min(original.length, ocorrencia.fim - item.inicio);
                if (inicio > posicao) {
                    inserir(document.createTextNode(original.slice(posicao, inicio)));
                }
                const marca = document.createElement("mark");
                marca.className = "regras-pesquisa__marca";
                marca.textContent = original.slice(inicio, fim);
                inserir(marca); marcas[numero].push(marca); posicao = fim;
            }
            if (posicao < original.length) {
                inserir(document.createTextNode(original.slice(posicao)));
            }
            originais.push({ no: item.no, texto: original, inseridos }); item.no.data = "";
        }
    });
    return { marcas, limpar: () => {
        for (const original of originais) {
            original.no.data = original.texto;
            original.inseridos.forEach(no => no.parentNode?.removeChild(no));
        }
    } };
}

/** Abas existem na projeção; ativá-las antes de medir torna qualquer ocorrência alcançável. */
export function revelarOcorrencia(marca: HTMLElement): void {
    const painel = marca.closest<HTMLElement>("[appAbaPainel][hidden]");
    const abaId = painel?.getAttribute("aria-labelledby");
    if (abaId) document.getElementById(abaId)?.click();
}
