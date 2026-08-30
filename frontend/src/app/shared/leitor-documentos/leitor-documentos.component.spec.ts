import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LeitorDocumentos } from './leitor-documentos.component';
import { LeitorDocumentosService } from './leitor-documentos.service';

describe('LeitorDocumentos', () => {
  let fixture: ComponentFixture<LeitorDocumentos>;
  let servico: LeitorDocumentosService;

  beforeEach(async () => {
    definirViewport(1920, 1080);
    instalarMatchMedia();
    await TestBed.configureTestingModule({ imports: [LeitorDocumentos] }).compileComponents();
    servico = TestBed.inject(LeitorDocumentosService);
    fixture = TestBed.createComponent(LeitorDocumentos);
    fixture.detectChanges();
  });

  it('não monta o visualizador enquanto o leitor está fechado', () => {
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
  });

  it('abre o PDF do Sistema no visualizador nativo sem camada textual própria', () => {
    abrir();
    const iframe = obter<HTMLIFrameElement>('iframe');
    expect(iframe.getAttribute('src')).toContain('/documentos/sistema-v4.1.0.pdf');
    expect(iframe.title).toBe('Sistema');
    expect(fixture.nativeElement.querySelector('canvas')).toBeNull();
    expect(fixture.nativeElement.querySelector('.leitor-pagina__texto')).toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Buscar nos documentos"]')).toBeNull();
  });

  it('troca para o Guia do Mestre no mesmo leitor', () => {
    abrir();
    clicar('[aria-label="Selecionar Guia do Mestre"]');
    expect(obter<HTMLIFrameElement>('iframe').getAttribute('src')).toContain(
      '/documentos/guia_de_mestre-v4.0.0.pdf',
    );
    expect(servico.estado().documentoAtivo).toBe('guia-mestre');
  });

  it('mantém o iframe montado ao recolher para preservar o estado do viewer', () => {
    abrir();
    const iframe = obter<HTMLIFrameElement>('iframe');
    clicar('[aria-label="Recolher documentos"]');
    expect(servico.estado()).toMatchObject({ aberto: true, recolhido: true });
    expect(fixture.nativeElement.querySelector('iframe')).toBe(iframe);
    expect(obter('.leitor-documentos__janela').hidden).toBe(true);
    expect(obter('[aria-label="Reabrir documentos"]')).toBeTruthy();
  });

  it('fecha e remove o visualizador, devolvendo o foco ao abridor', async () => {
    const abridor = document.createElement('button');
    document.body.append(abridor);
    abridor.focus();
    abrir();
    clicar('[aria-label="Fechar documentos"]');
    await vi.waitFor(() => expect(document.activeElement).toBe(abridor));
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
    abridor.remove();
  });

  it('permite arrastar a janela até o topo do viewport, acima da topbar', () => {
    definirViewport(1200, 900);
    abrir();
    const janela = obter('.leitor-documentos__janela');
    vi.spyOn(janela, 'getBoundingClientRect').mockReturnValue(
      criarRetangulo({ left: 0, top: 52, width: 640, height: 480 }),
    );
    obter('.leitor-documentos__cabecalho').dispatchEvent(
      new PointerEvent('pointerdown', { button: 0, clientX: 100, clientY: 100, bubbles: true }),
    );
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 100, clientY: -200 }));
    window.dispatchEvent(new PointerEvent('pointerup'));
    expect(servico.estado().geometria.y).toBe(0);
  });

  it('maximiza na viewport e restaura a geometria anterior', () => {
    definirViewport(1200, 900);
    abrir();
    servico.alterarGeometria(
      { x: 80, y: 70, largura: 760, altura: 560 },
      { largura: 1200, altura: 900 },
    );
    fixture.detectChanges();

    clicar('[aria-label="Maximizar documentos"]');
    expect(servico.estado().geometria).toEqual({
      x: 0,
      y: 0,
      largura: 1200,
      altura: 900,
    });
    expect(obter('.leitor-documentos__janela').classList).toContain(
      'leitor-documentos__janela--maximizada',
    );

    clicar('[aria-label="Restaurar tamanho dos documentos"]');
    expect(servico.estado().geometria).toEqual({
      x: 80,
      y: 70,
      largura: 760,
      altura: 560,
    });
  });

  it('usa tela cheia no mobile sem alça de redimensionamento, com o leitor próprio em vez do iframe', () => {
    abrir();
    definirViewport(360, 800);
    window.dispatchEvent(new Event('resize'));
    fixture.detectChanges();
    expect(obter('.leitor-documentos__janela').classList).toContain(
      'leitor-documentos__janela--mobile',
    );
    expect(fixture.nativeElement.querySelector('.leitor-documentos__redimensionar')).toBeNull();
    // Edge mobile não incorpora PDF em iframe e bloqueia o download automático que o plugin
    // nativo precisaria (janela em branco) — o mobile usa o leitor próprio via pdfjs-dist.
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
    expect(obter('app-leitor-pdf-mobile')).toBeTruthy();
  });

  it('fecha com Escape quando o foco está no shell do leitor', () => {
    abrir();
    const cabecalho = obter('.leitor-documentos__cabecalho');
    cabecalho.focus();
    cabecalho.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(servico.estado().aberto).toBe(false);
  });

  it("não foca o gatilho se o leitor é destruído depois de recolher", () => {
    vi.useFakeTimers();
    try {
      abrir();
      clicar("[aria-label=\"Recolher documentos\"]");
      fixture.destroy();

      expect(() => vi.runAllTimers()).not.toThrow();
    } finally {
      vi.useRealTimers();
    }
  });

  function abrir(): void {
    servico.abrir();
    fixture.detectChanges();
  }

  function clicar(seletor: string): void {
    obter<HTMLButtonElement>(seletor).click();
    fixture.detectChanges();
  }

  function obter<T extends HTMLElement = HTMLElement>(seletor: string): T {
    const elemento = fixture.nativeElement.querySelector(seletor) as T | null;
    expect(elemento, `Elemento ausente: ${seletor}`).not.toBeNull();
    return elemento!;
  }
});

function definirViewport(largura: number, altura: number): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: largura });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: altura });
}

function instalarMatchMedia(): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn((consulta: string) => ({
      matches: consulta.includes('560px') && window.innerWidth <= 560,
      media: consulta,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function criarRetangulo(
  parcial: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
): DOMRect {
  return {
    ...parcial,
    x: parcial.left,
    y: parcial.top,
    right: parcial.left + parcial.width,
    bottom: parcial.top + parcial.height,
    toJSON: () => ({}),
  };
}
