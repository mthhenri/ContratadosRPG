import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Tooltip } from '../../tooltip/tooltip.directive';
import { EDITOR_MARKDOWN_FACTORY, EditorMarkdown } from './editor-markdown.component';
import {
  type AcaoMarkdown,
  ESTADO_EDITOR_MARKDOWN_INICIAL,
  type EstadoEditorMarkdown,
} from './editor-markdown-formatos';

describe('EditorMarkdown', () => {
  let fixture: ComponentFixture<EditorMarkdown>;
  let aoAlterar: (markdown: string) => void;
  let aoAlterarEstado: (estado: EstadoEditorMarkdown) => void;
  let markdownAtual: string;
  const definirMarkdown = vi.fn((markdown: string) => {
    markdownAtual = markdown;
    queueMicrotask(() => aoAlterar(markdown));
  });
  const definirSomenteLeitura = vi.fn();
  const aplicarAcao = vi.fn();
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
            aoAlterarEstado: (estado: EstadoEditorMarkdown) => void;
          }) => {
            markdownAtual = opcoes.valorInicial;
            aoAlterar = opcoes.aoAlterar;
            aoAlterarEstado = opcoes.aoAlterarEstado;
            return {
              criar: () => Promise.resolve(),
              destruir,
              obterMarkdown: () => markdownAtual,
              definirMarkdown,
              definirSomenteLeitura,
              aplicarAcao,
              definirMargemInferiorRolagem: vi.fn(),
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

  function informarEstado(parcial: Partial<EstadoEditorMarkdown>): void {
    aoAlterarEstado({ ...ESTADO_EDITOR_MARKDOWN_INICIAL, ...parcial });
    fixture.detectChanges();
  }

  function botao(rotulo: string): HTMLButtonElement | null {
    return fixture.nativeElement.querySelector(`[aria-label="${rotulo}"]`);
  }

  it.each([
    ['Desfazer', 'DESFAZER'],
    ['Título principal', 'TITULO_1'],
    ['Negrito', 'NEGRITO'],
    ['Lista numerada', 'LISTA_NUMERADA'],
    ['Citação', 'CITACAO'],
    ['Inserir tabela', 'TABELA'],
  ])('aciona %s pela ação %s', (rotulo, acao) => {
    informarEstado({ podeDesfazer: true });
    botao(rotulo)!.click();
    expect(aplicarAcao).toHaveBeenCalledWith(acao);
  });

  it('usa os primitivos de botão na barra', () => {
    const botoes = fixture.nativeElement.querySelectorAll('.editor-markdown__barra button');
    expect(botoes.length).toBeGreaterThan(0);
    for (const elemento of botoes) {
      expect((elemento as HTMLElement).classList).toContain('botao-icone');
    }
  });

  it('deixa Desfazer/Refazer fora da faixa que rola de lado', () => {
    const historico = fixture.nativeElement.querySelector('.editor-markdown__historico') as HTMLElement;
    const faixa = fixture.nativeElement.querySelector('.editor-markdown__faixa--formatacao') as HTMLElement;

    expect(historico.contains(botao('Desfazer'))).toBe(true);
    expect(historico.contains(botao('Refazer'))).toBe(true);
    expect(faixa.contains(botao('Desfazer'))).toBe(false);
  });

  it('botão "Código" explica como fazer um bloco (o botão só marca código em linha)', () => {
    const dica = fixture.debugElement
      .query((elemento) => elemento.nativeElement === botao('Código'))
      .injector.get(Tooltip)
      .appTooltip();
    expect(dica).toContain('```');
  });

  it('não oferece mais o botão avulso de texto normal (os formatos alternam)', () => {
    expect(botao('Texto normal')).toBeNull();
  });

  it('mostra a faixa de tabela só com o cursor em tabela, sem depender de clique', () => {
    expect(fixture.nativeElement.querySelector('[aria-label="Ações da tabela"]')).toBeNull();

    informarEstado({ emTabela: true });
    expect(fixture.nativeElement.querySelector('[aria-label="Ações da tabela"]')).not.toBeNull();

    informarEstado({ emTabela: false });
    expect(fixture.nativeElement.querySelector('[aria-label="Ações da tabela"]')).toBeNull();
  });

  it.each([
    ['Inserir linha acima', 'LINHA_ACIMA'],
    ['Inserir linha abaixo', 'LINHA_ABAIXO'],
    ['Remover a linha atual', 'LINHA_REMOVER'],
    ['Inserir coluna à esquerda', 'COLUNA_ESQUERDA'],
    ['Inserir coluna à direita', 'COLUNA_DIREITA'],
    ['Remover a coluna atual', 'COLUNA_REMOVER'],
    ['Continuar escrevendo abaixo da tabela', 'TABELA_SAIR'],
    ['Apagar a tabela inteira', 'TABELA_REMOVER'],
  ])('a faixa de tabela aciona "%s" (%s) com botão rotulado', (rotulo, acao) => {
    informarEstado({ emTabela: true });
    const alvo = botao(rotulo)!;
    expect(alvo.classList).toContain('botao');
    expect(alvo.textContent?.trim().length).toBeGreaterThan(0);
    alvo.click();
    expect(aplicarAcao).toHaveBeenCalledWith(acao as AcaoMarkdown);
  });

  it('ordena a faixa de tabela pelo uso, com rótulos que se explicam sem título de grupo', () => {
    informarEstado({ emTabela: true });
    const rotulos = [
      ...fixture.nativeElement.querySelectorAll('.editor-markdown__faixa--tabela button'),
    ].map((elemento) => (elemento as HTMLElement).textContent?.trim());

    expect(rotulos).toEqual([
      'Texto abaixo',
      '+ Linha abaixo',
      '+ Linha acima',
      'Remover linha',
      '+ Coluna à direita',
      '+ Coluna à esquerda',
      'Remover coluna',
      'Apagar tabela',
    ]);
    expect(botao('Inserir linha acima')!.disabled).toBe(false);
  });

  it('não oferece inserir tabela com o cursor já dentro de uma', () => {
    expect(botao('Inserir tabela')!.disabled).toBe(false);
    informarEstado({ emTabela: true });
    expect(botao('Inserir tabela')!.disabled).toBe(true);
  });

  it('dentro de tabela troca entre a faixa de tabela e a de texto (uma por vez no celular)', () => {
    const barra = () => fixture.nativeElement.querySelector('.editor-markdown__barra') as HTMLElement;
    expect(botao('Mostrar formatação de texto')).toBeNull();

    informarEstado({ emTabela: true });
    expect(barra().classList).toContain('editor-markdown__barra--em-tabela');
    expect(barra().classList).not.toContain('editor-markdown__barra--mostrando-texto');

    botao('Mostrar formatação de texto')!.click();
    fixture.detectChanges();
    expect(barra().classList).toContain('editor-markdown__barra--mostrando-texto');
    expect(botao('Mostrar ações da tabela')!.textContent?.trim()).toBe('Tabela');
    expect(barra().textContent).not.toMatch(/\bTexto\b(?! abaixo)/);

    // Sair da tabela e entrar em outra volta a mostrar as ações de tabela.
    informarEstado({ emTabela: false });
    informarEstado({ emTabela: true });
    expect(barra().classList).not.toContain('editor-markdown__barra--mostrando-texto');
  });

  it('reflete os formatos ativos do cursor como alternância pressionada', () => {
    expect(botao('Negrito')!.getAttribute('aria-pressed')).toBe('false');

    informarEstado({ ativos: new Set<AcaoMarkdown>(['NEGRITO', 'TITULO_1']) });

    expect(botao('Negrito')!.getAttribute('aria-pressed')).toBe('true');
    expect(botao('Título principal')!.getAttribute('aria-pressed')).toBe('true');
    expect(botao('Itálico')!.getAttribute('aria-pressed')).toBe('false');
    expect(botao('Inserir tabela')!.hasAttribute('aria-pressed')).toBe(false);
  });

  it('desabilita desfazer/refazer quando o histórico não tem para onde ir', () => {
    expect(botao('Desfazer')!.disabled).toBe(true);
    expect(botao('Refazer')!.disabled).toBe(true);

    informarEstado({ podeDesfazer: true });

    expect(botao('Desfazer')!.disabled).toBe(false);
    expect(botao('Refazer')!.disabled).toBe(true);
  });

  it('marca "Texto abaixo" e "Apagar tabela" como grupos laterais da grade de tabela', () => {
    informarEstado({ emTabela: true });
    const laterais = [
      ...fixture.nativeElement.querySelectorAll('.editor-markdown__grupo--lateral button'),
    ].map((elemento) => (elemento as HTMLElement).textContent?.trim());

    expect(laterais).toEqual(['Texto abaixo', 'Apagar tabela']);
  });

  it.each([
    [true, 1],
    [false, 0],
  ])('campo curto=%s: ao ganhar foco, traz a barra para a vista %i vez(es)', async (compacto, vezes) => {
    const rolar = vi.fn();
    const barra = fixture.nativeElement.querySelector('.editor-markdown__barra') as HTMLElement;
    Object.defineProperty(barra, 'scrollIntoView', { configurable: true, value: rolar });
    fixture.componentRef.setInput('compacto', compacto);
    fixture.detectChanges();

    const superficie = fixture.nativeElement.querySelector('.editor-markdown__superficie') as HTMLElement;
    superficie.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    fixture.detectChanges();
    await new Promise((resolver) => requestAnimationFrame(resolver));
    await new Promise((resolver) => requestAnimationFrame(resolver));

    expect(rolar).toHaveBeenCalledTimes(vezes);
    if (vezes) expect(rolar).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' });
  });

  it('avisa por focadoChange quando o foco entra e sai do editor', () => {
    const eventos: boolean[] = [];
    fixture.componentInstance.focadoChange.subscribe((focado) => eventos.push(focado));
    const superficie = fixture.nativeElement.querySelector('.editor-markdown__superficie') as HTMLElement;

    superficie.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    superficie.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    superficie.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body }));

    expect(eventos).toEqual([true, false]);
  });

  it('marca o host como focado enquanto o foco está dentro do editor', () => {
    const superficie = fixture.nativeElement.querySelector('.editor-markdown__superficie') as HTMLElement;
    superficie.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    fixture.detectChanges();
    expect(fixture.nativeElement.classList).toContain('editor-markdown--focado');

    superficie.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body }));
    fixture.detectChanges();
    expect(fixture.nativeElement.classList).not.toContain('editor-markdown--focado');
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

describe('EditorMarkdown como ControlValueAccessor', () => {
  @Component({
    imports: [EditorMarkdown, ReactiveFormsModule],
    template: `<app-editor-markdown [formControl]="controle" />`,
  })
  class HospedeFormulario {
    readonly controle = new FormControl('# Inicial', { nonNullable: true });
  }

  let aoAlterar: (markdown: string) => void;
  let markdownAtual: string;
  const definirMarkdown = vi.fn((markdown: string) => {
    markdownAtual = markdown;
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    markdownAtual = '';
    await TestBed.configureTestingModule({
      imports: [HospedeFormulario],
      providers: [
        {
          provide: EDITOR_MARKDOWN_FACTORY,
          useValue: (opcoes: { valorInicial: string; aoAlterar: (markdown: string) => void }) => {
            markdownAtual = opcoes.valorInicial;
            aoAlterar = opcoes.aoAlterar;
            return {
              criar: () => Promise.resolve(),
              destruir: vi.fn(),
              obterMarkdown: () => markdownAtual,
              definirMarkdown,
              definirSomenteLeitura: vi.fn(),
              aplicarAcao: vi.fn(),
              definirMargemInferiorRolagem: vi.fn(),
            };
          },
        },
      ],
    }).compileComponents();
  });

  it('recebe o valor inicial do FormControl', async () => {
    const fixture = TestBed.createComponent(HospedeFormulario);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(markdownAtual).toBe('# Inicial');
  });

  it('propaga digitação de volta ao FormControl', async () => {
    const fixture = TestBed.createComponent(HospedeFormulario);
    fixture.detectChanges();
    await fixture.whenStable();

    aoAlterar('Texto **novo**');

    expect(fixture.componentInstance.controle.value).toBe('Texto **novo**');
  });

  it('reflete `disable()` do FormControl como somente leitura', async () => {
    const fixture = TestBed.createComponent(HospedeFormulario);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.controle.disable();
    fixture.detectChanges();

    const editor = fixture.nativeElement.querySelector('app-editor-markdown') as HTMLElement;
    expect(editor.getAttribute('aria-label')).toBe('Conteúdo Markdown somente leitura');
  });
});
