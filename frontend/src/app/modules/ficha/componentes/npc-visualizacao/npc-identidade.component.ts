import { Component, computed, effect, inject, input, output, signal, viewChild } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { TemaService } from "../../../../core/services/tema.service";
import { CategoriaNpcEnum } from "@contratados-rpg/shared/enums";
import { IMAGEM_MIMES_ACCEPT } from "@contratados-rpg/shared/validators";
import type { FichaImagemFocoDto } from "@contratados-rpg/shared/dtos/ficha";
import { calcularEnergia, obterReferenciaCategoria,
    obterReferenciaCooperacao, calcularDefesasNpc } from "@contratados-rpg/shared/regras/npc";
import { calcularBonusDefesaEquipamento } from "@contratados-rpg/shared/regras/agente";
import { Icone } from "../../../../shared/icone/icone.component";
import { AutoFocus } from "../../../../shared/auto-focus/auto-focus.directive";
import { FocoImagem } from "../../../../shared/foco-imagem.directive";
import { Tooltip } from "../../../../shared/tooltip/tooltip.directive";
import { Botao } from "../../../../shared/ui/botao/botao.component";
import { BotaoIcone } from "../../../../shared/ui/botao-icone/botao-icone.component";
import { Cartao } from "../../../../shared/ui/cartao/cartao.component";
import { Chip } from "../../../../shared/ui/chip/chip.component";
import { Stat, StatValor } from "../../../../shared/ui/stat/stat.component";
import { ValorEditavel } from "../../../../shared/ui/valor-editavel/valor-editavel.component";
import { BarraRecurso } from "../../../../shared/ui/barra-recurso/barra-recurso.component";
import { BarraEscala } from "../../../../shared/ui/barra-escala/barra-escala.component";
import { NpcEdicaoFormulario } from "../../npc-edicao-formulario.service";
import { AjusteEnquadramentoImagem } from "../ajuste-enquadramento-imagem/ajuste-enquadramento-imagem.component";

function referenciaCooperacao(cooperacao: number) {
    try { return obterReferenciaCooperacao({ cooperacao }); }
    catch { return null; }
}

/** Limites das faixas de Cooperação (`obterReferenciaCooperacao`) — onde a barra desenha ticks. */
const LIMITES_COOPERACAO = [1, 2, 4, 7, 10] as const;

/**
 * Cartão Identidade da ficha de NPC (`m4-17`, extraído de `NpcVisualizacao`): perfil com retrato
 * 175×175 e a Cooperação como `app-barra-escala` sob a foto; Categoria/Nível e Defesa/Bloquear/
 * Esquivar em `app-stat` `fino`; Vida/Energia em `app-barra-recurso` compacta. A edição é a da
 * `m4-16` (valor avulso, um por vez via `NpcEdicaoFormulario`) — este componente só a consome.
 */
@Component({
    selector: "app-npc-identidade",
    imports: [ReactiveFormsModule, Icone, AutoFocus, FocoImagem, Tooltip, Botao, BotaoIcone, Cartao,
        Chip, Stat, StatValor, ValorEditavel, BarraRecurso, BarraEscala, AjusteEnquadramentoImagem],
    templateUrl: "./npc-identidade.component.html", styleUrl: "./npc-identidade.component.scss",
})
export class NpcIdentidade {
    private readonly tema = inject(TemaService);
    readonly formulario = inject(NpcEdicaoFormulario);
    readonly edicao = this.formulario.edicao;
    readonly gerenciavel = input(false);
    readonly imagemOcupada = input(false);
    readonly imagemAlterada = output<{ arquivo: File | null; foco: FichaImagemFocoDto }>();
    readonly imagemRemovida = output<void>();
    readonly origemImagem = signal<File | string | null>(null);
    private arquivoImagem: File | null = null;
    readonly tiposImagemAceitos = IMAGEM_MIMES_ACCEPT;
    readonly limitesCooperacao = LIMITES_COOPERACAO;
    readonly corSelecionada = new FormControl(this.tema.accentEfetivo(), { nonNullable: true });
    readonly ficha = computed(() => this.edicao.rascunho() ?? this.edicao.ficha());
    readonly dados = computed(() => this.ficha()!.dados);
    readonly categorias = Object.values(CategoriaNpcEnum).map((categoria) =>
        obterReferenciaCategoria({ categoria }));
    readonly referencia = computed(() => obterReferenciaCategoria({
        categoria: this.dados().categoria,
    }));
    /** Faixa e frases da barra, em função do valor exibido (acompanham o arrasto do slider);
     * fora do contrato 0–10 `obterReferenciaCooperacao` lança e a barra cai no fallback. */
    readonly rotuloCooperacao = (cooperacao: number) =>
        referenciaCooperacao(cooperacao)?.rotulo ?? "Valor inválido";
    readonly descricaoCooperacao = (cooperacao: number) => {
        const faixa = referenciaCooperacao(cooperacao);
        return faixa ? `${faixa.social} ${faixa.combate}` : "";
    };
    /** Erro do último salvamento da Cooperação pela barra (a barra não tem campo que fique aberto). */
    readonly erroCooperacao = signal<string | null>(null);
    private readonly barraCooperacao = viewChild(BarraEscala);
    readonly civil = computed(() => this.dados().categoria === CategoriaNpcEnum.CIVIL);
    /** Bônus de equipamento (itens equipados do `inventario`) somado **por cima** do snapshot
     * manual de Defesa/Bloquear/Esquivar (`m4-20`) — nunca escrito de volta na ficha, mesmo
     * padrão "manual + equipamento" de `calcularBonusDefesaEquipamento` no agente. */
    readonly bonusEquipamento = computed(() =>
        calcularBonusDefesaEquipamento(this.dados().inventario ?? []));
    readonly defesas = computed(() => calcularDefesasNpc(this.dados()));
    readonly notaDefesa = computed(() => this.textoNotaBonus(this.bonusEquipamento().defesa));
    readonly notaBloquear = computed(() => this.textoNotaBonus(this.bonusEquipamento().bloqueio));
    readonly notaEsquivar = computed(() => this.textoNotaBonus(this.bonusEquipamento().esquiva));

    private textoNotaBonus(bonus: number): string {
        return bonus !== 0 ? `${bonus > 0 ? "+" : ""}${bonus} equip.` : "";
    }
    readonly pool = computed(() => typeof calcularEnergia({ categoria: this.dados().categoria,
        destreza: this.dados().atributos.destreza }) !== "number");
    /** Violação específica do valor avulso em edição (nível/cooperação têm regra própria em
     * `validarFichaNpc`) — mais precisa que o `edicao.erro()` genérico, mas cai nele se a falha
     * foi de rede, não de validação (decisão 2, m4-16). */
    readonly violacoesNivel = computed(() => this.edicao.violacoes()
        .filter((violacao) => violacao.startsWith("nível:")));

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

    /**
     * Cooperação editada na própria barra (`m4-17`): o slider só emite ao soltar/Enter, então abrir
     * e confirmar o valor avulso acontecem juntos — persiste **só** `dados.cooperacao` (a faixa 0–10
     * é a de `validarFichaNpc`). Sem campo que fique aberto para corrigir, uma falha libera a trava
     * de "um por vez" na hora e deixa o erro sob a barra, que volta ao valor salvo.
     */
    async confirmarCooperacao(valor: number): Promise<void> {
        if (!this.gerenciavel() || !Number.isFinite(valor)) return;
        this.erroCooperacao.set(null);
        this.formulario.editarAvulso("cooperacao");
        if (!this.formulario.emEdicaoDe("cooperacao")) { this.barraCooperacao()?.descartar(); return; }
        const cooperacao = Math.trunc(valor);
        await this.formulario.confirmarAvulso("cooperacao",
            (ficha) => ({ ...ficha, dados: { ...ficha.dados, cooperacao } }));
        if (!this.formulario.emEdicaoDe("cooperacao")) return;
        const violacao = this.edicao.violacoes().find((item) => item.startsWith("cooperação:"));
        this.erroCooperacao.set(violacao ?? this.edicao.erro() ?? "Não foi possível salvar.");
        this.formulario.cancelarAvulso();
        this.barraCooperacao()?.descartar();
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
