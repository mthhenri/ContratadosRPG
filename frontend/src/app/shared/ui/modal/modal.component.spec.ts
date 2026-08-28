import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Modal } from './modal.component';

/**
 * Prova o primitivo de modal: abre/fecha pelas três vias (Escape, clique no fundo, botão "×"),
 * todas caindo em `(fechou)`; `[fechavelPeloFundo]="false"` desliga só o clique no fundo; e a
 * rolagem do `<body>` fica travada enquanto o `<dialog>` está aberto.
 */
@Component({
  imports: [Modal],
  template: `
    <button type="button" id="gatilho">Abrir</button>
    <app-modal
      [aberto]="aberto()"
      [titulo]="'Editar item'"
      [largura]="largura()"
      [fechavelPeloFundo]="fechavelPeloFundo()"
      (fechou)="fechamentos.set(fechamentos() + 1)"
    >
      <p class="conteudo-projetado">Conteúdo do formulário</p>
    </app-modal>
  `,
})
class Hospedeiro {
  readonly aberto = signal(false);
  readonly largura = signal<string | null>(null);
  readonly fechavelPeloFundo = signal(true);
  readonly fechamentos = signal(0);
}

describe('Modal', () => {
  function montar() {
    TestBed.configureTestingModule({ imports: [Hospedeiro] });
    const fixture = TestBed.createComponent(Hospedeiro);
    fixture.detectChanges();
    return fixture;
  }

  function dialogo(fixture: ReturnType<typeof montar>) {
    return (fixture.nativeElement as HTMLElement).querySelector('dialog') as HTMLDialogElement;
  }

  afterEach(() => {
    // As transições de `aberto()` para `false` no `afterEach` de cada teste já destravam a rolagem
    // (efeito de limpeza do `Modal`) — reforça que nenhum teste vaza `overflow: hidden` no `body`.
    document.body.style.overflow = '';
  });

  it('chama showModal() quando aberto e close() quando fechado pelo input', () => {
    const fixture = montar();
    expect(dialogo(fixture).open).toBe(false);

    fixture.componentInstance.aberto.set(true);
    fixture.detectChanges();
    expect(dialogo(fixture).open).toBe(true);

    fixture.componentInstance.aberto.set(false);
    fixture.detectChanges();
    expect(dialogo(fixture).open).toBe(false);
  });

  it('projeta o conteúdo do consumidor e o título no aria-labelledby', () => {
    const fixture = montar();
    fixture.componentInstance.aberto.set(true);
    fixture.detectChanges();

    const elemento = dialogo(fixture);
    expect(elemento.querySelector('.conteudo-projetado')?.textContent).toBe(
      'Conteúdo do formulário',
    );
    const idTitulo = elemento.getAttribute('aria-labelledby');
    expect(elemento.querySelector(`#${idTitulo}`)?.textContent).toBe('Editar item');
  });

  it('fecha e emite (fechou) ao clicar no "×"', () => {
    const fixture = montar();
    fixture.componentInstance.aberto.set(true);
    fixture.detectChanges();

    dialogo(fixture).querySelector<HTMLButtonElement>('.modal__fechar')?.click();
    fixture.detectChanges();

    expect(dialogo(fixture).open).toBe(false);
    expect(fixture.componentInstance.fechamentos()).toBe(1);
  });

  it('fecha e emite (fechou) no Escape (evento cancel do <dialog>)', () => {
    const fixture = montar();
    fixture.componentInstance.aberto.set(true);
    fixture.detectChanges();

    dialogo(fixture).dispatchEvent(new Event('cancel', { cancelable: true }));
    fixture.detectChanges();

    expect(dialogo(fixture).open).toBe(false);
    expect(fixture.componentInstance.fechamentos()).toBe(1);
  });

  it('fecha ao clicar no fundo (o <dialog> em si, não um filho projetado)', () => {
    const fixture = montar();
    fixture.componentInstance.aberto.set(true);
    fixture.detectChanges();

    dialogo(fixture).click();
    fixture.detectChanges();

    expect(dialogo(fixture).open).toBe(false);
    expect(fixture.componentInstance.fechamentos()).toBe(1);
  });

  it('clique em conteúdo projetado não fecha (o alvo não é o próprio <dialog>)', () => {
    const fixture = montar();
    fixture.componentInstance.aberto.set(true);
    fixture.detectChanges();

    dialogo(fixture).querySelector<HTMLElement>('.conteudo-projetado')?.click();
    fixture.detectChanges();

    expect(dialogo(fixture).open).toBe(true);
    expect(fixture.componentInstance.fechamentos()).toBe(0);
  });

  it('[fechavelPeloFundo]="false" desliga só o clique no fundo — Escape e "×" continuam fechando', () => {
    const fixture = montar();
    fixture.componentInstance.fechavelPeloFundo.set(false);
    fixture.componentInstance.aberto.set(true);
    fixture.detectChanges();

    dialogo(fixture).click();
    fixture.detectChanges();
    expect(dialogo(fixture).open).toBe(true);
    expect(fixture.componentInstance.fechamentos()).toBe(0);

    dialogo(fixture).dispatchEvent(new Event('cancel', { cancelable: true }));
    fixture.detectChanges();
    expect(dialogo(fixture).open).toBe(false);
    expect(fixture.componentInstance.fechamentos()).toBe(1);
  });

  it('aplica a largura pedida via custom property, não via max-width inline', () => {
    // `--modal-largura` (não `[style.max-width]` direto): um `style` inline venceria a media
    // query de `bp.mobile` do SCSS incondicionalmente, travando a largura de desktop no mobile
    // (achado ao vivo no gate visual da ui-02, no catálogo do inventário — 50vw virava 180px numa
    // tela de 360px). Consumida via `var()`, a cascata normal deixa a media query vencer.
    const fixture = montar();
    fixture.componentInstance.largura.set('640px');
    fixture.componentInstance.aberto.set(true);
    fixture.detectChanges();

    expect(dialogo(fixture).style.maxWidth).toBe('');
    expect(dialogo(fixture).style.getPropertyValue('--modal-largura')).toBe('640px');
  });

  it('trava a rolagem do body enquanto o modal está aberto e destrava ao fechar', () => {
    const fixture = montar();
    expect(document.body.style.overflow).toBe('');

    fixture.componentInstance.aberto.set(true);
    fixture.detectChanges();
    expect(document.body.style.overflow).toBe('hidden');

    fixture.componentInstance.aberto.set(false);
    fixture.detectChanges();
    expect(document.body.style.overflow).toBe('');
  });

  it('dois modais abertos ao mesmo tempo só destravam o body quando o último fecha', () => {
    // Segunda instância na mesma `TestBed` já configurada por `montar()` — reconfigurar de novo
    // depois de criar um componente lança "test module has already been instantiated".
    const a = montar();
    const b = TestBed.createComponent(Hospedeiro);
    b.detectChanges();

    a.componentInstance.aberto.set(true);
    a.detectChanges();
    b.componentInstance.aberto.set(true);
    b.detectChanges();
    expect(document.body.style.overflow).toBe('hidden');

    a.componentInstance.aberto.set(false);
    a.detectChanges();
    expect(document.body.style.overflow).toBe('hidden');

    b.componentInstance.aberto.set(false);
    b.detectChanges();
    expect(document.body.style.overflow).toBe('');
  });
});
