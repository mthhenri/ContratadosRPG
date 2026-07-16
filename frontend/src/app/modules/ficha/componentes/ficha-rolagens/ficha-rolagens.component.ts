import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

import { RolagemModoEnum, RolagemPresetTipoEnum } from '@contratados-rpg/shared/enums';
import type {
  FichaAtributosDto,
  FichaHabilidadeDto,
  FichaRolagemDto,
  FichaRolagemPassoDto,
} from '@contratados-rpg/shared/dtos/ficha';
import {
  ABREVIACOES_ATRIBUTO,
  resolverPreset,
  rolarPasso,
  validarFormula,
  type PassoInterpretadoDto,
  type PlanoPresetDto,
} from '@contratados-rpg/shared/regras/rolagem';

import { BandejaDadosService } from '../../../../shared/bandeja-dados/bandeja-dados.service';
import { GuiaFormula } from '../guia-formula/guia-formula.component';

/** Grupo tipado de um passo seguinte no formulário (encadeamento), com as habilidades **deste passo**. */
type PassoForm = FormGroup<{
  nome: FormControl<string>;
  modo: FormControl<RolagemModoEnum>;
  formula: FormControl<string>;
  descricao: FormControl<string>;
  habilidades: FormControl<readonly string[]>;
}>;

/**
 * Um preset renderizado: o índice original, o plano já **resolvido** pelo motor (passos interpretados
 * com os efeitos das habilidades de cada passo fundidos + energia por passo) e os campos de exibição.
 */
interface RolagemVM {
  readonly indice: number;
  readonly nome: string;
  readonly descricao: string | null;
  /** Plano do motor: passos prontos p/ rolar, cada um com sua energia e habilidades vinculadas. */
  readonly plano: PlanoPresetDto;
  /** `true` quando há passos seguintes (primária + ≥1) — muda a renderização dos passos. */
  readonly encadeado: boolean;
  /** Modo da rolagem primária (badge do cartão). */
  readonly modoPrimario: RolagemModoEnum;
}

/**
 * Editor **no próprio lugar** da aba Rolagens (m3-15; estendido em m3-22 — "Rolagem v2"): os presets
 * nomeados da ficha (`FichaRolagemDto`). Um preset pode ser **Teste** (rola o pool, pega o maior +
 * Proficiência) ou **Soma** (dano/total, agrupado por tipo), ser **encadeado** (primária → dano →
 * crítico, todos os passos visíveis, cada um com seu botão de rolar) e **anexar habilidades por passo**:
 * cada ação escolhe quais habilidades aplica, e ao rolá-la gasta a Energia delas + aplica os efeitos
 * (ex.: Força Bruta = FOR × 3 só no passo de dano).
 *
 * **Nenhuma regra de dados vive aqui** (proibição #26): interpretar/validar/rolar e resolver o preset
 * (efeitos + energia por passo) é o motor puro `shared/regras/rolagem` (`resolverPreset`/`rolarPasso`,
 * RNG do navegador — §6.6). O componente é **controlado**: cada mutação da lista emite `rolagensMudou` e
 * a página persiste. O resultado de cada rolagem vai para a **bandeja de dados** global (m3-22), não
 * fica no cartão. Estilos só com os tokens do tema "Terminal de Contenção" (proibição #29).
 */
@Component({
  selector: 'app-ficha-rolagens',
  imports: [ReactiveFormsModule, NgTemplateOutlet, GuiaFormula],
  templateUrl: './ficha-rolagens.component.html',
  styleUrl: './ficha-rolagens.component.scss',
})
export class FichaRolagens {
  /** Presets atuais — a fonte da verdade é a página (componente controlado). */
  readonly rolagens = input<readonly FichaRolagemDto[]>([]);
  /** Atributos da ficha (já **efetivos**, pós-lesão) — alimentam a rolagem. */
  readonly atributos = input.required<FichaAtributosDto>();
  /** Proficiência (nível; `null` para Civil) somada nos passos de Teste + fonte `PROF` (m3-22). */
  readonly proficiencia = input<number | null>(null);
  /** Nível do agente — fonte `NIV` nas fórmulas (m3-22). */
  readonly nivel = input<number>(0);
  /** Habilidades da ficha — o pool que cada passo pode anexar (energia + efeitos). */
  readonly habilidadesDisponiveis = input<readonly FichaHabilidadeDto[]>([]);
  /** Dono/mestre edita; para os demais é só leitura + rolar (a página liga por `podeGerenciar`). */
  readonly editavel = input(false);

  /** Emite a lista inteira após qualquer mutação — a página persiste. */
  readonly rolagensMudou = output<readonly FichaRolagemDto[]>();
  /** Energia a debitar ao rolar um passo com habilidades — a página aplica em `energiaAtual`. */
  readonly energiaGasta = output<number>();

  /** Bandeja de dados global — onde cada passo rolado aqui aparece. */
  private readonly bandeja = inject(BandejaDadosService);

  /** Exposto ao template para comparar o modo dos passos/badges. */
  protected readonly RolagemModoEnum = RolagemModoEnum;
  /** Abreviações de atributo aceitas nas fórmulas (para a dica do formulário). */
  protected readonly abreviaturas = Object.keys(ABREVIACOES_ATRIBUTO).join(' ');

  /** Índice em edição: `null` = fechado, `-1` = adicionando um novo preset, `≥0` = editando. */
  protected readonly indiceEmEdicao = signal<number | null>(null);
  /** Índice com a confirmação de remoção inline aberta, ou `null`. */
  protected readonly indiceRemovendo = signal<number | null>(null);

  /** Valor de Energia informado para passos de custo variável (`[X E]`), por `preset:passo`. Efêmero. */
  private readonly energiaVariavelPorPasso = signal<ReadonlyMap<string, number>>(new Map());

  protected readonly form = new FormGroup({
    nome: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    modo: new FormControl<RolagemModoEnum>(RolagemModoEnum.SOMA, { nonNullable: true }),
    formula: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    descricao: new FormControl('', { nonNullable: true }),
    /** Habilidades do **passo primário**. */
    habilidades: new FormControl<readonly string[]>([], { nonNullable: true }),
    seguintes: new FormArray<PassoForm>([]),
  });

  /** Passos seguintes do formulário (encadeamento) — açúcar para o template. */
  protected get seguintes(): FormArray<PassoForm> {
    return this.form.controls.seguintes;
  }

  /** Validade da fórmula digitada no form (live): `null` enquanto vazia, senão `true`/`false`. */
  private readonly formulaTexto = toSignal(this.form.controls.formula.valueChanges, { initialValue: '' });
  private readonly modoSelecionado = toSignal(this.form.controls.modo.valueChanges, {
    initialValue: RolagemModoEnum.SOMA,
  });
  protected readonly formulaAtualValida = computed<boolean | null>(() => {
    const texto = this.formulaTexto().trim();
    return texto === '' ? null : validarFormula(texto, this.modoSelecionado());
  });

  /** Presets resolvidos pelo motor (passos + efeitos + energia por passo), prontos para exibir e rolar. */
  protected readonly presets = computed<readonly RolagemVM[]>(() => {
    const atributos = this.atributos();
    const proficiencia = this.proficiencia();
    const habilidades = this.habilidadesDisponiveis();
    return this.rolagens().map((preset, indice) => {
      const plano = resolverPreset({ preset, atributos, proficiencia, habilidades });
      return {
        indice,
        nome: preset.nome,
        descricao: preset.descricao?.trim() || null,
        plano,
        encadeado: plano.passos.length > 1,
        modoPrimario: plano.passos[0]?.modo ?? RolagemModoEnum.SOMA,
      };
    });
  });

  protected readonly vazio = computed(() => this.rolagens().length === 0);

  // === Ações de edição ===
  protected abrirNovo(): void {
    this.resetarForm();
    this.indiceRemovendo.set(null);
    this.indiceEmEdicao.set(-1);
  }

  protected editar(indice: number): void {
    const preset = this.rolagens()[indice];
    if (!preset) {
      return;
    }
    this.resetarForm();
    this.form.patchValue({
      nome: preset.nome,
      modo: preset.modo ?? RolagemModoEnum.SOMA,
      formula: preset.formula,
      descricao: preset.descricao ?? '',
      habilidades: preset.habilidades ?? [],
    });
    (preset.seguintes ?? []).forEach((passo) => this.seguintes.push(this.novoPassoForm(passo)));
    this.indiceRemovendo.set(null);
    this.indiceEmEdicao.set(indice);
  }

  protected cancelarEdicao(): void {
    this.indiceEmEdicao.set(null);
  }

  /** Zera o formulário para o estado neutro (novo preset) — inclui esvaziar os passos e as habilidades. */
  private resetarForm(): void {
    this.seguintes.clear();
    this.form.reset({ nome: '', modo: RolagemModoEnum.SOMA, formula: '', descricao: '', habilidades: [] });
  }

  private novoPassoForm(passo?: FichaRolagemPassoDto): PassoForm {
    return new FormGroup({
      nome: new FormControl(passo?.nome ?? '', { nonNullable: true, validators: [Validators.required] }),
      modo: new FormControl(passo?.modo ?? RolagemModoEnum.SOMA, { nonNullable: true }),
      formula: new FormControl(passo?.formula ?? '', { nonNullable: true, validators: [Validators.required] }),
      descricao: new FormControl(passo?.descricao ?? '', { nonNullable: true }),
      habilidades: new FormControl<readonly string[]>(passo?.habilidades ?? [], { nonNullable: true }),
    });
  }

  protected adicionarPasso(): void {
    this.seguintes.push(this.novoPassoForm());
  }

  protected removerPasso(indice: number): void {
    this.seguintes.removeAt(indice);
  }

  // === Habilidades anexadas (por passo) ===
  /** Alterna a habilidade `nome` no controle de habilidades de um passo (primária ou seguinte). */
  protected alternarHabilidade(controle: FormControl<readonly string[]>, nome: string): void {
    const atual = controle.value;
    controle.setValue(atual.includes(nome) ? atual.filter((item) => item !== nome) : [...atual, nome]);
  }

  /** Mantém só as habilidades que ainda existem na ficha (nome casado). */
  private filtrarHabilidades(nomes: readonly string[]): string[] {
    return nomes.filter((nome) => this.habilidadesDisponiveis().some((habilidade) => habilidade.nome === nome));
  }

  /**
   * Confirma o preset: monta o `FichaRolagemDto` **enxuto** (omite `modo` `SOMA`, `tipo`/`seguintes`
   * vazios e `habilidades` vazias por passo → preset legado inalterado), insere (novo) ou substitui
   * (edição) e emite. Guarda contra passos meio-preenchidos: só entram os que têm nome **e** fórmula.
   */
  protected confirmar(): void {
    if (this.form.invalid) {
      return;
    }
    const bruto = this.form.getRawValue();
    const nome = bruto.nome.trim();
    const formula = bruto.formula.trim();
    if (!nome || !formula) {
      return;
    }
    const descricao = bruto.descricao.trim();
    const modo = bruto.modo;
    const habilidadesPrimaria = this.filtrarHabilidades(bruto.habilidades);

    const seguintes: FichaRolagemPassoDto[] = bruto.seguintes
      .map((passo) => {
        const passoHabilidades = this.filtrarHabilidades(passo.habilidades);
        return {
          nome: passo.nome.trim(),
          formula: passo.formula.trim(),
          ...(passo.modo !== RolagemModoEnum.SOMA ? { modo: passo.modo } : {}),
          ...(passo.descricao.trim() ? { descricao: passo.descricao.trim() } : {}),
          ...(passoHabilidades.length ? { habilidades: passoHabilidades } : {}),
        };
      })
      .filter((passo) => passo.nome && passo.formula);

    const preset: FichaRolagemDto = {
      nome,
      formula,
      ...(descricao ? { descricao } : {}),
      ...(modo !== RolagemModoEnum.SOMA ? { modo } : {}),
      ...(seguintes.length ? { tipo: RolagemPresetTipoEnum.ENCADEADO, seguintes } : {}),
      ...(habilidadesPrimaria.length ? { habilidades: habilidadesPrimaria } : {}),
    };

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
  /**
   * Rola um passo do preset e o joga na **bandeja** (m3-22). Ao rolar, debita a Energia das habilidades
   * **deste passo** (soma dos custos + o valor variável informado). Passo inválido não rola.
   */
  protected rolarPassoDoPreset(preset: RolagemVM, indicePasso: number): void {
    const passo = preset.plano.passos[indicePasso];
    if (!passo) {
      return;
    }
    const resultado = rolarPasso(passo, this.atributos(), this.proficiencia(), this.nivel());
    if (!resultado) {
      return;
    }
    const rotulo = preset.encadeado ? `${preset.nome} · ${passo.nome}` : preset.nome;
    this.bandeja.mostrar({ rotulo, resultado, modo: passo.modo });
    this.debitarEnergia(preset.indice, passo, indicePasso);
  }

  private debitarEnergia(presetIndice: number, passo: PassoInterpretadoDto, indicePasso: number): void {
    if (passo.habilidadesVinculadas.length === 0) {
      return;
    }
    const variavel = passo.energiaVariavel ? this.energiaVariavelDe(presetIndice, indicePasso) : 0;
    const total = passo.energiaGasta + variavel;
    if (total > 0) {
      this.energiaGasta.emit(total);
    }
  }

  // === Energia variável (`[X E]`), por passo ===
  private chaveEnergia(presetIndice: number, passoIndice: number): string {
    return `${presetIndice}:${passoIndice}`;
  }

  protected energiaVariavelDe(presetIndice: number, passoIndice: number): number {
    return this.energiaVariavelPorPasso().get(this.chaveEnergia(presetIndice, passoIndice)) ?? 0;
  }

  protected definirEnergiaVariavel(presetIndice: number, passoIndice: number, texto: string): void {
    const valor = Number.parseInt(texto, 10);
    const mapa = new Map(this.energiaVariavelPorPasso());
    mapa.set(this.chaveEnergia(presetIndice, passoIndice), Number.isNaN(valor) || valor < 0 ? 0 : valor);
    this.energiaVariavelPorPasso.set(mapa);
  }

  private emitir(lista: readonly FichaRolagemDto[]): void {
    // Os valores de energia variável ficam presos ao índice; limpa ao mudar a lista para não desalinhar.
    this.energiaVariavelPorPasso.set(new Map());
    this.rolagensMudou.emit(lista);
  }
}
