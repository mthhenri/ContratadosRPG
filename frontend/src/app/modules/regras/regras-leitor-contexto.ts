import { Injectable } from "@angular/core";

let proximoLeitor = 0;

/** IDs locais: página e painel podem apresentar o mesmo livro simultaneamente. */
@Injectable()
export class RegrasLeitorContexto {
    private readonly prefixo = `regras-${++proximoLeitor}-`;

    identificar(ancora: string): string {
        return this.prefixo + ancora;
    }
}
