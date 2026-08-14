import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EDITOR_MARKDOWN_FACTORY, EditorMarkdown } from './editor-markdown.component';

describe('EditorMarkdown', () => {
  let fixture: ComponentFixture<EditorMarkdown>;
  let aoAlterar: (markdown: string) => void;
  let markdownAtual: string;
  const definirMarkdown = vi.fn((markdown: string) => { markdownAtual = markdown; });
  const definirSomenteLeitura = vi.fn();
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
});
