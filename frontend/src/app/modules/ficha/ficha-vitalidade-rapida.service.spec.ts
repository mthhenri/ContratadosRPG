import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ClasseEnum } from '@contratados-rpg/shared/enums';

import { FichaService } from './ficha.service';
import { FichaVitalidadeRapidaService } from './ficha-vitalidade-rapida.service';

/**
 * Prova a orquestração do ajuste rápido de Vida/Energia usado pelos mini-cards do detalhe da
 * campanha (m2-16g): busca o documento completo só na hora de persistir (nunca antes, nunca em
 * cache), mescla os campos pendentes por cima do que vier do servidor, faz um único
 * `alterarFicha` por rajada (debounced) e não deixa uma falha travar o próximo ajuste.
 */
describe('FichaVitalidadeRapidaService', () => {
  function montar(opts: { recuperarRetorno?: (id: number) => unknown; alterarErro?: boolean } = {}) {
    const fichaService = {
      recuperarFicha: vi.fn((id: number) =>
        of(
          opts.recuperarRetorno?.(id) ?? {
            id,
            campanhaId: 1,
            usuarioId: 9,
            nome: 'Corvo',
            dados: {
              nivel: 1,
              classe: ClasseEnum.COMBATENTE,
              estado: { vidaAtual: 10, vidaMaxima: 20, energiaAtual: 5, energiaMaxima: 15 },
            },
          },
        ),
      ),
      alterarFicha: opts.alterarErro
        ? vi.fn(() => throwError(() => new Error('falha simulada')))
        : vi.fn((id: number, dto: { nome: string; dados: unknown }) =>
            of({ id, campanhaId: 1, usuarioId: 9, nome: dto.nome, dados: dto.dados }),
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
  });

  it('rajada de cliques na mesma ficha vira um único ciclo de persistência, com o último valor', () => {
    const { servico, fichaService } = montar();
    servico.ajustar(7, 'vidaAtual', 11);
    vi.advanceTimersByTime(200);
    servico.ajustar(7, 'vidaAtual', 12);
    vi.advanceTimersByTime(200);
    servico.ajustar(7, 'vidaAtual', 13);
    vi.advanceTimersByTime(500);

    expect(fichaService.recuperarFicha).toHaveBeenCalledTimes(1);
    expect(fichaService.recuperarFicha).toHaveBeenCalledWith(7);
    expect(fichaService.alterarFicha).toHaveBeenCalledTimes(1);
    expect(fichaService.alterarFicha).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        dados: expect.objectContaining({ estado: expect.objectContaining({ vidaAtual: 13 }) }),
      }),
    );
  });

  it('mescla o campo pendente por cima do documento buscado, sem tocar no resto do estado', () => {
    const { servico, fichaService } = montar();
    servico.ajustar(7, 'vidaAtual', 9);
    vi.advanceTimersByTime(500);

    const [, dto] = fichaService.alterarFicha.mock.calls[0] as [number, { dados: { estado: unknown } }];
    expect(dto.dados.estado).toEqual({ vidaAtual: 9, vidaMaxima: 20, energiaAtual: 5, energiaMaxima: 15 });
  });

  it('ajustes de fichas diferentes são independentes — cada uma com seu próprio debounce', () => {
    const { servico, fichaService } = montar();
    servico.ajustar(1, 'vidaAtual', 5);
    vi.advanceTimersByTime(300);
    servico.ajustar(2, 'energiaAtual', 8);
    vi.advanceTimersByTime(300);
    // 600ms desde o ajuste da ficha 1 (assentou), só 300ms desde a ficha 2 (ainda não).
    expect(fichaService.recuperarFicha).toHaveBeenCalledWith(1);
    expect(fichaService.recuperarFicha).not.toHaveBeenCalledWith(2);

    vi.advanceTimersByTime(300);
    expect(fichaService.recuperarFicha).toHaveBeenCalledWith(2);
    expect(fichaService.alterarFicha).toHaveBeenCalledTimes(2);
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
    expect(fichaService.recuperarFicha).toHaveBeenCalledTimes(2);
  });
});
