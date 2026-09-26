import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { TipoDocumentoEnum } from '@contratados-rpg/shared/enums';

import { DocumentoService } from '../../documento.service';
import { DocumentoCriarDialog } from './documento-criar-dialog.component';

/** Prova o dialog "Novo documento" (m9-04): validação do título, escolha do tipo e o criado. */
describe('DocumentoCriarDialog', () => {
  function montar() {
    const criado = { id: 4, titulo: 'Planta', tipo: TipoDocumentoEnum.IMAGEM };
    const documentoService = { criar: vi.fn(() => of(criado)) };
    TestBed.configureTestingModule({
      imports: [DocumentoCriarDialog],
      providers: [{ provide: DocumentoService, useValue: documentoService }],
    });
    const fixture = TestBed.createComponent(DocumentoCriarDialog);
    fixture.componentRef.setInput('campanhaId', 9);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    const emitidos: unknown[] = [];
    fixture.componentInstance.criado.subscribe((documento) => emitidos.push(documento));
    return { fixture, raiz, documentoService, emitidos, criado };
  }

  const titulo = (raiz: HTMLElement) =>
    raiz.querySelector('input.campo__controle') as HTMLInputElement;
  const enviar = (raiz: HTMLElement) =>
    (raiz.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
  const tipo = (raiz: HTMLElement, rotulo: string) =>
    Array.from(raiz.querySelectorAll<HTMLButtonElement>('button[app-segmentado-item]')).find(
      (item) => item.textContent?.includes(rotulo),
    )!;

  it('não cria sem título (nem só com espaços) e mostra o erro no campo', () => {
    const { fixture, raiz, documentoService } = montar();
    titulo(raiz).value = '   ';
    titulo(raiz).dispatchEvent(new Event('input'));
    enviar(raiz);
    fixture.detectChanges();

    expect(documentoService.criar).not.toHaveBeenCalled();
    expect(raiz.querySelector('.campo__erro')?.textContent).toContain('Dê um título ao documento.');
  });

  it('mostra o limite do título de shared e nasce em Texto', () => {
    const { raiz } = montar();
    expect(titulo(raiz).getAttribute('maxlength')).toBe('120');
    expect(raiz.querySelector('.campo__dica')?.textContent).toContain('0/120');
    expect(tipo(raiz, 'Texto').getAttribute('aria-pressed')).toBe('true');
  });

  it('cria com o título limpo e o tipo escolhido, e devolve o criado', () => {
    const { fixture, raiz, documentoService, emitidos, criado } = montar();
    tipo(raiz, 'Imagem').click();
    fixture.detectChanges();
    expect(tipo(raiz, 'Imagem').getAttribute('aria-pressed')).toBe('true');

    titulo(raiz).value = '  Planta  ';
    titulo(raiz).dispatchEvent(new Event('input'));
    enviar(raiz);

    expect(documentoService.criar).toHaveBeenCalledWith(9, {
      titulo: 'Planta',
      tipo: TipoDocumentoEnum.IMAGEM,
    });
    expect(emitidos).toEqual([criado]);
  });
});
