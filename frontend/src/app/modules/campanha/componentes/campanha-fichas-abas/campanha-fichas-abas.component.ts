import { Component, computed, input, output, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type { FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';
import { TipoFichaEnum } from '@contratados-rpg/shared/enums';

import { Icone } from '../../../../shared/icone/icone.component';
import { OverflowFade } from '../../../../shared/overflow-fade/overflow-fade.directive';
import { AbaPainel } from '../../../../shared/ui/abas/aba-painel.directive';
import { Aba } from '../../../../shared/ui/abas/aba.component';
import { Abas } from '../../../../shared/ui/abas/abas.component';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto.component';
import { ordenarPorNome } from '../../../ficha/ordenacao-nome';
import {
  montarCriaturaEsquadrao,
  montarNpcEsquadrao,
  npcTemEnergia,
} from '../../campanha-fichas-especiais.util';
import { CampanhaFichaAcesso } from '../campanha-ficha-acesso/campanha-ficha-acesso.component';
import { CriaturaEsquadraoCard } from '../criatura-esquadrao-card/criatura-esquadrao-card.component';
import { EspectadorFichaCard, type EspectadorFichaCardDados } from '../espectador-ficha-card/espectador-ficha-card.component';

export type AbaFichas = 'esquadrao' | 'criaturas' | 'npcs';

/** Alvo dos eventos dos cartões — o suficiente para a página abrir a ficha ou o menu ⋯. */
export interface AlvoFicha {
  readonly id: number;
  readonly usuarioId: number;
  readonly nome: string;
  readonly donoNome?: string;
}

/**
 * Corpo da campanha do mestre (m4-15): Esquadrão · Criaturas · NPCs em abas do mesmo padrão —
 * cabeçalho de seção (contagem + botão de criar) e grade de cartões do Esquadrão
 * (`EspectadorFichaCard`/`CriaturaEsquadraoCard`). Criaturas e NPCs em ordem A–Z; o Esquadrão
 * mantém a ordem recebida. Só apresenta: abrir ficha, menu ⋯ (que mora na raiz da página, fora do
 * grid com máscara de overflow) e criar agente saem como eventos; o diálogo de acesso de jogadores
 * é daqui (`abrirAcesso`, chamado pelo item do menu da página).
 */
@Component({
  selector: 'app-campanha-fichas-abas',
  imports: [
    RouterLink,
    Abas,
    Aba,
    AbaPainel,
    Botao,
    Icone,
    Esqueleto,
    OverflowFade,
    EspectadorFichaCard,
    CriaturaEsquadraoCard,
    CampanhaFichaAcesso,
  ],
  templateUrl: './campanha-fichas-abas.component.html',
  styleUrl: './campanha-fichas-abas.component.scss',
})
export class CampanhaFichasAbas {
  /** Silhueta de carga (barra de abas + cabeçalho + cartões) no lugar do conteúdo. */
  readonly carregando = input(false);
  readonly campanhaId = input.required<number>();
  readonly fichasEsquadrao = input.required<readonly EspectadorFichaCardDados[]>();
  /** Todas as fichas visíveis da campanha — criaturas e NPCs saem daqui. */
  readonly fichas = input.required<readonly FichaResumoDto[]>();
  readonly membros = input<readonly CampanhaMembroResumoDto[]>([]);
  readonly rolagens = input<readonly RolagemResumoDto[]>([]);
  readonly textoAtualizacao = input<string | null>(null);
  /** Ficha cujo menu ⋯ está aberto (dropdown na raiz da página). */
  readonly menuFichaId = input<number | null>(null);

  readonly abrirFicha = output<{ ficha: AlvoFicha; tipo: TipoFichaEnum }>();
  readonly alternarMenu = output<{ ficha: AlvoFicha; tipo: TipoFichaEnum; evento: MouseEvent }>();
  readonly avatarEntrou = output<{ evento: MouseEvent; imagemUrl: string | null }>();
  readonly avatarSaiu = output<void>();
  readonly criarAgente = output<void>();

  protected readonly TipoFichaEnum = TipoFichaEnum;
  protected readonly abaAtiva = signal<AbaFichas>('esquadrao');
  private readonly acessoRef = viewChild(CampanhaFichaAcesso);

  protected readonly criaturas = computed(() =>
    ordenarPorNome(this.fichas().filter((ficha) => ficha.tipo === TipoFichaEnum.CRIATURA)),
  );
  protected readonly npcs = computed(() =>
    ordenarPorNome(this.fichas().filter((ficha) => ficha.tipo === TipoFichaEnum.NPC)),
  );
  /** Criaturas e NPCs — a base do diálogo de acesso. */
  protected readonly especiais = computed(() => [...this.criaturas(), ...this.npcs()]);
  protected readonly cartoesCriatura = computed(() =>
    this.criaturas().map((ficha) => ({ ficha, dados: montarCriaturaEsquadrao(ficha) })),
  );
  protected readonly cartoesNpc = computed(() =>
    this.npcs().map((ficha) => ({
      ficha,
      dados: montarNpcEsquadrao(ficha),
      mostrarEnergia: npcTemEnergia(ficha),
    })),
  );

  protected selecionarAba(aba: string): void {
    if (aba === 'esquadrao' || aba === 'criaturas' || aba === 'npcs') {
      this.abaAtiva.set(aba);
    }
  }

  /** Abre o diálogo de acesso de visualização de uma criatura/NPC (item do menu ⋯ da página). */
  abrirAcesso(fichaId: number): void {
    this.acessoRef()?.abrir(fichaId);
  }

  protected ultimaRolagem(fichaId: number): RolagemResumoDto | null {
    return this.rolagens().find((rolagem) => rolagem.fichaId === fichaId) ?? null;
  }

  protected alvo(ficha: { id: number; usuarioId: number; nome: string }, donoNome?: string): AlvoFicha {
    return { id: ficha.id, usuarioId: ficha.usuarioId, nome: ficha.nome, donoNome };
  }
}
