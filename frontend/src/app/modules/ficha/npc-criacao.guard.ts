import { inject } from "@angular/core";
import { CanActivateFn, CanDeactivateFn, Router } from "@angular/router";
import { catchError, map, of } from "rxjs";
import { TipoCampanhaMembroPapelEnum } from "@contratados-rpg/shared/enums";
import { CampanhaService } from "../campanha/campanha.service";
import type { NpcCriar } from "./paginas/criar-npc/criar-npc.page";

/** UX da criação avulsa; a API continua sendo a autoridade sobre o papel do usuário. */
export const mestreAlgumaCampanhaGuard: CanActivateFn = () => {
    const router = inject(Router);
    return inject(CampanhaService).listarCampanhas().pipe(
        map((campanhas) => campanhas.some((campanha) =>
            campanha.papel === TipoCampanhaMembroPapelEnum.MESTRE)
            ? true : router.createUrlTree(["/acesso-negado"])),
        catchError(() => of(router.createUrlTree(["/acesso-negado"]))),
    );
};

/** Guarda o preenchimento transitório ao navegar dentro da aplicação. */
export const npcCriacaoSaidaGuard: CanDeactivateFn<NpcCriar> = (pagina) => pagina.podeSair();
