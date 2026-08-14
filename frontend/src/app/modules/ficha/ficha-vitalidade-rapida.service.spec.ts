import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import { FichaService } from './ficha.service';
import { FichaVitalidadeRapidaService } from './ficha-vitalidade-rapida.service';

type FichaAlteradaDublada = {
  id: number;
  campanhaId: number;
  usuarioId: number;
  nome: string;
  cor: string;
  imagemUrl: string;
  oculta: boolean;
  dados: { estado: { vidaAtual?: number; energiaAtual?: number } };
};

/**
 * Prova a orquestração do ajuste rápido de Vida/Energia usado pelos mini-cards do detalhe da
 * campanha (m2-16g): envia somente Vida/Energia pela operação dedicada, faz um único request por
 * rajada (debounced) e não deixa uma falha travar o próximo ajuste.
 */
describe('FichaVitalidadeRapidaService', () => {
  function montar(opts: { alterarErro?: boolean } = {}) {
    const fichaService = {
      recuperarFicha: vi.fn((id: number) =>
        of({
          id,
          campanhaId: 1,
          usuarioId: 9,
          nome: 'Corvo',
          cor: '#2563EB',
          imagemUrl: 'https://exemplo.test/corvo.webp',
          oculta: true,
          dados: { estado: { vidaAtual: 10, energiaAtual: 5 } },
        }),
      ),
      alterarFicha: vi.fn((id: number) => of({ id })),
      alterarVitalidade: opts.alterarErro
        ? vi.fn(() => throwError(() => new Error('falha simulada')))
        : vi.fn((id: number, dto: { vidaAtual?: number; energiaAtual?: number }) =>
            of({
              id,
              campanhaId: 1,
              usuarioId: 9,
              nome: 'Corvo',
              cor: '#2563EB',
              imagemUrl: 'https://exemplo.test/corvo.webp',
              oculta: true,
              dados: { estado: dto },
            }),
          ),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: FichaService, useValue: fichaService }],
    });

    const servico = TestBed.inject(FichaVitalidadeRapidaService);
    return { servico, fichaService };
  }

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('não persiste nada antes do debounce assentar', () => {
    const { servico, fichaService } = montar();
    servico.ajustar(7, 'vidaAtual', 11);
    vi.advanceTimersByTime(400);
    expect(fichaService.recuperarFicha).not.toHaveBeenCalled();
    expect(fichaService.alterarFicha).not.toHaveBeenCalled();
    expect(fichaService.alterarVitalidade).not.toHaveBeenCalled();
  });

  it('rajada de cliques na mesma ficha vira uma operação dedicada, com o último valor', () => {
    const { servico, fichaService } = montar();
    servico.ajustar(7, 'vidaAtual', 11);
    vi.advanceTimersByTime(200);
    servico.ajustar(7, 'vidaAtual', 12);
    vi.advanceTimersByTime(200);
    servico.ajustar(7, 'vidaAtual', 13);
    vi.advanceTimersByTime(500);

    expect(fichaService.recuperarFicha).not.toHaveBeenCalled();
    expect(fichaService.alterarFicha).not.toHaveBeenCalled();
    expect(fichaService.alterarVitalidade).toHaveBeenCalledTimes(1);
    expect(fichaService.alterarVitalidade).toHaveBeenCalledWith(7, { vidaAtual: 13 });
  });

  it('envia somente o campo de vitalidade pendente', () => {
    const { servico, fichaService } = montar();
    servico.ajustar(7, 'vidaAtual', 9);
    vi.advanceTimersByTime(500);

    expect(fichaService.alterarVitalidade).toHaveBeenCalledWith(7, { vidaAtual: 9 });
  });

  it('serializa lotes da mesma ficha para o valor mais recente não ser sobrescrito', () => {
    const { servico, fichaService } = montar();
    const primeiraResposta = new Subject<FichaAlteradaDublada>();
    const segundaResposta = new Subject<FichaAlteradaDublada>();
    fichaService.alterarVitalidade
      .mockReturnValueOnce(primeiraResposta)
      .mockReturnValueOnce(segundaResposta);

    servico.ajustar(7, 'vidaAtual', 11);
    vi.advanceTimersByTime(500);
    expect(fichaService.alterarVitalidade).toHaveBeenCalledWith(7, { vidaAtual: 11 });

    servico.ajustar(7, 'vidaAtual', 12);
    vi.advanceTimersByTime(500);
    expect(fichaService.alterarVitalidade).toHaveBeenCalledTimes(1);

    primeiraResposta.complete();
    expect(fichaService.alterarVitalidade).toHaveBeenCalledWith(7, { vidaAtual: 12 });
    expect(fichaService.alterarVitalidade).toHaveBeenCalledTimes(2);
  });

  it('ajustes de fichas diferentes são independentes — cada uma com seu próprio debounce', () => {
    const { servico, fichaService } = montar();
    servico.ajustar(1, 'vidaAtual', 5);
    vi.advanceTimersByTime(300);
    servico.ajustar(2, 'energiaAtual', 8);
    vi.advanceTimersByTime(300);
    // 600ms desde o ajuste da ficha 1 (assentou), só 300ms desde a ficha 2 (ainda não).
    expect(fichaService.alterarVitalidade).toHaveBeenCalledWith(1, { vidaAtual: 5 });
    expect(fichaService.alterarVitalidade).not.toHaveBeenCalledWith(2, { energiaAtual: 8 });

    vi.advanceTimersByTime(300);
    expect(fichaService.alterarVitalidade).toHaveBeenCalledWith(2, { energiaAtual: 8 });
    expect(fichaService.alterarVitalidade).toHaveBeenCalledTimes(2);
  });

  it('emite em persistido$ após um ciclo bem-sucedido', () => {
    const { servico } = montar();
    const persistidos: number[] = [];
    servico.persistido$.subscribe((ficha) => persistidos.push(ficha.id));

    servico.ajustar(7, 'vidaAtual', 9);
    vi.advanceTimersByTime(500);

    expect(persistidos).toEqual([7]);
  });

  it('emite o fichaId em falhou$ quando a persistência dá erro, sem travar o próximo ajuste', () => {
    const { servico, fichaService } = montar({ alterarErro: true });
    const falhas: number[] = [];
    servico.falhou$.subscribe((fichaId) => falhas.push(fichaId));

    servico.ajustar(7, 'vidaAtual', 9);
    vi.advanceTimersByTime(500);
    expect(falhas).toEqual([7]);

    // Um novo ajuste depois da falha ainda funciona — nada ficou preso.
    servico.ajustar(7, 'vidaAtual', 10);
    vi.advanceTimersByTime(500);
    expect(fichaService.alterarVitalidade).toHaveBeenCalledTimes(2);
  });
});
