import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import type {
  FichaAtributosDto,
  FichaComboDto,
  FichaComboPassoDto,
  FichaHabilidadeDto,
  FichaRolagemDto,
} from '@contratados-rpg/shared/dtos/ficha';

import { BandejaDadosService } from '../../../../shared/bandeja-dados/bandeja-dados.service';
import { executarPassoPreset } from '../../executar-rolagem';

/** Grupo tipado de um passo do formulário de combo. */
type PassoComboForm = FormGroup<{
  nome: FormControl<string>;
  rolagemNome: FormControl<string>;
}>;

/** Um combo renderizado — o índice original + se está em execução (passo atual). */
interface ComboVM {
  readonly indice: number;
  readonly nome: string;
  readonly passos: readonly FichaComboPassoDto[];
}

/**
 * Editor + runner de **Combos** (m3-37) — sequências ordenadas de rolagens que o jogador monta e
 * executa passo a passo, na aba Combate mesclada com Rolagens. Cada passo **referencia** um preset
 * de rolagem já existente da ficha (`FichaRolagemDto.nome`) — reusa 100% o motor de
 * `shared/regras/rolagem` via `executarPassoPreset` (extraído de `FichaRolagens`), sem duplicar
 * lógica de resolver/rolar/rotular/debitar energia.
 *
 * **Execução**: um passo por clique em "Próximo" (não dispara tudo de uma vez — decisão do autor),
 * cada resultado vai pra **bandeja de dados** global como uma rolagem normal (mesmo débito de
 * energia de habilidade vinculada, sem tratamento especial). Um passo cuja `rolagemNome` não
 * resolve mais (preset renomeado/apagado) mostra "preset não encontrado" em vez de travar — mesma
 * liberdade de edição de m3-10 (não valida referência no salvar).
 *
 * Componente **controlado**: cada mutação emite `combos` inteiro e a página persiste (padrão de
 * `FichaRolagens`/m3-15).
 */
@Component({
  selector: 'app-ficha-combos',
  imports: [ReactiveFormsModule, NgTemplateOutlet],
  templateUrl: './ficha-combos.component.html',
  styleUrl: './ficha-combos.component.scss',
})
export class FichaCombos {
  /** Combos atuais — a fonte da verdade é a página (componente controlado). */
  readonly combos = input<readonly FichaComboDto[]>([]);
  /** Presets de rolagem da ficha — o cardápio de referência de cada passo do combo. */
  readonly rolagens = input<readonly FichaRolagemDto[]>([]);
  /** Atributos da ficha (já efetivos, pós-lesão) — alimentam a rolagem ao executar um passo. */
  readonly atributos = input.required<FichaAtributosDto>();
  /** Proficiência (nível; `null` para Civil) somada nos passos de Teste. */
  readonly proficiencia = input<number | null>(null);
  /** Nível do agente — fonte `NIV` nas fórmulas dos presets referenciados. */
  readonly nivel = input<number>(0);
  /** Habilidades da ficha — o mesmo pool que os presets de rolagem podem ter vinculado. */
  readonly habilidadesDisponiveis = input<readonly FichaHabilidadeDto[]>([]);
  /** Dono/mestre edita; para os demais é só leitura + executar. */
  readonly editavel = input(false);

  /** Emite a lista inteira após qualquer mutação — a página persiste. */
  readonly combosMudou = output<readonly FichaComboDto[]>();
  /** Energia a debitar ao executar um passo cujo preset tem habilidades vinculadas. */
  readonly energiaGasta = output<number>();

  private readonly bandeja = inject(BandejaDadosService);

  /** Índice em edição: `null` fechado, `-1` novo combo, `≥0` editando. */
  protected readonly indiceEmEdicao = signal<number | null>(null);
  /** Índice com a confirmação de remoção inline aberta, ou `null`. */
  protected readonly indiceRemovendo = signal<number | null>(null);

  protected readonly form = new FormGroup({
    nome: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    passos: new FormArray<PassoComboForm>([]),
  });

  protected get passos(): FormArray<PassoComboForm> {
    return this.form.controls.passos;
  }

  protected readonly combosVM = computed<readonly ComboVM[]>(() =>
    this.combos().map((combo, indice) => ({ indice, nome: combo.nome, passos: combo.passos })),
  );

  protected readonly vazio = computed(() => this.combos().length === 0);

  // === Execução (runner) — um passo por clique em "Próximo" ===
  /** Índice do combo em execução, ou `null` (nenhum rodando). */
  protected readonly executandoIndice = signal<number | null>(null);
  /** Passo atual dentro do combo em execução. */
  protected readonly passoAtualIndice = signal(0);

  /** Passos do combo em execução (vazio se nenhum). */
  protected readonly passosExecucao = computed<readonly FichaComboPassoDto[]>(() => {
    const indice = this.executandoIndice();
    return indice === null ? [] : (this.combos()[indice]?.passos ?? []);
  });

  /** `true` quando o passo atual referencia um preset que já não existe mais. */
  protected readonly passoAtualNaoEncontrado = computed(() => {
    const passo = this.passosExecucao()[this.passoAtualIndice()];
    if (!passo) {
      return false;
    }
    return !this.rolagens().some((rolagem) => rolagem.nome === passo.rolagemNome);
  });

  protected iniciarExecucao(indice: number): void {
    this.indiceEmEdicao.set(null);
    this.executandoIndice.set(indice);
    this.passoAtualIndice.set(0);
  }

  protected pararExecucao(): void {
    this.executandoIndice.set(null);
    this.passoAtualIndice.set(0);
  }

  /**
   * Executa o passo atual (resolve+rola o preset referenciado via `executarPassoPreset`, mostra na
   * bandeja e debita Energia se houver) e avança pro próximo. Passo com referência quebrada só
   * avança (nada pra rolar). Ao passar do último passo, fecha o runner.
   */
  protected executarPassoAtual(): void {
    const passos = this.passosExecucao();
    const indicePasso = this.passoAtualIndice();
    const passo = passos[indicePasso];
    if (passo) {
      const preset = this.rolagens().find((rolagem) => rolagem.nome === passo.rolagemNome);
      if (preset) {
        const executado = executarPassoPreset({
          preset,
          atributos: this.atributos(),
          proficiencia: this.proficiencia(),
          nivel: this.nivel(),
          habilidadesDisponiveis: this.habilidadesDisponiveis(),
          indicePasso: 0,
        });
        if (executado) {
          this.bandeja.mostrar({
            rotulo: `${passo.nome} (${preset.nome})`,
            formula: executado.formula,
            resultado: executado.resultado,
          });
          if (executado.energiaGasta > 0) {
            this.energiaGasta.emit(executado.energiaGasta);
          }
        }
      }
    }
    if (indicePasso + 1 >= passos.length) {
      this.pararExecucao();
    } else {
      this.passoAtualIndice.set(indicePasso + 1);
    }
  }

  // === Edição ===
  protected abrirNovo(): void {
    this.pararExecucao();
    this.resetarForm();
    this.indiceRemovendo.set(null);
    this.indiceEmEdicao.set(-1);
  }

  protected editar(indice: number): void {
    const combo = this.combos()[indice];
    if (!combo) {
      return;
    }
    this.pararExecucao();
    this.resetarForm();
    this.form.patchValue({ nome: combo.nome });
    combo.passos.forEach((passo) => this.passos.push(this.novoPassoForm(passo)));
    this.indiceRemovendo.set(null);
    this.indiceEmEdicao.set(indice);
  }

  protected cancelarEdicao(): void {
    this.indiceEmEdicao.set(null);
  }

  private resetarForm(): void {
    this.passos.clear();
    this.form.reset({ nome: '' });
  }

  private novoPassoForm(passo?: FichaComboPassoDto): PassoComboForm {
    return new FormGroup({
      nome: new FormControl(passo?.nome ?? '', { nonNullable: true, validators: [Validators.required] }),
      rolagemNome: new FormControl(passo?.rolagemNome ?? '', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    });
  }

  protected adicionarPasso(): void {
    this.passos.push(this.novoPassoForm());
  }

  protected removerPasso(indice: number): void {
    this.passos.removeAt(indice);
  }

  /** Move um passo uma posição na direção `delta` (−1 sobe, +1 desce), sem sair dos limites. */
  protected moverPasso(indice: number, delta: number): void {
    const destino = indice + delta;
    if (destino < 0 || destino >= this.passos.length) {
      return;
    }
    const grupo = this.passos.at(indice);
    this.passos.removeAt(indice);
    this.passos.insert(destino, grupo);
  }

  protected confirmar(): void {
    if (this.form.invalid) {
      return;
    }
    const bruto = this.form.getRawValue();
    const nome = bruto.nome.trim();
    if (!nome) {
      return;
    }
    const passos: FichaComboPassoDto[] = bruto.passos
      .map((passo) => ({ nome: passo.nome.trim(), rolagemNome: passo.rolagemNome }))
      .filter((passo) => passo.nome && passo.rolagemNome);

    const combo: FichaComboDto = { nome, passos };
    const indice = this.indiceEmEdicao();
    if (indice === null) {
      return;
    }
    const lista = [...this.combos()];
    if (indice === -1) {
      lista.push(combo);
    } else {
      lista[indice] = combo;
    }
    this.combosMudou.emit(lista);
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
    if (this.executandoIndice() === indice) {
      this.pararExecucao();
    }
    this.combosMudou.emit(this.combos().filter((_, i) => i !== indice));
    this.indiceRemovendo.set(null);
  }
}
