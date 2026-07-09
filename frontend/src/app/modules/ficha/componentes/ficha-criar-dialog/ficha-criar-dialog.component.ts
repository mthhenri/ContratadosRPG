import { Component, computed, effect, input, output, signal } from '@angular/core';

import { ArquetipoEnum, ClasseEnum } from '@contratados-rpg/shared/enums';
import type { FichaAtributosDto } from '@contratados-rpg/shared/dtos/ficha';
import {
  MAESTRIA_PONTOS_MINIMO,
  calcularEnergia,
  calcularVida,
  maestriaAtingivel,
  obterBonusAtributos,
  obterLimitesClasse,
} from '@contratados-rpg/shared/regras/agente';

import { HoldRepeat } from '../../../../shared/hold-repeat/hold-repeat.directive';
import { GRUPOS_CLASSE, arquetiposDaClasse, ehClasseBase } from '../../opcoes-ficha';
import { ATRIBUTOS_BASE_PADRAO, type OpcoesFichaInicial } from '../../ficha-padrao';

/** Chave de cada atributo (as dez chaves de `FichaAtributosDto`). */
type ChaveAtributo = keyof FichaAtributosDto;

/** Abreviação + nome + chave de um atributo (box: abrev. em cima, valor, nome embaixo). */
interface CampoAtributo {
  readonly chave: ChaveAtributo;
  readonly abrev: string;
  readonly nome: string;
}

/** Bloco de atributos (agrupamento de leitura do documento: Físicos / Mentais). */
interface GrupoAtributos {
  readonly rotulo: string;
  readonly campos: readonly CampoAtributo[];
}

/**
 * Assistente de **criação de ficha** (m3-16): antes de criar, coleta as escolhas cruciais — Codinome,
 * Classe/Subclasse/Arquétipo, Nível, Prestígio, atributos **base** e Maestria — num dialog sobre a
 * lista, em vez de despejar uma ficha padrão para edição no lugar. Os atributos são clampados aos
 * limites da classe (`obterLimitesClasse`) e o **bônus fixo de arquétipo/subclasse** (doc — mesma
 * tabela do editor) é somado no total exibido; a Maestria só habilita no atributo final 6+. Ao
 * confirmar, emite as escolhas **base** — a página monta a ficha via `construirFichaInicial` (que
 * reaplica o bônus e o snapshot). Nenhuma fórmula nova aqui (proibições #26/#27); só tokens do tema
 * (proibição #29).
 */
@Component({
  selector: 'app-ficha-criar-dialog',
  imports: [HoldRepeat],
  templateUrl: './ficha-criar-dialog.component.html',
  styleUrl: './ficha-criar-dialog.component.scss',
})
export class FichaCriarDialog {
  /** `true` enquanto a criação está em voo (desabilita os botões). */
  readonly criando = input(false);

  /** Escolhas confirmadas — a página monta e persiste a ficha. */
  readonly criar = output<OpcoesFichaInicial>();
  /** Fechar o assistente sem criar. */
  readonly cancelar = output<void>();

  protected readonly gruposClasse = GRUPOS_CLASSE;
  protected readonly limiteMaestria = MAESTRIA_PONTOS_MINIMO;

  protected readonly nome = signal('Novo agente');
  protected readonly classe = signal<ClasseEnum>(ClasseEnum.COMBATENTE);
  protected readonly arquetipo = signal<ArquetipoEnum | null>(null);
  protected readonly nivel = signal(0);
  protected readonly prestigio = signal(0);
  /** Atributos **base** (antes do bônus fixo de arquétipo). */
  protected readonly atributos = signal<FichaAtributosDto>({ ...ATRIBUTOS_BASE_PADRAO });
  protected readonly maestria = signal<ChaveAtributo | null>(null);

  protected readonly gruposAtributos: readonly GrupoAtributos[] = [
    {
      rotulo: 'Físicos',
      campos: [
        { chave: 'destreza', abrev: 'DES', nome: 'Destreza' },
        { chave: 'forca', abrev: 'FOR', nome: 'Força' },
        { chave: 'luta', abrev: 'LUT', nome: 'Luta' },
        { chave: 'pontaria', abrev: 'PON', nome: 'Pontaria' },
        { chave: 'vigor', abrev: 'VIG', nome: 'Vigor' },
      ],
    },
    {
      rotulo: 'Mentais',
      campos: [
        { chave: 'intelecto', abrev: 'INT', nome: 'Intelecto' },
        { chave: 'medicina', abrev: 'MED', nome: 'Medicina' },
        { chave: 'sentidos', abrev: 'SEN', nome: 'Sentidos' },
        { chave: 'social', abrev: 'SOC', nome: 'Social' },
        { chave: 'vontade', abrev: 'VON', nome: 'Vontade' },
      ],
    },
  ];

  /** Limites de Nível/atributo da classe atual. */
  protected readonly limites = computed(() => obterLimitesClasse({ classe: this.classe() }));
  /** `true` quando a classe tem arquétipo (mostra o segundo `<select>`). */
  protected readonly ehClasseBaseAtual = computed(() => ehClasseBase(this.classe()));
  /** Arquétipos válidos para a classe atual. */
  protected readonly arquetipos = computed(() => arquetiposDaClasse(this.classe()));
  protected readonly ehCivil = computed(() => this.classe() === ClasseEnum.CIVIL);
  protected readonly rotuloNivel = computed(() => (this.ehCivil() ? 'Treinamentos' : 'Nível'));

  /** Bônus fixo de atributos do arquétipo/subclasse escolhido (só quando a classe o comporta). */
  private readonly bonus = computed(() =>
    obterBonusAtributos({
      classe: this.classe(),
      arquetipo: this.ehClasseBaseAtual() ? this.arquetipo() : null,
    }),
  );

  /** Resumo legível do bônus do arquétipo (ex.: "+1 FOR · +1 LUT"), ou vazio. */
  protected readonly bonusResumo = computed(() => {
    const bonus = this.bonus();
    const abrev = new Map(
      this.gruposAtributos.flatMap((grupo) => grupo.campos.map((campo) => [campo.chave, campo.abrev])),
    );
    return (Object.keys(bonus) as ChaveAtributo[])
      .filter((chave) => (bonus[chave] ?? 0) !== 0)
      .map((chave) => `+${bonus[chave]} ${abrev.get(chave)}`)
      .join(' · ');
  });

  /** Prévia de Vida/Energia máximas com os atributos **finais** (base + bônus, clampados). */
  protected readonly vidaPrevia = computed(() =>
    calcularVida({ classe: this.classe(), nivel: this.nivel(), vigor: this.atributoFinal('vigor') }),
  );
  protected readonly energiaPrevia = computed(() =>
    calcularEnergia({
      classe: this.classe(),
      nivel: this.nivel(),
      destreza: this.atributoFinal('destreza'),
    }),
  );

  constructor() {
    // Trocar de classe/arquétipo pode invalidar a Maestria (o total do atributo muda): reavalia.
    effect(() => {
      const chave = this.maestria();
      if (chave !== null && !maestriaAtingivel(this.atributoFinal(chave))) {
        this.maestria.set(null);
      }
    });
  }

  /** Valor **final** de um atributo (base + bônus), clampado aos limites da classe. */
  protected atributoFinal(chave: ChaveAtributo): number {
    const limites = this.limites();
    const bruto = this.atributos()[chave] + (this.bonus()[chave] ?? 0);
    return Math.min(limites.atributoMaximo, Math.max(limites.atributoMinimo, bruto));
  }

  /** Bônus de arquétipo aplicado a um atributo (0 quando não há) — marcador `+n` no box. */
  protected bonusAtributo(chave: ChaveAtributo): number {
    return this.bonus()[chave] ?? 0;
  }

  protected atualizarNome(valor: string): void {
    this.nome.set(valor);
  }

  /** Troca a classe; reclampa Nível e atributos e limpa o arquétipo se não valer para a nova classe. */
  protected mudarClasse(evento: Event): void {
    const classe = (evento.target as HTMLSelectElement).value as ClasseEnum;
    this.classe.set(classe);
    const limites = obterLimitesClasse({ classe });
    this.nivel.update((valor) =>
      Math.min(limites.nivelMaximo, Math.max(limites.nivelMinimo, valor)),
    );
    this.atributos.update((atributos) => {
      const reclampados = { ...atributos };
      (Object.keys(reclampados) as ChaveAtributo[]).forEach((chave) => {
        reclampados[chave] = Math.min(
          limites.atributoMaximo,
          Math.max(limites.atributoMinimo, reclampados[chave]),
        );
      });
      return reclampados;
    });
    if (!arquetiposDaClasse(classe).some((opcao) => opcao.valor === this.arquetipo())) {
      this.arquetipo.set(null);
    }
  }

  /** Troca o arquétipo (`''` = nenhum). */
  protected mudarArquetipo(evento: Event): void {
    const valor = (evento.target as HTMLSelectElement).value;
    this.arquetipo.set(valor === '' ? null : (valor as ArquetipoEnum));
  }

  /** Passo − / + no Nível, clampado aos limites da classe. */
  protected passoNivel(delta: number): void {
    const limites = this.limites();
    this.nivel.update((valor) =>
      Math.min(limites.nivelMaximo, Math.max(limites.nivelMinimo, valor + delta)),
    );
  }

  /** Passo − / + no Prestígio (piso 0). */
  protected passoPrestigio(delta: number): void {
    this.prestigio.update((valor) => Math.max(0, valor + delta));
  }

  /** Passo − / + num atributo **base**, clampado aos limites da classe. */
  protected passoAtributo(chave: ChaveAtributo, delta: number): void {
    const limites = this.limites();
    this.atributos.update((atributos) => ({
      ...atributos,
      [chave]: Math.min(
        limites.atributoMaximo,
        Math.max(limites.atributoMinimo, atributos[chave] + delta),
      ),
    }));
  }

  /** `true` se o atributo (com o bônus) atinge o mínimo de Maestria. */
  protected maestriaHabilitada(chave: ChaveAtributo): boolean {
    return maestriaAtingivel(this.atributoFinal(chave));
  }

  /** Marca/desmarca a Maestria (única na ficha; só com o total 6+). */
  protected alternarMaestria(chave: ChaveAtributo): void {
    if (!this.maestriaHabilitada(chave)) {
      return;
    }
    this.maestria.set(this.maestria() === chave ? null : chave);
  }

  /** Confirma o assistente: emite as escolhas **base** (a página aplica o bônus e o snapshot). */
  protected confirmar(): void {
    if (this.criando()) {
      return;
    }
    this.criar.emit({
      nome: this.nome(),
      classe: this.classe(),
      arquetipo: this.arquetipo(),
      nivel: this.nivel(),
      prestigio: this.prestigio(),
      atributos: this.atributos(),
      maestria: this.maestria(),
    });
  }

  /** Fecha sem criar. */
  protected fechar(): void {
    this.cancelar.emit();
  }
}
