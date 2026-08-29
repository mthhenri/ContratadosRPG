import { Component, ElementRef, effect, input, output, viewChild } from '@angular/core';

/** Sequência para o `id` do título — alvo do `aria-labelledby` do `<dialog>`. */
let sequenciaModal = 0;

let modaisAbertos = 0;

/** Trava a rolagem do `<body>` enquanto houver ao menos um modal aberto (`<dialog>` nativo não
 *  trava sozinho — Safari/iOS deixa o fundo rolar por toque mesmo com `showModal()`). Contador
 *  módulo-level porque modais podem se aninhar (`GuiaFormula` dentro de outro `app-modal`). */
function travarRolagemDoBody(): void {
  modaisAbertos += 1;
  if (modaisAbertos === 1) {
    document.body.style.overflow = 'hidden';
  }
}

function destravarRolagemDoBody(): void {
  modaisAbertos = Math.max(0, modaisAbertos - 1);
  if (modaisAbertos === 0) {
    document.body.style.overflow = '';
  }
}

/**
 * Primitivo de modal (ui-02 · `P-034`) sobre o `<dialog>` nativo (`showModal()`/`close()`), no
 * lugar da implementação anterior. API mínima, derivada dos 13 usos reais do projeto (a auditoria
 * corrigiu o número: a spec original contava 14 por incluir uma menção em comentário) — sem
 * `draggable`, `resizable`, `appendTo` nem `[breakpoints]`, que só existiam para desligar recurso
 * anterior que o projeto nunca usou ou para contornar o `position: static` do overlay preso a um
 * container rolável (`P-025`). O top layer do `<dialog>` nativo elimina as duas classes de bug de
 * uma vez: não depende de `position`/`z-index`/contexto de empilhamento, e por isso vários modais
 * aninhados (`GuiaFormula` aberto de dentro de outro `app-modal`) empilham corretamente sem
 * precisar da ginástica de delegar para uma cópia externa.
 *
 * Fechar por Escape (`cancel`), clique no `::backdrop` (fora da caixa) e o botão "×" caem todos no
 * mesmo `(fechou)`: quem hospeda decide o que fazer,
 * tipicamente voltar o próprio `[aberto]` para `false`. O componente não lê o próprio fechamento
 * de volta; é controlado, como o resto da biblioteca (`Botao`, `Campo`).
 *
 * O corpo (`<ng-content>`) não define `overflow` — só o `<dialog>` raiz limita altura e rola, se
 * precisar (`max-height` no SCSS). Colocar `overflow-y: auto` num wrapper interno era exatamente
 * o defeito que forçava um seletor de encapsulamento vazado sobre o wrapper de conteúdo do
 * dialog anterior em `ficha-inventario`: um dropdown absoluto
 * (`.ficha-inv__categoria-select-lista`) que ultrapassa a altura do formulário curto disparava
 * rolagem interna à toa, mesmo sem precisar de nenhuma. Sem esse wrapper, o formulário curto
 * nunca aciona rolagem alguma; um modal genuinamente alto (raro — todo bloco extenso do projeto
 * já limita a própria altura, ver `.ficha-inv__grade` etc.) rola o `<dialog>` inteiro como último
 * recurso, cabeçalho incluso.
 */
@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss',
})
export class Modal {
  readonly aberto = input.required<boolean>();
  readonly titulo = input.required<string>();
  /** Largura CSS (ex.: `'640px'`, `'50vw'`). Sem valor, usa o padrão do primitivo. */
  readonly largura = input<string | null>(null);
  /** `false` desliga o fechar por clique no fundo — usado por `ReceberDanoDialog`, que já não
   *  preserva um formulário com dado digitado, evitando perda acidental. */
  readonly fechavelPeloFundo = input(true);

  readonly fechou = output<void>();

  protected readonly tituloId = `modal-titulo-${(sequenciaModal += 1)}`;

  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');

  constructor() {
    effect((aoLimpar) => {
      const elemento = this.dialogo().nativeElement;
      if (this.aberto()) {
        if (!elemento.open) {
          elemento.showModal();
        }
        travarRolagemDoBody();
        aoLimpar(() => destravarRolagemDoBody());
      } else if (elemento.open) {
        elemento.close();
      }
    });
  }

  /** Fecha o `<dialog>` nativo — dispara `close`, que emite `(fechou)`. Usado pelo "×", pelo
   *  clique no fundo e pelo `cancel` do Escape (fechamos explicitamente em vez de confiar no fechar
   *  automático do navegador, que não dispara em todo ambiente de teste). */
  protected fechar(): void {
    this.dialogo().nativeElement.close();
  }

  protected onFechado(): void {
    this.fechou.emit();
  }

  /** Clique no `::backdrop` chega como clique no próprio `<dialog>` (o conteúdo é filho) — só
   *  fecha quando o alvo é o `<dialog>` em si, nunca um clique que borbulhou de dentro da caixa. */
  protected onCliqueNoFundo(evento: MouseEvent): void {
    if (this.fechavelPeloFundo() && evento.target === this.dialogo().nativeElement) {
      this.fechar();
    }
  }
}
