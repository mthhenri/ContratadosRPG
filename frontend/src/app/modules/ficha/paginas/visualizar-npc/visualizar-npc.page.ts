import { Component, DestroyRef, HostListener, computed, inject, signal, viewChild } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { filter, firstValueFrom, merge } from "rxjs";
import { TipoCampanhaMembroPapelEnum } from "@contratados-rpg/shared/enums";
import type { CampanhaMembroResumoDto } from "@contratados-rpg/shared/dtos/campanha";
import type { FichaAcessoResumoDto, FichaImagemFocoDto } from "@contratados-rpg/shared/dtos/ficha";
import type { RolagemResumoDto } from "@contratados-rpg/shared/dtos/rolagem";
import { SessaoService } from "../../../../core/services/sessao.service";
import { TempoRealService } from "../../../../core/services/tempo-real.service";
import { TopbarContextoService } from "../../../../core/services/topbar-contexto.service";
import { Icone } from "../../../../shared/icone/icone.component";
import { Tooltip } from "../../../../shared/tooltip/tooltip.directive";
import { CalculadoraFlutuante } from "../../../../shared/calculadora-flutuante/calculadora-flutuante.component";
import { HistoricoRolagensSidebar } from "../../../../shared/historico-rolagens-sidebar/historico-rolagens-sidebar.component";
import { Botao } from "../../../../shared/ui/botao/botao.component";
import { BotaoIcone } from "../../../../shared/ui/botao-icone/botao-icone.component";
import { Campo } from "../../../../shared/ui/campo/campo.component";
import { Cartao } from "../../../../shared/ui/cartao/cartao.component";
import { ColunaAcoes } from "../../../../shared/ui/coluna-acoes/coluna-acoes.component";
import { ColunaAcoesItem } from "../../../../shared/ui/coluna-acoes/coluna-acoes-item.component";
import { ConfirmacaoService } from "../../../../shared/ui/confirmacao/confirmacao.service";
import { EditorMarkdown } from "../../../../shared/ui/editor-markdown/editor-markdown.component";
import { Esqueleto } from "../../../../shared/ui/esqueleto/esqueleto.component";
import { EstadoVazio } from "../../../../shared/ui/estado-vazio/estado-vazio.component";
import { Modal } from "../../../../shared/ui/modal/modal.component";
import { NotificacaoService } from "../../../../shared/ui/notificacao/notificacao.service";
import { PainelFlutuante } from "../../../../shared/ui/painel-flutuante/painel-flutuante.component";
import { CampanhaService } from "../../../campanha/campanha.service";
import { FichaEdicaoNpcService } from "../../ficha-edicao-npc.service";
import { FichaService } from "../../ficha.service";
import { NpcEdicaoFormulario } from "../../npc-edicao-formulario.service";
import { lerParamRota } from "../../ler-param-rota";
import { RolagemService } from "../../rolagem.service";
import { NpcVisualizacao } from "../../componentes/npc-visualizacao/npc-visualizacao.component";

@Component({
    selector: "app-npc-visualizar", providers: [FichaEdicaoNpcService, NpcEdicaoFormulario],
    imports: [ReactiveFormsModule, RouterLink, Icone, Tooltip, CalculadoraFlutuante,
        HistoricoRolagensSidebar, Botao, BotaoIcone, Campo, Cartao, ColunaAcoes, ColunaAcoesItem,
        EditorMarkdown, Esqueleto, EstadoVazio, Modal, PainelFlutuante, NpcVisualizacao],
    templateUrl: "./visualizar-npc.page.html", styleUrl: "./visualizar-npc.page.scss",
})
export class NpcVisualizar {
    readonly edicao = inject(FichaEdicaoNpcService);
    private readonly editorAnotacoes = viewChild<EditorMarkdown>("editorAnotacoes");
    readonly formulario = inject(NpcEdicaoFormulario);
    private readonly api = inject(FichaService);
    private readonly campanhas = inject(CampanhaService);
    private readonly rolagens = inject(RolagemService);
    private readonly sessao = inject(SessaoService);
    private readonly tempoReal = inject(TempoRealService);
    private readonly topbar = inject(TopbarContextoService);
    private readonly confirmacao = inject(ConfirmacaoService);
    private readonly notificacao = inject(NotificacaoService);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    readonly fichaId = Number(lerParamRota(inject(ActivatedRoute), "id"));
    readonly campanhaId = computed(() => this.edicao.ficha()?.campanhaId ?? null);
    readonly campanhaNome = signal("");
    /** Estado de persistência do cabeçalho — vazio quando não há o que dizer (como na criatura). */
    readonly textoPersistencia = computed(() => {
        const estado = this.edicao.estadoPersistencia();
        if (estado === "salvando") return "Salvando…";
        if (estado === "salvo") return "Salvo";
        // Sem "Rascunho" (m4-16): a edição em curso já se mostra no próprio bloco.
        return estado === "erro" ? "Falha ao salvar" : "";
    });
    readonly membros = signal<readonly CampanhaMembroResumoDto[]>([]);
    readonly acessos = signal<readonly FichaAcessoResumoDto[]>([]);
    readonly carregando = signal(true);
    readonly erroCarga = signal(false);
    readonly historicoAberto = signal(false);
    readonly historico = signal<readonly RolagemResumoDto[]>([]);
    readonly historicoCarregando = signal(false);
    readonly historicoTemMais = signal(false);
    private historicoPagina = 0;
    readonly calculadoraAberta = signal(false);
    readonly anotacoesAbertas = signal(false);
    readonly mobile = signal(window.innerWidth <= 560);
    readonly dialogAcesso = signal(false);
    readonly membroParaConceder = new FormControl<number | null>(null);
    readonly acessoOcupado = signal(false);
    readonly erroAcesso = signal("");
    readonly imagemOcupada = signal(false);
    readonly erroImagem = signal("");
    readonly imagemPendente = signal<{
        arquivo: File | null; foco: FichaImagemFocoDto;
    } | null>(null);
    private leituraGeracao = 0;
    private acessoPerdido = false;
    private destruida = false;
    private salaCampanha: number | null = null;
    readonly gerenciavel = computed(() => !!this.edicao.ficha() && (
        this.edicao.ficha()?.usuarioId === this.sessao.usuario()?.id || this.membros().some(
            (membro) => membro.usuarioId === this.sessao.usuario()?.id
                && membro.papel === TipoCampanhaMembroPapelEnum.MESTRE,
        )
    ));
    readonly elegiveis = computed(() => this.membros().filter((membro) =>
        membro.papel === TipoCampanhaMembroPapelEnum.JOGADOR
        && membro.usuarioId !== this.edicao.ficha()?.usuarioId
        && !this.acessos().some((acesso) => acesso.usuarioId === membro.usuarioId)));

    constructor() {
        void this.carregar();
        this.tempoReal.conectar();
        this.tempoReal.entrarSalaFicha(this.fichaId);
        this.destroyRef.onDestroy(() => {
            this.destruida = true; this.leituraGeracao++;
            this.tempoReal.sairSalaFicha(this.fichaId); this.topbar.limpar();
            if (this.salaCampanha !== null) this.tempoReal.sairSalaCampanha(this.salaCampanha);
        });
        // Eventos invalidam: GET tipado conserva privacidade e o contrato de NPC.
        merge(this.tempoReal.fichaAlterada$.pipe(filter((ficha) => ficha.id === this.fichaId)),
            this.tempoReal.reconexao$).pipe(takeUntilDestroyed())
            .subscribe(() => { void this.carregar(false); void this.carregarHistorico(1); });
        this.tempoReal.acessoRevogado$.pipe(filter((evento) => evento.fichaId === this.fichaId
            && evento.usuarioId === this.sessao.usuario()?.id), takeUntilDestroyed())
            .subscribe(() => { if (!this.gerenciavel()) this.expulsar(); });
        this.tempoReal.rolagemRegistrada$.pipe(
            filter((rolagem) => rolagem.fichaId === this.fichaId),
            takeUntilDestroyed()).subscribe((rolagem) => this.historico.update((atuais) =>
                atuais.some((atual) => atual.id === rolagem.id) ? atuais : [rolagem, ...atuais]));
        this.tempoReal.rolagemExcluida$.pipe(filter((evento) => evento.fichaId === this.fichaId),
            takeUntilDestroyed()).subscribe((evento) => this.historico.update((atuais) =>
                atuais.filter((rolagem) => rolagem.id !== evento.id)));
    }

    async carregar(inicial = true): Promise<void> {
        if (this.acessoPerdido || this.destruida) return;
        const geracao = ++this.leituraGeracao;
        if (inicial) { this.carregando.set(true); this.erroCarga.set(false); }
        try {
            const ficha = await firstValueFrom(this.api.recuperarFichaNpc(this.fichaId)
                .pipe(takeUntilDestroyed(this.destroyRef)));
            if (geracao !== this.leituraGeracao || this.acessoPerdido || this.destruida) return;
            if (this.edicao.ficha()) this.edicao.absorverRemoto(ficha);
            else this.edicao.definirFicha(ficha);
            this.topbar.definir(ficha.nome);
            if (this.salaCampanha !== ficha.campanhaId) {
                if (this.salaCampanha !== null) this.tempoReal.sairSalaCampanha(this.salaCampanha);
                this.salaCampanha = ficha.campanhaId;
                if (this.salaCampanha !== null) {
                    this.tempoReal.entrarSalaCampanha(this.salaCampanha);
                }
            }
            if (ficha.campanhaId !== null) {
                const [campanha, membros] = await Promise.allSettled([
                    firstValueFrom(this.campanhas.recuperarCampanha(ficha.campanhaId)),
                    firstValueFrom(this.campanhas.listarMembros(ficha.campanhaId)),
                ]);
                if (geracao !== this.leituraGeracao || this.acessoPerdido || this.destruida) return;
                this.campanhaNome.set(campanha.status === "fulfilled" ? campanha.value.nome : "");
                this.membros.set(membros.status === "fulfilled" ? membros.value : []);
            } else { this.campanhaNome.set(""); this.membros.set([]); }
            if (inicial) void this.carregarHistorico(1);
        } catch (erro) {
            if (geracao !== this.leituraGeracao || this.acessoPerdido || this.destruida) return;
            const status = (erro as { status?: number }).status;
            if (!inicial && (status === 403 || status === 404)) this.expulsar();
            else if (inicial) { this.edicao.limpar(); this.erroCarga.set(true); }
        } finally {
            if (geracao === this.leituraGeracao) this.carregando.set(false);
        }
    }

    private expulsar(): void {
        const rota = this.rotaSaida();
        this.acessoPerdido = true; this.leituraGeracao++;
        this.edicao.limpar(); this.historico.set([]); this.acessos.set([]);
        this.anotacoesAbertas.set(false); this.dialogAcesso.set(false);
        this.imagemPendente.set(null);
        this.topbar.limpar();
        this.notificacao.notificar({ severidade: "aviso", resumo: "Acesso revogado",
            detalhe: "Seu acesso a esta ficha foi revogado." });
        void this.router.navigate(rota);
    }

    rotaSaida(): (string | number)[] {
        return this.campanhaId() === null ? ["/fichas"] : ["/campanhas", this.campanhaId()!];
    }

    /** Só as Anotações (painel flutuante) ainda disparam Salvar pela página — os demais blocos e
     * valores avulsos salvam direto no próprio bloco/campo (m4-16). */
    async salvarAnotacoes(): Promise<void> {
        if (!this.gerenciavel() || this.formulario.grupo() !== "anotacoes") return;
        const texto = this.editorAnotacoes()?.confirmarValor();
        if (texto !== undefined) this.formulario.formulario.controls.anotacoes.setValue(texto);
        await this.formulario.salvar();
    }

    async abrirAcesso(): Promise<void> {
        if (!this.gerenciavel()) return;
        this.dialogAcesso.set(true); this.erroAcesso.set("");
        await this.carregarAcessos();
    }

    private async carregarAcessos(): Promise<void> {
        try {
            const acessos = await firstValueFrom(this.api.listarAcessos(this.fichaId));
            if (this.gerenciavel()) this.acessos.set(acessos);
        } catch { this.erroAcesso.set("Não foi possível carregar os acessos. Tente novamente."); }
    }

    async conceder(): Promise<void> {
        const usuarioId = this.membroParaConceder.value;
        if (!this.gerenciavel() || usuarioId === null || this.acessoOcupado()) return;
        this.acessoOcupado.set(true); this.erroAcesso.set("");
        try {
            await firstValueFrom(this.api.concederAcesso(this.fichaId, usuarioId));
            this.membroParaConceder.reset(null); await this.carregarAcessos();
        } catch { this.erroAcesso.set("Não foi possível conceder. Sua seleção foi mantida."); }
        finally { this.acessoOcupado.set(false); }
    }

    async revogar(usuarioId: number): Promise<void> {
        if (!this.gerenciavel() || this.acessoOcupado()) return;
        this.acessoOcupado.set(true); this.erroAcesso.set("");
        try {
            await firstValueFrom(this.api.revogarAcesso(this.fichaId, usuarioId));
            await this.carregarAcessos();
        } catch { this.erroAcesso.set("Não foi possível revogar. Tente novamente."); }
        finally { this.acessoOcupado.set(false); }
    }

    async carregarHistorico(pagina = this.historicoPagina + 1): Promise<void> {
        if (!this.edicao.ficha() || this.historicoCarregando() || this.acessoPerdido) return;
        this.historicoCarregando.set(true);
        try {
            const resposta = await firstValueFrom(
                this.rolagens.listarPorFicha(this.fichaId, pagina, 20));
            if (!this.edicao.ficha() || this.acessoPerdido || this.destruida) return;
            this.historico.set(pagina === 1 ? resposta.itens
                : [...this.historico(), ...resposta.itens]);
            this.historicoPagina = resposta.paginaAtual;
            this.historicoTemMais.set(resposta.paginaAtual < resposta.totalPaginas);
        } catch { /* O interceptor comunica o erro; o histórico confirmado permanece. */ }
        finally { this.historicoCarregando.set(false); }
    }

    async alterarImagem(alteracao: {
        arquivo: File | null; foco: FichaImagemFocoDto;
    }): Promise<void> {
        if (!this.gerenciavel() || this.imagemOcupada()
            || (this.edicao.edicaoPendente() && !this.imagemPendente())) return;
        this.imagemPendente.set(alteracao); this.imagemOcupada.set(true); this.erroImagem.set("");
        try {
            if (alteracao.arquivo) {
                await firstValueFrom(this.api.alterarImagem(this.fichaId, alteracao.arquivo));
                this.imagemPendente.set({ arquivo: null, foco: alteracao.foco });
                await this.carregar(false);
            }
            if (!this.gerenciavel()) return;
            this.edicao.iniciarEdicao();
            this.edicao.alterarRascunho((ficha) => ({ ...ficha, imagemFoco: alteracao.foco }));
            if (!(await this.edicao.salvar())) throw new Error("Falha de enquadramento");
            this.imagemPendente.set(null);
        } catch { this.erroImagem.set("Não foi possível concluir o retrato. Tente novamente."); }
        finally { this.imagemOcupada.set(false); }
    }

    async removerImagem(): Promise<void> {
        if (!this.gerenciavel() || this.imagemOcupada() || this.edicao.edicaoPendente()) return;
        this.imagemOcupada.set(true); this.erroImagem.set("");
        try {
            await firstValueFrom(this.api.excluirImagem(this.fichaId));
            await this.carregar(false);
        }
        catch { this.erroImagem.set("Não foi possível remover o retrato. Tente novamente."); }
        finally { this.imagemOcupada.set(false); }
    }

    async excluir(): Promise<void> {
        if (!this.gerenciavel()) return;
        const confirmado = await this.confirmacao.confirmar({ titulo: "Excluir NPC",
            mensagem: "Excluir esta ficha de NPC?", entidade: this.edicao.ficha()!.nome,
            severidade: "perigo", rotuloConfirmar: "Confirmar exclusão",
            aoConfirmar: () => firstValueFrom(this.api.excluirFicha(this.fichaId)) });
        if (confirmado) {
            const rota = this.rotaSaida(); this.edicao.limpar(); void this.router.navigate(rota);
        }
    }

    podeSair(): boolean | Promise<boolean> {
        if (this.acessoPerdido) return true;
        if (this.edicao.salvando() || this.imagemOcupada()) return false;
        if (!this.edicao.edicaoPendente() && !this.imagemPendente()
            && !this.formulario.ocupado()) return true;
        return this.confirmacao.confirmar({ titulo: "Sair da ficha?",
            mensagem: "As alterações não salvas serão descartadas.", severidade: "padrao",
            rotuloConfirmar: "Sair sem salvar", rotuloCancelar: "Continuar editando" });
    }

    @HostListener("window:resize")
    ajustarViewport(): void { this.mobile.set(window.innerWidth <= 560); }

    @HostListener("window:beforeunload", ["$event"])
    protegerFechamento(evento: BeforeUnloadEvent): void {
        if (this.edicao.edicaoPendente() || this.edicao.salvando() || this.imagemPendente()
            || this.formulario.ocupado()) {
            evento.preventDefault(); evento.returnValue = "";
        }
    }
}
