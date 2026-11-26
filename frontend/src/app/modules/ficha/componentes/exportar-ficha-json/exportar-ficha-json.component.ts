import { Component, computed, inject, input, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { TipoUsuarioEnum } from '@contratados-rpg/shared/enums';

import { SessaoService } from '../../../../core/services/sessao.service';
import {
  MenuAcoes,
  type MenuAcoesItem,
} from '../../../../shared/ui/menu-acoes/menu-acoes.component';
import {
  FichaArquivoJsonService,
  type ModoExportacaoJson,
  type TipoFichaArquivoJson,
} from '../../ficha-arquivo-json.service';

/**
 * "Exportar ▾" no cabeçalho da ficha de Criatura/NPC (`ficha-json-exportar-importar-admin`): o
 * mesmo Copiar/Baixar JSON do menu ⋯ do acervo, sem precisar voltar a ele. Só o administrador vê
 * (gate de oferta; a leitura segue a permissão da rota de sempre). Sem admin, não renderiza nada.
 */
@Component({
  selector: 'app-exportar-ficha-json',
  imports: [MenuAcoes],
  template: `
    @if (ehAdmin()) {
      <app-menu-acoes
        rotulo="Exportar"
        variante="secundario"
        estilo="contorno"
        tamanho="pequeno"
        [itens]="itens"
        [desabilitado]="exportando()"
        (escolheu)="exportar($event)"
      />
    }
  `,
})
export class ExportarFichaJson {
  private readonly sessaoService = inject(SessaoService);
  private readonly arquivoJson = inject(FichaArquivoJsonService);

  readonly fichaId = input.required<number>();
  readonly tipo = input.required<TipoFichaArquivoJson>();

  protected readonly ehAdmin = computed(
    () => this.sessaoService.usuario()?.tipo === TipoUsuarioEnum.ADMIN,
  );
  protected readonly exportando = signal(false);
  protected readonly itens: readonly MenuAcoesItem[] = [
    { id: 'copiar', rotulo: 'Copiar JSON', descricao: 'Para a área de transferência' },
    { id: 'baixar', rotulo: 'Baixar JSON', descricao: 'Arquivo .json' },
  ];

  protected exportar(modo: string): void {
    this.exportando.set(true);
    this.arquivoJson
      .exportar(this.fichaId(), this.tipo(), modo as ModoExportacaoJson)
      .pipe(finalize(() => this.exportando.set(false)))
      .subscribe();
  }
}
