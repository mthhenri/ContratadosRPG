import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

import { RolagemPresetTipoEnum } from '@contratados-rpg/shared/enums';
import type {
  FichaAtributosDto,
  FichaHabilidadeDto,
  FichaRolagemDto,
  FichaRolagemPassoDto,
} from '@contratados-rpg/shared/dtos/ficha';
import {
  ABREVIACOES_ATRIBUTO,
  resolverPreset,
  rolarFormula,
  rolarPasso,
  validarFormula,
  type PassoInterpretadoDto,
  type PlanoPresetDto,
} from '@contratados-rpg/shared/regras/rolagem';

import { BandejaDadosService } from '../../../../shared/bandeja-dados/bandeja-dados.service';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { GuiaFormula } from '../guia-formula/guia-formula.component';

/** Grupo tipado de um passo seguinte no formulário (encadeamento), com as habilidades **deste passo**. */
type PassoForm = FormGroup<{
  nome: FormControl<string>;
  formula: FormControl<string>;
  descricao: FormControl<string>;
  habilidades: FormControl<readonly string[]>;
  critico: FormControl<boolean>;
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
}

/**
 * Editor **no próprio lugar** da aba Rolagens (m3-15; estendido em m3-22 — "Rolagem v2"; gramática v3
 * m3-29): os presets nomeados da ficha (`FichaRolagemDto`). Não há mais "modo" — a **fórmula** especifica
 * tudo (um teste é `LUTd20kh1 + PROF`; keep, margem de crítico `cm`, explosão `!`/implosão `?`). Um preset
 * pode ser **encadeado** (primária → dano → crítico, todos os passos visíveis, cada um com seu botão de
 * rolar) e **anexar habilidades por passo** (m3-31): cada passo escolhe quais habilidades usa **só para a
 * Energia** (a fusão de efeitos foi aposentada); a mesma habilidade pode ser aplicada mais de uma vez
 * (multiconjunto — soma energia por ocorrência). Um passo pode ser marcado **critável** (dobra o dano).
 *
 * **Nenhuma regra de dados vive aqui** (proibição #26): interpretar/validar/rolar e resolver o preset
 * (energia por passo) é o motor puro `shared/regras/rolagem` (`resolverPreset`/`rolarPasso`,
 * RNG do navegador — §6.6). O componente é **controlado**: cada mutação da lista emite `rolagensMudou` e
 * a página persiste. O resultado de cada rolagem vai para a **bandeja de dados** global (m3-22), não
 * fica no cartão. Estilos só com os tokens do tema "Terminal de Contenção" (proibição #29).
 */
@Component({
  selector: 'app-ficha-rolagens',
  imports: [ReactiveFormsModule, NgTemplateOutlet, GuiaFormula, Tooltip],
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
    formula: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    descricao: new FormControl('', { nonNullable: true }),
    /** Habilidades do **passo primário**. */
    habilidades: new FormControl<readonly string[]>([], { nonNullable: true }),
    /** Passo primário é **critável** (m3-30) — ganha o botão "Rolar crítico". */
    critico: new FormControl(false, { nonNullable: true }),
    seguintes: new FormArray<PassoForm>([]),
  });

  /** Passos seguintes do formulário (encadeamento) — açúcar para o template. */
  protected get seguintes(): FormArray<PassoForm> {
    return this.form.controls.seguintes;
  }

  /** Validade da fórmula digitada no form (live): `null` enquanto vazia, senão `true`/`false`. */
  private readonly formulaTexto = toSignal(this.form.controls.formula.valueChanges, { initialValue: '' });
  protected readonly formulaAtualValida = computed<boolean | null>(() => {
    const texto = this.formulaTexto().trim();
    return texto === '' ? null : validarFormula(texto);
  });

  /** Campo de **rolagem avulsa** (m3-31): digita uma fórmula e rola na hora, **sem salvar** um preset. */
  protected readonly rapida = new FormControl('', { nonNullable: true });
  private readonly rapidaTexto = toSignal(this.rapida.valueChanges, { initialValue: '' });
  /** Validade da fórmula avulsa (live): `null` enquanto vazia. */
  protected readonly rapidaValida = computed<boolean | null>(() => {
    const texto = this.rapidaTexto().trim();
    return texto === '' ? null : validarFormula(texto);
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
      formula: preset.formula,
      descricao: preset.descricao ?? '',
      habilidades: preset.habilidades ?? [],
      critico: preset.critico ?? false,
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
    this.form.reset({ nome: '', formula: '', descricao: '', habilidades: [], critico: false });
  }

  private novoPassoForm(passo?: FichaRolagemPassoDto): PassoForm {
    return new FormGroup({
      nome: new FormControl(passo?.nome ?? '', { nonNullable: true, validators: [Validators.required] }),
      formula: new FormControl(passo?.formula ?? '', { nonNullable: true, validators: [Validators.required] }),
      descricao: new FormControl(passo?.descricao ?? '', { nonNullable: true }),
      habilidades: new FormControl<readonly string[]>(passo?.habilidades ?? [], { nonNullable: true }),
      critico: new FormControl(passo?.critico ?? false, { nonNullable: true }),
    });
  }

  protected adicionarPasso(): void {
    this.seguintes.push(this.novoPassoForm());
  }

  protected removerPasso(indice: number): void {
    this.seguintes.removeAt(indice);
  }

  // === Habilidades anexadas (por passo) — multiconjunto (m3-31) ===
  /** Quantas vezes a habilidade `nome` está aplicada no passo (0 = não usada). */
  protected contarHabilidade(controle: FormControl<readonly string[]>, nome: string): number {
    return controle.value.filter((item) => item === nome).length;
  }

  /** Aplica **mais uma** ocorrência da habilidade `nome` (soma energia por ocorrência). */
  protected adicionarHabilidade(controle: FormControl<readonly string[]>, nome: string): void {
    controle.setValue([...controle.value, nome]);
  }

  /** Remove **uma** ocorrência da habilidade `nome` (a primeira encontrada). */
  protected removerHabilidade(controle: FormControl<readonly string[]>, nome: string): void {
    const indice = controle.value.indexOf(nome);
    if (indice >= 0) {
      const proximo = [...controle.value];
      proximo.splice(indice, 1);
      controle.setValue(proximo);
    }
  }

  /** Mantém só as habilidades que ainda existem na ficha (nome casado) — preserva repetições. */
  private filtrarHabilidades(nomes: readonly string[]): string[] {
    return nomes.filter((nome) => this.habilidadesDisponiveis().some((habilidade) => habilidade.nome === nome));
  }

  /** Agrupa uma lista de nomes (multiconjunto) em `{ nome, quantidade }` para exibir os chips de vínculo. */
  protected vinculosAgrupados(nomes: readonly string[]): readonly { readonly nome: string; readonly quantidade: number }[] {
    const contagem = new Map<string, number>();
    for (const nome of nomes) {
      contagem.set(nome, (contagem.get(nome) ?? 0) + 1);
    }
    return [...contagem].map(([nome, quantidade]) => ({ nome, quantidade }));
  }

  /** Descrição de uma habilidade pelo nome (para o tooltip dos chips de vínculo) — vazio se não achar. */
  protected descricaoDe(nome: string): string {
    return this.habilidadesDisponiveis().find((habilidade) => habilidade.nome === nome)?.descricao ?? '';
  }

  /**
   * Confirma o preset: monta o `FichaRolagemDto` **enxuto** (omite `tipo`/`seguintes` vazios e
   * `habilidades` vazias por passo → preset simples inalterado), insere (novo) ou substitui (edição) e
   * emite. Guarda contra passos meio-preenchidos: só entram os que têm nome **e** fórmula.
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
    const habilidadesPrimaria = this.filtrarHabilidades(bruto.habilidades);

    const seguintes: FichaRolagemPassoDto[] = bruto.seguintes
      .map((passo) => {
        const passoHabilidades = this.filtrarHabilidades(passo.habilidades);
        return {
          nome: passo.nome.trim(),
          formula: passo.formula.trim(),
          ...(passo.descricao.trim() ? { descricao: passo.descricao.trim() } : {}),
          ...(passoHabilidades.length ? { habilidades: passoHabilidades } : {}),
          ...(passo.critico ? { critico: true } : {}),
        };
      })
      .filter((passo) => passo.nome && passo.formula);

    const preset: FichaRolagemDto = {
      nome,
      formula,
      ...(descricao ? { descricao } : {}),
      ...(seguintes.length ? { tipo: RolagemPresetTipoEnum.ENCADEADO, seguintes } : {}),
      ...(habilidadesPrimaria.length ? { habilidades: habilidadesPrimaria } : {}),
      ...(bruto.critico ? { critico: true } : {}),
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
   * Rola a **fórmula avulsa** (m3-31) na bandeja, **sem salvar** preset e **sem gastar Energia**. Usa a
   * fórmula crua digitada (o jogador escreve exatamente o que quer — `2d6 [Físico]`, `LUTd20kh1cm1 + PROF`…).
   */
  protected rolarRapida(): void {
    const formula = this.rapida.value.trim();
    if (!formula || !validarFormula(formula)) {
      return;
    }
    const resultado = rolarFormula({
      formula,
      atributos: this.atributos(),
      proficiencia: this.proficiencia(),
      nivel: this.nivel(),
    });
    if (resultado) {
      this.bandeja.mostrar({ rotulo: 'Rolagem rápida', formula, resultado });
    }
  }

  /**
   * Rola um passo do preset e o joga na **bandeja** (m3-22). Ao rolar, debita a Energia das habilidades
   * **deste passo** (soma dos custos + o valor variável informado). Passo inválido não rola.
   */
  protected rolarPassoDoPreset(preset: RolagemVM, indicePasso: number, critico = false): void {
    const passo = preset.plano.passos[indicePasso];
    if (!passo) {
      return;
    }
    const resultado = rolarPasso(passo, this.atributos(), this.proficiencia(), this.nivel(), undefined, critico);
    if (!resultado) {
      return;
    }
    const sufixoCritico = critico ? ' · CRÍTICO' : '';
    const rotulo = (preset.encadeado ? `${preset.nome} · ${passo.nome}` : preset.nome) + sufixoCritico;
    this.bandeja.mostrar({ rotulo, formula: passo.formula, resultado });
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
