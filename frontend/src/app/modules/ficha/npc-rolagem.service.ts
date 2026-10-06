import { Injectable, inject } from "@angular/core";
import type { FichaAtributosDto } from "@contratados-rpg/shared/dtos/ficha";
import { RolagemVisibilidadeEnum } from "@contratados-rpg/shared/enums";
import { comporFormulaTesteAtributoNpc, rolarTesteAtributoNpc } from "@contratados-rpg/shared/regras/npc";
import { BandejaDadosService } from "../../shared/bandeja-dados/bandeja-dados.service";
import { FichaEdicaoNpcService } from "./ficha-edicao-npc.service";
import { FichaRolagemRegistroService } from "./ficha-rolagem-registro.service";

/** Orquestra bandeja e registro existentes; o teste e o crítico são resolvidos no shared. */
@Injectable()
export class NpcRolagemService {
    private readonly bandeja = inject(BandejaDadosService);
    private readonly edicao = inject(FichaEdicaoNpcService);
    private readonly registro = inject(FichaRolagemRegistroService);
    private podeRolar: () => boolean = () => false;
    inicializar(podeRolar: () => boolean): void { this.podeRolar = podeRolar; }
    rolar(atributo: keyof FichaAtributosDto, nome: string): void {
        const ficha = this.edicao.ficha();
        if (!ficha || !this.podeRolar() || this.edicao.edicaoPendente() || this.edicao.salvando()) return;
        const teste = { dados: ficha.dados, atributo };
        const resultado = rolarTesteAtributoNpc(teste);
        if (!resultado) return;
        const entrada = { rotulo: `Teste de ${nome}`, formula: comporFormulaTesteAtributoNpc(teste), resultado };
        this.bandeja.mostrar({ ...entrada, corFicha: ficha.cor, visibilidade: RolagemVisibilidadeEnum.PRIVADA });
        this.registro.registrar(entrada);
    }
}
