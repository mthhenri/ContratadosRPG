import { Component, inject, input, output, signal } from "@angular/core";
import type { FichaAtributosDto } from "@contratados-rpg/shared/dtos/ficha";
import type { RolagemResumoDto } from "@contratados-rpg/shared/dtos/rolagem";
import { RolagemVisibilidadeEnum } from "@contratados-rpg/shared/enums";

import { Icone } from "../../../../shared/icone/icone.component";
import { Tooltip } from "../../../../shared/tooltip/tooltip.directive";
import { Botao } from "../../../../shared/ui/botao/botao.component";
import { RolagemRapida } from "../../../ficha/componentes/rolagem-rapida/rolagem-rapida.component";
import type { RolagemRealizadaDto } from "../../../ficha/rolagem-realizada";
import { RolagemService } from "../../../ficha/rolagem.service";

/** Rolagem avulsa da campanha: a autoria Mestre é atribuída pelo servidor, sem ficha/combatente. */
@Component({
    selector: "app-rolagem-mestre",
    imports: [RolagemRapida, Botao, Icone, Tooltip],
    templateUrl: "./rolagem-mestre.component.html",
    styleUrl: "./rolagem-mestre.component.scss",
})
export class RolagemMestre {
    readonly campanhaId = input.required<number>();
    readonly rolagemRegistrada = output<RolagemResumoDto>();

    private readonly rolagemService = inject(RolagemService);
    protected readonly oculta = signal(false);
    /** Mesmo ambiente neutro da campanha: não há ficha para fornecer atributos ao montador. */
    protected readonly atributos: FichaAtributosDto = {
        destreza: 0, forca: 0, luta: 0, pontaria: 0, vigor: 0,
        intelecto: 0, medicina: 0, sentidos: 0, social: 0, vontade: 0,
    };

    protected alternarVisibilidade(): void {
        this.oculta.update((oculta) => !oculta);
    }

    protected registrarRolagem(evento: RolagemRealizadaDto): void {
        this.rolagemService.registrarAvulsaDaCampanha(this.campanhaId(), {
            rotulo: evento.rotulo,
            formula: evento.formula ?? null,
            resultado: evento.resultado,
            visibilidade: this.oculta()
                ? RolagemVisibilidadeEnum.PRIVADA
                : RolagemVisibilidadeEnum.PUBLICA,
        }).subscribe({ next: (rolagem) => this.rolagemRegistrada.emit(rolagem) });
    }
}
