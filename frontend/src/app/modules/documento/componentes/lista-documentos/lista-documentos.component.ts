import {
  Component,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import type { DocumentoResumoDto } from '@contratados-rpg/shared/dtos/documento';

import { Icone } from '../../../../shared/icone/icone.component';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { BotaoIcone } from '../../../../shared/ui/botao-icone/botao-icone.component';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto.component';
import { EstadoVazio } from '../../../../shared/ui/estado-vazio/estado-vazio.component';
import { MenuAcoes, type MenuAcoesItem } from '../../../../shared/ui/menu-acoes/menu-acoes.component';
import { PastaLinha } from '../../../../shared/ui/pasta-linha/pasta-linha.component';
import { BibliotecaOrganizacaoStore } from '../../biblioteca-organizacao.store';
import {
  destinosDeMovimento,
  contarItens,
  linhasVisiveis,
  montarArvore,
  podeCriarSubpasta,
  podeMoverPasta,
  type LinhaArvore,
  type LinhaDocumento,
  type LinhaPasta,
  type NoPasta,
} from '../../documento-arvore';
import {
  NENHUM_LEITOR,
  leitoresDoDocumento,
  type DocumentoLeitoresPorDocumento,
} from '../../documento-leitores';
import { DocumentoCartao } from '../documento-cartao/documento-cartao.component';
import { PastaDestinoDialog } from '../pasta-destino-dialog/pasta-destino-dialog.component';
import { PastaNomeDialog } from '../pasta-nome-dialog/pasta-nome-dialog.component';

/**
 * Pedido de troca de posição de um documento **na raiz** — `-1` sobe, `+1` desce. `vizinho` é o
 * documento com quem ele troca de lugar entre os da raiz (a ordem manual da campanha é uma lista
 * só, com os documentos de pasta no meio; trocar com o vizinho visível preserva as pastas).
 */
export interface DocumentoMovimento {
  readonly documento: DocumentoResumoDto;
  readonly vizinho: DocumentoResumoDto;
  readonly deslocamento: -1 | 1;
}

type Dialogo =
  | { readonly tipo: 'criar'; readonly pastaMaeId: number | null }
  | { readonly tipo: 'renomear'; readonly no: NoPasta }
  | { readonly tipo: 'mover-pasta'; readonly no: NoPasta }
  | { readonly tipo: 'mover-documento'; readonly documento: DocumentoResumoDto };

type AlvoMenu =
  | { readonly tipo: 'pasta'; readonly linha: LinhaPasta }
  | { readonly tipo: 'documento'; readonly linha: LinhaDocumento };

type Arrastado = { readonly tipo: 'pasta' | 'documento'; readonly id: number };

/**
 * A lista da biblioteca (m9-04, extraída na m9-05; em árvore com pastas na biblioteca-pastas):
 * esqueleto, estado vazio ou as pastas e os cartões. A organização em pastas é a do cargo do
 * usuário e vem da `BibliotecaOrganizacaoStore` (provida pelo `BibliotecaCorpo`) — esta lista só
 * desenha o que a árvore pura (`montarArvore`) entrega e encaminha as ações à store.
 *
 * - **Navegar** (todos, inclusive o espectador): recolher/expandir pastas; abrir documentos.
 * - **Organizar** (mestre e jogador; o espectador não vê o controle): "Nova pasta" e o modo
 *   Organizar, que revela por item o menu de ações (renomear, mover para…, subir/descer, excluir,
 *   nova subpasta) — ícones de edição só aparecem sob demanda — e liga o arrastar e soltar no
 *   desktop. "Mover para…" é a ação equivalente para o toque e o teclado.
 * - **Ordem:** pastas por `ordem`; documentos na pasta pelo vínculo; na raiz, a ordem manual do
 *   mestre ou a de criação para a mesa. As setas de ordem do mestre (`ordenavel`) valem para os
 *   documentos em qualquer nível.
 *
 * O que muda por papel entra por input — o mestre liga o chip de estado (`mostrarEstado`) e as setas
 * (`ordenavel`). Selecionar e mover na raiz saem como eventos para a página.
 */
@Component({
  selector: 'app-lista-documentos',
  imports: [
    Icone,
    Botao,
    BotaoIcone,
    Esqueleto,
    EstadoVazio,
    MenuAcoes,
    PastaLinha,
    DocumentoCartao,
    PastaNomeDialog,
    PastaDestinoDialog,
  ],
  templateUrl: './lista-documentos.component.html',
  styleUrl: './lista-documentos.component.scss',
})
export class ListaDocumentos {
  /**
   * Ausente quando a lista é usada fora do `BibliotecaCorpo` (o seletor de documento do Caderno):
   * sem organização, ela segue plana e sem controles de pasta.
   */
  private readonly store = inject(BibliotecaOrganizacaoStore, { optional: true });
  private readonly injector = inject(Injector);

  readonly documentos = input.required<readonly DocumentoResumoDto[]>();
  readonly carregando = input(false);
  readonly abertoId = input<number | null>(null);
  /** Chip Revelado/Oculto em cada cartão — só o mestre. */
  readonly mostrarEstado = input(false);
  /** Quem está lendo cada documento (m9-10) — só o mestre recebe; a mesa fica com o vazio. */
  readonly leitoresPorDocumento = input<DocumentoLeitoresPorDocumento>(NENHUM_LEITOR);
  /** Setas de ordem — só o mestre. */
  readonly ordenavel = input(false);
  /** Setas travadas (escrita em voo, edição aberta). */
  readonly bloqueado = input(false);
  readonly vazioTitulo = input.required<string>();
  readonly vazioApoio = input.required<string>();

  readonly selecionar = output<number>();
  readonly mover = output<DocumentoMovimento>();

  protected readonly leitoresDoDocumento = leitoresDoDocumento;
  protected readonly editavel = computed(() => this.store?.editavel() ?? false);
  protected readonly emOperacao = computed(() => this.store?.emOperacao() ?? false);

  protected readonly arvore = computed(() => montarArvore(this.store?.organizacao() ?? null, this.documentos()));
  protected readonly expandidas = signal<ReadonlySet<number>>(new Set());
  protected readonly linhas = computed<LinhaArvore[]>(() =>
    linhasVisiveis(this.arvore(), this.expandidas()),
  );
  protected readonly semItens = computed(
    () => this.arvore().porId.size === 0 && this.documentos().length === 0,
  );

  protected readonly organizando = signal(false);
  protected readonly dialogo = signal<Dialogo | null>(null);
  protected readonly alvoMenu = signal<AlvoMenu | null>(null);
  protected readonly arrastando = signal<Arrastado | null>(null);
  /** Pasta (id) ou raiz (`'raiz'`) sob o item arrastado. */
  protected readonly alvoDrop = signal<number | 'raiz' | null>(null);

  protected readonly menu = viewChild<MenuAcoes>('menu');

  /** Arrastar e soltar: só no modo Organizar, para quem edita e sem escrita em voo. */
  protected readonly arrastavel = computed(
    () => this.organizando() && this.editavel() && !this.emOperacao(),
  );

  protected readonly itensMenu = computed<readonly MenuAcoesItem[]>(() => {
    const alvo = this.alvoMenu();
    if (!alvo) {
      return [];
    }
    if (alvo.tipo === 'documento') {
      return [{ id: 'mover', rotulo: 'Mover para…' }];
    }
    const { no, primeiro, ultimo } = alvo.linha;
    return [
      {
        id: 'subpasta',
        rotulo: 'Nova subpasta',
        desabilitado: !podeCriarSubpasta(this.arvore(), no.pasta.id),
      },
      { id: 'renomear', rotulo: 'Renomear' },
      { id: 'mover', rotulo: 'Mover para…' },
      { id: 'subir', rotulo: 'Subir na ordem', desabilitado: primeiro },
      { id: 'descer', rotulo: 'Descer na ordem', desabilitado: ultimo },
      { id: 'excluir', rotulo: 'Excluir pasta' },
    ];
  });

  protected readonly destinos = computed(() => {
    const dialogo = this.dialogo();
    if (dialogo?.tipo === 'mover-pasta') {
      return destinosDeMovimento(this.arvore(), dialogo.no);
    }
    return destinosDeMovimento(this.arvore(), null);
  });

  constructor() {
    // O documento aberto aparece sempre: as pastas que o contêm se expandem quando ele abre.
    effect(() => {
      const abertoId = this.abertoId();
      const arvore = this.arvore();
      if (abertoId === null) {
        return;
      }
      const cadeia = this.pastasQueContem(abertoId, arvore.pastas);
      if (cadeia.length > 0) {
        untracked(() => this.expandir(cadeia));
      }
    });
  }

  // ── Navegação ───────────────────────────────────────────────────────────────

  protected alternarPasta(id: number): void {
    this.expandidas.update((atuais) => {
      const proximas = new Set(atuais);
      if (!proximas.delete(id)) {
        proximas.add(id);
      }
      return proximas;
    });
  }

  /** Identidade estável da linha: o mesmo item mantém o elemento ao expandir ou mover. */
  protected chaveLinha(linha: LinhaArvore): string {
    return linha.tipo === 'pasta' ? `p${linha.no.pasta.id}` : `d${linha.documento.id}`;
  }

  protected contagem(no: NoPasta): number {
    return contarItens(no);
  }

  // ── Barra de organização ───────────────────────────────────────────────────

  protected alternarOrganizando(): void {
    this.organizando.update((atual) => !atual);
    this.limparArrasto();
  }

  protected abrirNovaPasta(pastaMaeId: number | null = null): void {
    this.dialogo.set({ tipo: 'criar', pastaMaeId });
  }

  protected fecharDialogo(): void {
    this.dialogo.set(null);
  }

  // ── Menu de ações por item ─────────────────────────────────────────────────

  protected abrirMenu(alvo: AlvoMenu, evento: Event): void {
    const gatilho = (evento.currentTarget as HTMLElement).getBoundingClientRect();
    this.alvoMenu.set(alvo);
    // Os `itens` do menu chegam pelo binding, na próxima detecção de mudanças: abrir antes dela
    // acharia o menu vazio. `afterNextRender` roda depois que o binding já foi aplicado.
    afterNextRender(() => this.menu()?.abrirContextual(gatilho.right, gatilho.bottom), {
      injector: this.injector,
    });
  }

  protected aoFecharMenu(): void {
    this.alvoMenu.set(null);
  }

  protected aoEscolherAcao(acao: string): void {
    const alvo = this.alvoMenu();
    if (!alvo) {
      return;
    }
    if (alvo.tipo === 'documento') {
      this.dialogo.set({ tipo: 'mover-documento', documento: alvo.linha.documento });
      return;
    }
    const { no, pastaMaeId } = alvo.linha;
    const indice = this.indiceDaPasta(alvo.linha);
    switch (acao) {
      case 'subpasta':
        this.abrirNovaPasta(no.pasta.id);
        break;
      case 'renomear':
        this.dialogo.set({ tipo: 'renomear', no });
        break;
      case 'mover':
        this.dialogo.set({ tipo: 'mover-pasta', no });
        break;
      case 'subir':
        this.exigirStore().moverPasta(no.pasta.id, pastaMaeId, indice - 1).subscribe();
        break;
      case 'descer':
        this.exigirStore().moverPasta(no.pasta.id, pastaMaeId, indice + 1).subscribe();
        break;
      case 'excluir':
        this.exigirStore().removerPasta(no.pasta.id).subscribe();
        break;
    }
  }

  // ── Dialogs ────────────────────────────────────────────────────────────────

  protected confirmarNome(nome: string): void {
    const dialogo = this.dialogo();
    if (dialogo?.tipo === 'criar') {
      this.exigirStore().criarPasta(nome, dialogo.pastaMaeId).subscribe({
        next: () => {
          if (dialogo.pastaMaeId !== null) {
            this.expandir([dialogo.pastaMaeId]);
          }
          this.fecharDialogo();
        },
      });
    } else if (dialogo?.tipo === 'renomear') {
      this.exigirStore().renomearPasta(dialogo.no.pasta.id, nome).subscribe({
        next: () => this.fecharDialogo(),
      });
    }
  }

  protected confirmarDestino(destinoId: number | null): void {
    const dialogo = this.dialogo();
    if (dialogo?.tipo === 'mover-pasta') {
      this.exigirStore().moverPasta(dialogo.no.pasta.id, destinoId).subscribe({
        next: () => this.depoisDeMover(destinoId),
      });
    } else if (dialogo?.tipo === 'mover-documento') {
      this.exigirStore().moverDocumento(dialogo.documento.id, destinoId).subscribe({
        next: () => this.depoisDeMover(destinoId),
      });
    }
  }

  protected pastaAtualDoDialogo(): number | null {
    const dialogo = this.dialogo();
    if (dialogo?.tipo === 'mover-pasta') {
      return this.paiDa(dialogo.no.pasta.id);
    }
    if (dialogo?.tipo === 'mover-documento') {
      return this.pastaDoDocumento(dialogo.documento.id);
    }
    return null;
  }

  protected tituloDestino(): string {
    const dialogo = this.dialogo();
    if (dialogo?.tipo === 'mover-pasta') {
      return `Mover ${dialogo.no.pasta.nome}`;
    }
    return dialogo?.tipo === 'mover-documento' ? `Mover ${dialogo.documento.titulo}` : 'Mover';
  }

  // ── Setas de ordem do mestre ───────────────────────────────────────────────

  /** Troca o documento com o vizinho do mesmo grupo: na raiz, pela página; na pasta, pelo vínculo. */
  protected moverDocumento(linha: LinhaDocumento, deslocamento: -1 | 1): void {
    if (linha.pastaMaeId === null) {
      const vizinho = this.arvore().documentos[this.indiceDoDocumento(linha) + deslocamento];
      if (vizinho) {
        this.mover.emit({ documento: linha.documento, vizinho, deslocamento });
      }
      return;
    }
    this.exigirStore()
      .moverDocumento(
        linha.documento.id,
        linha.pastaMaeId,
        this.indiceDoDocumento(linha) + deslocamento,
      )
      .subscribe();
  }

  // ── Arrastar e soltar (desktop) ────────────────────────────────────────────

  protected aoArrastar(evento: DragEvent, arrastado: Arrastado): void {
    if (!this.arrastavel()) {
      evento.preventDefault();
      return;
    }
    this.arrastando.set(arrastado);
    if (evento.dataTransfer) {
      evento.dataTransfer.effectAllowed = 'move';
      // O Firefox só inicia o arrasto com algum dado definido.
      evento.dataTransfer.setData('text/plain', `${arrastado.tipo}:${arrastado.id}`);
    }
  }

  protected aoPassarSobre(evento: DragEvent, destino: number | 'raiz'): void {
    if (!this.aceitaSoltar(destino)) {
      return;
    }
    evento.preventDefault();
    if (evento.dataTransfer) {
      evento.dataTransfer.dropEffect = 'move';
    }
    this.alvoDrop.set(destino);
  }

  protected aoSairDe(destino: number | 'raiz'): void {
    if (this.alvoDrop() === destino) {
      this.alvoDrop.set(null);
    }
  }

  protected aoSoltar(evento: DragEvent, destino: number | 'raiz'): void {
    const arrastado = this.arrastando();
    if (!arrastado || !this.aceitaSoltar(destino)) {
      return;
    }
    evento.preventDefault();
    this.limparArrasto();
    const destinoId = destino === 'raiz' ? null : destino;
    const escrita =
      arrastado.tipo === 'pasta'
        ? this.exigirStore().moverPasta(arrastado.id, destinoId)
        : this.exigirStore().moverDocumento(arrastado.id, destinoId);
    escrita.subscribe({ next: () => this.depoisDeMover(destinoId) });
  }

  protected limparArrasto(): void {
    this.arrastando.set(null);
    this.alvoDrop.set(null);
  }

  /** O item arrastado já está no destino, ou (pasta) o destino é ela/descendente/estoura o teto? */
  private aceitaSoltar(destino: number | 'raiz'): boolean {
    const arrastado = this.arrastando();
    if (!arrastado) {
      return false;
    }
    const destinoId = destino === 'raiz' ? null : destino;
    if (arrastado.tipo === 'documento') {
      return this.pastaDoDocumento(arrastado.id) !== destinoId;
    }
    const no = this.arvore().porId.get(arrastado.id);
    return (
      !!no &&
      this.paiDa(arrastado.id) !== destinoId &&
      podeMoverPasta(this.arvore(), no, destinoId)
    );
  }

  // ── Internos ───────────────────────────────────────────────────────────────

  /** As ações só existem com a organização provida; sem ela os controles nem aparecem. */
  private exigirStore(): BibliotecaOrganizacaoStore {
    if (!this.store) {
      throw new Error('ListaDocumentos: ação de pasta sem BibliotecaOrganizacaoStore');
    }
    return this.store;
  }

  private depoisDeMover(destinoId: number | null): void {
    if (destinoId !== null) {
      this.expandir([destinoId]);
    }
    this.fecharDialogo();
  }

  private expandir(ids: readonly number[]): void {
    this.expandidas.update((atuais) => new Set([...atuais, ...ids]));
  }

  /** A pasta e as ancestrais de uma pasta que contém o documento (da mais externa à interna). */
  private pastasQueContem(documentoId: number, nos: readonly NoPasta[]): number[] {
    for (const no of nos) {
      if (no.documentos.some((documento) => documento.id === documentoId)) {
        return [no.pasta.id];
      }
      const dentro = this.pastasQueContem(documentoId, no.pastas);
      if (dentro.length > 0) {
        return [no.pasta.id, ...dentro];
      }
    }
    return [];
  }

  private pastaDoDocumento(documentoId: number): number | null {
    const [pasta] = this.pastasQueContem(documentoId, this.arvore().pastas).slice(-1);
    return pasta ?? null;
  }

  private paiDa(pastaId: number): number | null {
    return this.paiNaArvore(pastaId, this.arvore().pastas, null);
  }

  private paiNaArvore(
    pastaId: number,
    nos: readonly NoPasta[],
    mae: number | null,
  ): number | null {
    for (const no of nos) {
      if (no.pasta.id === pastaId) {
        return mae;
      }
      const achado = this.paiNaArvore(pastaId, no.pastas, no.pasta.id);
      if (achado !== null) {
        return achado;
      }
    }
    return null;
  }

  private irmasDaPasta(linha: LinhaPasta): readonly NoPasta[] {
    return linha.pastaMaeId === null
      ? this.arvore().pastas
      : (this.arvore().porId.get(linha.pastaMaeId)?.pastas ?? []);
  }

  private indiceDaPasta(linha: LinhaPasta): number {
    return this.irmasDaPasta(linha).findIndex((no) => no.pasta.id === linha.no.pasta.id);
  }

  private indiceDoDocumento(linha: LinhaDocumento): number {
    const grupo =
      linha.pastaMaeId === null
        ? this.arvore().documentos
        : (this.arvore().porId.get(linha.pastaMaeId)?.documentos ?? []);
    return grupo.findIndex((documento) => documento.id === linha.documento.id);
  }
}
