import {
    Component, ElementRef, computed, effect, inject, input, output, signal, viewChild,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { TemaService } from "../../../../core/services/tema.service";
import { CategoriaNpcEnum } from "@contratados-rpg/shared/enums";
import { IMAGEM_MIMES_ACCEPT } from "@contratados-rpg/shared/validators";
import type { FichaAtributosDto, FichaImagemFocoDto } from "@contratados-rpg/shared/dtos/ficha";
import { calcularDtAtributo, calcularEnergia, obterReferenciaCategoria,
    obterReferenciaCooperacao } from "@contratados-rpg/shared/regras/npc";
import { Icone } from "../../../../shared/icone/icone.component";
import { AutoFocus } from "../../../../shared/auto-focus/auto-focus.directive";
import { FocoImagem } from "../../../../shared/foco-imagem.directive";
import { Tooltip } from "../../../../shared/tooltip/tooltip.directive";
import { AbaPainel } from "../../../../shared/ui/abas/aba-painel.directive";
import { Aba } from "../../../../shared/ui/abas/aba.component";
import { Abas } from "../../../../shared/ui/abas/abas.component";
import { Botao } from "../../../../shared/ui/botao/botao.component";
import { BotaoIcone } from "../../../../shared/ui/botao-icone/botao-icone.component";
import { Campo } from "../../../../shared/ui/campo/campo.component";
import { Cartao } from "../../../../shared/ui/cartao/cartao.component";
import { Chip } from "../../../../shared/ui/chip/chip.component";
import { Stat } from "../../../../shared/ui/stat/stat.component";
import { StepInput } from "../../../../shared/ui/stepper/step-input.component";
import { ValorEditavel } from "../../../../shared/ui/valor-editavel/valor-editavel.component";
import { BarraRecurso } from "../../../../shared/ui/barra-recurso/barra-recurso.component";
import { NpcEdicaoFormulario, type GrupoEdicaoNpc } from "../../npc-edicao-formulario.service";
import { GRUPOS_ATRIBUTOS } from "../../npc-atributos-campos";
import { AjusteEnquadramentoImagem } from "../ajuste-enquadramento-imagem/ajuste-enquadramento-imagem.component";
import { NpcBlocoAcoes } from "./npc-bloco-acoes.component";
import { NpcHabilidadesLista } from "./npc-habilidades-lista.component";
import { NpcSanidadeLista } from "./npc-sanidade-lista.component";

@Component({
    selector: "app-npc-visualizacao",
    imports: [ReactiveFormsModule, Icone, AutoFocus, FocoImagem, Tooltip, AbaPainel, Aba, Abas,
        Botao, BotaoIcone, Campo, Cartao, Chip, Stat, StepInput, ValorEditavel, BarraRecurso,
        AjusteEnquadramentoImagem, NpcBlocoAcoes, NpcHabilidadesLista, NpcSanidadeLista],
    templateUrl: "./npc-visualizacao.component.html", styleUrl: "./npc-visualizacao.scss",
})
export class NpcVisualizacao {
    private readonly tema = inject(TemaService);
    readonly formulario = inject(NpcEdicaoFormulario);
    readonly edicao = this.formulario.edicao;
    readonly gerenciavel = input(false);
    readonly apertado = input(false);
    readonly imagemOcupada = input(false);
    readonly imagemAlterada = output<{ arquivo: File | null; foco: FichaImagemFocoDto }>();
    readonly imagemRemovida = output<void>();
    readonly origemImagem = signal<File | string | null>(null);
    private arquivoImagem: File | null = null;
    readonly tiposImagemAceitos = IMAGEM_MIMES_ACCEPT;
    readonly corSelecionada = new FormControl(this.tema.accentEfetivo(), { nonNullable: true });
    readonly ficha = computed(() => this.edicao.rascunho() ?? this.edicao.ficha());
    readonly dados = computed(() => this.ficha()!.dados);
    readonly grupos = GRUPOS_ATRIBUTOS;
    readonly categorias = Object.values(CategoriaNpcEnum).map((categoria) =>
        obterReferenciaCategoria({ categoria }));
    readonly referencia = computed(() => obterReferenciaCategoria({
        categoria: this.dados().categoria,
    }));
    readonly cooperacao = computed(() => {
        try { return obterReferenciaCooperacao({ cooperacao: this.dados().cooperacao }); }
        catch { return null; }
    });
    readonly civil = computed(() => this.dados().categoria === CategoriaNpcEnum.CIVIL);
    readonly pool = computed(() => typeof calcularEnergia({ categoria: this.dados().categoria,
        destreza: this.dados().atributos.destreza }) !== "number");
    readonly aba = signal("habilidades");
    readonly abas = ["habilidades", "conduta", "sanidade"] as const;
    readonly camposConduta = [
        { chave: "gatilhosFuga", nome: "Gatilhos de fuga" },
        { chave: "prioridadesAlvo", nome: "Prioridades de alvo" },
        { chave: "reacaoFerimentoSevero", nome: "Reação a ferimento severo" },
    ] as const;
    /** Anunciado a leitor de tela quando um bloco/valor entra em edição (item 3, m4-16). */
    readonly resumoEdicaoAtiva = computed(() => {
        const rotulo = this.formulario.rotuloEdicaoAtiva();
        return rotulo ? `Editando ${rotulo}` : "";
    });
    private readonly chavesAtributos = GRUPOS_ATRIBUTOS.flatMap((grupo) =>
        grupo.campos.map((campo) => campo.chave as string));
    /** Violações do bloco Atributos (`validarAtributosCategoria`) — erro dentro do próprio bloco,
     * como `criatura__atributos-aviso` (item 2, m4-16). */
    readonly violacoesAtributos = computed(() => this.edicao.violacoes()
        .filter((violacao) => this.chavesAtributos.some((chave) => violacao.startsWith(`${chave}:`))));
    /** Violação específica do valor avulso em edição (nível/cooperação têm regra própria em
     * `validarFichaNpc`) — mais precisa que o `edicao.erro()` genérico, mas cai nele se a falha
     * foi de rede, não de validação (decisão 2, m4-16). */
    readonly violacoesNivel = computed(() => this.edicao.violacoes()
        .filter((violacao) => violacao.startsWith("nível:")));
    readonly violacoesCooperacao = computed(() => this.edicao.violacoes()
        .filter((violacao) => violacao.startsWith("cooperação:")));
    /** Foco ao entrar em edição de bloco (item 3, m4-16): primeiro campo do bloco; o container
     * (`tabindex="-1"`) só recebe o foco se o bloco não tiver campo. */
    private readonly editorAtributos = viewChild<ElementRef<HTMLElement>>("editorAtributos");
    private readonly editorConduta = viewChild<ElementRef<HTMLElement>>("editorConduta");

    constructor() {
        effect(() => this.corSelecionada.setValue(this.ficha()?.cor ?? this.tema.accentEfetivo(),
            { emitEvent: false }));
        // Um por vez (m4-16): a cor salva na hora, então fica travada enquanto outra edição corre.
        effect(() => {
            if (this.formulario.ocupado()) this.corSelecionada.disable({ emitEvent: false });
            else this.corSelecionada.enable({ emitEvent: false });
        });
        this.corSelecionada.valueChanges.pipe(takeUntilDestroyed()).subscribe((cor) => {
            if (this.gerenciavel()) void this.confirmarCorImediata(cor);
        });
        this.focarAoAtivar("atributos", this.editorAtributos);
        this.focarAoAtivar("conduta", this.editorConduta);
    }

    /** Foca o primeiro campo do bloco assim que ele entra em edição (item 3, m4-16). Adiado pro
     * próximo macrotask: os campos só existem depois que o `@if` do template troca de estado. */
    private focarAoAtivar(grupo: GrupoEdicaoNpc, alvo: () => ElementRef<HTMLElement> | undefined) {
        effect(() => {
            if (!this.formulario.emEdicaoDe(grupo)) return;
            const elemento = alvo()?.nativeElement;
            if (!elemento) return;
            setTimeout(() => (elemento.querySelector<HTMLElement>("input, textarea, select")
                ?? elemento).focus());
        });
    }

    /** Blocos (Atributos/Conduta/Habilidades/Sequelas/Traumas/Anotações) — lápis some, Salvar/
     * Cancelar aparecem no próprio bloco; "um por vez" com os demais blocos e valores avulsos. */
    iniciar(grupo: GrupoEdicaoNpc): void {
        if (this.gerenciavel()) this.formulario.iniciar(grupo);
    }

    /** Esc cancela o bloco em edição; Ctrl/Cmd+Enter salva (item 3, m4-16). */
    aoTeclaBloco(evento: KeyboardEvent): void {
        if (evento.key === "Escape") { evento.stopPropagation(); this.formulario.cancelar(); }
        else if (evento.key === "Enter" && (evento.ctrlKey || evento.metaKey)) {
            evento.preventDefault(); void this.formulario.salvar();
        }
    }

    dt(chave: keyof FichaAtributosDto): number {
        return calcularDtAtributo({ nivel: this.dados().nivel,
            valorAtributo: this.dados().atributos[chave] });
    }

    /** Vida/Energia máximas já têm mecanismo avulso próprio no `app-barra-recurso` (clique no
     * "/ máximo" → input → Enter) — aqui só falta persistir aquele campo único, imediatamente,
     * no lugar de abrir um grupo que esperava um "Salvar" à parte (m4-16). */
    async ajustarMaximo(campo: "vidaMaxima" | "energiaMaxima", valor: number): Promise<void> {
        // Com um bloco aberto, `salvarCampo` levaria o rascunho dele junto no mesmo PUT.
        if (!this.gerenciavel() || this.formulario.ocupado() || !Number.isFinite(valor)) return;
        await this.formulario.edicao.salvarCampo((ficha) => ({ ...ficha,
            dados: { ...ficha.dados, [campo]: Math.max(0, valor) } }));
    }

    confirmarNome(valor: string): void {
        const nome = valor.trim();
        // Nome vazio não é um valor — sai da edição restaurando o nome atual (Esc implícito).
        if (!nome) { this.formulario.cancelarAvulso(); return; }
        void this.formulario.confirmarAvulso("nome", (ficha) => ({ ...ficha, nome,
            dados: { ...ficha.dados,
                identidadeNarrativa: { ...ficha.dados.identidadeNarrativa, nome } } }));
    }

    confirmarFuncao(valor: string): void {
        void this.formulario.confirmarAvulso("funcao", (ficha) => ({ ...ficha,
            dados: { ...ficha.dados,
                identidadeNarrativa: { ...ficha.dados.identidadeNarrativa, funcao: valor } } }));
    }

    confirmarCategoria(valor: string): void {
        const categoria = valor as CategoriaNpcEnum;
        void this.formulario.confirmarAvulso("categoria",
            (ficha) => ({ ...ficha, dados: { ...ficha.dados, categoria } }));
    }

    /** Sem clamp de faixa — um nível fora de 0–20 chega ao PUT e `validarFichaNpc` rejeita,
     * exibindo a violação dentro do próprio valor avulso (decisão 2, m4-16). */
    confirmarNivel(valor: number): void {
        if (!Number.isFinite(valor)) return;
        const nivel = Math.trunc(valor);
        void this.formulario.confirmarAvulso("nivel",
            (ficha) => ({ ...ficha, dados: { ...ficha.dados, nivel } }));
    }

    /** Sem clamp de faixa — mesma razão de {@link confirmarNivel}. */
    confirmarCooperacao(valor: number): void {
        if (!Number.isFinite(valor)) return;
        const cooperacao = Math.trunc(valor);
        void this.formulario.confirmarAvulso("cooperacao",
            (ficha) => ({ ...ficha, dados: { ...ficha.dados, cooperacao } }));
    }

    confirmarDefesa(valor: number): void {
        if (!Number.isFinite(valor)) return;
        void this.formulario.confirmarAvulso("defesaBase", (ficha) => ({ ...ficha,
            dados: { ...ficha.dados, defesaBase: Math.max(0, Math.trunc(valor)) } }));
    }

    confirmarBloquear(valor: number): void {
        if (!Number.isFinite(valor)) return;
        void this.formulario.confirmarAvulso("bloquear", (ficha) => ({ ...ficha,
            dados: { ...ficha.dados, bloquear: Math.max(0, Math.trunc(valor)) } }));
    }

    confirmarEsquivar(valor: number): void {
        if (!Number.isFinite(valor)) return;
        void this.formulario.confirmarAvulso("esquivar", (ficha) => ({ ...ficha,
            dados: { ...ficha.dados, esquivar: Math.max(0, Math.trunc(valor)) } }));
    }

    confirmarRecarga(valor: number): void {
        if (!Number.isFinite(valor)) return;
        const recargaPorTurno = Math.max(0, Math.trunc(valor));
        void this.formulario.confirmarAvulso("recargaPorTurno", (ficha) => ({ ...ficha,
            dados: { ...ficha.dados,
                energia: { ...ficha.dados.energia, recargaPorTurno } } }));
    }

    /** Cor da ficha: sempre visível, sem lápis nem trava — mesmo padrão imediato do retrato e do
     * ajuste rápido de Vida/Energia (análogo: `criatura__cor-entrada`). */
    private async confirmarCorImediata(cor: string): Promise<void> {
        const base = this.ficha();
        if (!base || this.formulario.ocupado()
            || cor === (base.cor ?? this.tema.accentEfetivo())) return;
        await this.formulario.edicao.salvarCampo((ficha) => ({ ...ficha, cor }));
    }

    escolherImagem(evento: Event): void {
        const entrada = evento.target as HTMLInputElement;
        const arquivo = entrada.files?.[0];
        if (arquivo && this.gerenciavel()) {
            this.arquivoImagem = arquivo; this.origemImagem.set(arquivo);
        }
        entrada.value = "";
    }

    reenquadrar(): void {
        const imagem = this.ficha()?.imagemUrl;
        if (imagem && this.gerenciavel()) {
            this.arquivoImagem = null; this.origemImagem.set(imagem);
        }
    }

    confirmarImagem(foco: FichaImagemFocoDto): void {
        this.imagemAlterada.emit({ arquivo: this.arquivoImagem, foco });
        this.origemImagem.set(null); this.arquivoImagem = null;
    }
}
