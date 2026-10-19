import { Component, DestroyRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { type Observable, merge, of } from 'rxjs';

import { TipoFichaEnum } from '@contratados-rpg/shared/enums';
import type { FichaCriaturaRecuperadaDto, FichaRecuperadaDto } from '@contratados-rpg/shared/dtos/ficha';

import { SessaoService } from '../../../../core/services/sessao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { CriaturaVisualizacao } from '../criatura-visualizacao/criatura-visualizacao.component';
import { FichaCampanhaCard } from '../ficha-campanha-card/ficha-campanha-card.component';
import { FichaEdicaoCriaturaService } from '../../ficha-edicao-criatura.service';
import { FichaEdicaoService } from '../../ficha-edicao.service';
import { FichaRolagemRegistroService } from '../../ficha-rolagem-registro.service';
import { FichaService } from '../../ficha.service';
import { revalidarLeituraFicha } from '../../ficha-leitura-revalidar';
import { mesclarDocumento, mesclarFicha } from '../../mesclar-ficha';
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
  imports: [FichaCampanhaCard, CriaturaVisualizacao],
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
  private readonly tempoRealService = inject(TempoRealService);
  private readonly destroyRef = inject(DestroyRef);

  readonly alvo = input.required<FichaFlutuanteAlvo>();
  readonly ehMestre = input.required<boolean>();
  readonly leituraNegada = output<number>();

  protected readonly TipoFichaEnum = TipoFichaEnum;
  protected readonly carregando = signal(true);
  protected readonly fichaJogador = signal<FichaRecuperadaDto | null>(null);
  protected readonly fichaCriatura = signal<FichaCriaturaRecuperadaDto | null>(null);

  /**
   * Nome da ficha carregada — o título da janela (`FichaFlutuante`). `null` enquanto carrega; segue
   * uma renomeação feita aqui mesmo, porque a edição grava no mesmo sinal.
   */
  readonly nome = computed(() => this.fichaJogador()?.nome ?? this.fichaCriatura()?.nome ?? null);

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
      // Sala da ficha aberta enquanto esta instância viver (fix-ficha-oculta-concessao-e-leitura):
      // é por ela que `ficha:acesso-revogado` fecha a janela (`FichaFlutuante`) — nem todo
      // hospedeiro ingressa (o painel de Iniciativa não assina fichas). Referência contada no
      // `TempoRealService`, então não derruba a sala que o hospedeiro também usa.
      this.tempoRealService.conectar();
      this.tempoRealService.entrarSalaFicha(alvoAtual.fichaId);
      this.destroyRef.onDestroy(() => this.tempoRealService.sairSalaFicha(alvoAtual.fichaId));

      if (alvoAtual.tipo === TipoFichaEnum.JOGADOR) {
        this.fichaEdicao.inicializar(this.fichaJogador, () => alvoAtual.fichaId);
      } else {
        this.fichaEdicaoCriatura.inicializar(this.fichaCriatura, () => alvoAtual.fichaId);
      }
      const recuperar = (): Observable<FichaRecuperadaDto | FichaCriaturaRecuperadaDto> =>
        alvoAtual.tipo === TipoFichaEnum.JOGADOR
          ? this.fichaService.recuperarFicha(alvoAtual.fichaId)
          : this.fichaService.recuperarFichaCriatura(alvoAtual.fichaId);
      merge(of(undefined), this.tempoRealService.reconexao$).pipe(
        revalidarLeituraFicha(recuperar, () => {
          this.fichaJogador.set(null);
          this.fichaCriatura.set(null);
          this.fichaEdicao.definirBase(null);
          this.fichaEdicaoCriatura.definirBase(null);
          this.carregando.set(false);
          this.leituraNegada.emit(alvoAtual.fichaId);
        }),
        takeUntilDestroyed(this.destroyRef),
      ).subscribe((ficha) => untracked(() => {
        if (alvoAtual.tipo === TipoFichaEnum.JOGADOR) {
          const jogador = ficha as FichaRecuperadaDto;
          const base = this.fichaEdicao.fichaBase();
          const local = this.fichaJogador();
          this.fichaJogador.set(this.fichaEdicao.edicaoPendente() && base && local
            ? mesclarFicha(base, local, jogador) : jogador);
          this.fichaEdicao.definirBase(jogador);
        } else {
          const criatura = ficha as FichaCriaturaRecuperadaDto;
          const base = this.fichaEdicaoCriatura.fichaBase();
          const local = this.fichaCriatura();
          this.fichaCriatura.set(this.fichaEdicaoCriatura.edicaoPendente() && base && local
            ? mesclarDocumento(base, local, criatura) : criatura);
          this.fichaEdicaoCriatura.definirBase(criatura);
        }
        this.carregando.set(false);
      }));
    });
  }
}
