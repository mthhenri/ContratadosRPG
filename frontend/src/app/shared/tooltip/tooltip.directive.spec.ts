import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Tooltip } from './tooltip.directive';

/**
 * Prova as duas modalidades do `appTooltip`:
 *
 * - **Ponteiro fino:** o balão só abre após o atraso (300 ms padrão), carrega o texto passado, some
 *   ao sair/clicar, e não abre com texto vazio.
 * - **Toque (m3-60):** host informativo abre no toque curto e engole o clique daquele toque; host
 *   acionável mantém a ação no toque curto e só abre o balão no pressionar-e-segurar (cancelando,
 *   aí sim, o clique do gesto). Fechar por toque fora, `Escape` e rolagem.
 *
 * O balão é portado para o `<body>` (por isso os testes consultam `document.body`). Temporizadores
 * falsos tornam hover e pressionar-e-segurar determinísticos.
 */
@Component({
  imports: [Tooltip],
  template: `
    <button data-teste="hover" [appTooltip]="texto()" [appTooltipDelay]="300">Habilidade</button>
    <!-- Espelha o host informativo real da ficha (a abreviação do atributo): span focável, sem
         ação nenhuma. O (click)/(keydown) existem só para flagrar clique vazado. -->
    <span
      data-teste="informativo"
      tabindex="0"
      [appTooltip]="'Força — DT 19'"
      (click)="cliques.set(cliques() + 1)"
      (keydown)="cliques.set(cliques() + 1)"
      >FOR</span
    >
    <button data-teste="acionavel" type="button" [appTooltip]="'Rolar'" (click)="rolagens.set(rolagens() + 1)">
      Rolar
    </button>
  `,
})
class Hospedeiro {
  readonly texto = signal<string>('Soma sua Força × 3 no dano.');
  /** Conta cliques que vazaram para um host **informativo** (deveria ficar sempre em 0). */
  readonly cliques = signal(0);
  /** Conta as ações disparadas pelo host **acionável**. */
  readonly rolagens = signal(0);
}

describe('Tooltip', () => {
  function montar() {
    TestBed.configureTestingModule({ imports: [Hospedeiro] });
    const fixture = TestBed.createComponent(Hospedeiro);
    fixture.detectChanges();
    const buscar = (teste: string) =>
      fixture.nativeElement.querySelector(`[data-teste="${teste}"]`) as HTMLElement;
    return {
      fixture,
      botao: buscar('hover'),
      informativo: buscar('informativo'),
      acionavel: buscar('acionavel'),
    };
  }

  const balao = () => document.body.querySelector('[role="tooltip"]');

  /** Evento de ponteiro de **dedo** — é o `pointerType` que decide a modalidade na diretiva. */
  function eventoDeToque(tipo: string, deslocamento = 0): PointerEvent {
    return new PointerEvent(tipo, {
      pointerType: 'touch',
      clientX: 100 + deslocamento,
      clientY: 100,
      bubbles: true,
      cancelable: true,
    });
  }

  /**
   * Simula um toque completo, incluindo o `click` que o navegador sintetiza depois.
   * Retorna `true` se esse clique sobreviveu (ou seja, viraria ação).
   */
  function tocar(elemento: HTMLElement, opcoes: { segurarMs?: number; arrastarPx?: number } = {}) {
    elemento.dispatchEvent(eventoDeToque('pointerdown'));
    if (opcoes.segurarMs) {
      vi.advanceTimersByTime(opcoes.segurarMs);
    }
    elemento.dispatchEvent(eventoDeToque('pointerup', opcoes.arrastarPx ?? 0));
    return elemento.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  }

  afterEach(() => {
    document.body.querySelectorAll('[role="tooltip"]').forEach((no) => no.remove());
  });

  // ------------------------------------------------------------------ ponteiro fino (mouse)

  it('abre o balão com o texto só depois do atraso; some ao sair', () => {
    vi.useFakeTimers();
    try {
      const { botao } = montar();
      botao.dispatchEvent(new Event('pointerenter'));
      // Antes do atraso: nada ainda.
      vi.advanceTimersByTime(200);
      expect(balao()).toBeNull();
      // Depois do atraso: balão com o texto.
      vi.advanceTimersByTime(120);
      expect(balao()?.textContent).toContain('Soma sua Força');
      // Sai o mouse: some.
      botao.dispatchEvent(new Event('pointerleave'));
      expect(balao()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('texto vazio não abre nada', () => {
    vi.useFakeTimers();
    try {
      const { fixture, botao } = montar();
      fixture.componentInstance.texto.set('');
      fixture.detectChanges();
      botao.dispatchEvent(new Event('pointerenter'));
      vi.advanceTimersByTime(1000);
      expect(balao()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('sair antes do atraso cancela a abertura', () => {
    vi.useFakeTimers();
    try {
      const { botao } = montar();
      botao.dispatchEvent(new Event('pointerenter'));
      vi.advanceTimersByTime(150);
      botao.dispatchEvent(new Event('pointerleave'));
      vi.advanceTimersByTime(1000);
      expect(balao()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('destruir o componente remove o balão aberto', () => {
    vi.useFakeTimers();
    try {
      const { fixture, botao } = montar();
      botao.dispatchEvent(new Event('pointerenter'));
      vi.advanceTimersByTime(300);
      expect(balao()).not.toBeNull();
      fixture.destroy();
      expect(balao()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('entrar com o dedo não agenda abertura por hover', () => {
    vi.useFakeTimers();
    try {
      const { botao } = montar();
      botao.dispatchEvent(eventoDeToque('pointerenter'));
      vi.advanceTimersByTime(1000);
      expect(balao()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  // ------------------------------------------------------------------ toque — host informativo

  it('host informativo: um toque abre o balão e o clique daquele toque não vira ação', () => {
    vi.useFakeTimers();
    try {
      const { fixture, informativo } = montar();
      const cliqueSobreviveu = tocar(informativo);
      expect(balao()?.textContent).toContain('DT 19');
      expect(cliqueSobreviveu).toBe(false);
      expect(fixture.componentInstance.cliques()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('host informativo: o segundo toque fecha o balão', () => {
    vi.useFakeTimers();
    try {
      const { informativo } = montar();
      tocar(informativo);
      expect(balao()).not.toBeNull();
      tocar(informativo);
      expect(balao()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('host informativo: arrastar (rolagem) não abre nem engole o clique', () => {
    vi.useFakeTimers();
    try {
      const { informativo } = montar();
      const cliqueSobreviveu = tocar(informativo, { arrastarPx: 40 });
      expect(balao()).toBeNull();
      expect(cliqueSobreviveu).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  // ------------------------------------------------------------------ toque — host acionável

  it('host acionável: toque curto executa a ação e não abre balão', () => {
    vi.useFakeTimers();
    try {
      const { fixture, acionavel } = montar();
      const cliqueSobreviveu = tocar(acionavel);
      expect(balao()).toBeNull();
      expect(cliqueSobreviveu).toBe(true);
      expect(fixture.componentInstance.rolagens()).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('host acionável: pressionar e segurar abre o balão e cancela a ação daquele toque', () => {
    vi.useFakeTimers();
    try {
      const { fixture, acionavel } = montar();
      const cliqueSobreviveu = tocar(acionavel, { segurarMs: 600 });
      expect(balao()?.textContent).toContain('Rolar');
      expect(cliqueSobreviveu).toBe(false);
      expect(fixture.componentInstance.rolagens()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  // ------------------------------------------------------------------ fechamento e acessibilidade

  it('toque fora fecha o balão aberto por toque', () => {
    vi.useFakeTimers();
    try {
      const { informativo } = montar();
      tocar(informativo);
      expect(balao()).not.toBeNull();
      document.body.dispatchEvent(eventoDeToque('pointerdown'));
      expect(balao()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('Escape fecha o balão aberto por toque', () => {
    vi.useFakeTimers();
    try {
      const { informativo } = montar();
      tocar(informativo);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(balao()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('rolar fecha o balão aberto por toque', () => {
    vi.useFakeTimers();
    try {
      const { informativo } = montar();
      tocar(informativo);
      document.dispatchEvent(new Event('scroll'));
      expect(balao()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('enquanto aberto, o host descreve o balão por aria-describedby', () => {
    vi.useFakeTimers();
    try {
      const { informativo } = montar();
      tocar(informativo);
      const identificador = balao()!.getAttribute('id')!;
      expect(identificador).toBeTruthy();
      expect(informativo.getAttribute('aria-describedby')).toBe(identificador);
      tocar(informativo);
      expect(informativo.getAttribute('aria-describedby')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('foco de teclado continua abrindo o balão', () => {
    vi.useFakeTimers();
    try {
      const { botao } = montar();
      botao.dispatchEvent(new Event('focusin'));
      vi.advanceTimersByTime(300);
      expect(balao()?.textContent).toContain('Soma sua Força');
      botao.dispatchEvent(new Event('focusout'));
      expect(balao()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
