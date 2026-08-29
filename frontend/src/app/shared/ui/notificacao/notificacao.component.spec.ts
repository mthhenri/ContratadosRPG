import { TestBed } from '@angular/core/testing';

import { Notificacoes } from './notificacao.component';
import { NotificacaoService } from './notificacao.service';

describe('Notificacoes', () => {
  function montar() {
    TestBed.configureTestingModule({ imports: [Notificacoes] });
    const fixture = TestBed.createComponent(Notificacoes);
    fixture.detectChanges();
    return fixture;
  }

  it('não renderiza nada com a fila vazia', () => {
    const fixture = montar();
    expect((fixture.nativeElement as HTMLElement).querySelector('.notificacoes')).toBeNull();
  });

  it('renderiza resumo, detalhe e a classe de severidade de cada entrada', () => {
    const fixture = montar();
    const servico = TestBed.inject(NotificacaoService);
    servico.notificar({ severidade: 'erro', resumo: 'Falha', detalhe: 'Tente de novo.' });
    fixture.detectChanges();

    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('.notificacoes')?.getAttribute('aria-live')).toBe('polite');
    const item = raiz.querySelector('.notificacoes__item');
    expect(item?.classList.contains('notificacoes__item--erro')).toBe(true);
    expect(raiz.querySelector('.notificacoes__resumo')?.textContent).toBe('Falha');
    expect(raiz.querySelector('.notificacoes__detalhe')?.textContent).toBe('Tente de novo.');
  });

  it('o botão "×" fecha a notificação (dispensa manual)', () => {
    vi.useFakeTimers();
    try {
      const fixture = montar();
      const servico = TestBed.inject(NotificacaoService);
      servico.notificar({ severidade: 'sucesso', resumo: 'Salvo' });
      fixture.detectChanges();

      const raiz = fixture.nativeElement as HTMLElement;
      raiz.querySelector<HTMLButtonElement>('.notificacoes__fechar')?.click();
      fixture.detectChanges();
      expect(raiz.querySelector('.notificacoes__item')?.classList).toContain(
        'notificacoes__item--saindo',
      );

      vi.advanceTimersByTime(200);
      fixture.detectChanges();
      expect(raiz.querySelector('.notificacoes')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
