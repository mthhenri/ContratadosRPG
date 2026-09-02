import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { Icone } from '../../icone/icone.component';
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

  it('mostra o ícone certo por severidade, na cor da severidade (ui-20)', () => {
    const fixture = montar();
    const servico = TestBed.inject(NotificacaoService);
    servico.notificar({ severidade: 'sucesso', resumo: 'A' });
    servico.notificar({ severidade: 'informacao', resumo: 'B' });
    servico.notificar({ severidade: 'aviso', resumo: 'C' });
    servico.notificar({ severidade: 'erro', resumo: 'D' });
    fixture.detectChanges();

    const icones = fixture.debugElement
      .queryAll(By.directive(Icone))
      .map((de) => (de.componentInstance as Icone).nome());
    expect(icones).toEqual(['check', 'olho', 'alerta', 'excluir']);
  });

  it('a barra de duração recebe a duração real da severidade (ui-20)', () => {
    const fixture = montar();
    const servico = TestBed.inject(NotificacaoService);
    servico.notificar({ severidade: 'erro', resumo: 'Falha' });
    fixture.detectChanges();

    const barra = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      '.notificacoes__barra',
    );
    expect(barra?.style.animationDuration).toBe('8000ms');
  });

  it('sem ação, não renderiza o botão de resposta', () => {
    const fixture = montar();
    const servico = TestBed.inject(NotificacaoService);
    servico.notificar({ severidade: 'erro', resumo: 'Falha' });
    fixture.detectChanges();

    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('.notificacoes__acao')).toBeNull();
  });

  it('a ação é um app-botao "link" alcançável por teclado e executa antes de fechar', () => {
    vi.useFakeTimers();
    try {
      const fixture = montar();
      const servico = TestBed.inject(NotificacaoService);
      const executar = vi.fn();
      servico.notificar({
        severidade: 'erro',
        resumo: 'Falha',
        acao: { rotulo: 'Tentar de novo', executar },
      });
      fixture.detectChanges();

      const raiz = fixture.nativeElement as HTMLElement;
      const botaoAcao = raiz.querySelector<HTMLButtonElement>('.notificacoes__acao');
      // <button> nativo — Enter/Espaço ativam sozinhos, sem handler de teclado dedicado.
      expect(botaoAcao?.tagName).toBe('BUTTON');
      expect(botaoAcao?.classList.contains('botao--estilo-link')).toBe(true);
      expect(botaoAcao?.classList.contains('botao--perigo')).toBe(true); // erro → variante perigo
      expect(botaoAcao?.textContent?.trim()).toBe('Tentar de novo');

      botaoAcao?.click();
      fixture.detectChanges();

      expect(executar).toHaveBeenCalledTimes(1);
      expect(raiz.querySelector('.notificacoes__item')?.classList).toContain(
        'notificacoes__item--saindo',
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('hover no card pausa o auto-sumir e retomar reagenda (ui-20)', () => {
    vi.useFakeTimers();
    try {
      const fixture = montar();
      const servico = TestBed.inject(NotificacaoService);
      servico.notificar({ severidade: 'sucesso', resumo: 'Salvo' });
      fixture.detectChanges();

      const item = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
        '.notificacoes__item',
      );
      item?.dispatchEvent(new MouseEvent('mouseenter'));
      // 4000ms = duração de `sucesso` — ultrapassaria se o hover não tivesse pausado o timer.
      vi.advanceTimersByTime(4000);
      expect(servico.fila()[0].saindo).toBe(false);

      item?.dispatchEvent(new MouseEvent('mouseleave'));
      vi.advanceTimersByTime(4000);
      expect(servico.fila()[0].saindo).toBe(true);
    } finally {
      vi.useRealTimers();
    }
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
