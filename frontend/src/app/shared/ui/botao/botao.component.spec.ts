import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Botao, BotaoVariante } from './botao.component';

/**
 * Prova o primitivo de botão: veste o elemento nativo do consumidor (sem embrulhá-lo), emite as
 * classes BEM canônicas que os seletores contextuais do produto ainda usam, e não engole nem a
 * classe-companheira de tamanho nem o conteúdo projetado.
 */
@Component({
  imports: [Botao],
  template: `
    <button
      app-botao
      [variante]="variante()"
      class="autenticacao__enviar"
      type="submit"
      [disabled]="desabilitado()"
      (click)="cliques.set(cliques() + 1)"
    >
      <span class="rotulo">Entrar</span>
    </button>
    <a app-botao variante="secundario" href="/campanhas">Campanhas</a>
  `,
})
class Hospedeiro {
  readonly variante = signal<BotaoVariante | undefined>('primario');
  readonly desabilitado = signal(false);
  readonly cliques = signal(0);
}

describe('Botao', () => {
  function montar() {
    TestBed.configureTestingModule({ imports: [Hospedeiro] });
    const fixture = TestBed.createComponent(Hospedeiro);
    fixture.detectChanges();
    return fixture;
  }

  function botao(fixture: ReturnType<typeof montar>) {
    return (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;
  }

  it('veste o <button> do consumidor em vez de embrulhá-lo em um nó novo', () => {
    const fixture = montar();

    expect((fixture.nativeElement as HTMLElement).querySelector('app-botao')).toBeNull();
    expect(botao(fixture).tagName).toBe('BUTTON');
  });

  it('emite a classe base e preserva a classe-companheira de tamanho do consumidor', () => {
    const alvo = botao(montar());

    expect(alvo.classList.contains('botao')).toBe(true);
    expect(alvo.classList.contains('autenticacao__enviar')).toBe(true);
  });

  it('renderiza a classe canônica de cada variante, uma de cada vez', () => {
    const fixture = montar();
    const variantes: BotaoVariante[] = ['primario', 'secundario', 'perigo', 'positivo'];

    for (const variante of variantes) {
      fixture.componentInstance.variante.set(variante);
      fixture.detectChanges();

      const classes = Array.from(botao(fixture).classList);
      expect(classes).toContain(`botao--${variante}`);
      expect(classes.filter((classe) => classe.startsWith('botao--'))).toHaveLength(1);
    }
  });

  it('fica só com a base quando nenhuma variante é informada', () => {
    const fixture = montar();
    fixture.componentInstance.variante.set(undefined);
    fixture.detectChanges();

    const classes = Array.from(botao(fixture).classList);
    expect(classes).toContain('botao');
    expect(classes.filter((classe) => classe.startsWith('botao--'))).toHaveLength(0);
  });

  it('mantém o conteúdo projetado e os atributos nativos do consumidor', () => {
    const alvo = botao(montar());

    expect(alvo.querySelector('.rotulo')?.textContent?.trim()).toBe('Entrar');
    expect(alvo.type).toBe('submit');
  });

  it('não dispara o clique quando desabilitado', () => {
    const fixture = montar();
    fixture.componentInstance.desabilitado.set(true);
    fixture.detectChanges();

    botao(fixture).click();

    expect(fixture.componentInstance.cliques()).toBe(0);
  });

  it('também veste o <a>, que responde por 6 das chamadas do produto', () => {
    const ancora = (montar().nativeElement as HTMLElement).querySelector('a') as HTMLAnchorElement;

    expect(ancora.classList.contains('botao')).toBe(true);
    expect(ancora.classList.contains('botao--secundario')).toBe(true);
  });
});
