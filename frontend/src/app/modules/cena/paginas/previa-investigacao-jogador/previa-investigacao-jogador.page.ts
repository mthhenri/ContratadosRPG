import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { filter, merge, Subscription } from 'rxjs';
import type { CampanhaPreviaJogadorDto } from '@contratados-rpg/shared/dtos/campanha';
import type { CenaRecuperadaDto } from '@contratados-rpg/shared/dtos/cena';
import type { FichaRecuperadaDto } from '@contratados-rpg/shared/dtos/ficha';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';
import { CenaTipoEnum, TipoFichaEnum } from '@contratados-rpg/shared/enums';

import { CampanhaProjecaoService } from '../../../campanha/campanha-projecao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { TopbarContextoService } from '../../../../core/services/topbar-contexto.service';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { BotaoIcone } from '../../../../shared/ui/botao-icone/botao-icone.component';
import { Chip } from '../../../../shared/ui/chip/chip.component';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto.component';
import { EstadoVazio } from '../../../../shared/ui/estado-vazio/estado-vazio.component';
import { Modal } from '../../../../shared/ui/modal/modal.component';
import { Segmentado } from '../../../../shared/ui/segmentado/segmentado.component';
import { SegmentadoItem } from '../../../../shared/ui/segmentado/segmentado-item.component';
import { CartaoRolagem } from '../../../../shared/cartao-rolagem/cartao-rolagem.component';
import { Icone } from '../../../../shared/icone/icone.component';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { FichaCampanhaCard } from '../../../ficha/componentes/ficha-campanha-card/ficha-campanha-card.component';
import { FichaRolagemRegistroService } from '../../../ficha/ficha-rolagem-registro.service';
import { DocumentosCenaEspectador } from '../../componentes/documentos-cena-espectador/documentos-cena-espectador.component';
import { EsquadraoCenaJogador } from '../../componentes/esquadrao-cena-jogador/esquadrao-cena-jogador.component';
import { rotuloStatusCena, rotuloTipoCena } from '../../rotulos-cena';

/** Investigação no recorte do jogador-alvo, sem chamadas ou ações de mestre. */
@Component({
  selector: 'app-previa-investigacao-jogador',
  imports: [RouterLink, Botao, BotaoIcone, Chip, Esqueleto, EstadoVazio, Modal,
    Segmentado, SegmentadoItem, CartaoRolagem, Icone, Tooltip, FichaCampanhaCard,
    DocumentosCenaEspectador, EsquadraoCenaJogador],
  templateUrl: './previa-investigacao-jogador.page.html',
  styleUrl: './previa-investigacao-jogador.page.scss',
  providers: [FichaRolagemRegistroService],
})
export class PreviaInvestigacaoJogador {
  private readonly rota = inject(ActivatedRoute);
  private readonly projecao = inject(CampanhaProjecaoService);
  private readonly tempoReal = inject(TempoRealService);
  private readonly topbar = inject(TopbarContextoService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly campanhaId = Number(this.rota.snapshot.paramMap.get('id'));
  protected readonly usuarioAlvoId = Number(this.rota.snapshot.paramMap.get('usuarioAlvoId'));
  protected readonly previa = signal<CampanhaPreviaJogadorDto | null>(null);
  protected readonly cena = signal<CenaRecuperadaDto | null>(null);
  protected readonly carregandoCena = signal(true);
  protected readonly falhaCena = signal(false);
  protected readonly fichaPropria = signal<FichaRecuperadaDto | null>(null);
  protected readonly fichaModal = signal<FichaRecuperadaDto | null>(null);
  protected readonly fichaModalId = signal<number | null>(null);
  protected readonly falhaFichaModal = signal(false);
  protected readonly painelLateral = signal<'esquadrao' | 'rolagens'>('esquadrao');
  protected readonly rotuloTipoCena = rotuloTipoCena;
  protected readonly rotuloStatusCena = rotuloStatusCena;
  protected readonly ehInvestigacao = computed(() => this.cena()?.tipo === CenaTipoEnum.INVESTIGACAO);
  protected readonly nomeAlvo = computed(() =>
    this.previa()?.membros.find((membro) => membro.usuarioId === this.usuarioAlvoId)?.nome ?? 'Jogador',
  );
  protected readonly fichaPropriaId = computed(() =>
    this.previa()?.fichas.find((ficha) =>
      ficha.usuarioId === this.usuarioAlvoId && ficha.tipo === TipoFichaEnum.JOGADOR,
    )?.id ?? null,
  );

  private geracaoPrevia = 0;
  private geracaoCena = 0;
  private geracaoFichaPropria = 0;
  private geracaoFichaModal = 0;
  private cargaPrevia?: Subscription;
  private cargaCena?: Subscription;
  private cargaFichaPropria?: Subscription;
  private cargaFichaModal?: Subscription;
  private readonly salasFicha = new Set<number>();

  constructor() {
    const previaInicial = this.rota.snapshot.data['previaJogador'] as CampanhaPreviaJogadorDto | undefined;
    if (previaInicial) this.aplicarPrevia(previaInicial);
    else this.recarregarPrevia();
    this.carregarCena();
    this.tempoReal.conectar();
    this.tempoReal.entrarSalaCampanha(this.campanhaId);
    this.destroyRef.onDestroy(() => {
      this.tempoReal.sairSalaCampanha(this.campanhaId);
      this.sincronizarSalasFicha([]);
      this.topbar.limpar();
    });

    merge(
      this.tempoReal.acessoRevogado$.pipe(filter((evento) => this.salasFicha.has(evento.fichaId))),
      this.tempoReal.fichaCriada$.pipe(filter((ficha) => ficha.campanhaId === this.campanhaId)),
      this.tempoReal.membroEntrou$.pipe(filter((evento) => evento.campanhaId === this.campanhaId)),
      this.tempoReal.fichaVisibilidadeAlterada$.pipe(filter((evento) => evento.campanhaId === this.campanhaId)),
      this.tempoReal.fichaRemovidaDaCampanha$.pipe(filter((evento) => evento.campanhaId === this.campanhaId)),
      this.tempoReal.fichaRecortesAlterados$.pipe(filter((evento) =>
        evento.campanhaId === this.campanhaId && (evento.fichas || evento.membros))),
      this.tempoReal.fichaAlterada$.pipe(filter((ficha) => this.salasFicha.has(ficha.id))),
      this.tempoReal.rolagemRegistrada$.pipe(filter((rolagem) => rolagem.campanhaId === this.campanhaId)),
      this.tempoReal.rolagemExcluida$,
    ).pipe(takeUntilDestroyed()).subscribe(() => this.recarregarPrevia());

    merge(
      this.tempoReal.cenaAlterada$.pipe(filter((evento) => evento.campanhaId === this.campanhaId)),
      this.tempoReal.reconexao$,
    ).pipe(takeUntilDestroyed()).subscribe(() => this.carregarCena());
    this.tempoReal.reconexao$.pipe(takeUntilDestroyed()).subscribe(() => this.recarregarPrevia());
  }

  private aplicarPrevia(previa: CampanhaPreviaJogadorDto): void {
    this.previa.set(previa);
    this.topbar.definir(previa.campanha.nome);
    this.sincronizarSalasFicha(previa.fichas.map((ficha) => ficha.id));
    const fichaId = previa.fichas.find((ficha) =>
      ficha.usuarioId === this.usuarioAlvoId && ficha.tipo === TipoFichaEnum.JOGADOR)?.id;
    this.carregarFichaPropria(fichaId ?? null);
    const abertaId = this.fichaModalId();
    if (abertaId !== null) {
      if (this.podeAbrirFicha(abertaId, previa)) this.carregarFichaModal(abertaId);
      else this.fecharFichaModal();
    }
  }

  protected recarregarPrevia(): void {
    const geracao = ++this.geracaoPrevia;
    this.cargaPrevia?.unsubscribe();
    this.cargaPrevia = this.projecao.recuperarPreviaJogador(this.campanhaId, this.usuarioAlvoId)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (previa) => { if (geracao === this.geracaoPrevia) this.aplicarPrevia(previa); },
      });
  }

  protected carregarCena(): void {
    const geracao = ++this.geracaoCena;
    this.cargaCena?.unsubscribe();
    this.cena.set(null);
    this.carregandoCena.set(true);
    this.falhaCena.set(false);
    this.cargaCena = this.projecao.recuperarCenaAtivaPainelEspectador(this.campanhaId)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (cena) => {
          if (geracao !== this.geracaoCena) return;
          this.cena.set(cena);
          this.carregandoCena.set(false);
        },
        error: () => {
          if (geracao !== this.geracaoCena) return;
          this.carregandoCena.set(false);
          this.falhaCena.set(true);
        },
      });
  }

  private sincronizarSalasFicha(ids: readonly number[]): void {
    const atuais = new Set(ids);
    for (const id of atuais) if (!this.salasFicha.has(id)) {
      this.tempoReal.entrarSalaFicha(id);
      this.salasFicha.add(id);
    }
    for (const id of this.salasFicha) if (!atuais.has(id)) {
      this.tempoReal.sairSalaFicha(id);
      this.salasFicha.delete(id);
    }
  }

  private carregarFichaPropria(fichaId: number | null): void {
    const geracao = ++this.geracaoFichaPropria;
    this.cargaFichaPropria?.unsubscribe();
    this.fichaPropria.set(null);
    if (fichaId === null) return;
    this.cargaFichaPropria = this.projecao.recuperarFichaPreviaJogador(
      this.campanhaId, this.usuarioAlvoId, fichaId,
    ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (ficha) => {
        if (geracao === this.geracaoFichaPropria && this.fichaPropriaId() === fichaId) {
          this.fichaPropria.set(ficha);
        }
      },
    });
  }

  private podeAbrirFicha(fichaId: number, previa: CampanhaPreviaJogadorDto): boolean {
    return previa.membros.some((membro) =>
      membro.usuarioId !== this.usuarioAlvoId &&
      membro.fichas.some((ficha) => ficha.id === fichaId && ficha.acessoCompleto),
    ) && previa.fichas.some((ficha) => ficha.id === fichaId);
  }

  protected abrirFicha(fichaId: number): void {
    const previa = this.previa();
    if (!previa || !this.podeAbrirFicha(fichaId, previa)) return;
    this.fichaModalId.set(fichaId);
    this.carregarFichaModal(fichaId);
  }

  private carregarFichaModal(fichaId: number): void {
    const geracao = ++this.geracaoFichaModal;
    this.cargaFichaModal?.unsubscribe();
    this.fichaModal.set(null);
    this.falhaFichaModal.set(false);
    this.cargaFichaModal = this.projecao.recuperarFichaPreviaJogador(
      this.campanhaId, this.usuarioAlvoId, fichaId,
    ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (ficha) => {
        if (geracao === this.geracaoFichaModal && this.fichaModalId() === fichaId) {
          this.fichaModal.set(ficha);
        }
      },
      error: (erro: { status?: number }) => {
        if (geracao !== this.geracaoFichaModal) return;
        if (erro.status === 403 || erro.status === 404) {
          this.fecharFichaModal();
          this.recarregarPrevia();
        } else this.falhaFichaModal.set(true);
      },
    });
  }

  protected fecharFichaModal(): void {
    ++this.geracaoFichaModal;
    this.cargaFichaModal?.unsubscribe();
    this.fichaModalId.set(null);
    this.fichaModal.set(null);
    this.falhaFichaModal.set(false);
  }

  protected autorRolagem(rolagem: RolagemResumoDto): string {
    const membro = this.previa()?.membros.find((item) => item.usuarioId === rolagem.usuarioId);
    return [membro?.nome ?? 'Participante', rolagem.nomeFicha].filter(Boolean).join(' · ');
  }
}
