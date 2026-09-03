import { DestroyRef, Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { filter, finalize } from 'rxjs';
import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import type { CampanhaIdentidadeSeguraDto } from '@contratados-rpg/shared/dtos/campanha';
import type { EncontroRecuperadoDto } from '@contratados-rpg/shared/dtos/encontro';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';

import { CampanhaProjecaoService } from '../../campanha-projecao.service';
import { CampanhaService } from '../../campanha.service';
import { IniciativaLeitura } from '../../../encontro/componentes/iniciativa-leitura/iniciativa-leitura.component';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { TopbarContextoService } from '../../../../core/services/topbar-contexto.service';
import { Icone } from '../../../../shared/icone/icone.component';
import { OverflowFade } from '../../../../shared/overflow-fade/overflow-fade.directive';
import { ResultadoRolagem } from '../../../../shared/resultado-rolagem/resultado-rolagem.component';
import { rotuloRelativo } from '../../../../shared/rotulo-relativo.util';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { Cartao } from '../../../../shared/ui/cartao/cartao.component';
import { Chip } from '../../../../shared/ui/chip/chip.component';
import { EstadoVazio } from '../../../../shared/ui/estado-vazio/estado-vazio.component';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto.component';
import { Modal } from '../../../../shared/ui/modal/modal.component';

/** Tamanho de página do feed — mesmo degrau do histórico de rolagens da ficha (`visualizar.page.ts`). */
const ITENS_POR_PAGINA = 20;

/**
 * Painel do espectador (m8-03) — destino dedicado de quem entrou com o convite de espectador, e
 * prévia do mestre para conferir exatamente esse recorte (`espectadorCampanhaGuard`; decisão de
 * produto #5 de `m8-espectadores-campanha.spec.md`). Composição própria, não uma máscara sobre a
 * visão de mestre/jogador: cabeçalho compacto, selo "Modo espectador", e um feed dominante das
 * rolagens `PUBLICA` da campanha — sem cards de ficha, Equipe, convites, menus de gestão ou
 * qualquer controle de rolagem (o backend já recusaria; aqui eles nunca existem no template).
 *
 * O payload (`CampanhaPainelEspectadorDto`) é idêntico para `ESPECTADOR` e para o `MESTRE` em
 * prévia — quem diferencia a UI (a barra de prévia com "Sair da visualização") é
 * {@link ehMestrePreview}, resolvido à parte via `listarCampanhas` (o único jeito de saber o
 * próprio papel sem chamar uma rota que `ESPECTADOR` não pode acessar, como `listarMembros`).
 */
@Component({
  selector: 'app-campanha-espectador',
  imports: [
    RouterLink,
    Icone,
    OverflowFade,
    ResultadoRolagem,
    Botao,
    Cartao,
    Chip,
    EstadoVazio,
    Esqueleto,
    IniciativaLeitura,
    Modal,
  ],
  templateUrl: './espectador.page.html',
  styleUrl: './espectador.page.scss',
})
export class CampanhaEspectador {
  private readonly rotaAtiva = inject(ActivatedRoute);
  private readonly campanhaProjecaoService = inject(CampanhaProjecaoService);
  private readonly campanhaService = inject(CampanhaService);
  private readonly tempoRealService = inject(TempoRealService);
  private readonly topbarContexto = inject(TopbarContextoService);
  private readonly destroyRef = inject(DestroyRef);

  /** `id` da campanha, lido do parâmetro de rota (`/campanhas/:id/espectador`). */
  protected readonly id = Number(this.rotaAtiva.snapshot.paramMap.get('id'));

  protected readonly carregando = signal(true);
  protected readonly carregandoMais = signal(false);
  protected readonly campanha = signal<CampanhaIdentidadeSeguraDto | null>(null);
  protected readonly rolagens = signal<readonly RolagemResumoDto[]>([]);
  private readonly paginaAtual = signal(0);
  protected readonly temMais = signal(false);

  /** `true` quando quem abriu esta rota é o mestre da campanha, em prévia (nunca um espectador real). */
  protected readonly ehMestrePreview = signal(false);

  /**
   * Encontro não-encerrado da campanha, já redigido pelo backend (m8-05) — gatilha "Ver
   * Iniciativa". `EncontroService.recuperarEncontroAtivoParaEspectador` devolve o mesmo resultado
   * para `ESPECTADOR` real e `MESTRE` em prévia; esta página nunca decide o recorte sozinha.
   */
  protected readonly encontroAtivo = signal<EncontroRecuperadoDto | null>(null);
  protected readonly iniciativaAberta = signal(false);

  /** Relógio de 5s só para recomputar o tempo relativo das rolagens, sem novo fetch. */
  private readonly agora = signal(Date.now());

  protected tempoRolagem(rolagem: RolagemResumoDto): string {
    return rotuloRelativo(new Date(rolagem.createdDate).getTime(), this.agora());
  }

  /** Autor + ficha, quando a rolagem partiu de uma (rolagem avulsa de encontro não tem ficha). */
  protected autorRolagem(rolagem: RolagemResumoDto): string {
    return rolagem.nomeFicha ? `${rolagem.nomeAutor} · ${rolagem.nomeFicha}` : rolagem.nomeAutor;
  }

  protected readonly semRolagens = computed(
    () => !this.carregando() && this.rolagens().length === 0,
  );

  constructor() {
    // Slot de contexto da topbar (ui-21) — mesmo padrão de `CampanhaDetalhe`: nome da campanha
    // assim que `campanha()` chega, some ao sair da tela.
    effect(() => this.topbarContexto.definir(this.campanha()?.nome ?? null));
    this.destroyRef.onDestroy(() => this.topbarContexto.limpar());

    this.carregarPainel(1);
    this.carregarPapel();

    this.tempoRealService.conectar();
    this.tempoRealService.entrarSalaCampanha(this.id);
    this.destroyRef.onDestroy(() => this.tempoRealService.sairSalaCampanha(this.id));

    // Feed em tempo real (m8-03) — só rolagens `PUBLICA` chegam por aqui (o backend nunca
    // broadcasta privada, §9), e a sala do espectador nunca recebe outro evento (m8-02: a sala
    // `campanha:<id>:espectador` só é alvo de `rolagem:registrada` público, por construção).
    // Guarda contra duplicata do mesmo id — a rolagem mais recente do feed inicial (REST) pode
    // coincidir com a primeira que chega pelo socket, dependendo de quando cada um resolve.
    this.tempoRealService.rolagemRegistrada$
      .pipe(takeUntilDestroyed())
      .subscribe({ next: (rolagem) => this.onRolagemRegistrada(rolagem) });

    // Encontro alterado (m8-05): nunca confia no payload do socket — o mesmo evento carrega o
    // recorte de MESTRE para quem está de fato conectado como mestre (em prévia), então só um
    // refetch via REST (`recuperarEncontroAtivoParaEspectador`, sempre redigido) garante o mesmo
    // resultado para ESPECTADOR real e MESTRE em prévia. `itensPorPagina: 1` evita perturbar a
    // paginação do feed de rolagens já carregado.
    this.tempoRealService.encontroAlterado$
      .pipe(filter((evento) => evento.encontro.campanhaId === this.id), takeUntilDestroyed())
      .subscribe({ next: () => this.atualizarEncontroAtivo() });

    const relogio = setInterval(() => this.agora.set(Date.now()), 5000);
    this.destroyRef.onDestroy(() => clearInterval(relogio));
  }

  private atualizarEncontroAtivo(): void {
    this.campanhaProjecaoService
      .recuperarPainelEspectador(this.id, 1, 1)
      .subscribe({ next: (painel) => this.encontroAtivo.set(painel.encontroAtivo) });
  }

  private onRolagemRegistrada(rolagem: RolagemResumoDto): void {
    this.rolagens.update((atuais) => (atuais[0]?.id === rolagem.id ? atuais : [rolagem, ...atuais]));
  }

  /**
   * Só o mestre consegue `listarCampanhas` retratando o próprio papel como `MESTRE`; um espectador
   * real também consegue chamar essa rota (nunca gateada por papel) e sempre vai encontrar
   * `ESPECTADOR` na própria linha — nunca `MESTRE`, então o `false` é o resultado correto para ele.
   */
  private carregarPapel(): void {
    this.campanhaService.listarCampanhas().subscribe({
      next: (campanhas) => {
        const atual = campanhas.find((campanha) => campanha.id === this.id);
        this.ehMestrePreview.set(atual?.papel === TipoCampanhaMembroPapelEnum.MESTRE);
      },
    });
  }

  private carregarPainel(pagina: number): void {
    const marcarCarregando = pagina === 1 ? this.carregando : this.carregandoMais;
    marcarCarregando.set(true);
    this.campanhaProjecaoService
      .recuperarPainelEspectador(this.id, pagina, ITENS_POR_PAGINA)
      .pipe(finalize(() => marcarCarregando.set(false)))
      .subscribe({
        next: (painel) => {
          this.campanha.set(painel.campanha);
          this.encontroAtivo.set(painel.encontroAtivo);
          this.rolagens.update((atuais) =>
            pagina === 1 ? painel.rolagens.itens : [...atuais, ...painel.rolagens.itens],
          );
          this.paginaAtual.set(painel.rolagens.paginaAtual);
          this.temMais.set(painel.rolagens.paginaAtual < painel.rolagens.totalPaginas);
        },
      });
  }

  protected carregarMais(): void {
    if (this.carregandoMais() || !this.temMais()) {
      return;
    }
    this.carregarPainel(this.paginaAtual() + 1);
  }
}
