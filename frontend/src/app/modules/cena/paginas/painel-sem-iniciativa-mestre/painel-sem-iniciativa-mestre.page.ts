import { Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { CenaDocumentoResumoDto } from '@contratados-rpg/shared/dtos/cena';
import type { DocumentoRecuperadoDto, DocumentoResumoDto } from '@contratados-rpg/shared/dtos/documento';
import type { FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';
import { CenaStatusEnum, TipoFichaEnum } from '@contratados-rpg/shared/enums';

import { CalculadoraFlutuante } from '../../../../shared/calculadora-flutuante/calculadora-flutuante.component';
import { HistoricoRolagensSidebar } from '../../../../shared/historico-rolagens-sidebar/historico-rolagens-sidebar.component';
import { HistoricoRolagensJanelaService } from '../../../../shared/historico-rolagens-sidebar/historico-rolagens-janela.service';
import { Icone } from '../../../../shared/icone/icone.component';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { BotaoIcone } from '../../../../shared/ui/botao-icone/botao-icone.component';
import { Chip } from '../../../../shared/ui/chip/chip.component';
import { ColunaAcoes } from '../../../../shared/ui/coluna-acoes/coluna-acoes.component';
import { ColunaAcoesItem } from '../../../../shared/ui/coluna-acoes/coluna-acoes-item.component';
import { ConfirmacaoService } from '../../../../shared/ui/confirmacao/confirmacao.service';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto.component';
import { EstadoVazio } from '../../../../shared/ui/estado-vazio/estado-vazio.component';
import { Modal } from '../../../../shared/ui/modal/modal.component';
import { agruparFichasPorMembro, ordenarMembros } from '../../../campanha/campanha-equipe.util';
import {
  EspectadorFichaCard,
  type EspectadorFichaCardDados,
} from '../../../campanha/componentes/espectador-ficha-card/espectador-ficha-card.component';
import { DocumentoCartao } from '../../../documento/componentes/documento-cartao/documento-cartao.component';
import { LeitorDocumento } from '../../../documento/componentes/leitor-documento/leitor-documento.component';
import { DocumentoService } from '../../../documento/documento.service';
import { resolverFichaParaAbrir } from '../../../encontro/encontro-leitura.util';
import { EncontroPainelDadosService } from '../../../encontro/paginas/painel/encontro-painel-dados.service';
import { FichaFlutuante } from '../../../ficha/componentes/ficha-flutuante/ficha-flutuante.component';
import { CadernoFlutuante } from '../../../pagina-caderno/caderno-flutuante.component';
import { CenaService } from '../../cena.service';
import { rotuloStatusCena, rotuloTipoCena } from '../../rotulos-cena';

/**
 * Painel de uma cena **sem iniciativa** — visão do mestre (m7-24). Resistência e Investigação não
 * têm ordem de ação, então a composição da `ui-37` perde a trilha: **coluna de ações | Rolagens |
 * palco**, em que o palco é a grade de agentes da campanha (os cards do Esquadrão, sem lista de
 * participantes própria da cena). A `m7-25` acrescenta a coluna de Documentos à Investigação sem
 * trocar de componente.
 *
 * Quem a monta é `PainelCenaShell`; o dado e o tempo real vêm de `EncontroPainelDadosService`, que
 * no ramo sem iniciativa também mantém as fichas da grade ao vivo (salas `ficha:<id>`). Abrir e
 * encerrar seguem o padrão do `PainelEncontroMestre`: confirmação, endpoint da cena e `definirCena`.
 * **Nenhuma regra vive aqui** — a mecânica da Resistência (Limiar, DT móvel) está fora de escopo.
 */
@Component({
  selector: 'app-painel-cena-sem-iniciativa-mestre',
  imports: [
    RouterLink,
    Icone,
    Tooltip,
    BotaoIcone,
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
    HistoricoRolagensSidebar,
    EspectadorFichaCard,
    FichaFlutuante,
  ],
  templateUrl: './painel-sem-iniciativa-mestre.page.html',
  styleUrl: './painel-sem-iniciativa-mestre.page.scss',
})
export class PainelCenaSemIniciativaMestre {
  protected readonly dados = inject(EncontroPainelDadosService);
  protected readonly janelaHistorico = inject(HistoricoRolagensJanelaService);
  private readonly cenaService = inject(CenaService);
  private readonly confirmacaoService = inject(ConfirmacaoService);
  private readonly documentoService = inject(DocumentoService);

  private readonly fichaFlutuanteRef = viewChild<FichaFlutuante>('fichaFlutuante');
  private readonly calculadoraRef = viewChild<CalculadoraFlutuante>('calculadora');
  private readonly cadernoRef = viewChild<CadernoFlutuante>('caderno');
  /** Caderno aberto (mesmo minimizado) — marca o item "Caderno" da coluna de ações. */
  protected readonly cadernoAberto = computed(() => this.cadernoRef()?.aberto() ?? false);
  /** Janela da calculadora aberta — marca o item "Calculadora" da coluna de ações. */
  protected readonly calculadoraAberta = signal(false);

  protected readonly CenaStatusEnum = CenaStatusEnum;
  protected readonly rotuloTipoCena = rotuloTipoCena;
  protected readonly rotuloStatusCena = rotuloStatusCena;

  /**
   * A grade "Agentes" — as fichas de jogador da campanha, na ordem dos membros e com o nome do dono
   * anexado: a mesma derivação do Esquadrão de `detalhe-mestre` (`campanha-equipe.util.ts`).
   * Criaturas e NPCs não entram.
   */
  protected readonly agentes = computed<readonly EspectadorFichaCardDados[]>(() => {
    const porMembro = agruparFichasPorMembro(
      this.dados.fichasCampanha().filter((ficha) => ficha.tipo === TipoFichaEnum.JOGADOR),
    );
    const lista: EspectadorFichaCardDados[] = [];
    for (const membro of ordenarMembros(this.dados.membrosDaCampanha())) {
      for (const ficha of porMembro.get(membro.usuarioId) ?? []) {
        lista.push({ ...ficha, donoNome: membro.nome });
      }
    }
    return lista;
  });

  /** A lista do feed já vem em ordem decrescente; o primeiro item da ficha é sua última rolagem. */
  protected ultimaRolagemFicha(fichaId: number) {
    return this.dados.rolagensFeed().find((rolagem) => rolagem.fichaId === fichaId) ?? null;
  }

  // ── Coluna Documentos — Investigação (m7-25) ───────────────────────────────

  /** O documento completo do foco atual, para o `app-leitor-documento` do palco. */
  protected readonly documentoFoco = signal<DocumentoRecuperadoDto | null>(null);
  protected readonly carregandoDocumentoFoco = signal(false);
  protected readonly modalAnexarAberto = signal(false);
  protected readonly bibliotecaCarregando = signal(false);
  private readonly bibliotecaDocumentos = signal<readonly DocumentoResumoDto[]>([]);

  /** Documentos da biblioteca ainda não anexados a esta cena — o que o modal "Anexar" oferece. */
  protected readonly bibliotecaDisponivel = computed<readonly DocumentoResumoDto[]>(() => {
    const anexados = new Set(this.dados.documentosCena().map((documento) => documento.documentoId));
    return this.bibliotecaDocumentos().filter((documento) => !anexados.has(documento.id));
  });

  constructor() {
    // Busca o documento completo (conteúdo/imagem) sempre que o foco do palco muda — a coluna só
    // carrega o resumo (`CenaDocumentoResumoDto`); o leitor precisa do corpo inteiro.
    effect(() => {
      const foco = this.dados.documentoEmFoco();
      untracked(() => this.carregarDocumentoFoco(foco?.documentoId ?? null));
    });
  }

  private carregarDocumentoFoco(documentoId: number | null): void {
    if (documentoId === null) {
      this.documentoFoco.set(null);
      return;
    }
    this.carregandoDocumentoFoco.set(true);
    this.documentoService
      .recuperar(documentoId)
      .subscribe({
        next: (documento) => {
          this.documentoFoco.set(documento);
          this.carregandoDocumentoFoco.set(false);
        },
        error: () => this.carregandoDocumentoFoco.set(false),
      });
  }

  /** Clicar o cartão na coluna abre o documento no palco — não revela nada. */
  protected focarDocumento(documento: CenaDocumentoResumoDto): void {
    if (this.dados.emOperacao()) {
      return;
    }
    this.dados.focarDocumento(documento.documentoId);
  }

  /** "Apresentar" — revela o documento à mesa (M9) e o mantém em foco no palco. */
  protected apresentarDocumento(documento: CenaDocumentoResumoDto): void {
    if (this.dados.emOperacao()) {
      return;
    }
    this.dados.apresentarDocumento(documento.documentoId);
  }

  /** Remove o vínculo com a cena — o documento continua na biblioteca. */
  protected removerDocumentoDaCena(documento: CenaDocumentoResumoDto): void {
    if (this.dados.emOperacao()) {
      return;
    }
    this.dados.removerDocumentoDaCena(documento.documentoId);
  }

  /** Sobe (`-1`) ou desce (`+1`) um documento — a lista inteira vai reordenada (mesmo padrão do hub). */
  protected moverDocumento(documento: CenaDocumentoResumoDto, deslocamento: -1 | 1): void {
    const ordem = [...this.dados.documentosCena()]
      .sort((a, b) => a.ordem - b.ordem)
      .map((item) => item.documentoId);
    const origem = ordem.indexOf(documento.documentoId);
    const destino = origem + deslocamento;
    if (origem < 0 || destino < 0 || destino >= ordem.length || this.dados.emOperacao()) {
      return;
    }
    [ordem[origem], ordem[destino]] = [ordem[destino], ordem[origem]];
    this.dados.reordenarDocumentosCena(ordem);
  }

  protected abrirModalAnexar(): void {
    this.modalAnexarAberto.set(true);
    this.bibliotecaCarregando.set(true);
    this.documentoService.listar(this.dados.campanhaId).subscribe({
      next: (documentos) => {
        this.bibliotecaDocumentos.set(documentos);
        this.bibliotecaCarregando.set(false);
      },
      error: () => this.bibliotecaCarregando.set(false),
    });
  }

  protected fecharModalAnexar(): void {
    this.modalAnexarAberto.set(false);
  }

  protected anexarDocumento(documento: DocumentoResumoDto): void {
    if (this.dados.emOperacao()) {
      return;
    }
    this.dados.anexarDocumento(documento.id);
  }

  /** Abre a ficha do agente clicado na janela flutuante (o mestre olhando qualquer um). */
  protected abrirFichaFlutuante(agente: EspectadorFichaCardDados): void {
    this.fichaFlutuanteRef()?.abrir({
      fichaId: agente.id,
      tipo: TipoFichaEnum.JOGADOR,
      usuarioIdDono: agente.usuarioId,
    });
  }

  /** "Ver ficha" disparado de dentro das Anotações (`app-caderno-flutuante`) — só o `fichaId`. */
  protected abrirFichaFlutuanteDeAnotacoes(fichaId: number): void {
    const fichas: readonly FichaResumoDto[] = this.dados.fichasCampanha();
    const tipo = fichas.find((ficha) => ficha.id === fichaId)?.tipo ?? null;
    const alvo = resolverFichaParaAbrir(fichaId, tipo, fichas);
    if (alvo) {
      this.fichaFlutuanteRef()?.abrir(alvo);
    }
  }

  /** Mesmo racional do `PainelEncontroMestre`: só o `alternar()` do componente restaura a minimizada. */
  protected alternarCalculadora(): void {
    this.calculadoraRef()?.alternar();
  }

  protected alternarCaderno(): void {
    this.cadernoRef()?.alternar();
  }

  /**
   * Abre a cena planejada para a mesa (`PLANEJADA → ATIVA`). Havendo outra cena em andamento, o
   * backend a encerra (m7-22) — a confirmação avisa.
   */
  protected abrirCena(): void {
    const cena = this.dados.cena();
    if (!cena || this.dados.emOperacao()) {
      return;
    }
    this.confirmacaoService
      .confirmar({
        titulo: 'Abrir cena',
        mensagem: `Abrir ${cena.nome} para a mesa? Se houver outra cena em andamento, ela será encerrada.`,
        entidade: cena.nome,
        rotuloConfirmar: 'Abrir',
      })
      .then((confirmado) => {
        if (confirmado) {
          this.dados.executar(this.cenaService.abrirCena(cena.id), (aberta) =>
            this.dados.definirCena(aberta),
          );
        }
      });
  }

  /** Encerra a cena — depois disso ela fica só de leitura e vai para as encerradas do hub. */
  protected encerrarCena(): void {
    const cena = this.dados.cena();
    if (!cena || this.dados.emOperacao()) {
      return;
    }
    this.confirmacaoService
      .confirmar({
        titulo: 'Encerrar cena',
        mensagem: `Encerrar ${cena.nome}? Ela passa a ficar só de leitura.`,
        entidade: cena.nome,
        rotuloConfirmar: 'Encerrar',
      })
      .then((confirmado) => {
        if (confirmado) {
          this.dados.executar(this.cenaService.encerrarCena(cena.id), (encerrada) =>
            this.dados.definirCena(encerrada),
          );
        }
      });
  }
}
