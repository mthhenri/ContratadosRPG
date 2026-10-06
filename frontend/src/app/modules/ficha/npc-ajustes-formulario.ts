import { FormControl, FormGroup, Validators } from "@angular/forms";
import type { FichaAtributosDto } from "@contratados-rpg/shared/dtos/ficha";
import { CHAVES_ATRIBUTOS_NPC } from "@contratados-rpg/shared/regras/npc";

/** Controles dos ajustes; regras de Categoria permanecem no shared. */
export function criarMapaAjustesNpc() {
    const controles = Object.fromEntries(CHAVES_ATRIBUTOS_NPC.map((chave) =>
        [chave, new FormControl(0, { nonNullable: true, validators: Validators.pattern(/^-?\d+$/) })])) as Record<keyof FichaAtributosDto, FormControl<number>>;
    return new FormGroup(controles);
}
