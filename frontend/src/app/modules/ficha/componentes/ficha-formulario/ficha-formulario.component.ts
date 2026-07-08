import { Component, OnInit, computed, effect, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { map } from 'rxjs';

import { ArquetipoEnum, ClasseEnum } from '@contratados-rpg/shared/enums';
import type {
  FichaAtributosDto,
  FichaHabilidadeDto,
  FichaInventarioDto,
  FichaJogadorDadosDto,
  FichaLesaoDto,
  FichaSequelaDto,
  FichaTraumaDto,
} from '@contratados-rpg/shared/dtos/ficha';
import {
  aplicarLimitesPorClasse,
  calcularAreaPercepcao,
  calcularDanoCorpo,
  calcularDanoFurtivo,
  calcularDefesa,
  calcularDeslocamento,
  calcularEnergia,
  calcularInventario,
  calcularLimiteEnergia,
  calcularLimiteHabilidadesPorTurno,
  calcularProficiencia,
  calcularSanidade,
  calcularVida,
  obterLimitesClasse,
} from '@contratados-rpg/shared/regras/agente';

import { StepInput } from '../../../calculadora/componentes/step-input/step-input.component';

/** Valor de entrada/saída do formulário — identidade (`nome`) + documento de jogo (`dados`). */
export interface FichaFormularioValor {
  readonly nome: string;
  readonly dados: FichaJogadorDadosDto;
}

/** Chave de cada `FormControl` de atributo (as dez chaves de `FichaAtributosDto`). */
type ChaveAtributo = keyof FichaAtributosDto;

/** Rótulo + chave de um stepper de atributo, agrupado (Físicos / Mentais) como no documento. */
interface CampoAtributo {
  readonly chave: ChaveAtributo;
  readonly rotulo: string;
}

/** Bloco de atributos exibido no card (agrupamento de leitura do documento). */
interface GrupoAtributos {
  readonly rotulo: string;
  readonly campos: readonly CampoAtributo[];
}

/** Opção de classe/registro do `<select>`, agrupada por família (mesma da calculadora). */
interface GrupoClasse {
  readonly rotulo: string;
  readonly opcoes: readonly { readonly valor: ClasseEnum; readonly rotulo: string }[];
}

/** Opção de arquétipo do `<select>` (só para as três classes base). */
interface OpcaoArquetipo {
  readonly valor: ArquetipoEnum;
  readonly rotulo: string;
}

/** Stat secundária derivada (com tom semântico opcional) — espelha a calculadora de agente. */
interface StatSecundaria {
  readonly rotulo: string;
  readonly valor: string | number;
  readonly detalhe: string;
  readonly tom?: 'energia' | 'furtivo';
}

/** Sub-coleções do documento que esta tela ainda não edita — preservadas no round-trip da edição. */
interface EstadoPreservado {
  readonly sequelas: readonly FichaSequelaDto[];
  readonly traumas: readonly FichaTraumaDto[];
  readonly lesoes: readonly FichaLesaoDto[];
  readonly habilidades: readonly FichaHabilidadeDto[];
  readonly inventario: FichaInventarioDto;
}

/** Texto exibido no lugar de uma stat que a classe não possui (ex.: Civil sem defesa). */
const INDISPONIVEL = 'N/A';

/** Arquétipos disponíveis por classe base — `null`/vazio para Experimentos e Civil (sem arquétipo). */
const ARQUETIPOS_POR_CLASSE: Partial<Record<ClasseEnum, readonly OpcaoArquetipo[]>> = {
  [ClasseEnum.COMBATENTE]: [
    { valor: ArquetipoEnum.LUTADOR, rotulo: 'Lutador' },
    { valor: ArquetipoEnum.MERCENARIO, rotulo: 'Mercenário' },
    { valor: ArquetipoEnum.VANGUARDA, rotulo: 'Vanguarda' },
  ],
  [ClasseEnum.ESPECIALISTA]: [
    { valor: ArquetipoEnum.ENGENHEIRO, rotulo: 'Engenheiro' },
    { valor: ArquetipoEnum.ASSASSINO, rotulo: 'Assassino' },
    { valor: ArquetipoEnum.ACADEMICO, rotulo: 'Acadêmico' },
  ],
  [ClasseEnum.SUPORTE]: [
    { valor: ArquetipoEnum.PARAMEDICO, rotulo: 'Paramédico' },
    { valor: ArquetipoEnum.DIPLOMATA, rotulo: 'Diplomata' },
    { valor: ArquetipoEnum.COMANDANTE, rotulo: 'Comandante' },
  ],
};

/** Cria um `FormControl` numérico não-anulável (atributos, nível, prestígio, vida/energia). */
function controleNumerico(inicial: number): FormControl<number> {
  return new FormControl(inicial, { nonNullable: true });
}

/**
 * Formulário reutilizável da ficha de jogador (m3-06) — reusa os controles e cálculos da aba
 * `agente` da calculadora (`StepInput` + `shared/regras/agente`), servindo tanto à **criação**
 * quanto à **edição**. **Nenhuma regra de jogo vive aqui**: toda stat derivada (Vida/Energia
 * máximas, Defesa, Deslocamento, Dano, Inventário, Percepção…) vem de `shared/regras` (fonte
 * única — SYSTEM.SPEC §6.6, proibições #26/#27), então o front nunca duplica fórmula. Estilos só
 * com os tokens do tema "Terminal de Contenção" (proibição #29).
 *
 * O documento tem dez atributos (`FichaAtributosDto`); as fórmulas do agente consomem cinco
 * (Vigor/Destreza/Força/Vontade/Sentidos) — os demais são guardados, mas não alimentam derivados
 * (nenhuma fórmula em `shared/regras` os usa hoje). Ao trocar de classe, Nível e todos os
 * atributos são reclampados aos limites da classe (`obterLimitesClasse`) e Vida/Energia atuais são
 * limitadas ao máximo derivado — a mesma coerência que o backend revalida antes de persistir.
 *
 * Sub-coleções que esta tela ainda não edita (sequelas, traumas, lesões, habilidades, inventário)
 * são **preservadas** no round-trip da edição e nascem vazias na criação — não são zeradas.
 */
@Component({
  selector: 'app-ficha-formulario',
  imports: [ReactiveFormsModule, StepInput],
  templateUrl: './ficha-formulario.component.html',
  styleUrl: './ficha-formulario.component.scss',
})
export class FichaFormulario implements OnInit {
  /** Valor inicial (edição) — `null` na criação (defaults de fábrica). */
  readonly valorInicial = input<FichaFormularioValor | null>(null);
  /** Bloqueia o botão de salvar enquanto a persistência está em voo. */
  readonly salvando = input<boolean>(false);
  /** Rótulo do botão primário (ex.: "Criar ficha" / "Salvar alterações"). */
  readonly rotuloAcao = input<string>('Salvar');

  /** Emite `{ nome, dados }` pronto para persistir quando o formulário é submetido válido. */
  readonly salvar = output<FichaFormularioValor>();

  protected readonly gruposClasse: readonly GrupoClasse[] = [
    {
      rotulo: 'Classes Base',
      opcoes: [
        { valor: ClasseEnum.COMBATENTE, rotulo: 'Combatente' },
        { valor: ClasseEnum.ESPECIALISTA, rotulo: 'Especialista' },
        { valor: ClasseEnum.SUPORTE, rotulo: 'Suporte' },
      ],
    },
    {
      rotulo: 'Subclasses de Experimento',
      opcoes: [
        { valor: ClasseEnum.EXPERIMENTO_BESTIAL, rotulo: 'Experimento Bestial' },
        { valor: ClasseEnum.EXPERIMENTO_ARTIFICIAL, rotulo: 'Experimento Artificial' },
        { valor: ClasseEnum.EXPERIMENTO_HIBRIDO, rotulo: 'Experimento Híbrido' },
      ],
    },
    {
      rotulo: 'Não-Agentes',
      opcoes: [{ valor: ClasseEnum.CIVIL, rotulo: 'Civil' }],
    },
  ];

  protected readonly gruposAtributos: readonly GrupoAtributos[] = [
    {
      rotulo: 'Físicos',
      campos: [
        { chave: 'destreza', rotulo: 'Destreza' },
        { chave: 'forca', rotulo: 'Força' },
        { chave: 'luta', rotulo: 'Luta' },
        { chave: 'pontaria', rotulo: 'Pontaria' },
        { chave: 'vigor', rotulo: 'Vigor' },
      ],
    },
    {
      rotulo: 'Mentais',
      campos: [
        { chave: 'intelecto', rotulo: 'Intelecto' },
        { chave: 'medicina', rotulo: 'Medicina' },
        { chave: 'sentidos', rotulo: 'Sentidos' },
        { chave: 'social', rotulo: 'Social' },
        { chave: 'vontade', rotulo: 'Vontade' },
      ],
    },
  ];

  /** Sub-coleções preservadas do documento carregado (ou vazias na criação). */
  private readonly preservado = signal<EstadoPreservado>({
    sequelas: [],
    traumas: [],
    lesoes: [],
    habilidades: [],
    inventario: { itens: [], amplificadores: [] },
  });

  protected readonly formulario = new FormGroup({
    nome: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    classe: new FormControl<ClasseEnum>(ClasseEnum.COMBATENTE, { nonNullable: true }),
    arquetipo: new FormControl<ArquetipoEnum | null>(null),
    nivel: controleNumerico(0),
    prestigio: controleNumerico(0),
    atributos: new FormGroup({
      destreza: controleNumerico(1),
      forca: controleNumerico(1),
      luta: controleNumerico(1),
      pontaria: controleNumerico(1),
      vigor: controleNumerico(1),
      intelecto: controleNumerico(1),
      medicina: controleNumerico(1),
      sentidos: controleNumerico(1),
      social: controleNumerico(1),
      vontade: controleNumerico(1),
    }),
    vidaAtual: controleNumerico(0),
    energiaAtual: controleNumerico(0),
    anotacoes: new FormControl('', { nonNullable: true }),
  });

  /** Valor cru do formulário, refletido como Signal a cada alteração. */
  private readonly bruto = toSignal(
    this.formulario.valueChanges.pipe(map(() => this.formulario.getRawValue())),
    { initialValue: this.formulario.getRawValue() },
  );

  /** Limites de Nível e atributo da classe atual (bounds dos steppers). */
  protected readonly limites = computed(() => obterLimitesClasse({ classe: this.bruto().classe }));

  /**
   * Entrada normalizada aos limites da classe para as fórmulas — só os cinco atributos que
   * `shared/regras/agente` consome. Garante que valores fora dos bounds (ex.: logo após trocar de
   * classe) nunca escapem para o cálculo (mesma disciplina da calculadora).
   */
  private readonly entrada = computed(() => {
    const valor = this.bruto();
    const normalizado = aplicarLimitesPorClasse({
      classe: valor.classe,
      nivel: valor.nivel,
      vigor: valor.atributos.vigor,
      destreza: valor.atributos.destreza,
      forca: valor.atributos.forca,
      vontade: valor.atributos.vontade,
      sentidos: valor.atributos.sentidos,
    });
    return { classe: valor.classe, ...normalizado };
  });

  protected readonly ehCivil = computed(() => this.entrada().classe === ClasseEnum.CIVIL);
  protected readonly ehClasseBase = computed(
    () => ARQUETIPOS_POR_CLASSE[this.bruto().classe] !== undefined,
  );
  protected readonly arquetipos = computed<readonly OpcaoArquetipo[]>(
    () => ARQUETIPOS_POR_CLASSE[this.bruto().classe] ?? [],
  );

  protected readonly rotuloNivel = computed(() => (this.ehCivil() ? 'Treinamentos' : 'Nível'));

  // ── Stats de destaque (hero) e máximos (limitam Vida/Energia atuais) ─────────
  protected readonly vidaMaxima = computed(() => calcularVida(this.entrada()));
  protected readonly energiaMaxima = computed(() => calcularEnergia(this.entrada()));

  private readonly defesa = computed(() => calcularDefesa(this.entrada()));
  private readonly proficiencia = computed(() => calcularProficiencia(this.entrada()));

  protected readonly defesaBaseTexto = computed<string | number>(() => {
    const defesa = this.defesa();
    return defesa === null ? INDISPONIVEL : defesa.defesa;
  });
  protected readonly proficienciaTexto = computed<string>(() => {
    const proficiencia = this.proficiencia();
    return proficiencia === null ? INDISPONIVEL : `+${proficiencia}`;
  });

  // ── Stats secundárias (mesma composição da calculadora de agente) ────────────
  protected readonly secundarios = computed<readonly StatSecundaria[]>(() => {
    const defesa = this.defesa();
    const sanidade = calcularSanidade(this.entrada());
    const danoFurtivo = calcularDanoFurtivo(this.entrada());
    const limiteHabilidades = calcularLimiteHabilidadesPorTurno(this.entrada());
    const ehCivil = this.ehCivil();

    return [
      { rotulo: 'Esquiva', valor: defesa === null ? INDISPONIVEL : defesa.esquiva, detalhe: 'DEF + DES' },
      { rotulo: 'Bloqueio', valor: defesa === null ? INDISPONIVEL : defesa.bloqueio, detalhe: 'DEF + VIG' },
      { rotulo: 'Deslocamento', valor: `${calcularDeslocamento(this.entrada())} m`, detalhe: 'por turno' },
      { rotulo: 'Inventário', valor: calcularInventario(this.entrada()), detalhe: 'peso máx' },
      { rotulo: 'Dano Corpo', valor: calcularDanoCorpo(this.entrada()), detalhe: 'FOR + VIG' },
      {
        rotulo: 'Dano Furtivo',
        valor: danoFurtivo ?? INDISPONIVEL,
        detalhe: 'por nível',
        tom: 'furtivo',
      },
      {
        rotulo: 'Limite de Energia',
        valor: calcularLimiteEnergia(this.entrada()),
        detalhe: ehCivil ? 'DES' : 'DES × 2',
        tom: 'energia',
      },
      { rotulo: 'Traumas', valor: sanidade.limiteTraumas ?? INDISPONIVEL, detalhe: 'VON + 1' },
      { rotulo: 'Sequelas / Missão', valor: sanidade.sequelasRemovidasPorMissao, detalhe: 'VON' },
      {
        rotulo: 'Hab. / Turno',
        valor: limiteHabilidades,
        detalhe: ehCivil ? 'civil' : `base 4 + ${limiteHabilidades - 4}`,
      },
      { rotulo: 'Percepção', valor: `${calcularAreaPercepcao(this.entrada())} m`, detalhe: '5 + SEN×5' },
    ];
  });

  constructor() {
    // Ao trocar de classe, reclampa Nível e TODOS os dez atributos aos novos limites e descarta o
    // arquétipo se ele não pertencer à nova classe (Experimento/Civil não têm arquétipo). Mesma
    // coerência que o backend revalida (`validarDadosContraRegras`) antes de persistir.
    this.formulario.controls.classe.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((classe) => this.reclampearParaClasse(classe));

    // Mantém Vida/Energia atuais dentro do máximo derivado ao vivo — se baixar Vigor/Destreza/
    // Nível reduz o teto, o valor corrente acompanha (o backend rejeitaria acima do máximo).
    effect(() => {
      const vidaMaxima = this.vidaMaxima();
      const energiaMaxima = this.energiaMaxima();
      const bruto = this.bruto();
      if (bruto.vidaAtual > vidaMaxima) {
        this.formulario.controls.vidaAtual.setValue(vidaMaxima, { emitEvent: false });
      }
      if (bruto.energiaAtual > energiaMaxima) {
        this.formulario.controls.energiaAtual.setValue(energiaMaxima, { emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    const inicial = this.valorInicial();
    if (inicial) {
      this.semear(inicial);
      return;
    }
    // Criação: começa com Vida/Energia cheias (o máximo derivado dos defaults de fábrica).
    this.formulario.controls.vidaAtual.setValue(this.vidaMaxima(), { emitEvent: false });
    this.formulario.controls.energiaAtual.setValue(this.energiaMaxima(), { emitEvent: false });
  }

  /** Preenche o formulário com o documento carregado e guarda as sub-coleções não editadas. */
  private semear(inicial: FichaFormularioValor): void {
    const dados = inicial.dados;
    this.preservado.set({
      sequelas: dados.estado.sequelas,
      traumas: dados.estado.traumas,
      lesoes: dados.estado.lesoes,
      habilidades: dados.habilidades,
      inventario: dados.inventario,
    });
    this.formulario.patchValue({
      nome: inicial.nome,
      classe: dados.classe,
      arquetipo: dados.arquetipo,
      nivel: dados.nivel,
      prestigio: dados.prestigio,
      atributos: dados.atributos,
      vidaAtual: dados.estado.vidaAtual,
      energiaAtual: dados.estado.energiaAtual,
      anotacoes: dados.anotacoes,
    });
  }

  /** Reclampa Nível/atributos e limpa o arquétipo inválido quando a classe muda. */
  private reclampearParaClasse(classe: ClasseEnum): void {
    const bruto = this.formulario.getRawValue();
    const limites = obterLimitesClasse({ classe });
    const restringir = (valor: number, minimo: number, maximo: number): number =>
      Math.min(maximo, Math.max(minimo, valor));

    const atributosReclampeados = {} as Record<ChaveAtributo, number>;
    for (const [chave, valor] of Object.entries(bruto.atributos) as [ChaveAtributo, number][]) {
      atributosReclampeados[chave] = restringir(valor, limites.atributoMinimo, limites.atributoMaximo);
    }

    const arquetiposValidos = ARQUETIPOS_POR_CLASSE[classe] ?? [];
    const arquetipoContinuaValido = arquetiposValidos.some(
      (opcao) => opcao.valor === bruto.arquetipo,
    );

    this.formulario.patchValue({
      nivel: restringir(bruto.nivel, limites.nivelMinimo, limites.nivelMaximo),
      arquetipo: arquetipoContinuaValido ? bruto.arquetipo : null,
      atributos: atributosReclampeados,
    });
  }

  /** Monta o `FichaJogadorDadosDto` a partir do formulário + sub-coleções preservadas e emite. */
  protected submeter(): void {
    if (this.formulario.invalid || this.salvando()) {
      this.formulario.markAllAsTouched();
      return;
    }

    const bruto = this.formulario.getRawValue();
    const preservado = this.preservado();
    // Vida/Energia atuais nunca acima do máximo derivado (o backend rejeitaria); Energia pode
    // negativar, então só o teto é limitado.
    const vidaAtual = Math.min(bruto.vidaAtual, this.vidaMaxima());
    const energiaAtual = Math.min(bruto.energiaAtual, this.energiaMaxima());

    const dados: FichaJogadorDadosDto = {
      classe: bruto.classe,
      arquetipo: this.ehClasseBase() ? bruto.arquetipo : null,
      nivel: bruto.nivel,
      prestigio: bruto.prestigio,
      atributos: bruto.atributos,
      estado: {
        vidaAtual,
        energiaAtual,
        sequelas: preservado.sequelas,
        traumas: preservado.traumas,
        lesoes: preservado.lesoes,
      },
      habilidades: preservado.habilidades,
      inventario: preservado.inventario,
      anotacoes: bruto.anotacoes,
    };

    this.salvar.emit({ nome: bruto.nome.trim(), dados });
  }
}
