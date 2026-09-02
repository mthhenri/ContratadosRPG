import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LeitorDocumentos } from './leitor-documentos.component';
import { LeitorDocumentosService } from './leitor-documentos.service';

describe('LeitorDocumentos', () => {
  let fixture: ComponentFixture<LeitorDocumentos>;
  let servico: LeitorDocumentosService;

  beforeEach(async () => {
    // `app-painel-flutuante` persiste posição/minimizado em `localStorage` por `[id]`
    // ("documentos") — sem isso, um teste anterior que minimiza vazaria o estado para o próximo.
    localStorage.clear();
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

  it("mantém barra e visualizador no mesmo corpo flexível do leitor", () => {
    abrir();
    const conteudo = obter('.leitor-documentos__conteudo');
    expect(conteudo.querySelector('.leitor-documentos__toolbar')).toBeTruthy();
    expect(obter<HTMLIFrameElement>('iframe').parentElement).toBe(conteudo);
  });

  it('troca para o Guia do Mestre no mesmo leitor', () => {
    abrir();
    clicar('[aria-label="Selecionar Guia do Mestre"]');
    expect(obter<HTMLIFrameElement>('iframe').getAttribute('src')).toContain(
      '/documentos/guia_de_mestre-v4.0.0.pdf',
    );
    expect(servico.estado().documentoAtivo).toBe('guia-mestre');
  });

  it('mantém o iframe montado ao minimizar para preservar o estado do viewer', () => {
    abrir();
    const iframe = obter<HTMLIFrameElement>('iframe');
    clicar('[aria-label="Minimizar Documentos do sistema"]');
    expect(fixture.nativeElement.querySelector('iframe')).toBe(iframe);
    expect(obter('.painel-flutuante__janela').hidden).toBe(true);
    expect(obter('[aria-label="Reabrir documentos"]')).toBeTruthy();
  });

  it('reabre do gatilho minimizado e devolve o painel visível', () => {
    abrir();
    clicar('[aria-label="Minimizar Documentos do sistema"]');
    clicar('[aria-label="Reabrir documentos"]');
    expect(obter('.painel-flutuante__janela').hidden).toBe(false);
  });

  it('fecha e remove o visualizador, devolvendo o foco ao abridor', async () => {
    const abridor = document.createElement('button');
    document.body.append(abridor);
    abridor.focus();
    abrir();
    clicar('[aria-label="Fechar Documentos do sistema"]');
    await vi.waitFor(() => expect(document.activeElement).toBe(abridor));
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
    abridor.remove();
  });

  it('maximiza na viewport e restaura tamanho e posição anteriores', () => {
    definirViewport(1200, 900);
    abrir();
    servico.alterarTamanho({ largura: 760, altura: 560 }, { largura: 1200, altura: 900 });
    fixture.detectChanges();
    const janela = obter('.painel-flutuante__janela');
    const xAntes = janela.style.left;
    const yAntes = janela.style.top;

    clicar('[aria-label="Maximizar documentos"]');
    expect(servico.estado().tamanho).toEqual({ largura: 1200, altura: 900 });
    expect(obter('.painel-flutuante__janela').style.left).toBe('0px');
    expect(obter('.painel-flutuante__janela').style.top).toBe('0px');
    expect(obter('.painel-flutuante__janela').classList).toContain(
      'painel-flutuante__janela--maximizada',
    );

    clicar('[aria-label="Restaurar tamanho dos documentos"]');
    expect(servico.estado().tamanho).toEqual({ largura: 760, altura: 560 });
    expect(obter('.painel-flutuante__janela').style.left).toBe(xAntes);
    expect(obter('.painel-flutuante__janela').style.top).toBe(yAntes);
  });

  it('usa tela cheia no mobile sem alça de redimensionamento, com o leitor próprio em vez do iframe', () => {
    abrir();
    definirViewport(360, 800);
    window.dispatchEvent(new Event('resize'));
    fixture.detectChanges();
    expect(obter('.painel-flutuante__janela').classList).toContain(
      'painel-flutuante__janela--mobile',
    );
    expect(fixture.nativeElement.querySelector('.leitor-documentos__redimensionar')).toBeNull();
    // Edge mobile não incorpora PDF em iframe e bloqueia o download automático que o plugin
    // nativo precisaria (janela em branco) — o mobile usa o leitor próprio via pdfjs-dist.
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
    const leitorMobile = obter('app-leitor-pdf-mobile');
    expect(leitorMobile.parentElement).toBe(obter('.leitor-documentos__conteudo'));
  });

  it('fecha com Escape quando o foco está dentro do painel', () => {
    abrir();
    const janela = obter('.painel-flutuante__janela');
    janela.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(servico.estado().aberto).toBe(false);
  });

  it("não foca o gatilho se o leitor é destruído depois de minimizar", () => {
    vi.useFakeTimers();
    try {
      abrir();
      clicar('[aria-label="Minimizar Documentos do sistema"]');
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
