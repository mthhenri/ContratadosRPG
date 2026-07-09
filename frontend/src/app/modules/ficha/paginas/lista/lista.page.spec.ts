import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';
import { ClasseEnum, TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import type {
  CampanhaMembroEntradaDto,
  CampanhaMembroResumoDto,
} from '@contratados-rpg/shared/dtos/campanha';
import type { FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';

import { FichaLista } from './lista.page';
import { FichaService } from '../../ficha.service';
import { CampanhaService } from '../../../campanha/campanha.service';
import { SessaoService } from '../../../../core/services/sessao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';

/**
 * Prova a lista de fichas (m3-07): apresenta o recorte que o backend já filtrou (§14 — o front não
 * duplica regra) e resolve o dono de cada ficha ("Você" para a própria, o nome do membro para as
 * demais).
 */
describe('FichaLista', () => {
  const fichas: FichaResumoDto[] = [
    { id: 3, usuarioId: 7, nome: 'Kane', classe: ClasseEnum.COMBATENTE, nivel: 2 },
    { id: 4, usuarioId: 11, nome: 'Vera', classe: ClasseEnum.SUPORTE, nivel: 1 },
  ];
  const membros: CampanhaMembroResumoDto[] = [
    { usuarioId: 7, nome: 'Eu', papel: TipoCampanhaMembroPapelEnum.JOGADOR },
    { usuarioId: 11, nome: 'Vera Cruz', papel: TipoCampanhaMembroPapelEnum.MESTRE },
  ];

  function montar() {
    const fichaService = {
      listarFichas: vi.fn(() => of(fichas)),
      criarFicha: vi.fn(() => of({ id: 42, campanhaId: 9, usuarioId: 7, nome: 'Novo agente' })),
    };
    const campanhaService = { listarMembros: vi.fn(() => of(membros)) };
    const sessaoService = { usuario: () => ({ id: 7, login: 'eu', nome: 'Eu', token: 't' }) };

    // Stub do tempo real: `Subject`s controláveis para os eventos da sala e um Signal de reconexão.
    const fichaCriada$ = new Subject<FichaResumoDto>();
    const membroEntrou$ = new Subject<CampanhaMembroEntradaDto>();
    const reconexao = signal(0);
    const tempoRealService = {
      conectar: vi.fn(),
      entrarSalaCampanha: vi.fn(),
      sairSalaCampanha: vi.fn(),
      fichaCriada$: fichaCriada$.asObservable(),
      membroEntrou$: membroEntrou$.asObservable(),
      reconexao,
    };

    TestBed.configureTestingModule({
      imports: [FichaLista],
      providers: [
        provideRouter([]),
        { provide: FichaService, useValue: fichaService },
        { provide: CampanhaService, useValue: campanhaService },
        { provide: SessaoService, useValue: sessaoService },
        { provide: TempoRealService, useValue: tempoRealService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: new Map([['campanhaId', '9']]) },
            parent: null,
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(FichaLista);
    fixture.detectChanges();
    return {
      fixture,
      raiz: fixture.nativeElement as HTMLElement,
      fichaService,
      campanhaService,
      tempoRealService,
      fichaCriada$,
      membroEntrou$,
      reconexao,
    };
  }

  it('lista as fichas visíveis da campanha lida da rota', () => {
    const { raiz, fichaService } = montar();
    expect(fichaService.listarFichas).toHaveBeenCalledWith(9);
    const itens = raiz.querySelectorAll('.fichas__item');
    expect(itens.length).toBe(2);
    expect(raiz.textContent).toContain('Kane');
    expect(raiz.textContent).toContain('Combatente · Nível 2');
  });

  it('marca a própria ficha como "Você" e resolve o dono das demais', () => {
    const { raiz } = montar();
    const chips = Array.from(raiz.querySelectorAll('.chip-dono')).map((c) => c.textContent?.trim());
    expect(chips.some((texto) => texto?.includes('Você'))).toBe(true);
    expect(chips.some((texto) => texto?.includes('Vera Cruz'))).toBe(true);
    // A própria ficha ganha o realce accent.
    expect(raiz.querySelector('.chip-dono--minha')).not.toBeNull();
  });

  it('"Nova ficha" cria uma ficha padrão e navega direto para ela (default-then-edit, m3-10)', () => {
    const { raiz, fichaService } = montar();
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    (raiz.querySelector('.fichas__acao') as HTMLButtonElement).click();

    // Cria na campanha da rota com um documento padrão coerente (classe base, sem Maestria).
    expect(fichaService.criarFicha).toHaveBeenCalledTimes(1);
    expect(fichaService.criarFicha).toHaveBeenCalledWith(
      expect.objectContaining({
        campanhaId: 9,
        dados: expect.objectContaining({ classe: ClasseEnum.COMBATENTE, maestria: null }),
      }),
    );
    // Navega para a ficha recém-criada (edição no próprio lugar).
    expect(navegar).toHaveBeenCalledWith(['/painel', 9, 'ficha', 42]);
  });

  it('entra na sala da campanha ao abrir e a esquece ao destruir (m3-08)', () => {
    const { fixture, tempoRealService } = montar();
    expect(tempoRealService.conectar).toHaveBeenCalled();
    expect(tempoRealService.entrarSalaCampanha).toHaveBeenCalledWith(9);
    fixture.destroy();
    expect(tempoRealService.sairSalaCampanha).toHaveBeenCalledWith(9);
  });

  it('refaz o fetch (§14 arbitrado pelo backend) ao receber ficha:criada ou membro:entrou', () => {
    const { fichaService, campanhaService, fichaCriada$, membroEntrou$ } = montar();
    // Boot: 1 fetch de cada.
    expect(fichaService.listarFichas).toHaveBeenCalledTimes(1);
    expect(campanhaService.listarMembros).toHaveBeenCalledTimes(1);

    // Uma ficha criada na campanha → refetch (não confia no payload do broadcast; o back filtra §14).
    fichaCriada$.next({ id: 9, usuarioId: 11, nome: 'Nova', classe: ClasseEnum.COMBATENTE, nivel: 0 });
    expect(fichaService.listarFichas).toHaveBeenCalledTimes(2);

    // Um membro que entra → refetch (mantém o mapa de nomes do dono fresco).
    membroEntrou$.next({ campanhaId: 9, usuarioId: 12 });
    expect(fichaService.listarFichas).toHaveBeenCalledTimes(3);
    expect(campanhaService.listarMembros).toHaveBeenCalledTimes(3);
  });

  it('ressincroniza a lista ao reconectar (§9)', () => {
    const { fixture, fichaService, reconexao } = montar();
    expect(fichaService.listarFichas).toHaveBeenCalledTimes(1);

    reconexao.set(1);
    fixture.detectChanges();

    expect(fichaService.listarFichas).toHaveBeenCalledTimes(2);
  });
});
