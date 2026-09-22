import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

import { Icone } from '../../../../shared/icone/icone.component';
import { BotaoIcone } from '../../../../shared/ui/botao-icone/botao-icone.component';
import { EditorMarkdown } from '../../../../shared/ui/editor-markdown/editor-markdown.component';

/**
 * Markdown → texto puro para o balão do tooltip (sem renderização), **preservando a forma**: quebras
 * de linha, linhas em branco, recuo e listas ficam como o autor escreveu (o balão usa
 * `white-space: pre-wrap` quando há `\n`, ver `Tooltip`). Só sai a sintaxe que o leitor não veria:
 * marcadores de título/citação/ênfase/código, `[texto](url)` reduzido a `texto` e escapes. Itens de
 * lista viram `•`; listas numeradas mantêm o número. Não pretende ser um parser — a descrição de
 * habilidade só usa a sintaxe básica do editor.
 */
export function markdownParaTexto(markdown: string): string {
  return markdown
    .replace(/\r\n?/g, '\n')
    // Parágrafo vazio do Milkdown (`<br />` sozinho entre duas linhas em branco) já é a linha em branco
    // que o autor deixou; um `<br />` no meio do texto é uma quebra de linha.
    .replace(/\n\n[ \t]*<br\s*\/?>[ \t]*(?=\n\n|$)/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^([ \t]*)(?:#{1,6}|>)[ \t]+/gm, '$1')
    .replace(/^([ \t]*)[-*+][ \t]+/gm, '$1• ')
    .replace(/(\*\*|__|\*|_|~~|`)/g, '')
    .replace(/\\(?=\n|$)/g, '')
    .replace(/[ \t]+$/gm, '')
    .trim();
}

/**
 * Descrição de habilidade em leitura compacta com teto de altura: passando de
 * `LINHAS_VISIVEIS` linhas o texto termina em reticências e aparece um botão discreto — passar o
 * mouse (ou segurar o dedo) abre o tooltip com a descrição inteira. Curta, não muda nada: sem
 * botão, sem corte.
 *
 * O corte é CSS (`-webkit-line-clamp` no documento do Milkdown, ver SCSS); o componente só mede
 * se o conteúdo passou do teto (`scrollHeight > clientHeight`) para saber se o botão existe — o
 * Milkdown monta de forma assíncrona e a largura muda a quebra de linhas, então mede de novo a
 * cada mutação/redimensionamento.
 */
@Component({
  selector: 'app-habilidade-descricao',
  imports: [BotaoIcone, EditorMarkdown, Icone],
  templateUrl: './habilidade-descricao.component.html',
  styleUrl: './habilidade-descricao.component.scss',
})
export class HabilidadeDescricao {
  /** Descrição em Markdown, como salva no JSONB. */
  readonly valor = input.required<string>();
  /** Nome acessível do editor de leitura (ex.: "Descrição de Fôlego Extra"). */
  readonly rotulo = input.required<string>();

  private readonly corpo = viewChild.required<ElementRef<HTMLElement>>('corpo');

  protected readonly truncada = signal(false);
  protected readonly textoCompleto = computed(() => markdownParaTexto(this.valor()));

  constructor() {
    const destruicao = inject(DestroyRef);

    afterNextRender(() => {
      const raiz = this.corpo().nativeElement;
      const medir = (): void => {
        const documento = raiz.querySelector<HTMLElement>('.milkdown .editor');
        this.truncada.set(!!documento && documento.scrollHeight > documento.clientHeight + 1);
      };

      const observadores: { disconnect(): void }[] = [];
      if (typeof MutationObserver !== 'undefined') {
        const mutacao = new MutationObserver(medir);
        mutacao.observe(raiz, { childList: true, subtree: true, characterData: true });
        observadores.push(mutacao);
      }
      if (typeof ResizeObserver !== 'undefined') {
        const redimensionamento = new ResizeObserver(medir);
        redimensionamento.observe(raiz);
        observadores.push(redimensionamento);
      }
      destruicao.onDestroy(() => observadores.forEach((observador) => observador.disconnect()));

      medir();
    });
  }
}
