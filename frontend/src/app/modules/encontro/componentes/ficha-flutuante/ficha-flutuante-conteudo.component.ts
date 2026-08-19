import { Component, computed, effect, inject, input, signal } from '@angular/core';

import { TipoFichaEnum } from '@contratados-rpg/shared/enums';
import type { FichaCriaturaRecuperadaDto, FichaRecuperadaDto } from '@contratados-rpg/shared/dtos/ficha';

import { SessaoService } from '../../../../core/services/sessao.service';
import { CriaturaVisualizacao } from '../../../ficha/componentes/criatura-visualizacao/criatura-visualizacao.component';
import { FichaVisualizacao } from '../../../ficha/componentes/ficha-visualizacao/ficha-visualizacao.component';
import { FichaEdicaoCriaturaService } from '../../../ficha/ficha-edicao-criatura.service';
import { FichaEdicaoService } from '../../../ficha/ficha-edicao.service';
import { FichaRolagemRegistroService } from '../../../ficha/ficha-rolagem-registro.service';
import { FichaService } from '../../../ficha/ficha.service';
import type { FichaFlutuanteAlvo } from './ficha-flutuante.model';

/**
 * O corpo de dentro da `FichaFlutuante`: busca a ficha do `alvo` e a desenha, editável.
 *
 * **Por que é um componente à parte, e não um `@if` dentro da própria `FichaFlutuante`:** cada
 * `providers: []` (aqui embaixo) só ganha uma instância nova quando o **componente inteiro** é
 * recriado — `FichaEdicaoService.inicializar()`/`FichaEdicaoCriaturaService.inicializar()` travam
 * na primeira ficha que recebem (mesmo contrato de `FichaEdicaoService`, usado por
 * `VisualizarPage`/`CampanhaDetalhe`: uma página, uma ficha, uma instância). Como a janela
 * flutuante troca de ficha várias vezes na mesma sessão de combate (clicar em outro cartão), só
 * trocar o `input` não bastaria — a instância antiga continuaria presa à ficha antiga. A
 * `FichaFlutuante` (pai) força a recriação deste componente a cada `abrir()` para uma ficha
 * diferente (ver comentário em `ficha-flutuante.component.ts`).
 */
@Component({
  selector: 'app-ficha-flutuante-conteudo',
  imports: [FichaVisualizacao, CriaturaVisualizacao],
  templateUrl: './ficha-flutuante-conteudo.component.html',
  styleUrl: './ficha-flutuante-conteudo.component.scss',
  providers: [FichaEdicaoService, FichaEdicaoCriaturaService, FichaRolagemRegistroService],
})
export class FichaFlutuanteConteudo {
  private readonly fichaService = inject(FichaService);
  private readonly sessaoService = inject(SessaoService);
  protected readonly fichaEdicao = inject(FichaEdicaoService);
  protected readonly fichaEdicaoCriatura = inject(FichaEdicaoCriaturaService);
  private readonly fichaRolagemRegistro = inject(FichaRolagemRegistroService);

  readonly alvo = input.required<FichaFlutuanteAlvo>();
  readonly ehMestre = input.required<boolean>();

  protected readonly TipoFichaEnum = TipoFichaEnum;
  protected readonly carregando = signal(true);
  protected readonly fichaJogador = signal<FichaRecuperadaDto | null>(null);
  protected readonly fichaCriatura = signal<FichaCriaturaRecuperadaDto | null>(null);

  /** Mestre edita qualquer ficha; jogador só a própria — mesma regra de `CampanhaDetalhe`. */
  protected readonly ajustavel = computed(
    () => this.ehMestre() || this.alvo().usuarioIdDono === this.sessaoService.usuario()?.id,
  );

  constructor() {
    // `effect` (não o corpo direto do construtor) porque `alvo`/`ehMestre` são `input.required` —
    // só ficam disponíveis depois que Angular liga os bindings, já depois da construção. Esta
    // instância nasce e morre com uma única ficha (ver comentário da classe), então o efeito roda
    // exatamente uma vez: não há necessidade de guarda contra reexecução.
    effect(() => {
      const alvoAtual = this.alvo();
      this.fichaRolagemRegistro.inicializar(() => alvoAtual.fichaId);

      if (alvoAtual.tipo === TipoFichaEnum.JOGADOR) {
        this.fichaEdicao.inicializar(this.fichaJogador, () => alvoAtual.fichaId);
        this.fichaService.recuperarFicha(alvoAtual.fichaId).subscribe({
          next: (ficha) => {
            this.fichaJogador.set(ficha);
            this.fichaEdicao.definirBase(ficha);
            this.carregando.set(false);
          },
        });
      } else {
        this.fichaEdicaoCriatura.inicializar(this.fichaCriatura, () => alvoAtual.fichaId);
        this.fichaService.recuperarFichaCriatura(alvoAtual.fichaId).subscribe({
          next: (ficha) => {
            this.fichaCriatura.set(ficha);
            this.fichaEdicaoCriatura.definirBase(ficha);
            this.carregando.set(false);
          },
        });
      }
    });
  }
}
