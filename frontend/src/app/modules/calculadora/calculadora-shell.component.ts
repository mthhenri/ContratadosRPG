import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

interface AbaCalculadora {
  readonly caminho: string;
  readonly rotulo: string;
}

/**
 * Shell do módulo da calculadora: cabeçalho + navegação de abas (deep-link por rota) + o
 * `router-outlet` onde a página da aba ativa é renderizada. Cada aba é um `routerLink` para
 * `/calculadora/<aba>`; o estado ativo vem de `routerLinkActive` (paridade com a classe
 * `.active` do `switchTab` do site antigo, agora dirigida pela URL). Sem lógica de cálculo —
 * essa mora em cada página (m1-07..m1-10).
 */
@Component({
  selector: 'app-calculadora-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './calculadora-shell.component.html',
  styleUrl: './calculadora-shell.component.scss',
})
export class CalculadoraShell {
  protected readonly abas: readonly AbaCalculadora[] = [
    { caminho: 'agente', rotulo: 'Agente / Civil' },
    { caminho: 'dt', rotulo: 'DT' },
    { caminho: 'novo-agente', rotulo: 'Novo Agente' },
    { caminho: 'patente', rotulo: 'Patentes' },
    { caminho: 'descanso', rotulo: 'Descanso' },
    { caminho: 'compras', rotulo: 'Compras' },
  ];
}
