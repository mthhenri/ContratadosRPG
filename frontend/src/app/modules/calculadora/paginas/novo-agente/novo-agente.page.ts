import { Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { map, merge } from 'rxjs';

import { MotivoEntradaAgenteEnum } from '@contratados-rpg/shared/enums';
import {
  calcularBonusMonetario,
  calcularNovoAgente,
  calcularPrestigioInicial,
} from '@contratados-rpg/shared/regras/novo-agente';

import { AjudaCalculadora } from '../../componentes/ajuda-calculadora/ajuda-calculadora.component';
import { StepInput } from '../../componentes/step-input/step-input.component';
import { EstadoAbasCalculadoraService } from '../../estado-abas-calculadora.service';
import { ROTULOS_MOTIVO_ENTRADA, ROTULOS_PATENTE } from '../../rotulos';

/** Opção do `<select>` de motivo de entrada. */
interface OpcaoMotivo {
  readonly valor: MotivoEntradaAgenteEnum;
  readonly rotulo: string;
}

/** Valor bruto do formulário da aba — o que o singleton preserva entre navegações (m1-17). */
interface NovoAgenteEstadoBruto {
  motivo: MotivoEntradaAgenteEnum;
  mediaNivel: number;
  mediaPrestigio: number;
  prestigioBonus: number;
}

/**
 * Aba "Novo Agente" da calculadora (m1-08). Formulário reativo (motivo de entrada + médias de
 * Nível e Prestígio do grupo, mais o Prestígio editável do bônus) reusando o `StepInput` da
 * m1-06; o estado deriva em Signals. **Nenhuma regra de jogo vive aqui**: Nível/Prestígio
 * iniciais, patente e bônus monetário vêm de `shared/regras/novo-agente` (fonte única —
 * SYSTEM.SPEC §6.6). Paridade de saída com a aba `novo` do site antigo (`calcNovoAgente` /
 * `calcBonus`): o campo de Prestígio do bônus é auto-preenchido com o inicial calculado e pode
 * ser sobrescrito manualmente.
 */
@Component({
  selector: 'app-novo-agente-page',
  imports: [ReactiveFormsModule, StepInput, AjudaCalculadora],
  templateUrl: './novo-agente.page.html',
  styleUrl: './novo-agente.page.scss',
})
export class NovoAgentePage {
  protected readonly motivos: readonly OpcaoMotivo[] = (
    Object.values(MotivoEntradaAgenteEnum) as MotivoEntradaAgenteEnum[]
  ).map((valor) => ({ valor, rotulo: ROTULOS_MOTIVO_ENTRADA[valor] }));

  private readonly estadoAbas = inject(EstadoAbasCalculadoraService);

  protected readonly formulario = new FormGroup({
    motivo: new FormControl<MotivoEntradaAgenteEnum>(MotivoEntradaAgenteEnum.MORTE_OU_INICIO_DO_ZERO, {
      nonNullable: true,
    }),
    mediaNivel: new FormControl(5, { nonNullable: true }),
    mediaPrestigio: new FormControl(10, { nonNullable: true }),
    prestigioBonus: new FormControl(0, { nonNullable: true }),
  });

  private readonly bruto = toSignal(
    this.formulario.valueChanges.pipe(map(() => this.formulario.getRawValue())),
    { initialValue: this.formulario.getRawValue() },
  );

  /** Resultado completo (Nível/Prestígio iniciais, patente, bônus) a partir das três médias. */
  protected readonly resultado = computed(() =>
    calcularNovoAgente({
      motivo: this.bruto().motivo,
      mediaNivel: this.bruto().mediaNivel,
      mediaPrestigio: this.bruto().mediaPrestigio,
    }),
  );

  /** Bônus monetário do Prestígio informado no card de bônus (auto-preenchido ou manual). */
  protected readonly bonus = computed(() =>
    calcularBonusMonetario({ prestigioInicial: this.bruto().prestigioBonus }),
  );

  protected readonly nivelInicial = computed(() => this.resultado().nivelInicial);
  protected readonly prestigioInicial = computed(() => this.resultado().prestigio.prestigioInicial);
  protected readonly patenteResultante = computed(
    () => ROTULOS_PATENTE[this.resultado().patenteResultante.patente],
  );
  protected readonly recebeAmaldicoado = computed(
    () => this.resultado().recebeAmaldicoadoPeloPassado,
  );

  protected readonly subNivel = computed(() => `média ${this.bruto().mediaNivel.toFixed(1)} → −1`);
  protected readonly subPrestigio = computed(() => {
    const prestigio = this.resultado().prestigio;
    return `média ${this.bruto().mediaPrestigio} · ÷${prestigio.divisor} = −${prestigio.deducao}`;
  });
  protected readonly subPatente = computed(
    () => `piso: ${ROTULOS_PATENTE[this.resultado().prestigio.patenteCapMinimo.patente]}`,
  );

  /** Memória de cálculo exibida como lista (paridade com o detalhamento do site antigo). */
  protected readonly detalhes = computed<readonly string[]>(() => {
    const valor = this.bruto();
    const prestigio = this.resultado().prestigio;
    const pisoNome = ROTULOS_PATENTE[prestigio.patenteCapMinimo.patente];
    const prestigioAntesDoPiso = Math.floor(valor.mediaPrestigio - prestigio.deducao);
    return [
      `Motivo: ${ROTULOS_MOTIVO_ENTRADA[valor.motivo]}`,
      `Nível: arredonda(${valor.mediaNivel.toFixed(1)}) − 1 = ${this.resultado().nivelInicial} (mínimo 0)`,
      `Prestígio: ${valor.mediaPrestigio} − ⌊${valor.mediaPrestigio} ÷ ${prestigio.divisor}⌋ = ${valor.mediaPrestigio} − ${prestigio.deducao} = ${prestigioAntesDoPiso} → piso ${pisoNome} (${prestigio.patenteCapMinimo.prestigioMinimo}) → ${prestigio.prestigioInicial}`,
    ];
  });

  protected readonly bonusFormatado = computed(
    () => `$ ${this.bonus().bonus.toLocaleString('pt-BR')}`,
  );
  protected readonly bonusInfo = computed(() => {
    const patente = this.bonus().patente;
    return `Patente: ${ROTULOS_PATENTE[patente.patente]} · Salário base: $${patente.salario.toLocaleString('pt-BR')}/missão`;
  });

  constructor() {
    // Restaura o estado preservado entre navegações (m1-17), antes de armar as inscrições — assim
    // o `patchValue` de restauração não dispara o auto-sync (que sobrescreveria o Prestígio do
    // bônus restaurado) nem grava redundantemente no singleton.
    const salvo = this.estadoAbas.obterEstado<NovoAgenteEstadoBruto>('novo-agente');
    if (salvo) {
      this.formulario.patchValue(salvo);
    }

    // Auto-preenche o Prestígio do bônus com o inicial calculado sempre que a configuração muda —
    // paridade com o site antigo, que repopulava o campo (e sobrescrevia edição manual) a cada
    // mudança, deixando-o editável no restante.
    merge(
      this.formulario.controls.motivo.valueChanges,
      this.formulario.controls.mediaNivel.valueChanges,
      this.formulario.controls.mediaPrestigio.valueChanges,
    )
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.sincronizarPrestigioBonus());

    // Grava o valor bruto de volta no singleton a cada mudança (só memória — sem I/O).
    this.formulario.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() =>
        this.estadoAbas.definirEstado<NovoAgenteEstadoBruto>(
          'novo-agente',
          this.formulario.getRawValue(),
        ),
      );

    // Preenchimento inicial (o site antigo chamava calcNovoAgente no load). Só quando não há
    // estado restaurado — senão sobrescreveria o Prestígio do bônus preservado.
    if (!salvo) {
      this.sincronizarPrestigioBonus();
    }
  }

  /**
   * Volta a aba ao estado padrão: `reset()` restaura o preset de fábrica dos campos, e então
   * re-executa o auto-preenchimento do Prestígio do bônus — como no primeiro load, onde o campo
   * nasce preenchido com o inicial calculado (não zerado). O `valueChanges` regrava o singleton.
   */
  protected limpar(): void {
    this.formulario.reset();
    this.sincronizarPrestigioBonus();
  }

  /**
   * Copia o Prestígio inicial calculado para o campo editável do bônus. Lê de `getRawValue()`
   * (não do Signal `bruto`): quando um controle-filho emite, o `valueChanges` do form-pai — que
   * alimenta `bruto` — ainda não emitiu, então o Signal estaria defasado dentro do subscriber;
   * o modelo do form já está atualizado. O Prestígio inicial depende só de motivo + média de
   * Prestígio (a média de Nível não entra), então reusa `calcularPrestigioInicial`.
   */
  private sincronizarPrestigioBonus(): void {
    const { motivo, mediaPrestigio } = this.formulario.getRawValue();
    const prestigioInicial = calcularPrestigioInicial({ motivo, mediaPrestigio }).prestigioInicial;
    this.formulario.controls.prestigioBonus.setValue(prestigioInicial);
  }
}
