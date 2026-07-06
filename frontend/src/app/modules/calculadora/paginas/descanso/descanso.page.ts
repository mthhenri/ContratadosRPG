import { Component, computed, ElementRef, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { map, merge } from 'rxjs';

import { QualidadeDescansoEnum, TipoDescansoEnum } from '@contratados-rpg/shared/enums';
import {
  calcularDescanso,
  calcularResultadoDescanso,
  DadosExtrasDto,
  interpretarDadosExtras,
  RecuperacaoFaixaDto,
  rolarDados,
} from '@contratados-rpg/shared/regras/descanso';

import { StepInput } from '../../componentes/step-input/step-input.component';

/** Opção de um `<select>` da configuração (o rótulo carrega texto descritivo de UI). */
interface OpcaoDescanso<TValor> {
  readonly valor: TValor;
  readonly rotulo: string;
}

/** Resultado de rolar uma track (Energia ou Vida): total final + memória de cálculo. */
interface RolagemFaixa {
  readonly total: number;
  readonly breakdown: string;
}

/** Resultado de uma rolagem completa de descanso (Energia sempre; Vida só quando o tipo recupera). */
interface RolagemDescanso {
  readonly energia: RolagemFaixa;
  readonly vida: RolagemFaixa | null;
}

/** Duração do embaralhamento antes de assentar o valor final (paridade com o site antigo). */
const DURACAO_SCRAMBLE_MS = 650;

/**
 * Aba "Descanso" da calculadora (m1-09). Formulário reativo (tipo, ambiente, atributos, Nível,
 * refeição, interrupção e dados extras) reusando o `StepInput` da m1-06; o estado deriva em
 * Signals. **Nenhuma regra de jogo vive aqui**: a faixa determinística de recuperação, a
 * interpretação dos dados extras, a rolagem e o resultado final vêm de `shared/regras/descanso`
 * (fonte única — SYSTEM.SPEC §6.6). Paridade de saída com a aba `descanso` do site antigo
 * (`calcDescanso`/`rollDescanso`), **incluindo a rolagem animada** (efeito de embaralhamento) —
 * o único não-determinismo vive na página e usa a utilidade `rolarDados` do domínio (§6.6).
 */
@Component({
  selector: 'app-descanso-page',
  imports: [ReactiveFormsModule, StepInput],
  templateUrl: './descanso.page.html',
  styleUrl: './descanso.page.scss',
})
export class DescansoPage {
  protected readonly tipos: readonly OpcaoDescanso<TipoDescansoEnum>[] = [
    { valor: TipoDescansoEnum.CURTO, rotulo: 'Curto (~15 min) — 1D4' },
    { valor: TipoDescansoEnum.MEDIO, rotulo: 'Médio (2–4h) — 1D6' },
    { valor: TipoDescansoEnum.LONGO, rotulo: 'Longo (6–8h) — 1D8 · Uma vez por dia' },
  ];

  protected readonly qualidades: readonly OpcaoDescanso<QualidadeDescansoEnum>[] = [
    { valor: QualidadeDescansoEnum.INSALUBRE, rotulo: 'Insalubre (−1 tipo de dado)' },
    { valor: QualidadeDescansoEnum.ADEQUADO, rotulo: 'Adequado (padrão)' },
    { valor: QualidadeDescansoEnum.CONFORTAVEL, rotulo: 'Confortável (+1 tipo de dado)' },
  ];

  protected readonly opcoesSimNao: readonly OpcaoDescanso<'nao' | 'sim'>[] = [
    { valor: 'nao', rotulo: 'Não' },
    { valor: 'sim', rotulo: 'Sim (+1 tipo de dado)' },
  ];

  protected readonly opcoesInterrupcao: readonly OpcaoDescanso<'nao' | 'sim'>[] = [
    { valor: 'nao', rotulo: 'Não' },
    { valor: 'sim', rotulo: 'Sim (÷2 no resultado)' },
  ];

  protected readonly formulario = new FormGroup({
    tipo: new FormControl<TipoDescansoEnum>(TipoDescansoEnum.CURTO, { nonNullable: true }),
    qualidade: new FormControl<QualidadeDescansoEnum>(QualidadeDescansoEnum.ADEQUADO, {
      nonNullable: true,
    }),
    vigor: new FormControl(1, { nonNullable: true }),
    destreza: new FormControl(1, { nonNullable: true }),
    nivel: new FormControl(0, { nonNullable: true }),
    // Refeição e interrupção são `<select>` Sim/Não: guardados como string (não boolean) porque o
    // value accessor nativo do `<select>` escreve string — um boolean viraria a string `'sim'`,
    // sempre truthy. A conversão para boolean acontece em `entrada` (paridade com o site antigo).
    refeicao: new FormControl<'nao' | 'sim'>('nao', { nonNullable: true }),
    interrompido: new FormControl<'nao' | 'sim'>('nao', { nonNullable: true }),
    extraVida: new FormControl('', { nonNullable: true }),
    extraEnergia: new FormControl('', { nonNullable: true }),
  });

  private readonly bruto = toSignal(
    this.formulario.valueChanges.pipe(map(() => this.formulario.getRawValue())),
    { initialValue: this.formulario.getRawValue() },
  );

  /** Configuração normalizada (Sim/Não → boolean) que alimenta o motor de regras. */
  private readonly entrada = computed(() => {
    const valor = this.bruto();
    return {
      tipo: valor.tipo,
      qualidade: valor.qualidade,
      vigor: valor.vigor,
      destreza: valor.destreza,
      nivel: valor.nivel,
      refeicao: valor.refeicao === 'sim',
      interrompido: valor.interrompido === 'sim',
    };
  });

  /** Faixa determinística de recuperação (Energia sempre; Vida `null` no Descanso Curto). */
  protected readonly calculo = computed(() => calcularDescanso(this.entrada()));

  protected readonly energiaFaixa = computed(() => this.formatarFaixa(this.calculo().energia));
  protected readonly energiaFormula = computed(() =>
    this.formatarFormula(this.calculo().energia, this.entrada().interrompido),
  );

  protected readonly vidaFaixa = computed(() => {
    const vida = this.calculo().vida;
    return vida ? this.formatarFaixa(vida) : 'Não recupera Vida';
  });
  protected readonly vidaFormula = computed(() => {
    const vida = this.calculo().vida;
    return vida
      ? this.formatarFormula(vida, this.entrada().interrompido)
      : 'Descanso Curto não recupera Vida';
  });

  /** Notas contextuais da configuração (paridade com o bloco de notas do site antigo). */
  protected readonly notas = computed<readonly string[]>(() => {
    const entrada = this.entrada();
    const notas: string[] = [];
    if (entrada.tipo === TipoDescansoEnum.LONGO) {
      notas.push('Descanso Longo só pode ser feito uma vez por dia.');
    }
    if (entrada.qualidade === QualidadeDescansoEnum.INSALUBRE) {
      notas.push('Ambiente insalubre reduz os dados em 1 tipo.');
    }
    if (entrada.qualidade === QualidadeDescansoEnum.CONFORTAVEL) {
      notas.push(
        'Ambiente confortável aumenta os dados em 1 tipo. A Base da Fundação é sempre Confortável.',
      );
    }
    if (entrada.refeicao) {
      notas.push('Refeição consumida: +1 tipo de dado na recuperação.');
    }
    if (entrada.interrompido) {
      notas.push('Interrupção: resultado final dividido por 2 (arredonda para baixo).');
    }
    notas.push('Fórmula geral: ATRIBUTO × dados + (Nível × 2).');
    return notas;
  });

  // === Estado da rolagem animada ===
  protected readonly rolagemVisivel = signal(false);
  protected readonly rolando = signal(false);
  protected readonly energiaRolada = signal<string | number>('—');
  protected readonly vidaRolada = signal<string | number>('—');
  protected readonly energiaBreakdown = signal('');
  protected readonly vidaBreakdown = signal('');

  private readonly valorEnergiaElemento =
    viewChild<ElementRef<HTMLElement>>('valorEnergiaRolada');
  private readonly valorVidaElemento = viewChild<ElementRef<HTMLElement>>('valorVidaRolada');

  private handleAnimacao = 0;

  constructor() {
    // Mudança na configuração determinística esconde a última rolagem (o site chamava
    // `calcDescanso`, que ocultava o container de rolagem).
    merge(
      this.formulario.controls.tipo.valueChanges,
      this.formulario.controls.qualidade.valueChanges,
      this.formulario.controls.vigor.valueChanges,
      this.formulario.controls.destreza.valueChanges,
      this.formulario.controls.nivel.valueChanges,
      this.formulario.controls.refeicao.valueChanges,
      this.formulario.controls.interrompido.valueChanges,
    )
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.rolagemVisivel.set(false));

    // Mudança nos dados extras re-rola sem animação se já houver uma rolagem visível (paridade
    // com o `rollDescansoIfVisible` do site antigo).
    merge(
      this.formulario.controls.extraVida.valueChanges,
      this.formulario.controls.extraEnergia.valueChanges,
    )
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        if (this.rolagemVisivel()) {
          this.rolar(false);
        }
      });
  }

  /**
   * Rola a recuperação de Energia (e Vida, quando o tipo recupera). Com `animar`, embaralha
   * números aleatórios por ~650ms antes de assentar no valor final (efeito de scramble do site
   * antigo); sem `animar`, aplica o resultado direto (re-rolagem ao editar os dados extras).
   */
  protected rolar(animar = true): void {
    const rolagem = this.calcularRolagem();
    this.rolagemVisivel.set(true);

    if (!animar) {
      this.aplicarResultados(rolagem);
      return;
    }

    this.rolando.set(true);
    this.energiaRolada.set('...');
    this.energiaBreakdown.set('');
    if (rolagem.vida) {
      this.vidaRolada.set('...');
      this.vidaBreakdown.set('');
    }

    const inicio = Date.now();

    const embaralhar = (): void => {
      if (Date.now() - inicio < DURACAO_SCRAMBLE_MS) {
        // Cada quadro é uma rolagem real dos dados configurados (base + extras, com interrupção),
        // então o número embaralhado fica sempre dentro do intervalo possível daquela recuperação —
        // não um aleatório qualquer. O valor final assentado continua sendo o `rolagem` fixado no
        // início da rolagem.
        const previa = this.calcularRolagem();
        this.energiaRolada.set(previa.energia.total);
        if (previa.vida) {
          this.vidaRolada.set(previa.vida.total);
        }
        this.handleAnimacao = requestAnimationFrame(embaralhar);
      } else {
        this.rolando.set(false);
        this.aplicarResultados(rolagem);
      }
    };

    cancelAnimationFrame(this.handleAnimacao);
    this.handleAnimacao = requestAnimationFrame(embaralhar);
  }

  /** Assenta o resultado final nas duas tracks e dá um pulso de destaque em cada valor. */
  private aplicarResultados(rolagem: RolagemDescanso): void {
    this.energiaRolada.set(rolagem.energia.total);
    this.energiaBreakdown.set(rolagem.energia.breakdown);
    this.pulsar(this.valorEnergiaElemento());

    if (rolagem.vida) {
      this.vidaRolada.set(rolagem.vida.total);
      this.vidaBreakdown.set(rolagem.vida.breakdown);
      this.pulsar(this.valorVidaElemento());
    } else {
      this.vidaRolada.set('Não recupera');
      this.vidaBreakdown.set('Descanso Curto não recupera Vida');
    }
  }

  /** Rola as duas tracks a partir da faixa determinística e dos dados extras digitados. */
  private calcularRolagem(): RolagemDescanso {
    const calculo = this.calculo();
    // Lê do form (não do Signal `bruto`, que emite um passo atrás na re-rolagem por dados extras).
    const { extraVida, extraEnergia, interrompido } = this.formulario.getRawValue();
    const interrompidoBool = interrompido === 'sim';

    const energia = this.rolarFaixa(calculo.energia, extraEnergia, interrompidoBool);
    const vida = calculo.vida
      ? this.rolarFaixa(calculo.vida, extraVida, interrompidoBool)
      : null;
    return { energia, vida };
  }

  /** Rola uma track: dados de recuperação + dados extras interpretados, delegando o total ao motor. */
  private rolarFaixa(
    faixa: RecuperacaoFaixaDto,
    textoExtra: string,
    interrompido: boolean,
  ): RolagemFaixa {
    const rolagens = rolarDados({ faces: faixa.dadoFinal, quantidade: faixa.quantidadeDados });
    const extra = interpretarDadosExtras({ texto: textoExtra });
    const dadosExtras = this.rolarExtras(extra);

    const resultado = calcularResultadoDescanso({
      rolagens,
      dadosExtras,
      bonusNivel: faixa.bonusNivel,
      interrompido,
    });

    return {
      total: resultado.total,
      breakdown: this.montarBreakdown(rolagens, extra, dadosExtras, faixa.bonusNivel, resultado),
    };
  }

  /** Rola os dados extras interpretados: bônus fixo sai como está; notação `NdM` é rolada. */
  private rolarExtras(extra: DadosExtrasDto | null): number[] {
    if (!extra) {
      return [];
    }
    if (extra.bonusFixo > 0) {
      return [extra.bonusFixo];
    }
    return rolarDados({ faces: extra.faces, quantidade: extra.quantidade });
  }

  /** Memória de cálculo textual (paridade com o `breakdown` do site antigo). */
  private montarBreakdown(
    rolagens: readonly number[],
    extra: DadosExtrasDto | null,
    dadosExtras: readonly number[],
    bonusNivel: number,
    resultado: { soma: number; total: number; interrompido: boolean },
  ): string {
    let texto = rolagens.length > 0 ? `[${rolagens.join(' + ')}]` : '0';
    if (extra) {
      const somaExtra = dadosExtras.reduce((acumulado, valor) => acumulado + valor, 0);
      texto += extra.faces > 0 ? ` +extra[${dadosExtras.join(' + ')}]` : ` +${somaExtra}`;
    }
    texto += ` + ${bonusNivel} = ${resultado.soma}`;
    if (resultado.interrompido) {
      texto += ` ÷ 2 = ${resultado.total}`;
    }
    return texto;
  }

  /** Intervalo mínimo–máximo de uma faixa (ex.: `"3–12"`). */
  private formatarFaixa(faixa: RecuperacaoFaixaDto): string {
    return `${faixa.minimo}–${faixa.maximo}`;
  }

  /** Fórmula legível `NDx + (Nível × 2) = NDx+B` (÷ 2 na interrupção), paridade com o site. */
  private formatarFormula(faixa: RecuperacaoFaixaDto, interrompido: boolean): string {
    const notacao = `${faixa.quantidadeDados}D${faixa.dadoFinal}`;
    const nivel = faixa.bonusNivel / 2;
    return `${notacao} + (${nivel}×2) = ${notacao}+${faixa.bonusNivel}${interrompido ? ' ÷ 2' : ''}`;
  }

  /** Pulso de escala no valor recém-assentado (guardado para ambientes sem `Element.animate`). */
  private pulsar(elemento: ElementRef<HTMLElement> | undefined): void {
    elemento?.nativeElement.animate?.(
      [{ transform: 'scale(1.15)' }, { transform: 'scale(1)' }],
      { duration: 220, easing: 'ease-out' },
    );
  }
}
