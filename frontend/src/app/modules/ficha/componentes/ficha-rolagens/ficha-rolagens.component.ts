import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

import type { FichaAtributosDto, FichaRolagemDto } from '@contratados-rpg/shared/dtos/ficha';
import {
  ABREVIACOES_ATRIBUTO,
  ResultadoRolagemDto,
  rolarFormula,
  validarFormula,
} from '@contratados-rpg/shared/regras/rolagem';

/** Um preset renderizado: índice original, validade da fórmula e o último resultado rolado (ou `null`). */
interface RolagemVM {
  readonly indice: number;
  readonly nome: string;
  readonly formula: string;
  readonly descricao: string | null;
  readonly formulaValida: boolean;
  readonly resultado: ResultadoRolagemDto | null;
}

/**
 * Editor **no próprio lugar** da aba Rolagens (m3-15): a lista `rolagens` do `dados` —
 * presets nomeados de fórmula de dados (`FichaRolagemDto`, contrato m3-01). Adiciona/edita/remove
 * com um formulário inline (um por vez) e **rola** um preset mostrando o detalhamento (dados + total).
 *
 * **Nenhuma regra de dados vive aqui** (proibição #26): o parser/validador/avaliador de fórmula é o
 * motor puro `shared/regras/rolagem` (`validarFormula`/`rolarFormula`, RNG do navegador — §6.6). O
 * componente é **controlado**: cada mutação emite a lista inteira e a página persiste
 * (otimista, padrão granular m3-10). Fórmula inválida vira **aviso**, não trava a tela. Estilos só com
 * os tokens do tema "Terminal de Contenção" (proibição #29).
 */
@Component({
  selector: 'app-ficha-rolagens',
  imports: [ReactiveFormsModule, NgTemplateOutlet],
  templateUrl: './ficha-rolagens.component.html',
  styleUrl: './ficha-rolagens.component.scss',
})
export class FichaRolagens {
  /** Presets atuais — a fonte da verdade é a página (componente controlado). */
  readonly rolagens = input<readonly FichaRolagemDto[]>([]);
  /** Atributos da ficha — alimentam a rolagem (referências `+LUT` etc.). */
  readonly atributos = input.required<FichaAtributosDto>();
  /** Dono/mestre edita; para os demais é só leitura + rolar (a página liga por `podeGerenciar`). */
  readonly editavel = input(false);

  /** Emite a lista inteira após qualquer mutação — a página persiste. */
  readonly rolagensMudou = output<readonly FichaRolagemDto[]>();

  /** Abreviações de atributo aceitas nas fórmulas (para a dica do formulário). */
  protected readonly abreviaturas = Object.keys(ABREVIACOES_ATRIBUTO).join(' ');

  /** Índice em edição: `null` = fechado, `-1` = adicionando um novo preset, `≥0` = editando. */
  protected readonly indiceEmEdicao = signal<number | null>(null);
  /** Índice com a confirmação de remoção inline aberta, ou `null`. */
  protected readonly indiceRemovendo = signal<number | null>(null);
  /** Último resultado rolado por índice (efêmero; some ao mutar a lista). */
  private readonly resultados = signal<ReadonlyMap<number, ResultadoRolagemDto>>(new Map());

  protected readonly form = new FormGroup({
    nome: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    formula: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    descricao: new FormControl('', { nonNullable: true }),
  });

  /** Validade da fórmula digitada no form (live): `null` enquanto vazia, senão `true`/`false`. */
  private readonly formulaTexto = toSignal(this.form.controls.formula.valueChanges, { initialValue: '' });
  protected readonly formulaAtualValida = computed<boolean | null>(() => {
    const texto = this.formulaTexto().trim();
    return texto === '' ? null : validarFormula(texto);
  });

  protected readonly presets = computed<readonly RolagemVM[]>(() =>
    this.rolagens().map((rolagem, indice) => ({
      indice,
      nome: rolagem.nome,
      formula: rolagem.formula,
      descricao: rolagem.descricao?.trim() || null,
      formulaValida: validarFormula(rolagem.formula),
      resultado: this.resultados().get(indice) ?? null,
    })),
  );

  protected readonly vazio = computed(() => this.rolagens().length === 0);

  // === Ações de edição ===
  protected abrirNovo(): void {
    this.form.reset({ nome: '', formula: '', descricao: '' });
    this.indiceRemovendo.set(null);
    this.indiceEmEdicao.set(-1);
  }

  protected editar(indice: number): void {
    const rolagem = this.rolagens()[indice];
    if (!rolagem) {
      return;
    }
    this.form.reset({ nome: rolagem.nome, formula: rolagem.formula, descricao: rolagem.descricao ?? '' });
    this.indiceRemovendo.set(null);
    this.indiceEmEdicao.set(indice);
  }

  protected cancelarEdicao(): void {
    this.indiceEmEdicao.set(null);
  }

  /** Confirma o preset (nome e fórmula obrigatórios): insere (novo) ou substitui (edição) e emite. */
  protected confirmar(): void {
    if (this.form.invalid) {
      return;
    }
    const bruto = this.form.getRawValue();
    const nome = bruto.nome.trim();
    const formula = bruto.formula.trim();
    const descricao = bruto.descricao.trim();
    if (!nome || !formula) {
      return;
    }
    const preset: FichaRolagemDto = { nome, formula, ...(descricao ? { descricao } : {}) };
    const indice = this.indiceEmEdicao();
    if (indice === null) {
      return;
    }
    const lista = [...this.rolagens()];
    if (indice === -1) {
      lista.push(preset);
    } else {
      lista[indice] = preset;
    }
    this.emitir(lista);
    this.indiceEmEdicao.set(null);
  }

  // === Remoção (confirmação inline) ===
  protected removerPedido(indice: number): void {
    this.indiceEmEdicao.set(null);
    this.indiceRemovendo.set(indice);
  }

  protected cancelarRemocao(): void {
    this.indiceRemovendo.set(null);
  }

  protected confirmarRemocao(indice: number): void {
    this.emitir(this.rolagens().filter((_, i) => i !== indice));
    this.indiceRemovendo.set(null);
  }

  // === Rolar ===
  /** Rola o preset e guarda o resultado para exibir o detalhamento. Fórmula inválida não faz nada. */
  protected rolar(indice: number): void {
    const rolagem = this.rolagens()[indice];
    if (!rolagem) {
      return;
    }
    const resultado = rolarFormula({ formula: rolagem.formula, atributos: this.atributos() });
    if (!resultado) {
      return;
    }
    const mapa = new Map(this.resultados());
    mapa.set(indice, resultado);
    this.resultados.set(mapa);
  }

  // === Formatação (UI) ===
  /** Detalhamento compacto de um resultado: `2D6 [4+1] + LUT 3 + 2`. */
  protected detalharResultado(resultado: ResultadoRolagemDto): string {
    const partes: string[] = [];
    resultado.dados.forEach((grupo) => {
      const prefixo = grupo.sinal < 0 ? '−' : partes.length ? '+' : '';
      partes.push(`${prefixo}${grupo.valores.length}D${grupo.faces} [${grupo.valores.join('+')}]`);
    });
    resultado.atributos.forEach((atributo) => {
      const sinal = atributo.valor < 0 ? '−' : '+';
      partes.push(`${sinal} ${atributo.rotulo} ${Math.abs(atributo.valor)}`);
    });
    if (resultado.constante !== 0) {
      partes.push(`${resultado.constante < 0 ? '−' : '+'} ${Math.abs(resultado.constante)}`);
    }
    return partes.join(' ').replace(/^\+\s*/, '');
  }

  private emitir(lista: readonly FichaRolagemDto[]): void {
    // Os resultados são efêmeros e ficam presos ao índice; limpa ao mudar a lista para não desalinhar.
    this.resultados.set(new Map());
    this.rolagensMudou.emit(lista);
  }
}
