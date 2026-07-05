import { Component, computed } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { map } from 'rxjs';

import { ClasseEnum } from '@contratados-rpg/shared/enums';
import {
  aplicarLimitesPorClasse,
  calcularAreaPercepcao,
  calcularBeneficiosNivel,
  calcularDanoCorpo,
  calcularDanoFurtivo,
  calcularDefesa,
  calcularDeslocamento,
  calcularEnergia,
  calcularInventario,
  calcularLimiteEnergia,
  calcularLimiteHabilidadesPorTurno,
  calcularProficiencia,
  calcularProgressaoAcumulada,
  calcularSanidade,
  calcularVida,
  obterLimitesClasse,
} from '@contratados-rpg/shared/regras/agente';

import { StepInput } from '../../componentes/step-input/step-input.component';

/** Nome de cada `FormControl` numérico de atributo (chave do `FormGroup`). */
type ChaveAtributo = 'vigor' | 'destreza' | 'forca' | 'sentidos' | 'vontade';

/** Opção de classe/registro do `<select>`, agrupada por família. */
interface GrupoClasse {
  readonly rotulo: string;
  readonly opcoes: readonly { readonly valor: ClasseEnum; readonly rotulo: string }[];
}

/** Rótulo + chave de cada stepper de atributo. */
interface CampoAtributo {
  readonly chave: ChaveAtributo;
  readonly rotulo: string;
}

/** Stat secundária exibida no grid de status (com tom semântico opcional). */
interface StatSecundaria {
  readonly rotulo: string;
  readonly valor: string | number;
  readonly detalhe: string;
  readonly tom?: 'energia' | 'furtivo';
}

/** Ganho acumulado de progressão (só entra no grid quando maior que zero). */
interface ItemProgressao {
  readonly rotulo: string;
  readonly valor: number;
}

/** Texto exibido no lugar de uma stat que a classe não possui (ex.: Civil sem defesa). */
const INDISPONIVEL = 'N/A';

/**
 * Aba "Agente / Civil" da calculadora — a carro-chefe (m1-07). Formulário reativo
 * (classe, nível/treinamentos e os cinco atributos) em Reactive Forms reusando o
 * `StepInput` da m1-06; o estado deriva em Signals. **Nenhuma regra de jogo vive
 * aqui**: toda stat vem de `shared/regras/agente` (fonte única — SYSTEM.SPEC §6.6),
 * então o front nunca duplica fórmula. Layout fiel ao protótipo aprovado
 * `docs/design/examples/calculadora-de-atributos.html`, consumindo os tokens do tema.
 *
 * Os inputs são normalizados aos limites da classe (`aplicarLimitesPorClasse`) antes
 * de alimentar as fórmulas, e os controles são reclampados quando a classe muda —
 * paridade com o clamp da calculadora antiga ao trocar de registro.
 */
@Component({
  selector: 'app-agente-page',
  imports: [ReactiveFormsModule, StepInput],
  templateUrl: './agente.page.html',
  styleUrl: './agente.page.scss',
})
export class AgentePage {
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

  protected readonly campos: readonly CampoAtributo[] = [
    { chave: 'vigor', rotulo: 'Vigor' },
    { chave: 'destreza', rotulo: 'Destreza' },
    { chave: 'forca', rotulo: 'Força' },
    { chave: 'vontade', rotulo: 'Vontade' },
    { chave: 'sentidos', rotulo: 'Sentidos' },
  ];

  /** Preset inicial idêntico ao protótipo aprovado (Combatente, Nível 3, atributos 2/2/2/1/1). */
  protected readonly formulario = new FormGroup({
    classe: new FormControl<ClasseEnum>(ClasseEnum.COMBATENTE, { nonNullable: true }),
    nivel: new FormControl(3, { nonNullable: true }),
    vigor: new FormControl(2, { nonNullable: true }),
    destreza: new FormControl(2, { nonNullable: true }),
    forca: new FormControl(2, { nonNullable: true }),
    vontade: new FormControl(1, { nonNullable: true }),
    sentidos: new FormControl(1, { nonNullable: true }),
  });

  /** Valores crus do formulário, refletidos como Signal a cada alteração. */
  private readonly bruto = toSignal(
    this.formulario.valueChanges.pipe(map(() => this.formulario.getRawValue())),
    { initialValue: this.formulario.getRawValue() },
  );

  /** Limites de Nível e atributo da classe atual (bounds dos steppers). */
  protected readonly limites = computed(() => obterLimitesClasse({ classe: this.bruto().classe }));

  /**
   * Entrada normalizada aos limites da classe. Toda fórmula lê daqui, garantindo
   * que valores fora dos bounds (ex.: logo após trocar de classe) nunca escapem
   * para o cálculo — mesma disciplina do `aplicarLimitesPorClasse` do site antigo.
   */
  private readonly entrada = computed(() => {
    const valor = this.bruto();
    return { classe: valor.classe, ...aplicarLimitesPorClasse(valor) };
  });

  protected readonly ehCivil = computed(() => this.entrada().classe === ClasseEnum.CIVIL);
  protected readonly nivelAtual = computed(() => this.entrada().nivel);

  protected readonly rotuloNivel = computed(() => (this.ehCivil() ? 'Treinamentos' : 'Nível'));
  protected readonly rotuloProgressao = computed(() =>
    this.ehCivil() ? 'treinamento' : 'nível',
  );
  protected readonly tituloBeneficios = computed(() =>
    this.ehCivil() ? 'Benefícios deste Treinamento' : 'Benefícios deste Nível',
  );

  // ── Stats de destaque (hero) ───────────────────────────────────────────────
  protected readonly vida = computed(() => calcularVida(this.entrada()));
  protected readonly energia = computed(() => calcularEnergia(this.entrada()));

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

  // ── Stats secundárias ──────────────────────────────────────────────────────
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
      {
        rotulo: 'Traumas',
        valor: sanidade.limiteTraumas ?? INDISPONIVEL,
        detalhe: 'VON + 1',
      },
      { rotulo: 'Sequelas / Missão', valor: sanidade.sequelasRemovidasPorMissao, detalhe: 'VON' },
      {
        rotulo: 'Hab. / Turno',
        valor: limiteHabilidades,
        detalhe: ehCivil ? 'civil' : `base 4 + ${limiteHabilidades - 4}`,
      },
      { rotulo: 'Percepção', valor: `${calcularAreaPercepcao(this.entrada())} m`, detalhe: '5 + SEN×5' },
    ];
  });

  // ── Progressão ─────────────────────────────────────────────────────────────
  protected readonly beneficios = computed(() => calcularBeneficiosNivel(this.entrada()));

  protected readonly progressaoAcumulada = computed<readonly ItemProgressao[]>(() => {
    const progressao = calcularProgressaoAcumulada(this.entrada());
    const itens: readonly ItemProgressao[] = [
      { rotulo: 'Atributos', valor: progressao.atributos },
      { rotulo: 'Hab. Gerais', valor: progressao.habilidadesGerais },
      { rotulo: 'Hab. de Classe', valor: progressao.habilidadesClasse },
      { rotulo: 'Hab. Classe/Arquétipo', valor: progressao.habilidadesClasseOuArquetipo },
      { rotulo: 'Hab. de Outra Classe', valor: progressao.habilidadesOutraClasse },
      { rotulo: 'Fortificações', valor: progressao.fortificacoes },
      { rotulo: 'Hab. Civis', valor: progressao.habilidadesCivis },
    ];
    return itens.filter((item) => item.valor > 0);
  });

  constructor() {
    // Ao trocar de classe, reclampa Nível e atributos aos novos limites (paridade
    // com o clamp de input do site antigo ao mudar de registro).
    this.formulario.controls.classe.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.formulario.patchValue(aplicarLimitesPorClasse(this.formulario.getRawValue()));
      });
  }
}
