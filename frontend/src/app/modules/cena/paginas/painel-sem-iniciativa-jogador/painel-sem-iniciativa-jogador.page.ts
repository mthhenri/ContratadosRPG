import { Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import type { CenaDocumentoResumoDto } from '@contratados-rpg/shared/dtos/cena';
import type { FichaRecuperadaDto } from '@contratados-rpg/shared/dtos/ficha';
import { TipoFichaEnum } from '@contratados-rpg/shared/enums';

import { SessaoService } from '../../../../core/services/sessao.service';
import { BandejaDados } from '../../../../shared/bandeja-dados/bandeja-dados.component';
import { CalculadoraFlutuante } from '../../../../shared/calculadora-flutuante/calculadora-flutuante.component';
import { HistoricoRolagensSidebar } from '../../../../shared/historico-rolagens-sidebar/historico-rolagens-sidebar.component';
import { HistoricoRolagensJanelaService } from '../../../../shared/historico-rolagens-sidebar/historico-rolagens-janela.service';
import { Icone } from '../../../../shared/icone/icone.component';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { BotaoIcone } from '../../../../shared/ui/botao-icone/botao-icone.component';
import { Botao } from "../../../../shared/ui/botao/botao.component";
import { CenaDocumentoLeituraService } from "../../cena-documento-leitura.service";
import { Chip } from '../../../../shared/ui/chip/chip.component';
import { ColunaAcoes } from '../../../../shared/ui/coluna-acoes/coluna-acoes.component';
import { ColunaAcoesItem } from '../../../../shared/ui/coluna-acoes/coluna-acoes-item.component';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto.component';
import { EstadoVazio } from '../../../../shared/ui/estado-vazio/estado-vazio.component';
import { Modal } from '../../../../shared/ui/modal/modal.component';
import { DocumentoCartao } from '../../../documento/componentes/documento-cartao/documento-cartao.component';
import { LeitorDocumento } from '../../../documento/componentes/leitor-documento/leitor-documento.component';
import { resolverFichaParaAbrir } from '../../../encontro/encontro-leitura.util';
import { EncontroPainelDadosService } from '../../../encontro/paginas/painel/encontro-painel-dados.service';
import { FichaCampanhaCard } from '../../../ficha/componentes/ficha-campanha-card/ficha-campanha-card.component';
import { FichaFlutuante } from '../../../ficha/componentes/ficha-flutuante/ficha-flutuante.component';
import { FichaEdicaoService } from '../../../ficha/ficha-edicao.service';
import { FichaRolagemRegistroService } from '../../../ficha/ficha-rolagem-registro.service';
import { FichaService } from '../../../ficha/ficha.service';
import { CadernoFlutuante } from '../../../pagina-caderno/caderno-flutuante.component';
import { BibliotecaFlutuante } from '../../../documento/componentes/biblioteca-flutuante/biblioteca-flutuante.component';
import { rotuloStatusCena, rotuloTipoCena } from '../../rotulos-cena';

/**
 * Painel de uma cena **sem iniciativa** — visão do jogador (m7-24). A composição da `ui-39` sem a
 * trilha: coluna de ações (só Ferramentas), Rolagens e o palco com a **própria ficha** — o mesmo
 * `app-ficha-campanha-card` do `PainelEncontroJogador`, com os mesmos inputs e a mesma edição. Sem
 * nenhum controle de cena: abrir e encerrar são do mestre.
 *
 * A ficha do palco é a primeira ficha de jogador do usuário na campanha (a Iniciativa usa a do
 * combatente em campo; aqui não há combatentes). Sem ficha na campanha, o palco é um estado vazio.
 */
@Component({
  selector: 'app-painel-cena-sem-iniciativa-jogador',
  imports: [
    RouterLink,
    Icone,
    Tooltip,
    BotaoIcone,
    Botao,
    Chip,
    ColunaAcoes,
    ColunaAcoesItem,
    Esqueleto,
    EstadoVazio,
    Modal,
    DocumentoCartao,
    LeitorDocumento,
    CalculadoraFlutuante,
    CadernoFlutuante,
    BibliotecaFlutuante,
    HistoricoRolagensSidebar,
    FichaCampanhaCard,
    FichaFlutuante,
    BandejaDados,
  ],
  templateUrl: './painel-sem-iniciativa-jogador.page.html',
  styleUrl: './painel-sem-iniciativa-jogador.page.scss',
  // A própria ficha fica aberta no palco e as rolagens dela entram no feed (m3-27): as instâncias
  // são da página, presas a uma ficha só — mesmo padrão do `PainelEncontroJogador`.
  providers: [FichaRolagemRegistroService, FichaEdicaoService, CenaDocumentoLeituraService],
})
export class PainelCenaSemIniciativaJogador {
  protected readonly leitura = inject(CenaDocumentoLeituraService);
  protected readonly dados = inject(EncontroPainelDadosService);
  protected readonly janelaHistorico = inject(HistoricoRolagensJanelaService);
  private readonly fichaService = inject(FichaService);
  private readonly sessaoService = inject(SessaoService);
  private readonly rolagemRegistro = inject(FichaRolagemRegistroService);
  protected readonly fichaEdicao = inject(FichaEdicaoService);

  private readonly fichaFlutuanteRef = viewChild<FichaFlutuante>('fichaFlutuante');
  private readonly calculadoraRef = viewChild<CalculadoraFlutuante>('calculadora');
  private readonly cadernoRef = viewChild<CadernoFlutuante>('caderno');
  /** Caderno aberto (mesmo minimizado) — marca o item "Caderno" da coluna de ações. */
  protected readonly cadernoAberto = computed(() => this.cadernoRef()?.aberto() ?? false);
  private readonly bibliotecaRef = viewChild<BibliotecaFlutuante>('biblioteca');
  /** Biblioteca aberta (mesmo minimizada) — marca o item "Biblioteca" da coluna (m9-11). */
  protected readonly bibliotecaAberta = computed(() => this.bibliotecaRef()?.aberto() ?? false);
  /** Janela da calculadora aberta — marca o item "Calculadora" da coluna de ações. */
  protected readonly calculadoraAberta = signal(false);

  protected readonly rotuloTipoCena = rotuloTipoCena;
  protected readonly rotuloStatusCena = rotuloStatusCena;

  /** Id da ficha de jogador deste usuário na campanha — `null` para quem não tem ficha. */
  private readonly meuFichaId = computed<number | null>(() => {
    const usuarioId = this.sessaoService.usuario()?.id;
    return (
      this.dados
        .fichasCampanha()
        .find((ficha) => ficha.usuarioId === usuarioId && ficha.tipo === TipoFichaEnum.JOGADOR)
        ?.id ?? null
    );
  });

  /** `true` quando a tela já sabe que o jogador não tem ficha — o palco vira o estado vazio. */
  protected readonly semFicha = computed(
    () => !this.dados.carregando() && this.meuFichaId() === null,
  );

  /**
   * Documento completo da própria ficha — o resumo não carrega `dados`, que o cartão do palco
   * precisa. Buscado sempre que `meuFichaId` muda (mesmo padrão do `PainelEncontroJogador`).
   */
  protected readonly meuFichaDados = signal<FichaRecuperadaDto | null>(null);

  /** A ficha está no palco — no mobile, a coluna cede o rodapé à barra da ficha (ver o SCSS). */
  protected readonly comFicha = computed(() => !this.dados.carregando() && this.meuFichaId() !== null);

  constructor() {
    this.leitura.iniciar(this.dados.campanhaId, false);
    let cenaAnterior: number | undefined;
    effect(() => {
      const cenaId = this.dados.cena()?.id;
      const documentos = this.dados.documentosCena();
      untracked(() => {
        const documentoId = this.leitura.documentoId();
        if (cenaId !== cenaAnterior
          || (documentoId !== null && !documentos.some(item => item.documentoId === documentoId))) {
          this.leitura.fechar();
        }
        cenaAnterior = cenaId;
      });
    });
    this.fichaEdicao.inicializar(this.meuFichaDados, () => this.meuFichaId()!);
    this.rolagemRegistro.inicializar(() => this.meuFichaId());
    this.rolagemRegistro.registrada$
      .pipe(takeUntilDestroyed())
      .subscribe({ next: (rolagem) => this.dados.adicionarRolagemAoFeed(rolagem) });

    effect(() => {
      const fichaId = this.meuFichaId();
      if (fichaId === null) {
        untracked(() => this.meuFichaDados.set(null));
        return;
      }
      this.fichaService.recuperarFicha(fichaId).subscribe({
        next: (ficha) =>
          untracked(() => {
            this.meuFichaDados.set(ficha);
            this.fichaEdicao.definirBase(ficha);
          }),
      });
    });
  }

  /** "Ver ficha" disparado de dentro das Anotações (`app-caderno-flutuante`) — só o `fichaId`. */
  protected abrirFichaFlutuanteDeAnotacoes(fichaId: number): void {
    const fichas = this.dados.fichasCampanha();
    const tipo = fichas.find((ficha) => ficha.id === fichaId)?.tipo ?? null;
    const alvo = resolverFichaParaAbrir(fichaId, tipo, fichas);
    if (alvo) {
      this.fichaFlutuanteRef()?.abrir(alvo);
    }
  }

  /** Mesmo racional do `PainelEncontroJogador`: só o `alternar()` do componente restaura a minimizada. */
  protected alternarCalculadora(): void {
    this.calculadoraRef()?.alternar();
  }

  protected alternarCaderno(): void {
    this.cadernoRef()?.alternar();
  }

  /** Alterna a Biblioteca flutuante (m9-11) — `alternar()` restaura se estiver minimizada. */
  protected alternarBiblioteca(): void {
    this.bibliotecaRef()?.alternar();
  }

  // ── Documentos apresentados — Investigação (m7-25) ─────────────────────────

  protected readonly documentoAbertoModal = this.leitura.documento;

  /** Abre o documento já apresentado num modal de leitura — nada disso abre sozinho (§spec). */
  protected abrirDocumento(documento: CenaDocumentoResumoDto): void {
    this.leitura.abrir(documento.documentoId);
  }

  protected fecharDocumento(): void {
    this.leitura.fechar();
  }
}
