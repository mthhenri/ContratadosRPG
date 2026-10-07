import { Injectable, inject } from "@angular/core";
import type { FichaAtributosDto } from "@contratados-rpg/shared/dtos/ficha";
import { RolagemVisibilidadeEnum } from "@contratados-rpg/shared/enums";
import { comporFormulaTesteAtributoNpc, rolarTesteAtributoNpc } from "@contratados-rpg/shared/regras/npc";
import { calcularStatItem } from "@contratados-rpg/shared/regras/compras";
import { rolarFormula } from "@contratados-rpg/shared/regras/rolagem";
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

    /** Dano do item salvo, separado do teste de ataque; reusa o motor do inventário do agente. */
    rolarDano(indice: number): void {
        const ficha = this.edicao.ficha();
        if (!ficha || !this.podeRolar() || this.edicao.edicaoPendente() || this.edicao.salvando()) return;
        const item = ficha.dados.inventario?.[indice];
        if (!item) return;
        const formula = calcularStatItem({ item })?.dano;
        if (!formula) return;
        const resultado = rolarFormula({ formula, atributos: ficha.dados.atributos,
            nivel: ficha.dados.nivel, proficiencia: ficha.dados.nivel });
        if (!resultado) return;
        const entrada = { rotulo: item.apelido ?? item.nome, formula, resultado };
        this.bandeja.mostrar({ ...entrada, corFicha: ficha.cor,
            visibilidade: RolagemVisibilidadeEnum.PRIVADA });
        this.registro.registrar(entrada);
    }

    /** Teste de atributo/Competência do NPC, inclusive Luta e Pontaria usadas no ataque. */
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
