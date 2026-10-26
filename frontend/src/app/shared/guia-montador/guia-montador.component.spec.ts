import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { GuiaMontador } from './guia-montador.component';

@Component({
  imports: [GuiaMontador],
  template: `<app-guia-montador [aberto]="aberto()" (fechar)="aberto.set(false)" />`,
})
class Hospedeiro {
  readonly aberto = signal(true);
}

describe('GuiaMontador', () => {
  function montar() {
    const fixture = TestBed.createComponent(Hospedeiro);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    const botao = (texto: string) =>
      Array.from(raiz.querySelectorAll<HTMLButtonElement>('button')).find(
        (elemento) => elemento.textContent?.trim() === texto,
      )!;
    return { fixture, raiz, botao };
  }

  it('navega entre os assuntos e explica as ações reais do produto', () => {
    const { fixture, raiz, botao } = montar();
    expect(raiz.querySelector('.guia__conteudo')?.textContent).toContain('Escolha um modelo');

    botao('Editar termos').click();
    fixture.detectChanges();
    const conteudo = raiz.querySelector('.guia__conteudo')!.textContent!;
    expect(conteudo).toContain('Desfazer');
    expect(conteudo).toContain('Limpar');
    expect(conteudo).not.toContain('Restaurar');
    expect(botao('Editar termos').getAttribute('aria-pressed')).toBe('true');

    botao('Exemplos').click();
    fixture.detectChanges();
    expect(raiz.querySelector('.guia__conteudo')?.textContent).toContain('FOR*2 [F]');
    expect(raiz.querySelector('.guia__conteudo')?.textContent).not.toContain('Exemplo misto');
    expect(raiz.querySelector('.guia__rodape')?.textContent).not.toContain('demonstrações');
  });

  it('abre e fecha o guia real de expressões preservando o assunto do montador', () => {
    const { fixture, raiz, botao } = montar();
    botao('Editar termos').click();
    fixture.detectChanges();
    raiz.querySelector<HTMLButtonElement>('app-guia-formula .guia-gatilho')!.click();
    fixture.detectChanges();

    const dialogos = raiz.querySelectorAll<HTMLDialogElement>('dialog');
    expect(dialogos).toHaveLength(2);
    expect(dialogos[0].open).toBe(true);
    expect(dialogos[1].open).toBe(true);
    expect(dialogos[1].textContent).toContain('Como escrever uma fórmula');

    dialogos[1].dispatchEvent(new Event('cancel', { cancelable: true }));
    fixture.detectChanges();
    expect(dialogos[1].open).toBe(false);
    expect(dialogos[0].open).toBe(true);
    expect(botao('Editar termos').getAttribute('aria-pressed')).toBe('true');
  });

  it('devolve o fechamento ao hospedeiro pelo rodapé e por Escape', () => {
    const { fixture, raiz, botao } = montar();
    const dialogo = raiz.querySelector<HTMLDialogElement>('dialog')!;
    botao('Voltar ao montador').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.aberto()).toBe(false);
    expect(dialogo.open).toBe(false);

    fixture.componentInstance.aberto.set(true);
    fixture.detectChanges();
    dialogo.dispatchEvent(new Event('cancel', { cancelable: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.aberto()).toBe(false);
    expect(dialogo.open).toBe(false);
  });
});
