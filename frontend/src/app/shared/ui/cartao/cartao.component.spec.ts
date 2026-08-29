import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Cartao, CartaoNivelTitulo } from './cartao.component';

/**
 * Prova o invólucro de cartão: caixa sempre presente, cabeçalho (índice projetado + título +
 * régua) só quando `[titulo]` é informado, e o nível de heading configurável — os dois casos
 * reais auditados na `ui-03` (`h2` na maioria das 15 cópias, `h1` em `perfil.page`/`gestao.page`).
 */
@Component({
  imports: [Cartao],
  template: `
    <app-cartao
      [titulo]="titulo()"
      [nivelTitulo]="nivelTitulo()"
      [cabecalhoQuebravel]="cabecalhoQuebravel()"
    >
      <span cartaoIndice>{{ indice() }}</span>
      <span cartaoFim class="fim">{{ fim() }}</span>
      <p class="conteudo">Corpo do cartão</p>
    </app-cartao>
  `,
})
class Hospedeiro {
  readonly titulo = signal<string | undefined>(undefined);
  readonly nivelTitulo = signal<CartaoNivelTitulo>('h2');
  readonly cabecalhoQuebravel = signal(false);
  readonly indice = signal('1');
  readonly fim = signal('12');
}

describe('Cartao', () => {
  function montar() {
    TestBed.configureTestingModule({ imports: [Hospedeiro] });
    const fixture = TestBed.createComponent(Hospedeiro);
    fixture.detectChanges();
    return fixture;
  }

  function raiz(fixture: ReturnType<typeof montar>) {
    return fixture.nativeElement as HTMLElement;
  }

  it('renderiza a caixa canônica com o conteúdo projetado', () => {
    const elemento = raiz(montar());

    expect(elemento.querySelector('.cartao')).not.toBeNull();
    expect(elemento.querySelector('.cartao > .conteudo')?.textContent?.trim()).toBe(
      'Corpo do cartão',
    );
  });

  it('não renderiza cabeçalho sem [titulo]', () => {
    const elemento = raiz(montar());

    expect(elemento.querySelector('.cartao__cabecalho')).toBeNull();
  });

  it('renderiza índice, título e régua quando [titulo] é informado', () => {
    const fixture = montar();
    fixture.componentInstance.titulo.set('Consulta por Prestígio');
    fixture.detectChanges();

    const elemento = raiz(fixture);
    const cabecalho = elemento.querySelector('.cartao__cabecalho');

    expect(cabecalho).not.toBeNull();
    expect(elemento.querySelector('.cartao__indice')?.textContent?.trim()).toBe('1');
    expect(elemento.querySelector('.cartao__titulo')?.textContent?.trim()).toBe(
      'Consulta por Prestígio',
    );
    expect(elemento.querySelector('.cartao__regua')).not.toBeNull();
    expect(elemento.querySelector('.cartao__cabecalho > .fim')?.textContent?.trim()).toBe('12');
  });

  it('usa <h2> por padrão e <h1> quando nivelTitulo é h1', () => {
    const fixture = montar();
    fixture.componentInstance.titulo.set('Perfil');
    fixture.detectChanges();

    expect(raiz(fixture).querySelector('h2.cartao__titulo')).not.toBeNull();
    expect(raiz(fixture).querySelector('h1.cartao__titulo')).toBeNull();

    fixture.componentInstance.nivelTitulo.set('h1');
    fixture.detectChanges();

    expect(raiz(fixture).querySelector('h1.cartao__titulo')).not.toBeNull();
    expect(raiz(fixture).querySelector('h2.cartao__titulo')).toBeNull();
  });

  it('habilita a quebra de linha do cabeçalho somente quando solicitada', () => {
    const fixture = montar();
    fixture.componentInstance.titulo.set('Carrinho');
    fixture.componentInstance.cabecalhoQuebravel.set(true);
    fixture.detectChanges();

    expect(raiz(fixture).querySelector('.cartao__cabecalho--quebravel')).not.toBeNull();
  });
});
