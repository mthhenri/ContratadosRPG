import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { afterEach, describe, expect, it } from 'vitest';

import { EditorMarkdown } from '../../../../shared/ui/editor-markdown/editor-markdown.component';
import { AnotacoesFichaEditor } from './anotacoes-ficha-editor.component';

describe('AnotacoesFichaEditor', () => {
  afterEach(() => TestBed.resetTestingModule());

  function montar(valor: string) {
    TestBed.configureTestingModule({ imports: [AnotacoesFichaEditor] });
    const fixture = TestBed.createComponent(AnotacoesFichaEditor);
    fixture.componentRef.setInput('valor', valor);
    fixture.detectChanges();
    const salvos: string[] = [];
    fixture.componentInstance.salvar.subscribe((texto) => salvos.push(texto));
    return { fixture, salvos, raiz: fixture.nativeElement as HTMLElement };
  }

  function botao(raiz: HTMLElement, texto: string): HTMLButtonElement {
    return [...raiz.querySelectorAll('button')].find(
      (elemento) => elemento.textContent?.trim() === texto,
    ) as HTMLButtonElement;
  }

  function editor(fixture: ReturnType<typeof montar>['fixture']): EditorMarkdown {
    return fixture.debugElement.query(By.css('app-editor-markdown')).componentInstance;
  }

  it('mostra o texto em modo leitura e o estado vazio sem anotações', () => {
    const comTexto = montar('Vista no cais.');
    expect(editor(comTexto.fixture).valor()).toBe('Vista no cais.');
    expect(editor(comTexto.fixture).somenteLeitura()).toBe(true);
    TestBed.resetTestingModule();

    const vazio = montar('   ');
    expect(vazio.raiz.querySelector('app-editor-markdown')).toBeNull();
    expect(vazio.raiz.textContent).toContain('Sem anotações.');
  });

  it('edita a partir do valor atual e salva só quando o texto muda', () => {
    const { fixture, salvos, raiz } = montar('Antes.');

    botao(raiz, 'Editar anotações').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.editando()).toBe(true);
    expect(editor(fixture).valor()).toBe('Antes.');

    botao(raiz, 'Salvar').click();
    fixture.detectChanges();
    expect(salvos).toEqual([]);

    botao(raiz, 'Editar anotações').click();
    fixture.detectChanges();
    editor(fixture).valorChange.emit('Depois.');
    botao(raiz, 'Salvar').click();
    fixture.detectChanges();

    expect(salvos).toEqual(['Depois.']);
    expect(fixture.componentInstance.editando()).toBe(false);
  });

  it('cancelar descarta o rascunho', () => {
    const { fixture, salvos, raiz } = montar('Antes.');

    botao(raiz, 'Editar anotações').click();
    fixture.detectChanges();
    editor(fixture).valorChange.emit('Rascunho.');
    botao(raiz, 'Cancelar').click();
    fixture.detectChanges();

    expect(salvos).toEqual([]);
    expect(fixture.componentInstance.editando()).toBe(false);
    expect(editor(fixture).valor()).toBe('Antes.');
  });
});
