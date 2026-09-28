import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type { DocumentoLeitoresDto } from '@contratados-rpg/shared/dtos/documento';
import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';

import { TempoRealService } from '../../core/services/tempo-real.service';
import { CampanhaService } from '../campanha/campanha.service';
import { BibliotecaLeitoresStore } from './biblioteca-leitores.store';
import { descreverLeitores } from './documento-leitores';

/**
 * Prova a presença de leitura do lado do mestre (m9-10): o retrato vira contagem e nomes por
 * documento, o mestre nunca aparece, o espectador é identificado, um membro desconhecido recarrega
 * a lista uma vez, o retrato vazio limpa tudo e a reconexão informa de novo.
 */
describe('BibliotecaLeitoresStore — presença de leitura (m9-10)', () => {
  const CAMPANHA_ID = 9;
  const { MESTRE, JOGADOR, ESPECTADOR } = TipoCampanhaMembroPapelEnum;

  const membro = (
    usuarioId: number,
    nome: string,
    papel: TipoCampanhaMembroPapelEnum,
  ): CampanhaMembroResumoDto => ({ usuarioId, nome, papel, fichas: [] });

  const membros = [
    membro(1, 'Mestra', MESTRE),
    membro(2, 'Bruno', JOGADOR),
    membro(3, 'Ana', JOGADOR),
    membro(4, 'Carla', ESPECTADOR),
  ];

  function montar(iniciais: readonly CampanhaMembroResumoDto[] = membros) {
    const reconexao$ = new Subject<void>();
    const documentoLeitores$ = new Subject<DocumentoLeitoresDto>();
    const tempoReal = {
      informarLeitura: vi.fn(),
      reconexao$: reconexao$.asObservable(),
      documentoLeitores$,
    };
    const recarga$ = new Subject<CampanhaMembroResumoDto[]>();
    const campanhaService = { listarMembros: vi.fn(() => recarga$) };
    TestBed.configureTestingModule({
      providers: [
        BibliotecaLeitoresStore,
        { provide: TempoRealService, useValue: tempoReal },
        { provide: CampanhaService, useValue: campanhaService },
      ],
    });
    const store = TestBed.inject(BibliotecaLeitoresStore);
    store.iniciar(CAMPANHA_ID, signal(iniciais));
    const retrato = (leitores: DocumentoLeitoresDto['leitores'], campanhaId = CAMPANHA_ID) =>
      documentoLeitores$.next({ campanhaId, leitores });
    return { store, tempoReal, reconexao$, retrato, campanhaService, recarga$ };
  }

  const nomes = (store: BibliotecaLeitoresStore, documentoId: number) =>
    (store.leitoresPorDocumento().get(documentoId) ?? []).map((leitor) => leitor.nome);

  it('agrupa o retrato por documento, com os nomes dos membros em ordem alfabética', () => {
    const { store, retrato } = montar();

    retrato([
      { documentoId: 70, usuarioId: 2, papel: JOGADOR },
      { documentoId: 70, usuarioId: 3, papel: JOGADOR },
      { documentoId: 71, usuarioId: 2, papel: JOGADOR },
    ]);

    expect(nomes(store, 70)).toEqual(['Ana', 'Bruno']);
    expect(nomes(store, 71)).toEqual(['Bruno']);
    expect(store.leitoresPorDocumento().has(72)).toBe(false);
  });

  it('o mestre nunca aparece, mesmo se viesse no retrato', () => {
    const { store, retrato } = montar();

    retrato([
      { documentoId: 70, usuarioId: 1, papel: MESTRE },
      { documentoId: 70, usuarioId: 2, papel: JOGADOR },
    ]);

    expect(nomes(store, 70)).toEqual(['Bruno']);
  });

  it('identifica o espectador — no dado e na descrição do tooltip', () => {
    const { store, retrato } = montar();

    retrato([
      { documentoId: 70, usuarioId: 2, papel: JOGADOR },
      { documentoId: 70, usuarioId: 3, papel: JOGADOR },
      { documentoId: 70, usuarioId: 4, papel: ESPECTADOR },
    ]);

    const leitores = store.leitoresPorDocumento().get(70)!;
    expect(leitores.map((leitor) => leitor.espectador)).toEqual([false, false, true]);
    expect(descreverLeitores(leitores)).toBe('Ana, Bruno e Carla (espectador)');
  });

  it('substitui o retrato a cada evento — o vazio limpa tudo', () => {
    const { store, retrato } = montar();
    retrato([{ documentoId: 70, usuarioId: 2, papel: JOGADOR }]);

    retrato([{ documentoId: 71, usuarioId: 3, papel: JOGADOR }]);
    expect(store.leitoresPorDocumento().has(70)).toBe(false);
    expect(nomes(store, 71)).toEqual(['Ana']);

    retrato([]);
    expect(store.leitoresPorDocumento().size).toBe(0);
  });

  it('ignora o retrato de outra campanha', () => {
    const { store, retrato } = montar();

    retrato([{ documentoId: 70, usuarioId: 2, papel: JOGADOR }], 99);

    expect(store.leitoresPorDocumento().size).toBe(0);
  });

  it('membro desconhecido aparece como "Membro" e recarrega a lista uma vez', () => {
    const { store, retrato, campanhaService, recarga$ } = montar();

    retrato([{ documentoId: 70, usuarioId: 5, papel: JOGADOR }]);
    expect(nomes(store, 70)).toEqual(['Membro']);
    expect(campanhaService.listarMembros).toHaveBeenCalledTimes(1);
    expect(campanhaService.listarMembros).toHaveBeenCalledWith(CAMPANHA_ID);

    // Outro retrato com o mesmo desconhecido, com a recarga em voo: não repete.
    retrato([{ documentoId: 71, usuarioId: 5, papel: JOGADOR }]);
    expect(campanhaService.listarMembros).toHaveBeenCalledTimes(1);

    recarga$.next([...membros, membro(5, 'Diego', JOGADOR)]);
    expect(nomes(store, 71)).toEqual(['Diego']);
  });

  it('um id que continua desconhecido depois da recarga não recarrega de novo', () => {
    const { store, retrato, campanhaService, recarga$ } = montar();

    retrato([{ documentoId: 70, usuarioId: 5, papel: JOGADOR }]);
    recarga$.next([...membros]);
    retrato([{ documentoId: 70, usuarioId: 5, papel: JOGADOR }]);

    expect(campanhaService.listarMembros).toHaveBeenCalledTimes(1);
    expect(nomes(store, 70)).toEqual(['Membro']);
  });

  it('membros conhecidos não recarregam a lista', () => {
    const { retrato, campanhaService } = montar();

    retrato([{ documentoId: 70, usuarioId: 2, papel: JOGADOR }]);

    expect(campanhaService.listarMembros).not.toHaveBeenCalled();
  });

  it('informa leitura (null) ao iniciar e de novo a cada reconexão, para receber o retrato', () => {
    const { tempoReal, reconexao$ } = montar();
    expect(tempoReal.informarLeitura).toHaveBeenCalledWith(CAMPANHA_ID, null);
    tempoReal.informarLeitura.mockClear();

    reconexao$.next();

    expect(tempoReal.informarLeitura).toHaveBeenCalledTimes(1);
    expect(tempoReal.informarLeitura).toHaveBeenCalledWith(CAMPANHA_ID, null);
  });

  it('descreve um leitor só, dois e três no português da lista', () => {
    const leitor = (nome: string, espectador = false) => ({ usuarioId: 0, nome, espectador });
    expect(descreverLeitores([leitor('Ana')])).toBe('Ana');
    expect(descreverLeitores([leitor('Ana'), leitor('Bruno')])).toBe('Ana e Bruno');
    expect(descreverLeitores([leitor('Ana'), leitor('Carla', true)])).toBe(
      'Ana e Carla (espectador)',
    );
  });
});
