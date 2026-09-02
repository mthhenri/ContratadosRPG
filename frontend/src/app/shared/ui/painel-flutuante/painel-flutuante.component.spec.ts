import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PainelFlutuante } from './painel-flutuante.component';

interface DefinicaoComponenteComEstilos {
  readonly ɵcmp: {
    readonly styles: readonly string[];
  };
}

/**
 * Prova o primitivo de painel flutuante (ui-17): foco preso e devolvido ao gatilho, Escape
 * fechando, minimizar/posição persistindo em `localStorage` por `[id]` — o contrato que os três
 * consumidores (`CalculadoraFlutuante`, `CadernoFlutuante`, `LeitorDocumentos`) delegam inteiro a
 * este componente em vez de reimplementar cada um.
 */
@Component({
  imports: [PainelFlutuante],
  template: `
    <button type="button" id="gatilho">Abrir</button>
    <app-painel-flutuante
      #painel="appPainelFlutuante"
      [id]="idPainel()"
      titulo="Painel de teste"
      [aberto]="aberto()"
      (fechar)="fechamentos.set(fechamentos() + 1)"
      (minimizadoChange)="minimizadoEmitido.set($event)"
    >
      <button painelAcoesExtras type="button" aria-label="Maximizar painel">Maximizar</button>
      <button type="button" class="corpo-foco">Foco no corpo</button>
    </app-painel-flutuante>
  `,
})
class Hospedeiro {
  readonly idPainel = signal('teste-painel');
  readonly aberto = signal(false);
  readonly fechamentos = signal(0);
  readonly minimizadoEmitido = signal<boolean | null>(null);
  readonly painel = viewChild.required(PainelFlutuante);
}

describe('PainelFlutuante', () => {
  function montar(id?: string) {
    TestBed.configureTestingModule({ imports: [Hospedeiro] });
    const fixture = TestBed.createComponent(Hospedeiro);
    if (id) fixture.componentInstance.idPainel.set(id);
    fixture.detectChanges();
    return fixture;
  }

  function montarNaMesmaSuiteDeTeste(id?: string) {
    const fixture = TestBed.createComponent(Hospedeiro);
    if (id) fixture.componentInstance.idPainel.set(id);
    fixture.detectChanges();
    return fixture;
  }

  function janela(fixture: ReturnType<typeof montar>): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector('.painel-flutuante__janela');
  }

  async function flush(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('foca a janela ao abrir e devolve o foco a quem abriu ao fechar', async () => {
    const fixture = montar();
    const gatilho = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '#gatilho',
    )!;
    gatilho.focus();
    expect(document.activeElement).toBe(gatilho);

    fixture.componentInstance.aberto.set(true);
    fixture.detectChanges();
    await flush();

    expect(document.activeElement).toBe(janela(fixture));

    fixture.componentInstance.aberto.set(false);
    fixture.detectChanges();
    await flush();

    expect(document.activeElement).toBe(gatilho);
  });

  it('Tab no último elemento focável volta para o primeiro, e Shift+Tab faz o caminho inverso', () => {
    const fixture = montar();
    fixture.componentInstance.aberto.set(true);
    fixture.detectChanges();

    const elemento = janela(fixture)!;
    const minimizar = elemento.querySelector<HTMLButtonElement>('[aria-label^="Minimizar"]')!;
    const corpo = elemento.querySelector<HTMLButtonElement>('.corpo-foco')!;

    corpo.focus();
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    elemento.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(minimizar);

    minimizar.focus();
    const shiftTab = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    elemento.dispatchEvent(shiftTab);
    expect(shiftTab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(corpo);
  });

  it('Escape emite (fechar) sem fechar sozinho — quem hospeda decide', () => {
    const fixture = montar();
    fixture.componentInstance.aberto.set(true);
    fixture.detectChanges();

    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    janela(fixture)!.dispatchEvent(escape);
    fixture.detectChanges();

    expect(escape.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.fechamentos()).toBe(1);
    // Controlado: sem o consumidor reagir ao output, o painel continua "aberto" — só o input decide.
    expect(janela(fixture)).not.toBeNull();
  });

  it('minimizar esconde a janela, emite (minimizadoChange) e persiste', () => {
    const fixture = montar();
    fixture.componentInstance.aberto.set(true);
    fixture.detectChanges();

    const minimizar = janela(fixture)!.querySelector<HTMLButtonElement>(
      '[aria-label^="Minimizar"]',
    )!;
    minimizar.click();
    fixture.detectChanges();

    // `[hidden]`, não desmontagem — o conteúdo projetado (ex.: um iframe de PDF no leitor de
    // documentos) preserva o próprio estado interno em vez de recarregar ao restaurar.
    expect(janela(fixture)?.hidden).toBe(true);
    expect(fixture.componentInstance.minimizadoEmitido()).toBe(true);
    expect(fixture.componentInstance.painel().minimizado()).toBe(true);

    const persistido = JSON.parse(
      localStorage.getItem('contratados-rpg:painel-flutuante:teste-painel')!,
    );
    expect(persistido.minimizado).toBe(true);
  });

  it('restaurar() volta a mostrar a janela minimizada e traz para frente', () => {
    const fixture = montar();
    fixture.componentInstance.aberto.set(true);
    fixture.detectChanges();
    janela(fixture)!
      .querySelector<HTMLButtonElement>('[aria-label^="Minimizar"]')!
      .click();
    fixture.detectChanges();
    expect(janela(fixture)?.hidden).toBe(true);

    fixture.componentInstance.painel().restaurar();
    fixture.detectChanges();

    expect(fixture.componentInstance.painel().minimizado()).toBe(false);
    expect(janela(fixture)?.hidden).toBe(false);
  });

  it('arrastar pelo cabeçalho move a janela pelo deslocamento real do ponteiro', () => {
    const fixture = montar();
    fixture.componentInstance.aberto.set(true);
    fixture.detectChanges();

    const elemento = janela(fixture)!;
    const cabecalho = elemento.querySelector<HTMLElement>('.painel-flutuante__cabecalho')!;
    vi.spyOn(elemento, 'getBoundingClientRect').mockReturnValue(
      criarRetangulo({ left: 16, top: 88, width: 280, height: 300 }),
    );

    cabecalho.dispatchEvent(
      new PointerEvent('pointerdown', { button: 0, clientX: 100, clientY: 100, bubbles: true }),
    );
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 140, clientY: 70 }));
    window.dispatchEvent(new PointerEvent('pointerup'));
    fixture.detectChanges();

    expect(elemento.style.left).toBe('56px'); // 16 + (140 - 100)
    expect(elemento.style.top).toBe('58px'); // 88 + (70 - 100)
  });

  it('moverPara() reposiciona e persiste por [id]; opções.persistir=false não grava', () => {
    const fixture = montar();
    fixture.componentInstance.aberto.set(true);
    fixture.detectChanges();

    fixture.componentInstance.painel().moverPara({ x: 100, y: 40 });
    fixture.detectChanges();
    expect(janela(fixture)!.style.left).toBe('100px');
    expect(janela(fixture)!.style.top).toBe('40px');
    let persistido = JSON.parse(
      localStorage.getItem('contratados-rpg:painel-flutuante:teste-painel')!,
    );
    expect(persistido).toMatchObject({ x: 100, y: 40 });

    fixture.componentInstance.painel().moverPara({ x: 0, y: 0 }, { persistir: false });
    fixture.detectChanges();
    expect(janela(fixture)!.style.left).toBe('0px');
    persistido = JSON.parse(localStorage.getItem('contratados-rpg:painel-flutuante:teste-painel')!);
    expect(persistido).toMatchObject({ x: 100, y: 40 });
  });

  it('uma nova instância com o mesmo [id] retoma posição e minimizado do localStorage', () => {
    const primeira = montar();
    primeira.componentInstance.aberto.set(true);
    primeira.detectChanges();
    primeira.componentInstance.painel().moverPara({ x: 77, y: 33 });
    primeira.componentInstance.painel().restaurar();
    const minimizar = janela(primeira)!.querySelector<HTMLButtonElement>(
      '[aria-label^="Minimizar"]',
    )!;
    minimizar.click();
    primeira.detectChanges();

    const segunda = montarNaMesmaSuiteDeTeste();
    segunda.componentInstance.aberto.set(true);
    segunda.detectChanges();

    expect(segunda.componentInstance.painel().minimizado()).toBe(true);
    segunda.componentInstance.painel().restaurar();
    segunda.detectChanges();
    expect(janela(segunda)!.style.left).toBe('77px');
    expect(janela(segunda)!.style.top).toBe('33px');
  });

  it("ordena minimizar, ação extra e fechar no cabeçalho", () => {
    const fixture = montar();
    fixture.componentInstance.aberto.set(true);
    fixture.detectChanges();

    const rotulos = Array.from(
      janela(fixture)!.querySelectorAll<HTMLButtonElement>(".painel-flutuante__acoes button"),
    ).map((botao) => botao.getAttribute("aria-label"));

    expect(rotulos).toEqual([
      "Minimizar Painel de teste",
      "Maximizar painel",
      "Fechar Painel de teste",
    ]);
  });

  it(
    "ao abrir, limita uma posição persistida que ficou fora do viewport e salva a correção",
    async () => {
      localStorage.setItem(
        "contratados-rpg:painel-flutuante:teste-painel",
        JSON.stringify({ x: 900, y: 700, minimizado: false }),
      );
      const fixture = montar();
      fixture.componentInstance.aberto.set(true);
      fixture.detectChanges();

      const elemento = janela(fixture)!;
      vi.spyOn(elemento, "getBoundingClientRect").mockReturnValue(
        criarRetangulo({ left: 900, top: 700, width: 640, height: 480 }),
      );
      await flush();
      fixture.detectChanges();

      const xEsperado = Math.max(0, window.innerWidth - 640);
      const yEsperado = Math.max(0, window.innerHeight - 480);
      expect(elemento.style.left).toBe(`${xEsperado}px`);
      expect(elemento.style.top).toBe(`${yEsperado}px`);
      expect(
        JSON.parse(localStorage.getItem("contratados-rpg:painel-flutuante:teste-painel")!),
      ).toMatchObject({ x: xEsperado, y: yEsperado });
    },
  );

  it('instâncias com [id] diferentes não compartilham posição/minimizado', () => {
    const primeira = montar('painel-x');
    primeira.componentInstance.aberto.set(true);
    primeira.detectChanges();
    primeira.componentInstance.painel().moverPara({ x: 9, y: 9 });

    const segundaFixture = montarNaMesmaSuiteDeTeste('outro-painel');
    segundaFixture.componentInstance.aberto.set(true);
    segundaFixture.detectChanges();

    expect(janela(segundaFixture)!.style.left).not.toBe('9px');
  });

  it('trazerParaFrente eleva o z-index acima de instâncias já abertas', () => {
    const a = montar('painel-a');
    a.componentInstance.aberto.set(true);
    a.detectChanges();
    const nivelA = Number(janela(a)!.style.zIndex);

    const b = montarNaMesmaSuiteDeTeste('painel-b');
    b.componentInstance.aberto.set(true);
    b.detectChanges();
    const nivelB = Number(janela(b)!.style.zIndex);

    expect(nivelB).toBeGreaterThan(nivelA);

    janela(a)!.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    a.detectChanges();
    expect(Number(janela(a)!.style.zIndex)).toBeGreaterThan(nivelB);
  });

  it('expõe o componente via By.directive para consumidores que preferem consultar a instância', () => {
    const fixture = montar();
    const debug = fixture.debugElement.query(By.directive(PainelFlutuante));
    expect(debug.componentInstance).toBeInstanceOf(PainelFlutuante);
  });

  it("organiza o conteúdo projetado em uma coluna flexível para preencher a janela", () => {
    const estilos = (PainelFlutuante as unknown as DefinicaoComponenteComEstilos).ɵcmp.styles.join(
      '\n',
    );
    expect(estilos).toMatch(
      /painel-flutuante__corpo[^}]*display:\s*flex;[^}]*flex-direction:\s*column/,
    );
  });
});

function criarRetangulo(parcial: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>): DOMRect {
  return {
    ...parcial,
    x: parcial.left,
    y: parcial.top,
    right: parcial.left + parcial.width,
    bottom: parcial.top + parcial.height,
    toJSON: () => ({}),
  };
}
