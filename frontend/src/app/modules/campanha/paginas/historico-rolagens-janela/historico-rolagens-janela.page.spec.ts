import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RolagemVisibilidadeEnum } from '@contratados-rpg/shared/enums';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';

import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { RolagemService } from '../../../ficha/rolagem.service';
import { HistoricoRolagensCampanhaJanela } from './historico-rolagens-janela.page';

/** O "Voltar" da janela depende de quem a abriu: o espectador não acessa `/campanhas/:id`. */
describe('HistoricoRolagensCampanhaJanela', () => {
  afterEach(() => TestBed.resetTestingModule());

  function rolagem(id: number, rotulo: string, visibilidade: RolagemVisibilidadeEnum): RolagemResumoDto {
    return {
      id,
      fichaId: 1,
      encontroCombatenteId: null,
      campanhaId: 8,
      usuarioId: 5,
      nomeAutor: 'Autor',
      nomeFicha: 'Ficha',
      rotulo,
      formula: '1d20',
      visibilidade,
      resultado: { dados: [], atributos: [], constante: 0, total: 10 },
      createdDate: new Date().toISOString(),
      corFicha: null,
    };
  }

  const rolagemRegistrada$ = new Subject<RolagemResumoDto>();
  let rolagensRest: RolagemResumoDto[] = [];

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
        { provide: RolagemService, useValue: { listarPorCampanha: vi.fn(() => of(rolagensRest)) } },
        {
          provide: TempoRealService,
          useValue: {
            conectar: vi.fn(),
            entrarSalaCampanha: vi.fn(),
            sairSalaCampanha: vi.fn(),
            rolagemRegistrada$: rolagemRegistrada$.asObservable(),
            rolagemExcluida$: new Subject().asObservable(),
            reconexao: signal(0),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(HistoricoRolagensCampanhaJanela);
    fixture.detectChanges();
    return fixture;
  }

  function voltarDe(origem: string | null): HTMLAnchorElement {
    return montar(origem).nativeElement.querySelector('a[app-botao]') as HTMLAnchorElement;
  }

  it('volta à campanha para mestre e jogador', () => {
    const voltar = voltarDe(null);
    expect(voltar.textContent?.trim()).toBe('Voltar à campanha');
    expect(voltar.getAttribute('href')).toBe('/campanhas/8');
  });

  it('volta ao painel do espectador quando foi aberta por ele', () => {
    const voltar = voltarDe('espectador');
    expect(voltar.textContent?.trim()).toBe('Voltar à campanha');
    expect(voltar.getAttribute('href')).toBe('/campanhas/8/espectador');
  });

  it('aberta pelo espectador (ou pela prévia do mestre), só lista rolagens públicas', () => {
    rolagensRest = [
      rolagem(1, 'Pública REST', RolagemVisibilidadeEnum.PUBLICA),
      rolagem(2, 'Privada REST', RolagemVisibilidadeEnum.PRIVADA),
    ];
    const fixture = montar('espectador');
    rolagemRegistrada$.next(rolagem(3, 'Privada socket', RolagemVisibilidadeEnum.PRIVADA));
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Pública REST');
    expect(texto).not.toContain('Privada REST');
    expect(texto).not.toContain('Privada socket');
    rolagensRest = [];
  });

  it('aberta por mestre ou jogador, mantém o feed que a API devolveu', () => {
    rolagensRest = [rolagem(2, 'Privada REST', RolagemVisibilidadeEnum.PRIVADA)];
    const fixture = montar(null);

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Privada REST');
    rolagensRest = [];
  });
});
