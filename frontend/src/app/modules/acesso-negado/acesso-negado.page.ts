import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Icone } from '../../shared/icone/icone.component';

/** Destino genérico de uma tentativa autenticada sem a classificação exigida. */
@Component({
  selector: 'app-acesso-negado-page',
  imports: [RouterLink, Icone],
  templateUrl: './acesso-negado.page.html',
  styleUrl: './acesso-negado.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcessoNegadoPage {}
