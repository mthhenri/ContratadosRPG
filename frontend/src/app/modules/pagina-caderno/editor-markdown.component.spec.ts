import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EDITOR_MARKDOWN_FACTORY, EditorMarkdown } from './editor-markdown.component';

describe('EditorMarkdown', () => {
  let fixture: ComponentFixture<EditorMarkdown>;
  let aoAlterar: (markdown: string) => void;
  let markdownAtual: string;
  const definirMarkdown = vi.fn((markdown: string) => {
    markdownAtual = markdown;
    queueMicrotask(() => aoAlterar(markdown));
  });
  const definirSomenteLeitura = vi.fn();
  const aplicarFormato = vi.fn();
  const estaEmTabela = vi.fn(() => false);
  const destruir = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    markdownAtual = '';
    await TestBed.configureTestingModule({
      imports: [EditorMarkdown],
      providers: [
        {
          provide: EDITOR_MARKDOWN_FACTORY,
          useValue: (opcoes: {
            valorInicial: string;
            aoAlterar: (markdown: string) => void;
          }) => {
            markdownAtual = opcoes.valorInicial;
            aoAlterar = opcoes.aoAlterar;
            return {
              criar: () => Promise.resolve(),
              destruir,
              obterMarkdown: () => markdownAtual,
              definirMarkdown,
              definirSomenteLeitura,
              aplicarFormato,
              estaEmTabela,
            };
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(EditorMarkdown);
    fixture.componentRef.setInput('valor', '# Registro');
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('entrega alterações do editor visual como Markdown', () => {
    const alteracoes: string[] = [];
    fixture.componentInstance.valorChange.subscribe((valor) => alteracoes.push(valor));

    aoAlterar('Texto **importante**');

    expect(alteracoes).toEqual(['Texto **importante**']);
  });

  it('sincroniza outra página sem recriar a instância', () => {
    fixture.componentRef.setInput('valor', '## Outra página');
    fixture.detectChanges();

    expect(definirMarkdown).toHaveBeenCalledWith('## Outra página');
  });

  it('não trata a sincronização assíncrona de outra página como digitação', async () => {
    const alteracoes: string[] = [];
    fixture.componentInstance.valorChange.subscribe((valor) => alteracoes.push(valor));

    fixture.componentRef.setInput('valor', '## Outra página');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(alteracoes).toEqual([]);
  });

  it('bloqueia escrita e emissão quando está somente leitura', () => {
    const alteracoes: string[] = [];
    fixture.componentInstance.valorChange.subscribe((valor) => alteracoes.push(valor));
    fixture.componentRef.setInput('somenteLeitura', true);
    fixture.detectChanges();

    aoAlterar('mudança indevida');

    expect(definirSomenteLeitura).toHaveBeenLastCalledWith(true);
    expect(alteracoes).toEqual([]);
  });

  it('destrói a instância junto com o componente', () => {
    fixture.destroy();
    expect(destruir).toHaveBeenCalledOnce();
  });

  it.each([
    ['Inserir tabela', 'TABELA'],
    ['Adicionar linha', 'LINHA_ADICIONAR'],
    ['Remover linha', 'LINHA_REMOVER'],
    ['Adicionar coluna', 'COLUNA_ADICIONAR'],
    ['Remover coluna', 'COLUNA_REMOVER'],
  ])('aciona %s pelo formato %s', (rotulo, formato) => {
    const botao = fixture.nativeElement.querySelector(`[aria-label="${rotulo}"]`) as HTMLButtonElement;
    expect(botao).not.toBeNull();
    botao.disabled = false;
    botao.click();
    expect(aplicarFormato).toHaveBeenCalledWith(formato);
  });

  it('desabilita ações estruturais fora de tabela', () => {
    for (const rotulo of ['Adicionar linha', 'Remover linha', 'Adicionar coluna', 'Remover coluna']) {
      const botao = fixture.nativeElement.querySelector(`[aria-label="${rotulo}"]`) as HTMLButtonElement;
      expect(botao.disabled).toBe(true);
      expect(botao.getAttribute('aria-disabled')).toBe('true');
    }
  });

  it('explica uma ação de formatação ao passar o ponteiro sobre o botão', () => {
    vi.useFakeTimers();
    try {
      const botao = fixture.nativeElement.querySelector('[aria-label="Citação"]') as HTMLButtonElement;

      botao.dispatchEvent(new Event('pointerenter'));
      vi.advanceTimersByTime(300);

      expect(document.body.querySelector('[role="tooltip"]')?.textContent).toContain('Citação');
    } finally {
      document.body.querySelector('[role="tooltip"]')?.remove();
      vi.useRealTimers();
    }
  });

  it('oferece voltar ao topo depois de rolar o editor', () => {
    const rolarAteOTopo = vi.fn();
    Object.defineProperty(fixture.nativeElement, 'scrollTo', {
      configurable: true,
      value: rolarAteOTopo,
    });
    fixture.nativeElement.scrollTop = 280;
    fixture.nativeElement.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    const botao = fixture.nativeElement.querySelector('[aria-label="Voltar ao topo"]') as HTMLButtonElement;
    expect(botao).not.toBeNull();

    botao.click();
    expect(rolarAteOTopo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });
});
