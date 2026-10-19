import { Subject, of, throwError } from "rxjs";
import { revalidarLeituraFicha } from "./ficha-leitura-revalidar";

describe("revalidarLeituraFicha", () => {
    it("cancela a leitura anterior e não publica resposta superada", () => {
        const reconexao = new Subject<void>();
        const antiga = new Subject<string>();
        const nova = new Subject<string>();
        const recuperar = vi.fn().mockReturnValueOnce(antiga).mockReturnValueOnce(nova);
        const recebidos: string[] = [];
        reconexao.pipe(revalidarLeituraFicha(recuperar, vi.fn()))
            .subscribe((nome) => recebidos.push(nome as string));
        reconexao.next();
        reconexao.next();
        nova.next("Atual");
        antiga.next("Superada");
        expect(recebidos).toEqual(["Atual"]);
    });

    it("retenta falha transitória e encerra apenas após negação autoritativa", () => {
        const reconexao = new Subject<void>();
        const negar = vi.fn();
        const recuperar = vi.fn()
            .mockReturnValueOnce(throwError(() => ({ status: 500 })))
            .mockReturnValueOnce(of("Documento"))
            .mockReturnValueOnce(throwError(() => ({ status: 403 })));
        const recebidos: string[] = [];
        reconexao.pipe(revalidarLeituraFicha(recuperar, negar))
            .subscribe((nome) => recebidos.push(nome as string));
        reconexao.next();
        expect(negar).not.toHaveBeenCalled();
        reconexao.next();
        reconexao.next();
        reconexao.next();
        expect(recebidos).toEqual(["Documento"]);
        expect(negar).toHaveBeenCalledTimes(1);
        expect(recuperar).toHaveBeenCalledTimes(3);
    });
});
