import { Component, computed, input } from '@angular/core';

/**
 * Cor semântica do valor. Auditoria da `ui-03` sobre as 3 famílias que replicam o padrão puro de
 * exibição (`.stat`, `.agente-stat`, `.calc-stat` — 10 cópias, 11 telas): `vida`, `energia` e
 * `positivo` são as únicas cores realmente distintas em uso. `.ficha-mini`/`.ficha-atributo`
 * (as outras 2 das "5 declarações" da spec original) ficam de fora: misturam exibição com edição
 * inline e rolagem de dado — um primitivo mais rico do que este `Stat` de só-leitura, registrado
 * em `IDEAS.md` para uma task futura em vez de forçado aqui.
 *
 * `vida` usa `var(--vida)`/`var(--vida-border)`, não `var(--accent)` como o bloco `.stat--vida`
 * "congelado" em `_componentes.scss` — aquele exemplo ficou desatualizado em relação à própria
 * regra dos tokens (`_tokens.scss`: "Vida é vermelho FIXO da identidade — não acompanha a troca
 * de `--accent`"). Duas das cinco cópias auditadas (`detalhe.page`, `lista.page`) já usavam
 * `--vida` corretamente; as outras duas (`criar.page`, `criar-criatura.page`) copiaram o exemplo
 * desatualizado. O primitivo fixa a variante no valor correto.
 */
export type StatVariante = 'vida' | 'energia' | 'positivo' | 'alerta';
export type StatTamanho = 'compacto' | 'padrao';

/**
 * Primitivo de caixa de estatística (`ui-03` · `P-034`): rótulo pequeno uppercase + valor grande,
 * ambos mono, com cor semântica opcional.
 */
@Component({
  selector: 'app-stat',
  templateUrl: './stat.component.html',
  styleUrl: './stat.component.scss',
})
export class Stat {
  /** Rótulo curto do que o valor representa (ex.: "Vida", "Prestígio"). */
  readonly rotulo = input.required<string>();

  /**
   * Valor a destacar. Zero é um valor real; `null`, `undefined` e texto vazio representam um
   * campo ainda não preenchido e ganham o traço discreto no template.
   */
  readonly valor = input<string | number | null | undefined>();

  /** Complemento curto abaixo do valor, usado em resumos de progressão. */
  readonly nota = input('');

  /** Cor semântica. Sem valor, o valor usa a cor de texto neutra. */
  readonly variante = input<StatVariante>();

  /** Densidade compacta usada nos resumos dos guias de criação. */
  readonly tamanho = input<StatTamanho>('padrao');

  protected readonly temValor = computed(() => {
    const valor = this.valor();
    return valor !== null && valor !== undefined && valor !== '';
  });

  protected readonly classes = computed(() => {
    const variante = this.variante();
    const tamanho = this.tamanho() === 'compacto' ? ' stat--compacto' : '';
    return `${variante ? `stat stat--${variante}` : 'stat'}${tamanho}`;
  });
}
