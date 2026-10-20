import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { PastaLinha } from './pasta-linha.component';

@Component({
  imports: [PastaLinha],
  template: `<div
    app-pasta-linha
    [nome]="nome()"
    [aberta]="aberta()"
    [contagem]="contagem()"
    [nivel]="nivel()"
    [alvo]="alvo()"
    (alternar)="alternou = alternou + 1"
  >
    <button pastaAcoes type="button">Ações</button>
  </div>`,
})
class Hospedeiro {
  readonly nome = signal('Mapas');
  readonly aberta = signal(false);
  readonly contagem = signal<number | null>(3);
  readonly nivel = signal(0);
  readonly alvo = signal(false);
  alternou = 0;
}

describe('PastaLinha', () => {
  function montar() {
    TestBed.configureTestingModule({ imports: [Hospedeiro] });
    const fixture = TestBed.createComponent(Hospedeiro);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    const linha = raiz.querySelector('.pasta-linha') as HTMLElement;
    return { fixture, raiz, linha, host: fixture.componentInstance };
  }

  it('mostra o nome e a contagem; sem contagem, omite', () => {
    const { fixture, raiz, host } = montar();

    expect(raiz.querySelector('.pasta-linha__nome')?.textContent?.trim()).toBe('Mapas');
    expect(raiz.querySelector('.pasta-linha__contagem')?.textContent?.trim()).toBe('3');

    host.contagem.set(null);
    fixture.detectChanges();
    expect(raiz.querySelector('.pasta-linha__contagem')).toBeNull();
  });

  it('o botão principal expõe aria-expanded e emite alternar', () => {
    const { fixture, raiz, host } = montar();
    const botao = raiz.querySelector('.pasta-linha__alternar') as HTMLButtonElement;

    expect(botao.getAttribute('aria-expanded')).toBe('false');
    botao.click();
    expect(host.alternou).toBe(1);

    host.aberta.set(true);
    fixture.detectChanges();
    expect(botao.getAttribute('aria-expanded')).toBe('true');
  });

  it('aberta troca o ícone da pasta; alvo e nível viram classe e variável de recuo', () => {
    const { fixture, linha, host } = montar();
    expect(linha.classList.contains('pasta-linha--aberta')).toBe(false);

    host.aberta.set(true);
    host.alvo.set(true);
    host.nivel.set(2);
    fixture.detectChanges();

    expect(linha.classList.contains('pasta-linha--aberta')).toBe(true);
    expect(linha.classList.contains('pasta-linha--alvo')).toBe(true);
    expect(linha.style.getPropertyValue('--pasta-nivel')).toBe('2');
  });

  it('projeta as ações da linha ao lado do botão principal', () => {
    const { raiz } = montar();

    expect(raiz.querySelector('.pasta-linha > button:not(.pasta-linha__alternar)')?.textContent).toContain(
      'Ações',
    );
  });
});
