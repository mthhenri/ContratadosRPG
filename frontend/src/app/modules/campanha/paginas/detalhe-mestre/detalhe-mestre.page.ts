import { Component, inject, signal, viewChild } from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { RolagemVisibilidadeEnum, TipoCampanhaMembroPapelEnum, TipoFichaEnum } from '@contratados-rpg/shared/enums';
import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';

import { CampanhaDetalheDadosService } from '../detalhe/campanha-detalhe-dados.service';
import { CalculadoraFlutuante } from '../../../../shared/calculadora-flutuante/calculadora-flutuante.component';
import { CadernoFlutuante } from '../../../pagina-caderno/caderno-flutuante.component';
import { FichaFlutuante } from '../../../ficha/componentes/ficha-flutuante/ficha-flutuante.component';
import { EspectadorFichaCard, type EspectadorFichaCardDados } from '../../componentes/espectador-ficha-card/espectador-ficha-card.component';
import { InventarioEsquadrao } from '../../componentes/inventario-esquadrao/inventario-esquadrao.component';
import { ColunaAcoes } from '../../../../shared/ui/coluna-acoes/coluna-acoes.component';
import { ColunaAcoesItem } from '../../../../shared/ui/coluna-acoes/coluna-acoes-item.component';
import { Segmentado } from '../../../../shared/ui/segmentado/segmentado.component';
import { SegmentadoItem } from '../../../../shared/ui/segmentado/segmentado-item.component';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { BotaoIcone } from '../../../../shared/ui/botao-icone/botao-icone.component';
import { Chip } from '../../../../shared/ui/chip/chip.component';
import { EstadoVazio } from '../../../../shared/ui/estado-vazio/estado-vazio.component';
import { ResultadoRolagem } from '../../../../shared/resultado-rolagem/resultado-rolagem.component';
import { Icone } from '../../../../shared/icone/icone.component';
import { OverflowFade } from '../../../../shared/overflow-fade/overflow-fade.directive';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto.component';
import { Modal } from '../../../../shared/ui/modal/modal.component';
import { ConfirmacaoService } from '../../../../shared/ui/confirmacao/confirmacao.service';
import { CampanhaService } from '../../campanha.service';
import { FichaService } from '../../../ficha/ficha.service';
import { rotuloNivelAmeaca } from '../../../ficha/rotulos-criatura';

/**
 * Uma criatura na grade do Esquadrão — recorte enxuto de `FichaResumoDto` (`tipo === CRIATURA`),
 * mesmo formato que o antigo `CampanhaDetalhe.ItemCriatura` já usava.
 */
interface ItemCriatura {
  readonly id: number;
  readonly usuarioId: number;
  readonly imagemUrl: string | null;
  readonly cor: string | null;
  readonly nome: string;
  readonly naTexto: string;
  readonly vidaAtual: number;
  readonly vidaMaxima?: number;
  readonly defesa?: number;
}

/**
 * Visão do MESTRE em `/campanhas/:id` — redesenho (`campanha-detalhe-mestre-coluna-acoes.spec.md`).
 * Cabeçalho enxuto, `app-coluna-acoes` substituindo o menu kebab + os botões flutuantes de
 * calculadora/caderno, Esquadrão/Criaturas em grid de 3 colunas reusando `EspectadorFichaCard` em
 * modo interativo. Sem banner de crítico, sem coluna "Membros" ao lado (entregável 3 — removidos,
 * não apenas reposicionados). Dado e tempo real compartilhados vêm de `CampanhaDetalheDadosService`.
 */
@Component({
  selector: 'app-campanha-detalhe-mestre',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    ColunaAcoes,
    ColunaAcoesItem,
    Segmentado,
    SegmentadoItem,
    EspectadorFichaCard,
    InventarioEsquadrao,
    FichaFlutuante,
    CalculadoraFlutuante,
    CadernoFlutuante,
    Botao,
    BotaoIcone,
    Chip,
    EstadoVazio,
    ResultadoRolagem,
    Icone,
    OverflowFade,
    Tooltip,
    Esqueleto,
    Modal,
    DatePipe,
    NgTemplateOutlet,
  ],
  templateUrl: './detalhe-mestre.page.html',
  styleUrl: './detalhe-mestre.page.scss',
})
export class CampanhaDetalheMestre {
  protected readonly dados = inject(CampanhaDetalheDadosService);
  private readonly campanhaService = inject(CampanhaService);
  private readonly fichaService = inject(FichaService);
  private readonly confirmacaoService = inject(ConfirmacaoService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  protected readonly TipoFichaEnum = TipoFichaEnum;
  protected readonly TipoCampanhaMembroPapelEnum = TipoCampanhaMembroPapelEnum;
  protected readonly RolagemVisibilidadeEnum = RolagemVisibilidadeEnum;

  /** Painel lateral fixo (entregável 3) — sempre montado, alterna Rolagens⇆Inventário, nunca overlay. */
  protected readonly painelLateralAtivo = signal<'rolagens' | 'inventario'>('rolagens');

  protected readonly fichaFlutuanteRef = viewChild<FichaFlutuante>('fichaFlutuante');
  private readonly cadernoRef = viewChild<CadernoFlutuante>('caderno');

  protected readonly calculadoraAberta = signal(false);

  /** Alterna a janela do caderno — clicar de novo no item "Caderno" da coluna de ações fecha,
   *  mesmo comportamento do toggle da calculadora (`[(aberta)]` + `calculadoraAberta.set(!...)`). */
  protected alternarCaderno(): void {
    this.cadernoRef()?.alternar();
  }

  /** Placeholders desta task — o conteúdo das dialogs chega nas próximas tasks da série. */
  protected readonly dialogMembrosAberta = signal(false);
  protected readonly dialogConvitesAberta = signal(false);

  /**
   * Grid do "Esquadrão" — todas as fichas de jogador visíveis da campanha, achatadas com o nome
   * do dono anexado. Itera `membrosOrdenados()` (não `fichas()` cru) para a ordem do grid
   * acompanhar a ordem da dialog "Membros" — mesmo dado de `fichasPorMembro()`.
   */
  protected readonly fichasEsquadrao = () => {
    const porMembro = this.dados.fichasPorMembro();
    const lista: EspectadorFichaCardDados[] = [];
    for (const membro of this.dados.membrosOrdenados()) {
      for (const ficha of porMembro.get(membro.usuarioId) ?? []) {
        lista.push({ ...ficha, donoNome: membro.nome });
      }
    }
    return lista;
  };

  /** Criaturas da campanha — mesma subseção da grade, `na`/`defesa` já resolvidos por `FichaResumoDto`. */
  protected readonly criaturasEsquadrao = (): readonly ItemCriatura[] =>
    this.dados
      .fichas()
      .filter((ficha) => ficha.tipo === TipoFichaEnum.CRIATURA)
      .map((ficha): ItemCriatura => ({
        id: ficha.id,
        usuarioId: ficha.usuarioId,
        imagemUrl: ficha.imagemUrl,
        cor: ficha.cor ?? null,
        nome: ficha.nome,
        naTexto: ficha.na ? rotuloNivelAmeaca(ficha.na) : '—',
        vidaAtual: ficha.vidaAtual,
        vidaMaxima: ficha.vidaMaxima,
        defesa: ficha.defesa,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));

  /** Alterna Na Base/Em Missão — só o mestre altera; o jogador só lê (`CampanhaDetalheJogador`). */
  protected alterarEstadoCampanha(): void {
    const campanhaAtual = this.dados.campanha();
    if (!campanhaAtual) {
      return;
    }
    this.campanhaService.alterarEstado(this.dados.id, !campanhaAtual.naBase).subscribe((estado) => {
      this.dados.campanha.update((atual) => (atual ? { ...atual, naBase: estado.naBase } : atual));
    });
  }

  /** Abre a ficha (jogador ou criatura) na janela flutuante — "Abrir ficha" do cartão do Esquadrão. */
  protected abrirFichaFlutuante(
    ficha: { readonly id: number; readonly usuarioId: number },
    tipo: typeof TipoFichaEnum.JOGADOR | typeof TipoFichaEnum.CRIATURA,
  ): void {
    this.fichaFlutuanteRef()?.abrir({ fichaId: ficha.id, tipo, usuarioIdDono: ficha.usuarioId });
  }

  // === Menu "⋯" por cartão do Esquadrão (duplicar/remover/excluir) — dropdown na raiz do
  // template (não dentro do grid, que tem overflow+mask-image e recortaria um `position: fixed`
  // filho na pintura), mesmo padrão do antigo `menuFichaAberto` de `CampanhaDetalhe`.

  protected readonly menuFichaAberto = signal<{ id: number; nome: string; donoNome: string } | null>(null);
  protected readonly menuFichaPosicao = signal<{ top?: number; bottom?: number; right: number } | null>(null);

  protected alternarMenuFicha(ficha: EspectadorFichaCardDados, evento: MouseEvent): void {
    if (this.menuFichaAberto()?.id === ficha.id) {
      this.fecharMenuFicha();
      return;
    }
    const retangulo = (evento.currentTarget as HTMLElement).getBoundingClientRect();
    const espacoAbaixo = window.innerHeight - retangulo.bottom;
    const espacoAcima = retangulo.top;
    const right = window.innerWidth - retangulo.right;
    this.menuFichaPosicao.set(
      espacoAbaixo < 130 && espacoAcima > espacoAbaixo
        ? { bottom: window.innerHeight - retangulo.top + 6, right }
        : { top: retangulo.bottom + 6, right },
    );
    this.menuFichaAberto.set({ id: ficha.id, nome: ficha.nome, donoNome: ficha.donoNome });
  }

  protected fecharMenuFicha(): void {
    this.menuFichaAberto.set(null);
    this.menuFichaPosicao.set(null);
  }

  protected readonly confirmandoDuplicar = signal<{ id: number; nome: string; donoNome: string } | null>(null);
  protected readonly duplicando = signal<number | null>(null);

  protected pedirDuplicar(fichaId: number, fichaNome: string, donoNome: string): void {
    this.fecharMenuFicha();
    this.confirmandoDuplicar.set({ id: fichaId, nome: fichaNome, donoNome });
  }

  protected cancelarDuplicar(): void {
    if (this.duplicando() === null) {
      this.confirmandoDuplicar.set(null);
    }
  }

  /** Duplica uma ficha — o clone nasce na mesma campanha, dono é sempre quem duplicou (§14). */
  protected confirmarDuplicar(): void {
    const pendente = this.confirmandoDuplicar();
    if (!pendente || this.duplicando() !== null) {
      return;
    }
    this.duplicando.set(pendente.id);
    this.fichaService
      .duplicarFicha(pendente.id)
      .pipe(finalize(() => this.duplicando.set(null)))
      .subscribe({
        next: () => {
          this.confirmandoDuplicar.set(null);
          this.dados.recarregarMembrosEFichas();
        },
      });
  }

  protected readonly removendo = signal<number | null>(null);

  /** Desatribui a ficha da campanha (ela volta ao acervo solto do dono) — via menu do cartão. */
  protected removerDaCampanha(fichaId: number): void {
    this.fecharMenuFicha();
    if (this.removendo() !== null) {
      return;
    }
    this.removendo.set(fichaId);
    this.fichaService
      .atribuirCampanha(fichaId, null)
      .pipe(finalize(() => this.removendo.set(null)))
      .subscribe({
        next: () => this.dados.fichas.update((lista) => lista.filter((ficha) => ficha.id !== fichaId)),
      });
  }

  protected pedirExcluirFicha(fichaId: number, fichaNome: string): void {
    this.fecharMenuFicha();
    this.confirmacaoService
      .confirmar({
        titulo: 'Excluir ficha',
        mensagem: `Excluir ${fichaNome}? Esta ação não pode ser desfeita.`,
        entidade: fichaNome,
        rotuloConfirmar: 'Confirmar exclusão',
      })
      .then((confirmado) => {
        if (confirmado) {
          this.excluirFicha(fichaId);
        }
      });
  }

  private excluirFicha(fichaId: number): void {
    this.fichaService.excluirFicha(fichaId).subscribe({
      next: () => this.dados.fichas.update((lista) => lista.filter((ficha) => ficha.id !== fichaId)),
    });
  }

  /** Abre o assistente de criação de ficha/criatura — botões do cabeçalho do Esquadrão. */
  protected abrirCriarFicha(): void {
    void this.router.navigate(['/campanhas', this.dados.id, 'ficha', 'nova']);
  }

  protected abrirCriarCriatura(): void {
    void this.router.navigate(['/campanhas', this.dados.id, 'criatura', 'nova']);
  }

  // === Editar/Excluir campanha — itens da coluna de ações. A edição é uma dialog (decisão do
  // autor, 2026-09-08 — o formulário passou de inline no conteúdo para `app-modal`).

  protected readonly dialogEdicaoAberta = signal(false);
  protected readonly salvando = signal(false);

  protected readonly formularioEdicao = this.formBuilder.nonNullable.group({
    nome: ['', [Validators.required]],
    descricao: [''],
  });

  protected abrirEdicao(): void {
    const campanhaAtual = this.dados.campanha();
    if (!campanhaAtual) {
      return;
    }
    this.formularioEdicao.reset({ nome: campanhaAtual.nome, descricao: campanhaAtual.descricao ?? '' });
    this.dialogEdicaoAberta.set(true);
  }

  protected cancelarEdicao(): void {
    this.dialogEdicaoAberta.set(false);
  }

  protected salvarEdicao(): void {
    if (this.formularioEdicao.invalid || this.salvando()) {
      this.formularioEdicao.markAllAsTouched();
      return;
    }
    this.salvando.set(true);
    const { nome, descricao } = this.formularioEdicao.getRawValue();
    this.campanhaService
      .alterarCampanha(this.dados.id, { nome, descricao: descricao || undefined })
      .pipe(finalize(() => this.salvando.set(false)))
      .subscribe({
        next: (campanhaAlterada) => {
          this.dados.campanha.update((atual) =>
            atual ? { ...atual, nome: campanhaAlterada.nome, descricao: campanhaAlterada.descricao } : atual,
          );
          this.dialogEdicaoAberta.set(false);
        },
      });
  }

  protected pedirExclusao(): void {
    this.dialogEdicaoAberta.set(false);
    const campanhaAtual = this.dados.campanha();
    if (!campanhaAtual) {
      return;
    }
    this.confirmacaoService
      .confirmar({
        titulo: 'Excluir campanha',
        mensagem: `Excluir ${campanhaAtual.nome}? Esta ação não pode ser desfeita.`,
        entidade: campanhaAtual.nome,
        rotuloConfirmar: 'Confirmar exclusão',
      })
      .then((confirmado) => {
        if (confirmado) {
          this.campanhaService
            .excluirCampanha(this.dados.id)
            .subscribe({ next: () => void this.router.navigate(['/campanhas']) });
        }
      });
  }

  protected abrirAnotacoesFicha(fichaId: number): void {
    void this.router.navigate(['/campanhas', this.dados.id, 'ficha', fichaId], { fragment: 'anotacoes' });
  }

  // === Dialog "Membros" — gestão de membros (transferir mestre, alternar papel, remover) sai da
  // coluna sempre visível e vira dialog aberta pela coluna de ações. Cada jogador ganha a ação
  // "Prévia" por linha (decisão do autor, 2026-09-08 — substitui o fluxo de 2 passos do antigo
  // menu kebab "Prévia de jogador").

  protected readonly acaoMembro = signal<number | null>(null);
  protected readonly processandoMembro = signal(false);
  protected readonly alterandoPapel = signal<number | null>(null);

  protected podeGerenciarMembro(membro: CampanhaMembroResumoDto): boolean {
    return membro.papel !== TipoCampanhaMembroPapelEnum.MESTRE;
  }

  /**
   * Grade da dialog "Membros" em 3 categorias (decisão do autor, 2026-09-08): mestre sozinho na
   * primeira linha (a 2ª coluna fica vazia), depois jogadores, depois espectadores — cada grupo
   * mantém a ordem alfabética que `dados.membrosOrdenados()` já entrega dentro do papel.
   */
  protected readonly membroMestre = () =>
    this.dados.membrosOrdenados().find((membro) => membro.papel === TipoCampanhaMembroPapelEnum.MESTRE) ?? null;

  protected readonly membrosJogadores = () =>
    this.dados.membrosOrdenados().filter((membro) => membro.papel === TipoCampanhaMembroPapelEnum.JOGADOR);

  protected readonly membrosEspectadores = () =>
    this.dados.membrosOrdenados().filter((membro) => membro.papel === TipoCampanhaMembroPapelEnum.ESPECTADOR);

  protected pedirRemocaoMembro(membro: CampanhaMembroResumoDto): void {
    this.confirmacaoService
      .confirmar({
        titulo: 'Remover membro',
        mensagem: `Remover ${membro.nome} da campanha?`,
        entidade: membro.nome,
        rotuloConfirmar: 'Confirmar remoção',
      })
      .then((confirmado) => {
        if (confirmado) {
          this.removerMembro(membro.usuarioId);
        }
      });
  }

  private removerMembro(usuarioId: number): void {
    this.campanhaService.removerMembro(this.dados.id, usuarioId).subscribe({
      next: () => this.dados.membros.update((lista) => lista.filter((membro) => membro.usuarioId !== usuarioId)),
    });
  }

  protected pedirTransferenciaMestre(membro: CampanhaMembroResumoDto): void {
    this.acaoMembro.set(membro.usuarioId);
  }

  protected cancelarAcaoMembro(): void {
    this.acaoMembro.set(null);
  }

  /** Transfere o papel de mestre — `dados.ehMestre` recomputa e `CampanhaDetalheShell` troca pra `CampanhaDetalheJogador`. */
  protected confirmarTransferenciaMestre(usuarioId: number): void {
    if (this.processandoMembro()) {
      return;
    }
    this.processandoMembro.set(true);
    this.campanhaService
      .transferirMestre(this.dados.id, usuarioId)
      .pipe(finalize(() => this.processandoMembro.set(false)))
      .subscribe({
        next: () => {
          this.acaoMembro.set(null);
          this.dados.recarregarMembrosEFichas();
        },
      });
  }

  /** O único par que o mestre gere por este botão é `JOGADOR ↔ ESPECTADOR` — promover a `MESTRE` é sempre {@link pedirTransferenciaMestre}. */
  protected papelAlvo(
    membro: CampanhaMembroResumoDto,
  ): TipoCampanhaMembroPapelEnum.JOGADOR | TipoCampanhaMembroPapelEnum.ESPECTADOR {
    return membro.papel === TipoCampanhaMembroPapelEnum.JOGADOR
      ? TipoCampanhaMembroPapelEnum.ESPECTADOR
      : TipoCampanhaMembroPapelEnum.JOGADOR;
  }

  protected pedirAlterarPapelMembro(membro: CampanhaMembroResumoDto): void {
    const alvo = this.papelAlvo(membro);
    const rotuloAlvo = alvo === TipoCampanhaMembroPapelEnum.ESPECTADOR ? 'Espectador' : 'Jogador';
    this.confirmacaoService
      .confirmar({
        titulo: 'Alterar papel',
        mensagem: `Tornar ${membro.nome} ${rotuloAlvo}?`,
        entidade: membro.nome,
        rotuloConfirmar: 'Confirmar',
        severidade: 'padrao',
      })
      .then((confirmado) => {
        if (confirmado) {
          this.alterarPapelMembro(membro.usuarioId, alvo);
        }
      });
  }

  private alterarPapelMembro(
    usuarioId: number,
    papel: TipoCampanhaMembroPapelEnum.JOGADOR | TipoCampanhaMembroPapelEnum.ESPECTADOR,
  ): void {
    if (this.alterandoPapel() !== null) {
      return;
    }
    this.alterandoPapel.set(usuarioId);
    this.campanhaService
      .alterarPapelMembro(this.dados.id, usuarioId, papel)
      .pipe(finalize(() => this.alterandoPapel.set(null)))
      .subscribe({ next: () => this.dados.recarregarMembrosEFichas() });
  }

  /** "Prévia" — navega para a rota dedicada (`recuperarPreviaJogador`), nunca um toggle local. */
  protected abrirPreviaJogador(membro: CampanhaMembroResumoDto): void {
    this.dialogMembrosAberta.set(false);
    void this.router.navigate(['/campanhas', this.dados.id, 'previa', membro.usuarioId]);
  }

  // === Dialog "Convites" — os dois códigos (jogador/espectador) saem da tira de estatísticas
  // sempre visível e viram dialog aberta pela coluna de ações. Mesmo comportamento de copiar/
  // regenerar de hoje, só de local.

  protected readonly regenerando = signal(false);
  protected readonly regenerado = signal(false);
  protected readonly copiado = signal(false);

  protected readonly regenerandoEspectador = signal(false);
  protected readonly regeneradoEspectador = signal(false);
  protected readonly copiadoEspectador = signal(false);

  protected copiarConvite(): void {
    const codigoConvite = this.dados.campanha()?.codigoConvite;
    if (!codigoConvite) {
      return;
    }
    void navigator.clipboard.writeText(codigoConvite).then(() => {
      this.copiado.set(true);
      setTimeout(() => this.copiado.set(false), 1500);
    });
  }

  protected rotuloCopiarConvite(copiado: boolean, tipo: 'jogador' | 'espectador'): string {
    return copiado ? 'Código copiado' : `Copiar código de convite de ${tipo}`;
  }

  protected rotuloRegenerarConvite(regenerando: boolean, tipo: 'jogador' | 'espectador'): string {
    return regenerando ? `Regenerando código de convite de ${tipo}` : `Regenerar código de convite de ${tipo}`;
  }

  protected pedirRegenerarConvite(): void {
    this.confirmacaoService
      .confirmar({
        titulo: 'Regenerar convite de jogador',
        mensagem: 'O código atual deixa de funcionar. Quem ainda não entrou vai precisar do novo.',
        rotuloConfirmar: 'Regenerar',
        severidade: 'padrao',
      })
      .then((confirmado) => {
        if (confirmado) {
          this.regenerarConvite();
        }
      });
  }

  private regenerarConvite(): void {
    if (this.regenerando()) {
      return;
    }
    this.regenerando.set(true);
    this.campanhaService
      .regenerarConvite(this.dados.id)
      .pipe(finalize(() => this.regenerando.set(false)))
      .subscribe({
        next: (conviteRegenerado) => {
          this.dados.campanha.update((atual) =>
            atual ? { ...atual, codigoConvite: conviteRegenerado.codigoConvite } : atual,
          );
          this.regenerado.set(true);
          setTimeout(() => this.regenerado.set(false), 1500);
        },
      });
  }

  protected copiarConviteEspectador(): void {
    const codigoConviteEspectador = this.dados.campanha()?.codigoConviteEspectador;
    if (!codigoConviteEspectador) {
      return;
    }
    void navigator.clipboard.writeText(codigoConviteEspectador).then(() => {
      this.copiadoEspectador.set(true);
      setTimeout(() => this.copiadoEspectador.set(false), 1500);
    });
  }

  protected pedirRegenerarConviteEspectador(): void {
    this.confirmacaoService
      .confirmar({
        titulo: 'Regenerar convite de espectador',
        mensagem: 'O código atual deixa de funcionar. Quem ainda não entrou vai precisar do novo.',
        rotuloConfirmar: 'Regenerar',
        severidade: 'padrao',
      })
      .then((confirmado) => {
        if (confirmado) {
          this.regenerarConviteEspectador();
        }
      });
  }

  private regenerarConviteEspectador(): void {
    if (this.regenerandoEspectador()) {
      return;
    }
    this.regenerandoEspectador.set(true);
    this.campanhaService
      .regenerarConviteEspectador(this.dados.id)
      .pipe(finalize(() => this.regenerandoEspectador.set(false)))
      .subscribe({
        next: (conviteRegenerado) => {
          this.dados.campanha.update((atual) =>
            atual ? { ...atual, codigoConviteEspectador: conviteRegenerado.codigoConviteEspectador } : atual,
          );
          this.regeneradoEspectador.set(true);
          setTimeout(() => this.regeneradoEspectador.set(false), 1500);
        },
      });
  }
}
