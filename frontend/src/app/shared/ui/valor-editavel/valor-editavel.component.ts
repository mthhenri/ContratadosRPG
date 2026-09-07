import { Component, ElementRef, computed, effect, inject, input, output } from '@angular/core';

import { Botao, type BotaoVariante } from '../botao/botao.component';
import { Tooltip } from '../../tooltip/tooltip.directive';

/** `'herdado'` (ui-29d) pede ao botão interno para não aplicar variante nenhuma — ver `variante`. */
export type ValorEditavelVariante = BotaoVariante | 'herdado';

/**
 * Primitivo de "valor da ficha que vira campo de edição ao clicar" (`P-057`). Absorve a máquina de
 * estado exibição↔edição e a identidade visual do estado de exibição — hoje reimplementadas em
 * CSS local em ~30 ocorrências (`ficha-ident__nome`, `criatura__stat-valor`,
 * `barra-recurso__valor-atual`...).
 *
 * Não genereciza o **tipo** do campo de edição: `number`/`text`/`select` variam de ocorrência
 * para ocorrência, cada um com a própria assinatura de confirmação (`confirmar*()`). O estado de
 * edição continua sendo o `<input>`/`<select>` do consumidor, projetado via `<ng-content />` —
 * este primitivo só decide **quando** mostrá-lo (`[editando]`, controlado como `[aberto]` no
 * `app-modal`).
 *
 * O estado de exibição é um `button[app-botao][estilo="texto"]` interno — reaproveita cor/hover/
 * cursor do primitivo de botão em vez de duplicá-los. `[variante]` deixa o consumidor pedir uma
 * cor semântica (ex.: `aviso` para um valor em alerta); sem valor, cai em `secundario` (neutro, mas
 * ainda `var(--text)` explícito — não é "sem cor"). `'herdado'` (ui-29d) é o valor pra quando nem
 * isso serve: o botão interno não recebe variante nenhuma, então não aplica `color` próprio e a
 * cor de fato atravessa por herança (ver nota de tamanho/tipografia abaixo) — cobre um consumidor
 * que quer uma cor diferente de toda a paleta de severidade (`barra-recurso__max`, que quer o
 * mesmo `var(--text-mute)` do `<span>` do modo não-editável ao lado). `[desabilitado]` desabilita
 * o botão interno (herda o esmaecido `opacity: 0.55` do `app-botao`) — cobre o padrão
 * `[disabled]="!ajustavel()"` que várias ocorrências já usam.
 *
 * Tamanho/tipografia continuam do consumidor: propriedades herdáveis (`font-size`, `color`,
 * `font-weight`) atravessam o `display: contents` do host a partir da classe-companheira que o
 * consumidor já aplica no próprio `<app-valor-editavel>` (mesma divisão de responsabilidade do
 * `app-botao`) — só que essa herança só chega ao botão interno de fato quando `variante` não
 * sobrescreve `color` por conta própria, ou seja, só com `'herdado'`.
 */
@Component({
  selector: 'app-valor-editavel',
  imports: [Botao, Tooltip],
  templateUrl: './valor-editavel.component.html',
  styleUrl: './valor-editavel.component.scss',
})
export class ValorEditavel {
  readonly valor = input.required<string | number>();
  /** Controlado pelo consumidor — o mesmo signal que decide qual `<input>`/`<select>` projetar. */
  readonly editando = input.required<boolean>();
  readonly desabilitado = input(false);
  /** Vira `aria-label="Editar " + rotuloAria()` no botão do estado de exibição. */
  readonly rotuloAria = input.required<string>();
  /**
   * `'herdado'` (ui-29d) é o escape hatch pra quando `secundario` (`var(--text)`, quase branco)
   * não é a cor que o consumidor quer — em vez de outra severidade, ele pede pra não aplicar
   * variante nenhuma no botão interno, deixando `color` de fato atravessar por herança a partir da
   * classe-companheira que o consumidor já põe no próprio `<app-valor-editavel>` (o comentário da
   * classe já prometia essa herança; sem `'herdado'` ela nunca se cumpria, porque o padrão
   * `secundario` sempre aplicava sua própria cor). Achado ao vivo: `barra-recurso__max` queria
   * `var(--text-mute)` como o `<span>` do modo não-editável ao lado, e `secundario` sempre vencia.
   */
  readonly variante = input<ValorEditavelVariante>('secundario');
  /** `undefined` quando `'herdado'` — sem variante, `app-botao` não aplica cor/fundo/borda nenhum. */
  protected readonly varianteBotao = computed<BotaoVariante | undefined>(() => {
    const valor = this.variante();
    return valor === 'herdado' ? undefined : valor;
  });
  /**
   * Texto de `appTooltip` no botão do estado de exibição — precisa ser um input do primitivo
   * (não algo que o consumidor anexe direto no `<app-valor-editavel>`) porque o `Tooltip` mede
   * `getBoundingClientRect()` do próprio host, e o host daqui é `display: contents` (retângulo
   * zerado). Sem valor, nenhum tooltip é anexado.
   */
  readonly tooltip = input<string | null>(null);
  /**
   * Alinhamento do botão dentro do contêiner flex/grid do consumidor. O host é `display: contents`
   * (some da geração de caixa), então `align-self`/`justify-self` postos de fora não têm efeito —
   * o botão interno vira o item de flex/grid de verdade e precisa do próprio alinhamento. Sem
   * valor, `inicio` (não esticar, não centralizar) é o seguro pra contêiner column sem
   * `align-items` explícito (`stretch` é o padrão do CSS); boxes centralizados (ex.: Reações/
   * Contra-ataque) pedem `centro`; um contêiner que já declara o próprio alinhamento (ex.:
   * `align-items: baseline` das tags de Deslocamento) pede `auto` — não sobrescrever o que o
   * consumidor já decidiu.
   */
  readonly alinhamento = input<'inicio' | 'centro' | 'auto'>('inicio');
  /**
   * Ocupa a largura inteira do contêiner (`display: block; width: 100%`) em vez de abraçar só o
   * texto — cobre o padrão "cartão inteiro clicável" (ex.: VD/Tenacidade/Defesa da Criatura, uma
   * caixa de grid inteira), distinto do padrão "texto no meio de uma frase" (Nível/Nome/Vida) que é
   * o default.
   */
  readonly bloco = input(false);
  /**
   * Repassa um valor de `flex` (shorthand CSS) pro botão interno — escape-hatch pro caso de um
   * item de flex-row que precisa crescer/encolher com base própria (ex.: `criatura__info-nota-
   * texto`, `flex: 1 1 200px`, pra empurrar o texto a quebrar linha em vez de estourar a linha).
   * Também zera o `min-width` do botão (senão o texto não quebra dentro do espaço encolhido).
   */
  readonly flex = input<string | null>(null);

  readonly editarSolicitado = output<void>();

  /**
   * O host é o próprio `<app-valor-editavel>` — `querySelector` nele acha o campo projetado via
   * `<ng-content />` assim que o `@else`/`@if` interno troca pro estado de edição.
   */
  private readonly elementoHost = inject(ElementRef<HTMLElement>);

  /**
   * Foca (e seleciona) o campo projetado ao entrar em edição — sem isso, `(blur)` nunca dispara
   * no primeiro clique fora, porque nada estava focado pra disparar o cancelamento (o consumidor
   * tinha de clicar *dentro* do campo primeiro pra focar de verdade, só então clicar fora fechava).
   *
   * **Por que este `effect` mora aqui, e não um `appAutoFocus` no `<input>` do consumidor**: o
   * campo projetado vive atrás do `@if (editando())` **deste** componente — é conteúdo passado por
   * `<ng-content />`, não filho direto do consumidor. Achado ao vivo (Playwright, não coberto por
   * teste unitário — `TestBed` sempre insere a fixture já montada no DOM real, mascarando a
   * corrida): um hook de disparo único no próprio `<input>` (`afterNextRender`, base do
   * `appAutoFocus`) só roda a primeira vez que aquele nó é criado; como o conteúdo projetado é
   * criado uma única vez (na instanciação da view do consumidor) e só *reaproveitado* — nunca
   * recriado — a cada alternância de `editando()`, esse hook nunca dispara de novo nas alternâncias
   * seguintes.
   *
   * Um `effect()` aqui, lendo o próprio `editando()`, **é** re-executado a cada alternância — mas
   * mesmo lendo `editando()` do próprio componente, o `effect` roda antes de o `@if` deste mesmo
   * template ter trocado o botão pelo campo (o input de um `signal` é aplicado antes do refresh do
   * template que o consome, não depois): `querySelector` **no mesmo tick** ainda encontra o
   * `<button>` do estado de exibição. Adiar a busca+foco para o próximo macrotask (`setTimeout`)
   * resolve — dá tempo do commit do template acontecer antes da query rodar.
   */
  constructor() {
    effect(() => {
      if (!this.editando()) {
        return;
      }
      setTimeout(() => {
        const campo = this.elementoHost.nativeElement.querySelector('input, textarea, select');
        if (campo instanceof HTMLInputElement || campo instanceof HTMLTextAreaElement) {
          campo.focus();
          campo.select();
        } else if (campo instanceof HTMLSelectElement) {
          campo.focus();
        }
      });
    });
  }
}
