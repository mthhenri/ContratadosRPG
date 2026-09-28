import { Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import type {
  DocumentoRecuperadoDto,
  DocumentoResumoDto,
} from '@contratados-rpg/shared/dtos/documento';

import { Icone } from '../../../../shared/icone/icone.component';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { BotaoIcone } from '../../../../shared/ui/botao-icone/botao-icone.component';
import { Chip } from '../../../../shared/ui/chip/chip.component';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto.component';
import { EstadoVazio } from '../../../../shared/ui/estado-vazio/estado-vazio.component';
import { iconeTipoDocumento } from '../../documento-tipo';
import { BuscaDocumentos } from '../busca-documentos/busca-documentos.component';
import { LeitorDocumento } from '../leitor-documento/leitor-documento.component';
import {
  ListaDocumentos,
  type DocumentoMovimento,
} from '../lista-documentos/lista-documentos.component';

/**
 * Estrutura comum da Biblioteca (m9-05) — a composição da página do mestre da `m9-04`, agora
 * usada pelas três visões (mestre, jogador, espectador): a casca do hub de cenas (cabeçalho com
 * voltar, `//`, "Biblioteca", nome da campanha), a coluna da lista com a busca no topo e o painel
 * do documento aberto. No celular, uma vista por vez: a lista, ou o documento com um "voltar".
 *
 * Só apresenta — o estado (lista, documento aberto, tempo real) é da página. O que muda por papel
 * entra por input (`mostrarEstado`, `ordenavel`, os textos dos vazios) e por projeção:
 * - `[bibliotecaAcao]`: a ação do cabeçalho (o "Novo documento" do mestre);
 * - `[bibliotecaAcoesDocumento]`: as ações no cabeçalho do documento aberto (mestre);
 * - `[bibliotecaCorpoDocumento]`: o corpo do documento aberto — sem projeção, o `LeitorDocumento`.
 */
@Component({
  selector: 'app-biblioteca-layout',
  imports: [
    RouterLink,
    Icone,
    Botao,
    BotaoIcone,
    Chip,
    Esqueleto,
    EstadoVazio,
    BuscaDocumentos,
    LeitorDocumento,
    ListaDocumentos,
  ],
  templateUrl: './biblioteca-layout.component.html',
  styleUrl: './biblioteca-layout.component.scss',
})
export class BibliotecaLayout {
  readonly campanhaId = input.required<number>();
  readonly campanhaNome = input('');
  /** Destino do "voltar" do cabeçalho — a campanha, ou o painel do espectador. */
  readonly voltarRota = input.required<readonly (string | number)[]>();
  readonly voltarRotulo = input.required<string>();

  readonly documentos = input.required<readonly DocumentoResumoDto[]>();
  readonly carregandoLista = input(false);
  /** O documento escolhido — decide a vista do celular antes mesmo de ele carregar. */
  readonly abertoId = input<number | null>(null);
  /** O documento aberto já carregado; `null` com `abertoId` é o esqueleto do painel. */
  readonly documento = input<DocumentoRecuperadoDto | null>(null);

  /** Chip Revelado/Oculto na lista, na busca e no documento aberto — só o mestre. */
  readonly mostrarEstado = input(false);
  /** Setas de ordem na lista — só o mestre. */
  readonly ordenavel = input(false);
  readonly bloqueado = input(false);

  readonly vazioTitulo = input.required<string>();
  readonly vazioApoio = input.required<string>();
  readonly painelVazioApoio = input.required<string>();

  readonly selecionar = output<number>();
  /** Navegação pela busca: abre sem alternar o documento já aberto. */
  readonly abrir = output<number>();
  readonly mover = output<DocumentoMovimento>();
  /** "Voltar" do celular: a página fecha o documento (o mestre pergunta antes, se há rascunho). */
  readonly fecharDocumento = output<void>();

  protected readonly buscaAtiva = signal(false);
  protected readonly totalBusca = signal<number | null>(null);

  protected readonly iconeTipo = iconeTipoDocumento;

  /** A busca só some com a biblioteca carregada e vazia — buscar no nada não ajuda ninguém. */
  protected readonly mostrarBusca = computed(
    () => this.buscaAtiva() || this.carregandoLista() || this.documentos().length > 0,
  );
  protected readonly contagem = computed(() => {
    if (this.buscaAtiva()) {
      return this.totalBusca();
    }
    return this.carregandoLista() ? null : this.documentos().length;
  });
  /** Sem nenhum documento, o estado vazio da lista basta: o painel nem aparece. */
  protected readonly mostrarPainel = computed(
    () =>
      this.abertoId() !== null || (!this.carregandoLista() && this.documentos().length > 0),
  );
}
