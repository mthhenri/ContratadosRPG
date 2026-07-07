import { Component, computed, inject } from '@angular/core';

import { TemaService } from '../../core/services/tema.service';

/**
 * Marca do projeto (`public/logo-{white,black}.png`, m2-09) — troca a variante conforme a base
 * ativa do tema (`TemaService.base`, m1-13): branca sobre a base escura (identidade padrão),
 * preta sobre a base clara. Escala com a fonte do contexto (`1.4em`, mesmo padrão do
 * `app-icone`) para caber tanto na topbar quanto no painel de marca da autenticação.
 */
@Component({
  selector: 'app-marca',
  imports: [],
  templateUrl: './marca.component.html',
  styleUrl: './marca.component.scss',
})
export class Marca {
  private readonly temaService = inject(TemaService);

  protected readonly src = computed(() =>
    this.temaService.base() === 'claro' ? 'logo-black.png' : 'logo-white.png',
  );
}
