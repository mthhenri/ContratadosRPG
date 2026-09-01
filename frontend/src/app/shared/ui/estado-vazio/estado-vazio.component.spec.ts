import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { IconeNome } from '../../icone/icone.component';
import { EstadoVazio } from './estado-vazio.component';

/**
 * Prova os três slots (ícone opcional, título obrigatório, linha de apoio opcional) e a ação
 * projetada — os mesmos casos que `HistoricoRolagensSidebar`/`FichaAcervo`/`CampanhaLista`/
 * `InventarioEsquadrao`/`FichaInventario` passam a consumir em vez da marcação ad-hoc.
 */
@Component({
  imports: [EstadoVazio],
  template: `
    <app-estado-vazio [icone]="icone()" [titulo]="titulo()" [linhaApoio]="linhaApoio()">
      @if (comAcao()) {
        <button type="button" estadoVazioAcao>Criar campanha</button>
      }
    </app-estado-vazio>
  `,
})
class Hospedeiro {
  readonly icone = signal<IconeNome | undefined>(undefined);
  readonly titulo = signal('Nenhuma campanha ainda.');
  readonly linhaApoio = signal<string | undefined>(undefined);
  readonly comAcao = signal(false);
}

describe('EstadoVazio', () => {
  function montar() {
    TestBed.configureTestingModule({ imports: [Hospedeiro] });
    const fixture = TestBed.createComponent(Hospedeiro);
    fixture.detectChanges();
    return fixture;
  }

  function raiz(fixture: ReturnType<typeof montar>) {
    return fixture.nativeElement as HTMLElement;
  }

  it('renderiza o título sempre, sem ícone/apoio/ação quando não informados', () => {
    const elemento = raiz(montar());

    expect(elemento.querySelector('.estado-vazio__titulo')?.textContent?.trim()).toBe(
      'Nenhuma campanha ainda.',
    );
    expect(elemento.querySelector('.estado-vazio__icone')).toBeNull();
    expect(elemento.querySelector('.estado-vazio__apoio')).toBeNull();
    expect(elemento.querySelector('[estadovazioacao]')).toBeNull();
  });

  it('renderiza o ícone quando informado', () => {
    const fixture = montar();
    fixture.componentInstance.icone.set('campanhas');
    fixture.detectChanges();

    expect(raiz(fixture).querySelector('app-icone.estado-vazio__icone')).not.toBeNull();
  });

  it('renderiza a linha de apoio quando informada', () => {
    const fixture = montar();
    fixture.componentInstance.linhaApoio.set('Crie uma nova ou entre com o código de convite.');
    fixture.detectChanges();

    expect(raiz(fixture).querySelector('.estado-vazio__apoio')?.textContent?.trim()).toBe(
      'Crie uma nova ou entre com o código de convite.',
    );
  });

  it('projeta a ação opcional', () => {
    const fixture = montar();
    fixture.componentInstance.comAcao.set(true);
    fixture.detectChanges();

    const acao = raiz(fixture).querySelector('button[estadovazioacao]');
    expect(acao?.textContent?.trim()).toBe('Criar campanha');
  });
});
