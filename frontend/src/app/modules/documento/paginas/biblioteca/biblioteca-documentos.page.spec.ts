import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';

import { SessaoService } from '../../../../core/services/sessao.service';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto.component';
import { CampanhaService } from '../../../campanha/campanha.service';
import { BibliotecaDocumentos } from './biblioteca-documentos.page';

/** Dublê da página do mestre — a casca só decide **se** ela aparece. */
@Component({ selector: 'app-biblioteca-mestre', template: '' })
class BibliotecaMestreDuble {}

/** Prova a casca da biblioteca (m9-04): silhueta, página do mestre e o retorno dos demais. */
describe('BibliotecaDocumentos', () => {
  const CAMPANHA_ID = 9;
  const MESTRE = 1;
  const JOGADOR = 7;
  const membros: CampanhaMembroResumoDto[] = [
    { usuarioId: MESTRE, nome: 'Mestre', papel: TipoCampanhaMembroPapelEnum.MESTRE, fichas: [] as never },
    { usuarioId: JOGADOR, nome: 'Bia', papel: TipoCampanhaMembroPapelEnum.JOGADOR, fichas: [] as never },
  ];

  function montar(usuarioId: number, listarMembros = vi.fn(() => of(membros))) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: CampanhaService, useValue: { listarMembros } },
        { provide: SessaoService, useValue: { usuario: () => ({ id: usuarioId }) } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ campanhaId: String(CAMPANHA_ID) }) },
          },
        },
      ],
    });
    TestBed.overrideComponent(BibliotecaDocumentos, {
      set: { imports: [Esqueleto, BibliotecaMestreDuble] },
    });
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(BibliotecaDocumentos);
    fixture.detectChanges();
    return { fixture, raiz: fixture.nativeElement as HTMLElement, navegar };
  }

  it('mostra a silhueta enquanto o papel não é conhecido', () => {
    const pendente = new Subject<CampanhaMembroResumoDto[]>();
    const { raiz } = montar(MESTRE, vi.fn(() => pendente));
    expect(raiz.querySelector('[aria-label="Carregando a biblioteca"]')).not.toBeNull();
    expect(raiz.querySelector('app-biblioteca-mestre')).toBeNull();
  });

  it('o mestre vê a página do mestre', () => {
    const { raiz, navegar } = montar(MESTRE);
    expect(raiz.querySelector('app-biblioteca-mestre')).not.toBeNull();
    expect(navegar).not.toHaveBeenCalled();
  });

  it('quem não é mestre volta à campanha (a visão da mesa chega na m9-05)', () => {
    const { raiz, navegar } = montar(JOGADOR);
    expect(raiz.querySelector('app-biblioteca-mestre')).toBeNull();
    expect(navegar).toHaveBeenCalledWith(['/campanhas', CAMPANHA_ID], { replaceUrl: true });
  });

  it('quem não pode listar os membros (espectador, 403) também volta à campanha', () => {
    const { navegar } = montar(JOGADOR, vi.fn(() => throwError(() => new Error('403'))));
    expect(navegar).toHaveBeenCalledWith(['/campanhas', CAMPANHA_ID], { replaceUrl: true });
  });

  it('sem a página do mestre montada, a saída é livre', () => {
    const { fixture } = montar(JOGADOR);
    expect(fixture.componentInstance.podeSair()).toBe(true);
  });
});
