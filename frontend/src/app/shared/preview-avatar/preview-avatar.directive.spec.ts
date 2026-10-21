import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { PreviewAvatar } from './preview-avatar.directive';

/**
 * Prova o `appPreviewAvatar`: o preview ampliado só abre com mouse depois do hover sustentado
 * (600 ms), mostra a foto inteira (`contain`) num quadrado de 300px portado para o `<body>`, some
 * ao sair/clicar/rolar/trocar a foto, e não faz nada sem URL nem no toque.
 */
@Component({
  imports: [PreviewAvatar],
  template: `<span data-teste="avatar" [appPreviewAvatar]="url()">AB</span>`,
})
class Hospedeiro {
  readonly url = signal<string | null>('https://exemplo.test/avatar.webp');
}

describe('PreviewAvatar', () => {
  function montar() {
    TestBed.configureTestingModule({ imports: [Hospedeiro] });
    const fixture = TestBed.createComponent(Hospedeiro);
    fixture.detectChanges();
    const avatar = fixture.nativeElement.querySelector('[data-teste="avatar"]') as HTMLElement;
    return { fixture, avatar };
  }

  const preview = () => document.body.querySelector<HTMLElement>('body > div[aria-hidden="true"]');

  const evento = (tipo: string, pointerType = 'mouse') =>
    new PointerEvent(tipo, { pointerType, bubbles: true });

  afterEach(() => {
    vi.useRealTimers();
    document.body.querySelectorAll('body > div[aria-hidden="true"]').forEach((no) => no.remove());
  });

  it('só abre depois do hover sustentado, com a foto inteira em 300×300; some ao sair', () => {
    vi.useFakeTimers();
    const { avatar } = montar();

    avatar.dispatchEvent(evento('pointerenter'));
    vi.advanceTimersByTime(599);
    expect(preview()).toBeNull();

    vi.advanceTimersByTime(1);
    const caixa = preview();
    expect(caixa).not.toBeNull();
    expect(caixa!.style.width).toBe('300px');
    expect(caixa!.style.height).toBe('300px');
    const imagem = caixa!.querySelector('img')!;
    expect(imagem.getAttribute('src')).toBe('https://exemplo.test/avatar.webp');
    expect(imagem.style.objectFit).toBe('contain');

    avatar.dispatchEvent(evento('pointerleave'));
    expect(preview()).toBeNull();
  });

  it('sair antes do atraso cancela a abertura', () => {
    vi.useFakeTimers();
    const { avatar } = montar();

    avatar.dispatchEvent(evento('pointerenter'));
    vi.advanceTimersByTime(300);
    avatar.dispatchEvent(evento('pointerleave'));
    vi.advanceTimersByTime(1000);

    expect(preview()).toBeNull();
  });

  it('sem URL não abre nada', () => {
    vi.useFakeTimers();
    const { fixture, avatar } = montar();
    fixture.componentInstance.url.set(null);
    fixture.detectChanges();

    avatar.dispatchEvent(evento('pointerenter'));
    vi.advanceTimersByTime(1000);

    expect(preview()).toBeNull();
  });

  it('toque não abre (não existe hover no dedo)', () => {
    vi.useFakeTimers();
    const { avatar } = montar();

    avatar.dispatchEvent(evento('pointerenter', 'touch'));
    vi.advanceTimersByTime(1000);

    expect(preview()).toBeNull();
  });

  it('fecha ao clicar, ao rolar e ao trocar a foto com o preview aberto', () => {
    vi.useFakeTimers();
    const { fixture, avatar } = montar();
    const abrir = () => {
      avatar.dispatchEvent(evento('pointerenter'));
      vi.advanceTimersByTime(600);
      expect(preview()).not.toBeNull();
    };

    abrir();
    avatar.dispatchEvent(evento('pointerdown'));
    expect(preview()).toBeNull();

    abrir();
    document.dispatchEvent(new Event('scroll'));
    expect(preview()).toBeNull();

    abrir();
    fixture.componentInstance.url.set('https://exemplo.test/outra.webp');
    fixture.detectChanges();
    expect(preview()).toBeNull();
  });

  it('destruir o host com o preview aberto remove o preview', () => {
    vi.useFakeTimers();
    const { fixture, avatar } = montar();
    avatar.dispatchEvent(evento('pointerenter'));
    vi.advanceTimersByTime(600);
    expect(preview()).not.toBeNull();

    fixture.destroy();

    expect(preview()).toBeNull();
  });
});
