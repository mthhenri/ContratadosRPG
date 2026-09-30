import { TestBed } from "@angular/core/testing";
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from "@angular/router";
import { firstValueFrom, Observable, of, throwError } from "rxjs";
import { TipoCampanhaMembroPapelEnum } from "@contratados-rpg/shared/enums";
import { CampanhaService } from "../campanha/campanha.service";
import { mestreAlgumaCampanhaGuard } from "./npc-criacao.guard";

describe("mestreAlgumaCampanhaGuard", () => {
    it.each(["mestre", "jogador", "vazio", "falha"])("criação avulsa: %s", async (caso) => {
        const papel = caso === "mestre" ? TipoCampanhaMembroPapelEnum.MESTRE
            : TipoCampanhaMembroPapelEnum.JOGADOR;
        TestBed.configureTestingModule({ providers: [provideRouter([]),
            { provide: CampanhaService, useValue: { listarCampanhas: () => caso === "falha"
                ? throwError(() => new Error("Falha")) : of(caso === "vazio" ? [] : [{ papel }]) } },
        ] });
        const resultado = TestBed.runInInjectionContext(() => mestreAlgumaCampanhaGuard(
            {} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
        const valor = await firstValueFrom(resultado as Observable<boolean | UrlTree>);
        if (caso === "mestre") expect(valor).toBe(true);
        else expect(TestBed.inject(Router).serializeUrl(valor as UrlTree)).toBe("/acesso-negado");
    });
});
