import { Component } from '@angular/core';

/**
 * Primitivo de bloco de esqueleto de carregamento (`ui-14` · `P-034`). Substitui `.esqueleto-bloco`
 * + `@keyframes esqueleto-pulso`, hoje copiados em `acervo.page.scss`, `lista.page.scss` e outros
 * SCSS de página — a mesma duplicação que `app-botao`/`app-chip` já resolveram para seus blocos.
 *
 * Mesma divisão de responsabilidade dos demais primitivos: este componente é dono só da
 * **identidade** (cor `--surface-2`, raio, animação de pulso, `prefers-reduced-motion`); o
 * consumidor continua dono do **tamanho e da geometria** — largura, altura, formato de avatar —
 * na própria classe BEM aplicada no mesmo elemento (`<app-esqueleto class="acervo__esqueleto-titulo" />`),
 * exatamente como já faz com `app-botao`. Puramente decorativo: `aria-hidden` fica no host: quem
 * envolve os blocos anuncia o carregamento uma vez (`role="status" aria-label="Carregando…"`),
 * como o produto já faz.
 */
@Component({
  selector: 'app-esqueleto',
  template: '',
  styleUrl: './esqueleto.component.scss',
  host: {
    class: 'esqueleto',
    'aria-hidden': 'true',
  },
})
export class Esqueleto {}
