import { Component, computed, input } from '@angular/core';

/**
 * Grupo de seleção única (`P-056`), companion de `app-segmentado-item`. Diferente de `app-abas`
 * (`tablist`/`tab`, dono de `tabpanel`): aqui o papel ARIA é `group` com item `aria-pressed` — um
 * seletor de modo/filtro que troca dado no lugar (ou nem isso), não uma troca de painel. Auditoria
 * (`UI-27`) achou três origens reais com esse papel — Caderno, Leitor de Documentos e Inventário
 * da ficha — Caderno e Leitor já tinham a mesma identidade byte-a-byte (pill com fundo
 * `--accent-dim`); o primitivo segue essa origem, e o Inventário (que copiava o bloco preenchido
 * das abas do Status) migra para ela.
 *
 * Mesmo padrão de `Abas`/`Aba`: a seleção continua do consumidor (`(click)` chama o método que já
 * existia); o primitivo só veste o container e cada item, e reflete `[ativo]`/`[desabilitado]`.
 */
@Component({
  selector: 'app-segmentado',
  template: `<ng-content />`,
  styleUrl: './segmentado.component.scss',
  host: {
    '[class]': 'classes()',
    role: 'group',
    '[attr.aria-label]': 'rotulo()',
  },
})
export class Segmentado {
  /** Rótulo acessível do grupo (`aria-label`). */
  readonly rotulo = input.required<string>();

  /** Ocupa 100% da largura disponível, cada item dividindo o espaço em partes iguais — opt-in
   *  (mesmo racional de `Botao.fluido`); sem ele, o grupo continua do tamanho do próprio conteúdo. */
  readonly fluido = input(false);

  protected readonly classes = computed(() =>
    this.fluido() ? 'segmentado segmentado--fluido' : 'segmentado',
  );
}
