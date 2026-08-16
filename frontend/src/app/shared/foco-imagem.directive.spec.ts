import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { FichaImagemFocoDto } from '@contratados-rpg/shared/dtos/ficha';

import { FocoImagem } from './foco-imagem.directive';
import type { Proporcao } from './enquadramento-imagem.util';

/**
 * Prova que a diretiva aplica o `translate()+scale()` de `estiloTransformEnquadramento` na
 * própria `<img>`, e que passa a considerar a proporção real da imagem (`naturalWidth`/
 * `naturalHeight`) assim que ela é conhecida — a margem extra pra fotos não-quadradas (ver
 * `enquadramento-imagem.util.spec.ts` pra a matemática pura de `escalaMinimaPorEixo`).
 */
@Component({
  imports: [FocoImagem],
  template: `<img [appFocoImagem]="foco()" [appFocoImagemCaixa]="caixa()" src="https://exemplo.test/avatar.webp" alt="" />`,
})
class Hospedeiro {
  readonly foco = signal<FichaImagemFocoDto | null>(null);
  readonly caixa = signal<Proporcao>({ largura: 1, altura: 1 });
}

describe('FocoImagem', () => {
  function montar() {
    TestBed.configureTestingModule({ imports: [Hospedeiro] });
    const fixture = TestBed.createComponent(Hospedeiro);
    fixture.detectChanges();
    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    return { fixture, img };
  }

  /** jsdom não busca a imagem de verdade — simula o `load` definindo o tamanho natural na mão. */
  function simularCarregamento(img: HTMLImageElement, largura: number, altura: number): void {
    Object.defineProperty(img, 'naturalWidth', { value: largura, configurable: true });
    Object.defineProperty(img, 'naturalHeight', { value: altura, configurable: true });
    Object.defineProperty(img, 'complete', { value: true, configurable: true });
    img.dispatchEvent(new Event('load'));
  }

  it('sem foco, não aplica transform nem troca object-fit/object-position (fica no cover/centralizado padrão do SCSS)', () => {
    const { img } = montar();
    expect(img.style.transform).toBe('');
    expect(img.style.objectFit).toBe('');
    expect(img.style.objectPosition).toBe('');
  });

  it('com foco, troca pra contain + ancorado no canto (0% 0%) — cover cortaria a imagem antes do transform rodar', () => {
    const { fixture, img } = montar();
    fixture.componentInstance.foco.set({ x: 50, y: 50, escala: 2 });
    fixture.detectChanges();
    expect(img.style.objectFit).toBe('contain');
    expect(img.style.objectPosition).toBe('0% 0%');
  });

  it('com foco e sem saber a proporção da imagem ainda, usa o fallback quadrado (margem só a partir do zoom)', () => {
    const { fixture, img } = montar();
    fixture.componentInstance.foco.set({ x: 50, y: 50, escala: 2 });
    fixture.detectChanges();
    expect(img.style.transform).toBe('translate(-50%, -50%) scale(2)');
  });

  it('assim que a imagem carrega, uma foto não-quadrada ganha margem extra no eixo que sobra — mesmo sem zoom manual', () => {
    const { fixture, img } = montar();
    fixture.componentInstance.foco.set({ x: 0, y: 50, escala: 1 });
    fixture.detectChanges();
    // Caixa quadrada, imagem 2:1 (o dobro da largura) — o eixo x ganha folga (minima.x = 2), y não.
    // O scale() do CSS acompanha a mínima (2) mesmo sem zoom manual — é o `contain` virando, na
    // prática, um `cover` correto pra essa proporção.
    simularCarregamento(img, 200, 100);
    fixture.detectChanges();
    expect(img.style.transform).toBe('translate(0%, 0%) scale(2)');

    fixture.componentInstance.foco.set({ x: 100, y: 50, escala: 1 });
    fixture.detectChanges();
    expect(img.style.transform).toBe('translate(-100%, 0%) scale(2)');
  });

  it('uma foto já quadrada não ganha margem nenhuma sem zoom, mesmo depois de medida', () => {
    const { fixture, img } = montar();
    fixture.componentInstance.foco.set({ x: 100, y: 0, escala: 1 });
    fixture.detectChanges();
    simularCarregamento(img, 300, 300);
    fixture.detectChanges();
    expect(img.style.transform).toBe('translate(0%, 0%) scale(1)');
  });
});
