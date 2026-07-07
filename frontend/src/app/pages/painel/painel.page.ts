import { Component, inject } from '@angular/core';

import { SessaoService } from '../../core/services/sessao.service';

/**
 * Landing privada do usuário autenticado — a primeira rota protegida pelo `autenticacaoGuard`
 * (m2-06) e destino padrão pós-login. Nesta task é uma casca mínima que confirma a sessão; a
 * gestão de campanhas (listar/criar/entrar) preenche este espaço na m2-07.
 */
@Component({
  selector: 'app-painel',
  imports: [],
  templateUrl: './painel.page.html',
  styleUrl: './painel.page.scss',
})
export class Painel {
  protected readonly sessaoService = inject(SessaoService);
}
