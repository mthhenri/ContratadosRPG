/** Passo de um caminho dentro do `dados` de uma peça: nome de campo ou posição numa lista. */
export type PassoDeDados = string | number;

/** Caminho dentro do `dados` (`["danos", 0, "trechos"]`); um campo plano é `["trechos"]`. */
export type CaminhoDeDados = readonly PassoDeDados[];

/** Lê o valor no caminho; `undefined` se algum passo não existir. */
export function lerNoCaminho(dados: unknown, caminho: CaminhoDeDados): unknown {
    let atual = dados;
    for (const passo of caminho) {
        if (atual === null || typeof atual !== "object") return undefined;
        atual = (atual as Record<PassoDeDados, unknown>)[passo];
    }
    return atual;
}

/**
 * Devolve uma cópia de `dados` com `valor` no caminho (sem mexer no original); os ramos que não mudam
 * são compartilhados. Com `valor === undefined` o campo é retirado (campo opcional vazio). Um passo
 * que não existe é criado: lista para passo numérico, objeto para texto.
 */
export function definirNoCaminho<T>(dados: T, caminho: CaminhoDeDados, valor: unknown): T {
    if (caminho.length === 0) return valor as T;
    const [passo, ...resto] = caminho;
    if (typeof passo === "number") {
        const lista = Array.isArray(dados) ? [...(dados as unknown[])] : [];
        lista[passo] = definirNoCaminho(lista[passo], resto, valor);
        return lista as T;
    }
    const objeto = { ...((dados !== null && typeof dados === "object" ? dados : {}) as Record<string, unknown>) };
    if (resto.length === 0 && valor === undefined) delete objeto[passo];
    else objeto[passo] = definirNoCaminho(objeto[passo], resto, valor);
    return objeto as T;
}

/** O caminho como texto estável, para `data-campo`, chaves de Desfazer e pedidos de foco. */
export function nomeDoCaminho(caminho: CaminhoDeDados): string {
    return caminho.join(".");
}
