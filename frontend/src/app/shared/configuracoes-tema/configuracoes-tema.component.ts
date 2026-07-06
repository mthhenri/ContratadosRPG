import { Component, effect, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { BaseTema, TemaService } from '../../core/services/tema.service';

/**
 * Painel de configurações de tema (m1-13): o gatilho (engrenagem) na topbar abre um painel que
 * troca **base clara/escura**, **preset de accent** e um **accent custom** via color picker com
 * **trava de contraste**. Toda a lógica de tema (aplicar, travar, persistir) vive no
 * `TemaService`; este componente só orquestra a UI e consome os tokens do tema (nenhum hex/
 * fonte/raio solto — proibição #29).
 *
 * O painel **fecha apenas por botão** (o "×" ou "Fechar"), sem clique-fora — mesmo padrão de
 * acessibilidade dos modais de ajuda/compras (não aciona `click-events-have-key-events`/
 * `interactive-supports-focus` do lint).
 */
@Component({
  selector: 'app-configuracoes-tema',
  imports: [ReactiveFormsModule],
  templateUrl: './configuracoes-tema.component.html',
  styleUrl: './configuracoes-tema.component.scss',
})
export class ConfiguracoesTema {
  protected readonly tema = inject(TemaService);

  /** Se o painel está aberto. */
  protected readonly aberto = signal(false);

  /** `true` quando a última cor escolhida no picker foi bloqueada pela trava de contraste. */
  protected readonly contrasteBloqueado = signal(false);

  /** Cor do color picker (`<input type="color">`) via Reactive Forms — sem `ngModel`. */
  protected readonly corCustom = new FormControl<string>(this.tema.accentEfetivo(), {
    nonNullable: true,
  });

  constructor() {
    // Sincroniza o picker com o accent efetivo (troca de preset/base pode alterá-lo).
    effect(() => {
      const accent = this.tema.accentEfetivo();
      if (this.corCustom.value !== accent) {
        this.corCustom.setValue(accent, { emitEvent: false });
      }
    });

    this.corCustom.valueChanges.subscribe((cor) => {
      const aplicado = this.tema.definirAccentCustom(cor);
      this.contrasteBloqueado.set(!aplicado);
    });
  }

  protected abrir(): void {
    this.contrasteBloqueado.set(false);
    this.aberto.set(true);
  }

  protected fechar(): void {
    this.aberto.set(false);
  }

  protected selecionarBase(base: BaseTema): void {
    this.contrasteBloqueado.set(false);
    this.tema.definirBase(base);
  }

  protected selecionarPreset(id: string): void {
    this.contrasteBloqueado.set(false);
    this.tema.selecionarPreset(id);
  }

  /** Salva a cor atual do picker como o slot custom re-selecionável (m1-16). */
  protected salvarCor(): void {
    this.contrasteBloqueado.set(false);
    this.tema.salvarAccentCustom(this.corCustom.value);
  }

  /** Re-seleciona o slot custom salvo (m1-16). */
  protected selecionarSalvo(): void {
    this.contrasteBloqueado.set(false);
    this.tema.selecionarAccentSalvo();
  }
}
