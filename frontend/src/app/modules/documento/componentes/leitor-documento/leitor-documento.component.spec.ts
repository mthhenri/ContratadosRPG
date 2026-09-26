import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { TipoDocumentoEnum } from '@contratados-rpg/shared/enums';

import { EditorMarkdown } from '../../../../shared/ui/editor-markdown/editor-markdown.component';
import { type DocumentoLeitura, LeitorDocumento } from './leitor-documento.component';

const texto: DocumentoLeitura = {
  titulo: 'Carta do informante',
  tipo: TipoDocumentoEnum.TEXTO,
  conteudoMarkdown: '# Carta\n\nEncontre-me no cais.',
  imagemUrl: null,
};
const imagem: DocumentoLeitura = {
  titulo: 'Mapa do porto',
  tipo: TipoDocumentoEnum.IMAGEM,
  conteudoMarkdown: null,
  imagemUrl: '/uploads/documentos/mapa.png',
};

/** Prova o `LeitorDocumento` (m9-04): texto só leitura; imagem, erro e alternância de tamanho. */
describe('LeitorDocumento', () => {
  function montar(documento: DocumentoLeitura) {
    TestBed.configureTestingModule({ imports: [LeitorDocumento] });
    const fixture = TestBed.createComponent(LeitorDocumento);
    fixture.componentRef.setInput('documento', documento);
    fixture.detectChanges();
    return { fixture, raiz: fixture.nativeElement as HTMLElement };
  }

  function botaoTamanho(raiz: HTMLElement): HTMLButtonElement {
    return raiz.querySelector('.leitor-documento__barra button') as HTMLButtonElement;
  }

  it('mostra o texto pelo editor Markdown em somente leitura, com o título como nome acessível', () => {
    const { fixture, raiz } = montar(texto);
    const editor = fixture.debugElement.query(By.css('app-editor-markdown'))
      .componentInstance as EditorMarkdown;

    expect(editor.valor()).toBe(texto.conteudoMarkdown);
    expect(editor.somenteLeitura()).toBe(true);
    expect(editor.rotulo()).toBe('Carta do informante');
    expect(raiz.querySelector('img')).toBeNull();
  });

  it('mostra a imagem com o título no alt e esqueleto até carregar', () => {
    const { fixture, raiz } = montar(imagem);
    const img = raiz.querySelector('img') as HTMLImageElement;

    expect(img.getAttribute('src')).toBe('/uploads/documentos/mapa.png');
    expect(img.alt).toBe('Mapa do porto');
    expect(raiz.querySelector('app-esqueleto')).not.toBeNull();
    expect(botaoTamanho(raiz).disabled).toBe(true);

    img.dispatchEvent(new Event('load'));
    fixture.detectChanges();
    expect(raiz.querySelector('app-esqueleto')).toBeNull();
    expect(botaoTamanho(raiz).disabled).toBe(false);
  });

  it('troca a imagem por um estado de erro quando a URL falha', () => {
    const { fixture, raiz } = montar(imagem);
    (raiz.querySelector('img') as HTMLImageElement).dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(raiz.querySelector('img')).toBeNull();
    expect(raiz.querySelector('app-estado-vazio')?.textContent).toContain(
      'Não foi possível carregar a imagem.',
    );
  });

  it('alterna entre ajustar à largura e tamanho real, e o quadro rola só no tamanho real', () => {
    const { fixture, raiz } = montar(imagem);
    (raiz.querySelector('img') as HTMLImageElement).dispatchEvent(new Event('load'));
    fixture.detectChanges();
    const quadro = raiz.querySelector('.leitor-documento__quadro') as HTMLElement;

    expect(botaoTamanho(raiz).getAttribute('aria-label')).toBe('Ver em tamanho real');
    expect(botaoTamanho(raiz).getAttribute('aria-pressed')).toBe('false');
    expect(quadro.classList).not.toContain('leitor-documento__quadro--real');

    botaoTamanho(raiz).click();
    fixture.detectChanges();
    expect(botaoTamanho(raiz).getAttribute('aria-label')).toBe('Ajustar à largura');
    expect(botaoTamanho(raiz).getAttribute('aria-pressed')).toBe('true');
    expect(quadro.classList).toContain('leitor-documento__quadro--real');
    expect(quadro.getAttribute('tabindex')).toBe('0');

    botaoTamanho(raiz).click();
    fixture.detectChanges();
    expect(quadro.classList).not.toContain('leitor-documento__quadro--real');
  });

  it('uma imagem nova volta ao esqueleto e ao ajuste à largura', () => {
    const { fixture, raiz } = montar(imagem);
    (raiz.querySelector('img') as HTMLImageElement).dispatchEvent(new Event('load'));
    fixture.detectChanges();
    botaoTamanho(raiz).click();
    fixture.detectChanges();

    fixture.componentRef.setInput('documento', { ...imagem, imagemUrl: '/uploads/documentos/b.png' });
    fixture.detectChanges();
    expect(raiz.querySelector('app-esqueleto')).not.toBeNull();
    expect(raiz.querySelector('.leitor-documento__quadro--real')).toBeNull();
  });

  it('um documento de imagem ainda sem arquivo mostra o estado vazio', () => {
    const { raiz } = montar({ ...imagem, imagemUrl: null });
    expect(raiz.querySelector('img')).toBeNull();
    expect(raiz.querySelector('app-estado-vazio')?.textContent).toContain('Nenhuma imagem ainda.');
  });
});
