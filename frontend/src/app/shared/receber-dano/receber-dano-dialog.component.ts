import { Component, computed, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { TIPOS_DANO_BLOQUEAVEIS, TipoDanoEnum } from '@contratados-rpg/shared/enums';
import { calcularDanoRecebido, type DanoRecebidoResultadoDto } from '@contratados-rpg/shared/regras/encontro';

import { Modal } from '../ui/modal/modal.component';
import { Tooltip } from '../tooltip/tooltip.directive';

/** Descrição de cada tipo bloqueável — texto do documento, para o `appTooltip` do rótulo. */
const DESCRICAO_TIPO: Record<TipoDanoEnum, string> = {
  [TipoDanoEnum.FISICO]: 'Corte, impacto ou perfuração — facas, socos, armas brancas.',
  [TipoDanoEnum.BALISTICO]: 'Perfuração de alta potência e velocidade — armas de fogo.',
  [TipoDanoEnum.EXPLOSAO]: 'Explosões — granadas e afins.',
  [TipoDanoEnum.QUIMICO]: 'Fogo, veneno, gás corrosivo, eletricidade e afins.',
  [TipoDanoEnum.GERAL]: 'Camada acima dos demais — irredutível, reduz qualquer tipo de dano.',
};

/** Sufixo de classe BEM por tipo — mesma paleta de `--dano-*` usada em `resultado-rolagem`. */
const SUFIXO_TIPO_DANO: Record<TipoDanoEnum, string> = {
  [TipoDanoEnum.FISICO]: 'fisico',
  [TipoDanoEnum.BALISTICO]: 'balistico',
  [TipoDanoEnum.EXPLOSAO]: 'explosao',
  [TipoDanoEnum.QUIMICO]: 'quimico',
  [TipoDanoEnum.GERAL]: 'geral',
};

/** Abreviação da coluna de tipo — "Balístico"/"Explosão" não cabem na coluna estreita da grade
 * (o `appTooltip` do rótulo já carrega o nome completo, ver `DESCRICAO_TIPO`). */
const ABREVIACAO_TIPO: Record<TipoDanoEnum, string> = {
  [TipoDanoEnum.FISICO]: 'Físico',
  [TipoDanoEnum.BALISTICO]: 'Balíst.',
  [TipoDanoEnum.EXPLOSAO]: 'Explos.',
  [TipoDanoEnum.QUIMICO]: 'Químico',
  [TipoDanoEnum.GERAL]: 'Geral',
};

/** Um `FormControl` de número não-negativo, sempre com valor (nunca `null`). */
function controleNumerico(): FormControl<number> {
  return new FormControl(0, { nonNullable: true });
}

/** Um grupo por tipo bloqueável: dano bruto + resistência custom (a da ficha é só leitura). */
function grupoTipo(): FormGroup<{ bruto: FormControl<number>; custom: FormControl<number> }> {
  return new FormGroup({ bruto: controleNumerico(), custom: controleNumerico() });
}

/**
 * O "tomador de dano facilitado" (m7-17): dialog com os cinco tipos de dano, que aplica a
 * resistência da ficha (mais um ajuste custom por tipo, para efeito de cena) e emite o total já
 * efetivo pronto para abater da Vida. Reaproveitado pelo cartão do combatente (mestre, no encontro)
 * e pelo bloco de vitalidade da ficha (jogador) — ver `receber-dano.ts` (`shared/regras/encontro`)
 * para a regra de cálculo, inclusive a assimetria da camada Geral.
 *
 * **Controlado e sem persistência própria**: o componente só calcula e emite `danoConfirmado` com o
 * total; quem hospeda decide como abater a Vida (steppers do encontro ou vitalidade da ficha) e como
 * registrar o log, se houver. `resistenciasFicha` é opcional — sem ela (cartão do encontro, que não
 * carrega a ficha completa), a coluna correspondente fica ausente e só a resistência custom conta.
 */
@Component({
  selector: 'app-receber-dano-dialog',
  imports: [ReactiveFormsModule, Modal, Tooltip],
  templateUrl: './receber-dano-dialog.component.html',
  styleUrl: './receber-dano-dialog.component.scss',
})
export class ReceberDanoDialog {
  readonly aberto = input(false);
  /** Resistência da ficha por tipo (inclui `GERAL`) — ausente = coluna correspondente não aparece. */
  readonly resistenciasFicha = input<Partial<Record<TipoDanoEnum, number>> | null>(null);

  /** Pedido de fechar sem aplicar (mask, Esc, botão Cancelar). */
  readonly fechado = output<void>();
  /** Confirmação — o total já efetivo, pronto para abater da Vida. */
  readonly danoConfirmado = output<number>();

  protected readonly TIPOS_DANO_BLOQUEAVEIS = TIPOS_DANO_BLOQUEAVEIS;
  protected readonly DESCRICAO_TIPO = DESCRICAO_TIPO;
  protected readonly ABREVIACAO_TIPO = ABREVIACAO_TIPO;
  protected readonly TipoDanoEnum = TipoDanoEnum;

  protected readonly formulario = new FormGroup({
    [TipoDanoEnum.FISICO]: grupoTipo(),
    [TipoDanoEnum.BALISTICO]: grupoTipo(),
    [TipoDanoEnum.EXPLOSAO]: grupoTipo(),
    [TipoDanoEnum.QUIMICO]: grupoTipo(),
    geral: grupoTipo(),
  });

  /** Espelho gravável do formulário (Reactive Forms não é signal) — recalcula o resultado ao vivo. */
  private readonly valoresFormulario = signal(this.formulario.getRawValue());

  constructor() {
    this.formulario.valueChanges.subscribe(() => {
      this.valoresFormulario.set(this.formulario.getRawValue());
    });
  }

  /** Classe BEM do rótulo de um tipo — mesma paleta de `--dano-*` do chip de rolagem. */
  protected classeTipo(tipo: TipoDanoEnum): string {
    return `receber-dano__tipo receber-dano__tipo--${SUFIXO_TIPO_DANO[tipo]}`;
  }

  /**
   * Resistência da ficha exibida para um tipo, envelopada (`{ valor }`) para o `@if...as` do
   * template distinguir "ausente" de "presente e zero" — `null` quando o input não foi fornecido.
   */
  protected resistenciaFichaDe(tipo: TipoDanoEnum): { valor: number } | null {
    const resistencias = this.resistenciasFicha();
    return resistencias ? { valor: resistencias[tipo] ?? 0 } : null;
  }

  protected readonly resultado = computed<DanoRecebidoResultadoDto>(() => {
    const valores = this.valoresFormulario();
    const resistenciasFicha = this.resistenciasFicha() ?? {};

    const gruposPorTipo: ReadonlyMap<TipoDanoEnum, { bruto: number; custom: number }> = new Map([
      [TipoDanoEnum.FISICO, valores[TipoDanoEnum.FISICO]],
      [TipoDanoEnum.BALISTICO, valores[TipoDanoEnum.BALISTICO]],
      [TipoDanoEnum.EXPLOSAO, valores[TipoDanoEnum.EXPLOSAO]],
      [TipoDanoEnum.QUIMICO, valores[TipoDanoEnum.QUIMICO]],
      [TipoDanoEnum.GERAL, valores.geral],
    ]);

    const brutos: Partial<Record<TipoDanoEnum, number>> = {};
    const resistenciasCustom: Partial<Record<TipoDanoEnum, number>> = {};
    gruposPorTipo.forEach((grupo, tipo) => {
      brutos[tipo] = grupo.bruto ?? 0;
      resistenciasCustom[tipo] = grupo.custom ?? 0;
    });

    return calcularDanoRecebido({ brutos, resistenciasFicha, resistenciasCustom });
  });

  /** As linhas do resumo ao vivo — só os tipos com dano bruto informado. */
  protected readonly linhasResumo = computed(() =>
    this.resultado().porTipo.filter((linha) => linha.bruto > 0),
  );

  protected readonly danoGeralInformado = computed(() => this.resultado().danoGeral > 0);

  protected confirmar(): void {
    this.danoConfirmado.emit(this.resultado().total);
    this.formulario.reset();
    this.fechado.emit();
  }

  protected cancelar(): void {
    this.formulario.reset();
    this.fechado.emit();
  }
}
