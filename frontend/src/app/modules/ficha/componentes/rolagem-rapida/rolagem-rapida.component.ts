import { Component, computed, inject, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

import { RolagemVisibilidadeEnum } from '@contratados-rpg/shared/enums';
import type { FichaAtributosDto } from '@contratados-rpg/shared/dtos/ficha';
import { expandirAtalhosDano, rolarFormula, validarFormula } from '@contratados-rpg/shared/regras/rolagem';

import { BandejaDadosService } from '../../../../shared/bandeja-dados/bandeja-dados.service';
import { MontadorRolagem } from '../../../../shared/montador-rolagem/montador-rolagem.component';
import type { RolagemRealizadaDto } from '../../rolagem-realizada';
import { GuiaFormula } from '../guia-formula/guia-formula.component';

/**
 * Barra de **Rolagem rápida** (digita uma fórmula e rola na hora, sem salvar preset): extraída de
 * `FichaRolagens` (m3-31) pra ser reusada fora do editor de presets — a ficha de criatura não tem
 * presets nomeados (seus "ataques" já são `FichaCriaturaAtaqueDto`, outro conceito, editados em
 * `CriaturaAtaqueLista`), mas o pedido do autor foi a **mesma barra** (visor + montador de botões
 * + "Rolar") na aba Ataques. Continua controlada pelo chamador: recebe os derivados prontos
 * (atributos, proficiência, nível, atalhos de dano) em vez de calculá-los — quem calcula é cada
 * `*-painel`/`*-visualizacao` (regra de negócio não migra pra cá, proibições #26/#27).
 *
 * Mostra o resultado na bandeja de dados global e emite `rolagemFeita` — quem persiste o histórico
 * (`FichaRolagemRegistroService.registrar`) é o chamador, que já o injeta com o `fichaId` certo.
 */
@Component({
  selector: 'app-rolagem-rapida',
  imports: [ReactiveFormsModule, GuiaFormula, MontadorRolagem],
  templateUrl: './rolagem-rapida.component.html',
  styleUrl: './rolagem-rapida.component.scss',
})
export class RolagemRapida {
  /** A aba sai do fluxo sem destruir o montador flutuante que pode continuar aberto. */
  readonly oculto = input(false);
  /** Visibilidade que a próxima rolagem leva pra bandeja/histórico. */
  readonly rolagemOculta = input(false);
  /** Atributos que alimentam a fórmula. */
  readonly atributos = input.required<FichaAtributosDto>();
  /** Proficiência (nível; `null` para Civil/criatura) — fonte `PROF` das fórmulas. */
  readonly proficiencia = input<number | null>(null);
  /** Nível do agente — fonte `NIV` nas fórmulas. */
  readonly nivel = input<number>(0);
  /** Dono/mestre pode rolar; visualizador só-acesso não (m3-51). */
  readonly podeRolar = input(false);
  /** Dano C. a C./Furtivo atuais — expandem os atalhos `CORPO`/`FURTIVO` na fórmula. */
  readonly atalhosDano = input<{ readonly corpo?: string | null; readonly furtivo?: string | null }>({});
  /** Cor de identidade visual da ficha — repassada à bandeja de dados. */
  readonly cor = input<string | null>(null);

  /** Toda rolagem executada aqui — quem persiste o histórico. */
  readonly rolagemFeita = output<RolagemRealizadaDto>();

  private readonly bandeja = inject(BandejaDadosService);

  protected readonly formula = new FormControl('', { nonNullable: true });
  private readonly formulaTexto = toSignal(this.formula.valueChanges, { initialValue: '' });

  /** Validade da fórmula digitada (live, já com `corpo`/`furtivo` expandidos): `null` enquanto vazia. */
  protected readonly formulaValida = computed<boolean | null>(() => {
    const texto = this.formulaTexto().trim();
    return texto === '' ? null : validarFormula(expandirAtalhosDano(texto, this.atalhosDano()));
  });

  protected rolar(): void {
    if (!this.podeRolar()) {
      return;
    }
    const bruto = this.formula.value.trim();
    if (!bruto) {
      return;
    }
    const formula = expandirAtalhosDano(bruto, this.atalhosDano());
    if (!validarFormula(formula)) {
      return;
    }
    const resultado = rolarFormula({
      formula,
      atributos: this.atributos(),
      proficiencia: this.proficiencia(),
      nivel: this.nivel(),
    });
    if (resultado) {
      this.bandeja.mostrar({
        rotulo: 'Rolagem rápida',
        formula,
        resultado,
        corFicha: this.cor(),
        visibilidade: this.rolagemOculta() ? RolagemVisibilidadeEnum.PRIVADA : RolagemVisibilidadeEnum.PUBLICA,
      });
      this.rolagemFeita.emit({ rotulo: 'Rolagem rápida', formula, resultado });
    }
  }
}
