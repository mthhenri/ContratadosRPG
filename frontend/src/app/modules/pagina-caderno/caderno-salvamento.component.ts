import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { Botao } from '../../shared/ui/botao/botao.component';
import { CadernoFlutuanteStore } from './caderno-flutuante.store';

/**
 * Selo de salvamento do caderno ("Salvando…", "Salvo", "Falha ao salvar", "Conflito de versão") e,
 * no conflito, "Recarregar versão". Lê o store de quem hospeda: o cabeçalho do painel flutuante e a
 * faixa de escopo da janela externa (I-027).
 */
@Component({
  selector: 'app-caderno-salvamento',
  standalone: true,
  imports: [Botao],
  templateUrl: './caderno-salvamento.component.html',
  styleUrl: './caderno-salvamento.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CadernoSalvamento {
  protected readonly store = inject(CadernoFlutuanteStore);
  protected readonly rotulo = computed(() => {
    const rotulos = {
      INATIVO: '',
      SALVANDO: 'Salvando…',
      SALVO: 'Salvo',
      FALHA: 'Falha ao salvar',
      CONFLITO: 'Conflito de versão',
    } as const;
    return rotulos[this.store.estadoSalvamento()];
  });
  protected readonly erro = computed(
    () =>
      this.store.estadoSalvamento() === 'FALHA' || this.store.estadoSalvamento() === 'CONFLITO',
  );
}
