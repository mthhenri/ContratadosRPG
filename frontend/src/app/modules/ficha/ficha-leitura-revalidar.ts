import { EMPTY, type Observable, type OperatorFunction, catchError, filter, switchMap } from "rxjs";

/** Só a resposta autoritativa de leitura negada/inexistente retira o documento local. */
export function acessoFichaFoiNegado(erro: unknown): boolean {
    return typeof erro === "object" && erro !== null && "status" in erro
        && (erro.status === 403 || erro.status === 404);
}

/**
 * Revalida a leitura a cada sinal, cancelando respostas superadas. Uma falha transitória
 * não encerra a assinatura; negação é terminal para este leitor e chama sua limpeza local.
 */
export function revalidarLeituraFicha<T>(
    recuperar: () => Observable<T>,
    aoNegar: () => void,
): OperatorFunction<void, T> {
    return (origem) => {
        let negado = false;
        return origem.pipe(
            filter(() => !negado),
            switchMap(() => recuperar().pipe(
                catchError((erro: unknown) => {
                    if (acessoFichaFoiNegado(erro)) {
                        negado = true;
                        aoNegar();
                    }
                    return EMPTY;
                }),
            )),
        );
    };
}
