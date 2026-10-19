import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';
import { RolagemVisibilidadeEnum } from '@contratados-rpg/shared/enums';
import { TempoRealService } from '../../core/services/tempo-real.service';
import { RolagemService } from './rolagem.service';

const rolagem: RolagemResumoDto = {
  id: 9, campanhaId: 8, fichaId: 3, encontroCombatenteId: null, usuarioId: 1,
  nomeAutor: 'Conta', nomeFicha: 'Agente', corFicha: null, rotulo: 'Teste', formula: '4',
  visibilidade: RolagemVisibilidadeEnum.PRIVADA,
  resultado: { dados: [], atributos: [], constante: 4, total: 4 }, createdDate: '2026-10-19T12:00:00Z',
};

describe('RolagemService', () => {
  for (const campanhaInvalidada of [8, 99]) {
    it(`preserva POST em voo e reconcilia somente a campanha invalidada ${campanhaInvalidada}`, () => {
      const resposta = new Subject<{ dados: RolagemResumoDto }>();
      const recortes = new Subject<{ campanhaId: number }>();
      const reservada = { ...rolagem, fichaId: null, nomeFicha: null, identidadeReservada: true };
      const http = { post: vi.fn(() => resposta), get: vi.fn(() => of({ dados: [reservada] })) };
      TestBed.configureTestingModule({ providers: [
        { provide: HttpClient, useValue: http },
        { provide: TempoRealService, useValue: { rolagemRecortesAlterados$: recortes } },
      ] });
      const recebidos = vi.fn();
      const completa = vi.fn();
      TestBed.inject(RolagemService).registrar(3, rolagem).subscribe({ next: recebidos, complete: completa });
      recortes.next({ campanhaId: campanhaInvalidada });
      expect(completa).not.toHaveBeenCalled();
      expect(resposta.observed).toBe(true);
      resposta.next({ dados: rolagem });
      resposta.complete();
      expect(recebidos).toHaveBeenCalledWith(campanhaInvalidada === 8 ? reservada : rolagem);
      expect(http.get).toHaveBeenCalledTimes(campanhaInvalidada === 8 ? 1 : 0);
      expect(completa).toHaveBeenCalledOnce();
    });
  }
});
