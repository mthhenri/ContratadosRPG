import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { EMPTY, type Observable, catchError, filter, map, of, switchMap } from 'rxjs';

import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type {
  FichaCriaturaRecuperadaDto,
  FichaRecuperadaDto,
} from '@contratados-rpg/shared/dtos/ficha';

import { SessaoService } from '../../../../core/services/sessao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto.component';
import { EstadoVazio } from '../../../../shared/ui/estado-vazio/estado-vazio.component';
import { JanelaExternaCabecalho } from '../../../../shared/ui/janela-externa-cabecalho/janela-externa-cabecalho.component';
import { CampanhaService } from '../../../campanha/campanha.service';
import { AnotacoesFichaEditor } from '../../componentes/anotacoes-ficha-editor/anotacoes-ficha-editor.component';
import { FichaEdicaoCriaturaService } from '../../ficha-edicao-criatura.service';
import { FichaEdicaoService } from '../../ficha-edicao.service';
import { FichaService } from '../../ficha.service';
import { mesclarDocumento, mesclarFicha } from '../../mesclar-ficha';

/** Ficha de jogador ou de criatura — só o que a janela lê para decidir permissão e contexto. */
interface FichaCarregada {
  nome: string;
  usuarioId: number;
  campanhaId: number | null;
}

/**
 * Anotações de uma ficha (jogador ou criatura) em janela externa (I-027): busca a ficha sozinha,
 * edita pela instância própria do serviço de edição e acompanha `ficha:alterada` pelo mesmo merge
 * de três vias das páginas da ficha. O `PUT` serializa o documento inteiro, então absorver o remoto
 * é o que impede salvar anotações aqui de desfazer o que a aba principal alterou (m3-17).
 */
@Component({
  selector: 'app-anotacoes-janela',
  imports: [AnotacoesFichaEditor, Esqueleto, EstadoVazio, JanelaExternaCabecalho],
  providers: [FichaEdicaoService, FichaEdicaoCriaturaService],
  templateUrl: './anotacoes-janela.page.html',
  styleUrl: './anotacoes-janela.page.scss',
  host: { '(window:beforeunload)': 'avisarEdicaoPendente($event)' },
})
export class AnotacoesJanela {
  private readonly rota = inject(ActivatedRoute);
  private readonly fichaService = inject(FichaService);
  private readonly campanhaService = inject(CampanhaService);
  private readonly sessaoService = inject(SessaoService);
  private readonly tempoRealService = inject(TempoRealService);
  private readonly fichaEdicao = inject(FichaEdicaoService);
  private readonly fichaEdicaoCriatura = inject(FichaEdicaoCriaturaService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly fichaId = Number(this.rota.snapshot.paramMap.get('fichaId'));
  protected readonly criatura = this.rota.snapshot.queryParamMap.get('tipo') === 'criatura';
  protected readonly voltarPara = this.criatura
    ? `/fichas/criatura/${this.fichaId}`
    : `/fichas/${this.fichaId}`;
  protected readonly contexto = signal('Anotações');
  protected readonly estado = signal<'carregando' | 'pronto' | 'negado'>('carregando');
  protected readonly editando = signal(false);

  private readonly fichaJogador = signal<FichaRecuperadaDto | null>(null);
  private readonly fichaCriatura = signal<FichaCriaturaRecuperadaDto | null>(null);

  protected readonly anotacoes = computed(
    () =>
      (this.criatura
        ? this.fichaCriatura()?.dados.anotacoes
        : this.fichaJogador()?.dados.anotacoes) ?? '',
  );

  constructor() {
    if (this.criatura) {
      this.fichaEdicaoCriatura.inicializar(this.fichaCriatura, () => this.fichaId);
    } else {
      this.fichaEdicao.inicializar(this.fichaJogador, () => this.fichaId);
    }

    this.recuperar()
      .pipe(
        switchMap((ficha) => {
          const campanhaId = ficha.campanhaId;
          const membros$: Observable<readonly CampanhaMembroResumoDto[]> =
            campanhaId !== null ? this.campanhaService.listarMembros(campanhaId) : of([]);
          return membros$.pipe(map((membros) => ({ ficha, membros })));
        }),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: ({ ficha, membros }) => this.iniciar(ficha, membros),
        error: () => this.estado.set('negado'),
      });

    // Mesmo canal `ficha:alterada` para jogador e criatura — ver `CriaturaVisualizar`. O payload
    // chega sem `anotacoes` (omitida para a sala inteira, §14): a janela sempre busca o documento
    // completo pelo REST, senão mostraria "Sem anotações" a cada alteração (P-080).
    this.tempoRealService.fichaAlterada$
      .pipe(
        filter((ficha) => ficha.id === this.fichaId && this.estado() === 'pronto'),
        switchMap(() => this.recuperar().pipe(catchError(() => EMPTY))),
        takeUntilDestroyed(),
      )
      .subscribe({ next: (ficha) => this.absorverRemoto(ficha) });

    effect(() => {
      if (this.tempoRealService.reconexao() > 0 && untracked(() => this.estado()) === 'pronto') {
        this.recuperar().subscribe({
          next: (ficha) => untracked(() => this.absorverRemoto(ficha)),
        });
      }
    });
  }

  protected salvar(texto: string): void {
    if (this.criatura) {
      this.fichaEdicaoCriatura.ajustarAnotacoes(texto);
    } else {
      this.fichaEdicao.ajustarAnotacoes(texto);
    }
  }

  /**
   * O save é debounced: fechar a janela logo após "Salvar" perderia o texto. Com edição pendente
   * (ou rascunho aberto), o navegador pede confirmação antes de fechar.
   */
  protected avisarEdicaoPendente(evento: BeforeUnloadEvent): void {
    const pendente = this.criatura
      ? this.fichaEdicaoCriatura.edicaoPendente()
      : this.fichaEdicao.edicaoPendente();
    if (pendente || this.editando()) {
      evento.preventDefault();
    }
  }

  private recuperar(): Observable<FichaRecuperadaDto | FichaCriaturaRecuperadaDto> {
    return this.criatura
      ? this.fichaService.recuperarFichaCriatura(this.fichaId)
      : this.fichaService.recuperarFicha(this.fichaId);
  }

  /** Dono ou mestre da campanha — mesma regra de apresentação de `podeGerenciar` das páginas. */
  private iniciar(
    ficha: FichaRecuperadaDto | FichaCriaturaRecuperadaDto,
    membros: readonly CampanhaMembroResumoDto[],
  ): void {
    const carregada: FichaCarregada = ficha;
    const usuarioId = this.sessaoService.usuario()?.id;
    const ehMestre = membros.some(
      (membro) =>
        membro.usuarioId === usuarioId && membro.papel === TipoCampanhaMembroPapelEnum.MESTRE,
    );
    if (carregada.usuarioId !== usuarioId && !ehMestre) {
      this.estado.set('negado');
      return;
    }

    this.definirFicha(ficha);
    this.contexto.set(`Anotações de ${carregada.nome}`);
    this.estado.set('pronto');
    this.tempoRealService.conectar();
    this.tempoRealService.entrarSalaFicha(this.fichaId);
    this.destroyRef.onDestroy(() => this.tempoRealService.sairSalaFicha(this.fichaId));
  }

  private definirFicha(ficha: FichaRecuperadaDto | FichaCriaturaRecuperadaDto): void {
    if (this.criatura) {
      const criatura = ficha as FichaCriaturaRecuperadaDto;
      this.fichaCriatura.set(criatura);
      this.fichaEdicaoCriatura.definirBase(criatura);
    } else {
      const jogador = ficha as FichaRecuperadaDto;
      this.fichaJogador.set(jogador);
      this.fichaEdicao.definirBase(jogador);
    }
  }

  /** Sem edição pendente substitui; com edição pendente mescla (o que foi editado aqui prevalece). */
  private absorverRemoto(remoto: FichaRecuperadaDto | FichaCriaturaRecuperadaDto): void {
    if (this.criatura) {
      const remotoCriatura = remoto as unknown as FichaCriaturaRecuperadaDto;
      const base = this.fichaEdicaoCriatura.fichaBase();
      const local = this.fichaCriatura();
      this.fichaCriatura.set(
        this.fichaEdicaoCriatura.edicaoPendente() && base && local
          ? mesclarDocumento(base, local, remotoCriatura)
          : remotoCriatura,
      );
      this.fichaEdicaoCriatura.definirBase(remotoCriatura);
      return;
    }
    const remotoJogador = remoto as FichaRecuperadaDto;
    const base = this.fichaEdicao.fichaBase();
    const local = this.fichaJogador();
    this.fichaJogador.set(
      this.fichaEdicao.edicaoPendente() && base && local
        ? mesclarFicha(base, local, remotoJogador)
        : remotoJogador,
    );
    this.fichaEdicao.definirBase(remotoJogador);
  }
}
