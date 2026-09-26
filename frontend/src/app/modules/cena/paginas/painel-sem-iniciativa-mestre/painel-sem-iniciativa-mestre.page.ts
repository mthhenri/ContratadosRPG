import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';

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
import { agruparFichasPorMembro, ordenarMembros } from '../../../campanha/campanha-equipe.util';
import {
  EspectadorFichaCard,
  type EspectadorFichaCardDados,
} from '../../../campanha/componentes/espectador-ficha-card/espectador-ficha-card.component';
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
