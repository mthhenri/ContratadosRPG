import { TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { of } from "rxjs";
import type { RolagemRegistrarDto, RolagemResumoDto } from "@contratados-rpg/shared/dtos/rolagem";
import { RolagemVisibilidadeEnum } from "@contratados-rpg/shared/enums";

import { BandejaDadosService } from "../../../../shared/bandeja-dados/bandeja-dados.service";
import { MontadorRolagem } from "../../../../shared/montador-rolagem/montador-rolagem.component";
import { RolagemRapida } from "../../../ficha/componentes/rolagem-rapida/rolagem-rapida.component";
import { RolagemService } from "../../../ficha/rolagem.service";
import { RolagemMestre } from "./rolagem-mestre.component";

describe("RolagemMestre", () => {
    function montar() {
        const registrarAvulsaDaCampanha = vi.fn((campanhaId: number, dto: RolagemRegistrarDto) => of({
            id: 501, campanhaId, fichaId: null, encontroCombatenteId: null, nomeFicha: null,
            usuarioId: 1, nomeAutor: "Mestre", corFicha: null, createdDate: "2026-10-22T12:00:00Z",
            ...dto,
        } as RolagemResumoDto));
        TestBed.configureTestingModule({
            imports: [RolagemMestre],
            providers: [{ provide: RolagemService, useValue: { registrarAvulsaDaCampanha } }],
        });
        const fixture = TestBed.createComponent(RolagemMestre);
        fixture.componentRef.setInput("campanhaId", 3);
        fixture.detectChanges();
        const mostrar = vi.spyOn(TestBed.inject(BandejaDadosService), "mostrar").mockReturnValue(1);
        const rapida = fixture.debugElement.query(By.directive(RolagemRapida))
            .componentInstance as RolagemRapida;
        const registradas: RolagemResumoDto[] = [];
        fixture.componentInstance.rolagemRegistrada.subscribe((rolagem) => registradas.push(rolagem));
        return { fixture, rapida, registrarAvulsaDaCampanha, registradas, mostrar };
    }

    for (const privada of [false, true]) {
        it(`persiste rolagem ${privada ? "privada" : "pública"} do mestre sem ficha/combatente e confirma ao feed`, () => {
            const alvo = montar();
            if (privada) {
                alvo.fixture.nativeElement.querySelector("button.rolagem-mestre__visibilidade").click();
                alvo.fixture.detectChanges();
            }
            alvo.rapida["formula"].setValue("1d6 + 2");
            alvo.rapida["rolar"]();

            const visibilidade = privada
                ? RolagemVisibilidadeEnum.PRIVADA
                : RolagemVisibilidadeEnum.PUBLICA;
            expect(alvo.registrarAvulsaDaCampanha).toHaveBeenCalledWith(3, {
                rotulo: "Rolagem rápida", formula: "1d6 + 2",
                resultado: expect.objectContaining({ total: expect.any(Number) }), visibilidade,
            });
            expect(alvo.mostrar).toHaveBeenCalledWith(expect.objectContaining({ visibilidade }));
            expect(alvo.registradas).toEqual([
                expect.objectContaining({ id: 501, fichaId: null, encontroCombatenteId: null }),
            ]);
            expect(alvo.fixture.debugElement.query(By.directive(MontadorRolagem))).not.toBeNull();
        });
    }

    it("fórmula inválida não persiste nem confirma uma rolagem", () => {
        const alvo = montar();
        alvo.rapida["formula"].setValue("inválida");
        alvo.rapida["rolar"]();
        expect(alvo.registrarAvulsaDaCampanha).not.toHaveBeenCalled();
        expect(alvo.registradas).toEqual([]);
    });
});
