import { TestBed } from '@angular/core/testing';

import { NotificacaoService } from './notificacao.service';

/**
 * Prova a fila de `NotificacaoService`: enfileira, auto-sumir por severidade (mesma janela de
 * tempo por severidade, `erro` mais longa que `sucesso`), dispensa manual com a mesma transição de
 * saída de `BandejaDadosService` (marca `saindo` antes de remover de fato) e empilhamento.
 */
describe('NotificacaoService', () => {
  function montar() {
    TestBed.resetTestingModule();
    return TestBed.inject(NotificacaoService);
  }

  it('notificar enfileira e devolve um id crescente', () => {
    const servico = montar();
    const id1 = servico.notificar({ severidade: 'sucesso', resumo: 'Salvo' });
    const id2 = servico.notificar({ severidade: 'erro', resumo: 'Falhou' });

    expect(servico.fila()).toHaveLength(2);
    expect(id2).toBeGreaterThan(id1);
    expect(servico.fila()[0]).toMatchObject({ severidade: 'sucesso', resumo: 'Salvo' });
    expect(servico.fila()[1]).toMatchObject({ severidade: 'erro', resumo: 'Falhou' });
    expect(servico.fila()[1].detalhe).toBeUndefined();
  });

  it('empilha várias notificações ao mesmo tempo, mantendo a ordem de chegada', () => {
    const servico = montar();
    servico.notificar({ severidade: 'informacao', resumo: 'Um' });
    servico.notificar({ severidade: 'aviso', resumo: 'Dois' });
    servico.notificar({ severidade: 'erro', resumo: 'Três' });

    expect(servico.fila().map((entrada) => entrada.resumo)).toEqual(['Um', 'Dois', 'Três']);
  });

  it('fechar marca a entrada como saindo e só a remove da fila após a transição', () => {
    vi.useFakeTimers();
    try {
      const servico = montar();
      const id = servico.notificar({ severidade: 'sucesso', resumo: 'Salvo' });

      servico.fechar(id);
      expect(servico.fila()).toHaveLength(1);
      expect(servico.fila()[0].saindo).toBe(true);

      vi.advanceTimersByTime(200);
      expect(servico.fila()).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('fechar é idempotente — chamar de novo numa entrada já saindo não reinicia a transição', () => {
    vi.useFakeTimers();
    try {
      const servico = montar();
      const id = servico.notificar({ severidade: 'aviso', resumo: 'Cuidado' });

      servico.fechar(id);
      vi.advanceTimersByTime(150);
      servico.fechar(id);
      vi.advanceTimersByTime(50);
      expect(servico.fila()).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('auto-sumir dispara sozinho, com janela de tempo diferente por severidade', () => {
    vi.useFakeTimers();
    try {
      const servico = montar();
      servico.notificar({ severidade: 'sucesso', resumo: 'Rápida' });
      servico.notificar({ severidade: 'erro', resumo: 'Demorada' });

      vi.advanceTimersByTime(4000);
      expect(servico.fila().find((e) => e.resumo === 'Rápida')?.saindo).toBe(true);
      expect(servico.fila().find((e) => e.resumo === 'Demorada')?.saindo).toBe(false);

      vi.advanceTimersByTime(4000);
      expect(servico.fila().find((e) => e.resumo === 'Demorada')?.saindo).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('fechar antes do auto-sumir cancela o timer — sem dupla remoção', () => {
    vi.useFakeTimers();
    try {
      const servico = montar();
      const id = servico.notificar({ severidade: 'informacao', resumo: 'Info' });

      servico.fechar(id);
      vi.advanceTimersByTime(200);
      expect(servico.fila()).toHaveLength(0);

      // Se o timer de auto-sumir não tivesse sido cancelado, dispararia aqui sobre uma fila vazia.
      vi.advanceTimersByTime(5000);
      expect(servico.fila()).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
