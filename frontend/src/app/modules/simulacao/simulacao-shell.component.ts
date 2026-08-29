import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { Icone, IconeNome } from '../../shared/icone/icone.component';
import { Chip } from '../../shared/ui/chip/chip.component';

interface AbaSimulacao {
  readonly caminho: string;
  readonly rotulo: string;
  readonly icone: IconeNome;
}

/**
 * Shell do módulo da simulacao: cabeçalho + navegação de abas (deep-link por rota) + o
 * `router-outlet` onde a página da aba ativa é renderizada. Cada aba é um `routerLink` para
 * `/simulacao/<aba>`; o estado ativo vem de `routerLinkActive` (paridade com a classe
 * `.active` do `switchTab` do site antigo, agora dirigida pela URL). Sem lógica de cálculo —
 * essa mora em cada página (m1-07..m1-10).
 */
@Component({
  selector: 'app-simulacao-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Icone, Chip],
  templateUrl: './simulacao-shell.component.html',
  styleUrl: './simulacao-shell.component.scss',
})
export class SimulacaoShell {
  protected readonly abas: readonly AbaSimulacao[] = [
    { caminho: 'agente', rotulo: 'Agente / Civil', icone: 'agente' },
    { caminho: 'dt', rotulo: 'DT', icone: 'dt' },
    { caminho: 'novo-agente', rotulo: 'Novo Agente', icone: 'novo-agente' },
    { caminho: 'patente', rotulo: 'Patentes', icone: 'patente' },
    { caminho: 'descanso', rotulo: 'Descanso', icone: 'descanso' },
    { caminho: 'compras', rotulo: 'Compras', icone: 'compras' },
    { caminho: 'vendas', rotulo: 'Vendas', icone: 'vendas' },
  ];
}
