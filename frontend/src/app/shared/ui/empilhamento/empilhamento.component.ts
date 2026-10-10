import { Component, computed, input } from '@angular/core';

export type EmpilhamentoEstado = 'inicial' | 'comprado' | 'vazio';

/**
 * Primitivo de empilhamento (■□) de modificações e amplificadores. Cada empilhamento é uma caixa
 * desenhada em CSS em um de três estados: `inicial` (concedido pela primeira compra), `comprado`
 * (adquirido depois) e `vazio`. Sem `atuais`, é leitura de regra: todo preenchido é inicial.
 */
@Component({
  selector: 'app-empilhamento',
  templateUrl: './empilhamento.component.html',
  styleUrl: './empilhamento.component.scss',
  host: {
    role: 'img',
    '[attr.aria-label]': 'descricao()',
    '[class.empilhamento--regra]': 'atuais() === undefined',
  },
})
export class Empilhamento {
  /** Empilhamentos concedidos pela primeira compra. */
  readonly iniciais = input.required<number>();

  /** Empilhamentos que o item tem agora. Ausente = leitura de regra (só os iniciais). */
  readonly atuais = input<number>();

  /** Teto de empilhamentos próprio da modificação/amplificador. */
  readonly maximo = input.required<number>();

  /** Nome para a leitura assistiva (ex.: "Pesada"). */
  readonly rotulo = input<string>();

  protected readonly estados = computed<readonly EmpilhamentoEstado[]>(() => {
    const maximo = Math.max(1, Math.floor(this.maximo()));
    const iniciais = Math.min(Math.max(0, Math.floor(this.iniciais())), maximo);
    const atuais = Math.min(Math.max(Math.floor(this.atuais() ?? iniciais), 0), maximo);
    return Array.from({ length: maximo }, (_, indice): EmpilhamentoEstado =>
      indice >= atuais ? 'vazio' : indice < iniciais ? 'inicial' : 'comprado');
  });

  protected readonly descricao = computed(() => {
    const estados = this.estados();
    const preenchidos = estados.filter((estado) => estado !== 'vazio').length;
    const iniciais = estados.filter((estado) => estado === 'inicial').length;
    const rotulo = this.rotulo();
    const base = this.atuais() === undefined
      ? `Empilhamento: ${iniciais} ${iniciais === 1 ? 'inicial' : 'iniciais'} de ${estados.length}`
      : `Empilhamento ${preenchidos} de ${estados.length}, ${iniciais} ${iniciais === 1 ? 'inicial' : 'iniciais'}`;
    return rotulo ? `${rotulo} — ${base}` : base;
  });
}
