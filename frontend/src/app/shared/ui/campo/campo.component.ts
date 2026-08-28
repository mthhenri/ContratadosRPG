import { Component, input } from '@angular/core';

/**
 * Degraus do rótulo. Saem da auditoria da ui-01 sobre os 40 blocos `&__rotulo` do frontend, que
 * são sempre mono + UPPERCASE + `--text-mute` e variam só no tamanho: 10px (9 ocorrências, o
 * `padrao`), 11px com `--tracking-label` (`amplo`, os formulários de tela cheia) e 9px
 * (`compacto`, as grades densas de ficha e criatura).
 */
export type CampoTamanho = 'compacto' | 'padrao' | 'amplo';

/**
 * Primitivo de campo de formulário (ui-01 · `P-034`): rótulo, dica e mensagem de erro em volta
 * do controle, que continua sendo do consumidor e entra por `<ng-content>`.
 *
 * É um invólucro, **não** um `ControlValueAccessor`: o consumidor segue escrevendo o
 * `<input formControlName="…">` nativo, o que preserva a proibição de `ngModel`
 * (`CONVENTIONS.md` → Frontend) e serve tanto os formulários reativos quanto os campos presos a
 * Signals, sem duas APIs.
 *
 * O controle projetado é filho direto do `<label>` — a regra global de asterisco obrigatório
 * (`label:has(> input:required)`, em `styles/tema/_base.scss`) depende disso, e o
 * `campo.component.spec` trava esse contrato.
 *
 * `[erro]` recebe a mensagem **já filtrada** pelo consumidor. Não há `[control]` com portão
 * `touched && invalid`: a auditoria mostrou que os erros reais são por chave (`minlength`) ou do
 * formulário inteiro (`senhasDivergentes`), e o portão genérico mudaria o comportamento.
 */
@Component({
  selector: 'app-campo',
  templateUrl: './campo.component.html',
  styleUrl: './campo.component.scss',
})
export class Campo {
  /** Texto do rótulo, renderizado em `campo__rotulo`. */
  readonly rotulo = input.required<string>();

  /** Escala do rótulo e do respiro entre rótulo e controle. */
  readonly tamanho = input<CampoTamanho>('padrao');

  /** Auxílio permanente abaixo do controle. Vazio esconde o elemento. */
  readonly dica = input('');

  /** Mensagem de erro já decidida pelo consumidor. Vazia esconde o elemento. */
  readonly erro = input('');
}
