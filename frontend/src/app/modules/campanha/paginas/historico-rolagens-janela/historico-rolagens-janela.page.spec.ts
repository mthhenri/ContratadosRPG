import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { RolagemService } from '../../../ficha/rolagem.service';
import { HistoricoRolagensCampanhaJanela } from './historico-rolagens-janela.page';

/** O "Voltar" da janela depende de quem a abriu: o espectador não acessa `/campanhas/:id`. */
describe('HistoricoRolagensCampanhaJanela', () => {
  afterEach(() => TestBed.resetTestingModule());

  function montar(origem: string | null) {
    TestBed.configureTestingModule({
      imports: [HistoricoRolagensCampanhaJanela],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: () => '8' },
              queryParamMap: { get: (chave: string) => (chave === 'origem' ? origem : null) },
            },
          },
        },
        { provide: RolagemService, useValue: { listarPorCampanha: vi.fn(() => of([])) } },
        {
          provide: TempoRealService,
          useValue: {
            conectar: vi.fn(),
            entrarSalaCampanha: vi.fn(),
            sairSalaCampanha: vi.fn(),
            rolagemRegistrada$: new Subject().asObservable(),
            rolagemExcluida$: new Subject().asObservable(),
            reconexao: signal(0),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(HistoricoRolagensCampanhaJanela);
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('a[app-botao]') as HTMLAnchorElement;
  }

  it('volta à campanha para mestre e jogador', () => {
    const voltar = montar(null);
    expect(voltar.textContent?.trim()).toBe('Voltar à campanha');
    expect(voltar.getAttribute('href')).toBe('/campanhas/8');
  });

  it('volta ao painel do espectador quando foi aberta por ele', () => {
    const voltar = montar('espectador');
    expect(voltar.textContent?.trim()).toBe('Voltar à campanha');
    expect(voltar.getAttribute('href')).toBe('/campanhas/8/espectador');
  });
});
