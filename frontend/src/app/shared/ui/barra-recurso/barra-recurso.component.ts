import { Component, computed, input, output, signal } from '@angular/core';

import { AutoFocus } from '../../auto-focus/auto-focus.directive';
import { Tooltip } from '../../tooltip/tooltip.directive';

/** Recurso com máximo que o primitivo sabe desenhar hoje — Sanidade não é um par atual/máximo. */
export type BarraRecursoTipo = 'vida' | 'energia';

/** Densidade interna do primitivo; o consumidor continua dono do tamanho e do arranjo externo. */
export type BarraRecursoTamanho = 'padrao' | 'compacto';

/**
 * Primitivo de recurso com máximo (`ui-16`): rótulo + valor atual/máximo + trilho de progresso,
 * cor fixa por recurso (`--vida`/`--energy`, não acompanham `--accent`) e limiar de alerta
 * (`--warning`) abaixo de 25% — sinal de urgência único, igual nos dois recursos, para quem
 * varre vários cartões de uma vez em combate.
 *
 * Absorve três desenhos hoje divergentes: o HUD sticky da ficha (mobile, só leitura), o bloco de
 * vitalidade da ficha (desktop, editável por clique) e o cartão de combatente (sem trilho algum,
 * só texto). A edição por clique é opcional (`editavel`) para servir aos três sem forçar
 * comportamento que o HUD e o cartão não têm. Steppers e o botão "Receber dano" continuam do
 * consumidor — o primitivo só é dono de rótulo/valor/trilho, não de toda interação de vitalidade.
 */
@Component({
  selector: 'app-barra-recurso',
  imports: [Tooltip, AutoFocus],
  templateUrl: './barra-recurso.component.html',
  styleUrl: './barra-recurso.component.scss',
})
export class BarraRecurso {
  readonly rotulo = input.required<string>();
  readonly recurso = input.required<BarraRecursoTipo>();
  readonly atual = input.required<number>();
  readonly maximo = input.required<number>();
  readonly tamanho = input<BarraRecursoTamanho>('padrao');

  /** Habilita clicar nos números para digitar o valor direto — só o bloco de vitalidade usa. */
  readonly editavel = input(false);
  /** Dica de progressão no rótulo (sublinhado pontilhado) — só o bloco de vitalidade usa hoje. */
  readonly dica = input('');
  /**
   * Base para a digitação do máximo, quando ela difere do `maximo` exibido na barra — a ficha
   * mostra o máximo já somado a amplificadores de equipamento, mas edita só a base armazenada
   * (evita commitar o bônus de volta como override manual). Sem valor, a edição usa o próprio
   * `maximo` — o caso do HUD/cartão, onde não existe essa distinção.
   */
  readonly maximoEditavel = input<number | null>(null);

  readonly atualAlterado = output<number>();
  readonly maximoAlterado = output<number>();

  protected readonly editando = signal<'atual' | 'maximo' | null>(null);

  protected readonly maximoParaEdicao = computed(() => this.maximoEditavel() ?? this.maximo());

  protected readonly percentual = computed(() => {
    const maximo = this.maximo();
    if (maximo <= 0) {
      return 0;
    }
    return Math.max(0, Math.min(100, (this.atual() / maximo) * 100));
  });

  /** Abaixo de 25%, o recurso vira alerta (`--warning`) — mesmo limiar para Vida e Energia. */
  protected readonly emAlerta = computed(() => this.percentual() < 25);

  protected readonly classes = computed(() => {
    const partes = ['barra-recurso', `barra-recurso--${this.recurso()}`];
    if (this.tamanho() === 'compacto') {
      partes.push('barra-recurso--compacta');
    }
    if (this.emAlerta()) {
      partes.push('barra-recurso--alerta');
    }
    return partes.join(' ');
  });

  protected editar(campo: 'atual' | 'maximo'): void {
    if (this.editavel()) {
      this.editando.set(campo);
    }
  }

  protected cancelarEdicao(): void {
    this.editando.set(null);
  }

  protected confirmar(campo: 'atual' | 'maximo', valorBruto: string): void {
    const valor = Number(valorBruto);
    if (valorBruto.trim() !== '' && Number.isFinite(valor)) {
      if (campo === 'atual') {
        this.atualAlterado.emit(Math.trunc(valor));
      } else {
        this.maximoAlterado.emit(Math.trunc(valor));
      }
    }
    this.editando.set(null);
  }
}
