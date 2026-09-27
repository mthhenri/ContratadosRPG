import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Subject } from 'rxjs';

import type { CampanhaPainelEspectadorDto } from '@contratados-rpg/shared/dtos/campanha';
import type {
  DocumentoBibliotecaAlteradaDto,
  DocumentoResumoDto,
} from '@contratados-rpg/shared/dtos/documento';
import { TipoDocumentoEnum } from '@contratados-rpg/shared/enums';

import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { BibliotecaEspectador } from './biblioteca-espectador.page';

/**
 * Prova a biblioteca do espectador (m9-05): o nome da campanha vem do painel resolvido pelo
 * `espectadorCampanhaResolver`, e a página **só** fala com a API de documento — nenhuma chamada a
 * `GET /campanha/:id`, membros ou fichas, que o backend recusa ao `ESPECTADOR` (403). A prova é na
 * rede (`HttpTestingController`), com os serviços reais. O voltar leva ao painel do espectador.
 */
describe('BibliotecaEspectador', () => {
  const CAMPANHA_ID = 9;
  const documento: DocumentoResumoDto = {
    id: 1,
    campanhaId: CAMPANHA_ID,
    titulo: 'Carta do informante',
    tipo: TipoDocumentoEnum.TEXTO,
    imagemUrl: null,
    revelado: true,
    ordem: 1,
    updatedDate: '2026-09-26 10:00:00.000001+00',
  };

  function montar() {
    const tempoReal = {
      conectar: vi.fn(),
      entrarSalaCampanha: vi.fn(),
      sairSalaCampanha: vi.fn(),
      reconexao: signal(0),
      documentoAlterado$: new Subject<DocumentoBibliotecaAlteradaDto>(),
    };
    const painel = {
      campanha: { id: CAMPANHA_ID, nome: 'Operação Maré', descricao: null },
    } as unknown as CampanhaPainelEspectadorDto;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TempoRealService, useValue: tempoReal },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: String(CAMPANHA_ID) }),
              data: { painelEspectador: painel },
            },
          },
        },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(BibliotecaEspectador);
    fixture.detectChanges();
    return { fixture, raiz: fixture.nativeElement as HTMLElement, http, tempoReal };
  }

  it('só chama a API de documento, e usa o nome do painel resolvido', () => {
    const { fixture, raiz, http, tempoReal } = montar();

    const pedidos = http.match(() => true);
    expect(pedidos.map((pedido) => `${pedido.request.method} ${pedido.request.url}`)).toEqual([
      `GET /campanha/${CAMPANHA_ID}/documento`,
    ]);
    pedidos[0].flush({ sucesso: true, mensagem: '', dados: [documento] });
    fixture.detectChanges();

    expect(raiz.querySelector('.biblioteca__campanha')?.textContent?.trim()).toBe('Operação Maré');
    expect(raiz.querySelector('.documento-cartao__nome')?.textContent?.trim()).toBe(
      'Carta do informante',
    );
    expect(tempoReal.entrarSalaCampanha).toHaveBeenCalledWith(CAMPANHA_ID);
    http.verify();
  });

  it('o voltar leva ao painel do espectador, e não há controles do mestre', () => {
    const { fixture, raiz, http } = montar();
    http.expectOne(`/campanha/${CAMPANHA_ID}/documento`).flush({
      sucesso: true,
      mensagem: '',
      dados: [documento],
    });
    fixture.detectChanges();

    const voltar = raiz.querySelector('a[aria-label="Voltar ao Painel do espectador"]');
    expect(voltar?.getAttribute('href')).toBe(`/campanhas/${CAMPANHA_ID}/espectador`);
    expect(raiz.querySelector('.documento-cartao app-chip')).toBeNull();
    expect(raiz.textContent).not.toContain('Novo documento');
  });
});
