import { TestBed } from '@angular/core/testing';

import { HabilidadeDescricao, markdownParaTexto } from './habilidade-descricao.component';

describe('markdownParaTexto', () => {
  it('tira marcadores de título, citação, ênfase e código e mantém a estrutura de linhas e listas', () => {
    const markdown = '# Título\n\n- **Item** um\n- _item_ dois\n\n> citação com `código`';

    expect(markdownParaTexto(markdown)).toBe('Título\n\n• Item um\n• item dois\n\ncitação com código');
  });

  it('mantém o número das listas numeradas e o recuo das sublistas', () => {
    expect(markdownParaTexto('1. passo um\n2. passo dois\n   - detalhe\n   * outro')).toBe(
      '1. passo um\n2. passo dois\n   • detalhe\n   • outro',
    );
  });

  it('reduz link e imagem ao texto visível', () => {
    expect(markdownParaTexto('veja [o guia](https://exemplo.com) e ![figura](a.png)')).toBe(
      'veja o guia e figura',
    );
  });

  it('preserva quebras de linha e linhas em branco, sem sobra de espaço no fim das linhas', () => {
    expect(markdownParaTexto('linha um  \n\n\nlinha dois\t\nlinha três')).toBe(
      'linha um\n\n\nlinha dois\nlinha três',
    );
  });

  it('trata quebra forçada (barra invertida) e <br /> como quebra de linha', () => {
    expect(markdownParaTexto('linha um\\\nlinha dois')).toBe('linha um\nlinha dois');
    expect(markdownParaTexto('linha um<br />linha dois')).toBe('linha um\nlinha dois');
  });

  it('parágrafo vazio do editor (<br /> sozinho) vira a linha em branco que o autor deixou', () => {
    expect(markdownParaTexto('antes\n\n<br />\n\ndepois')).toBe('antes\n\n\ndepois');
  });
});

describe('HabilidadeDescricao', () => {
  function montar(valor: string) {
    const fixture = TestBed.createComponent(HabilidadeDescricao);
    fixture.componentRef.setInput('valor', valor);
    fixture.componentRef.setInput('rotulo', 'Descrição de Fôlego Extra');
    fixture.detectChanges();
    return fixture;
  }

  /** Simula o documento do Milkdown com o conteúdo além do teto de linhas. */
  function simularDocumento(raiz: HTMLElement, alturaConteudo: number, alturaVisivel: number) {
    const milkdown = document.createElement('div');
    milkdown.className = 'milkdown';
    const documento = document.createElement('div');
    documento.className = 'editor';
    Object.defineProperty(documento, 'scrollHeight', { value: alturaConteudo });
    Object.defineProperty(documento, 'clientHeight', { value: alturaVisivel });
    milkdown.appendChild(documento);
    raiz.querySelector('.habilidade-descricao__corpo')!.appendChild(milkdown);
  }

  it('renderiza o editor de leitura e não mostra o botão enquanto cabe', async () => {
    const fixture = montar('Descrição curta.');
    const raiz = fixture.nativeElement as HTMLElement;

    simularDocumento(raiz, 60, 60);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(raiz.querySelector('app-editor-markdown')).not.toBeNull();
    expect(raiz.querySelector('.habilidade-descricao__ver')).toBeNull();
  });

  it('mostra o botão quando o conteúdo passa do teto', async () => {
    const fixture = montar('Descrição muito longa. '.repeat(40));
    const raiz = fixture.nativeElement as HTMLElement;

    simularDocumento(raiz, 400, 110);
    await fixture.whenStable();
    fixture.detectChanges();

    const botao = raiz.querySelector('.habilidade-descricao__ver');
    expect(botao).not.toBeNull();
    expect(botao?.getAttribute('aria-label')).toBe('Ver a descrição completa');
  });
});
