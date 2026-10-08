import { Component, ElementRef, computed, effect, inject, input, signal, viewChild } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { CategoriaNpcEnum, ItemCategoriaEnum } from "@contratados-rpg/shared/enums";
import {
    CATALOGO_CATEGORIAS, CATALOGO_ITENS, calcularStatItem, listarModificacoesDisponiveis,
    verificarConflitoModificacao, resolverDadosItem, ehEscudo,
    type CarrinhoItemDto, type ItemCatalogo, type ModificacaoDados,
    type StatItemDto,
} from "@contratados-rpg/shared/regras/compras";
import {
    CATEGORIAS_VETADAS_NPC_CIVIL, contarEmpilhamentosModificacoes, obterLimiteModificacoesNpc,
} from "@contratados-rpg/shared/regras/npc";
import { Icone, type IconeNome } from "../../../../shared/icone/icone.component";
import { OverflowFade } from "../../../../shared/overflow-fade/overflow-fade.directive";
import { Tooltip } from "../../../../shared/tooltip/tooltip.directive";
import { Botao } from "../../../../shared/ui/botao/botao.component";
import { BotaoIcone } from "../../../../shared/ui/botao-icone/botao-icone.component";
import { Chip } from "../../../../shared/ui/chip/chip.component";
import { EstadoVazio } from "../../../../shared/ui/estado-vazio/estado-vazio.component";
import { Campo } from "../../../../shared/ui/campo/campo.component";
import { StepInput } from "../../../../shared/ui/stepper/step-input.component";
import { Stat } from "../../../../shared/ui/stat/stat.component";
import { montarResistencias } from "@contratados-rpg/shared/regras/agente";
import { NpcEdicaoFormulario } from "../../npc-edicao-formulario.service";
import { NpcRolagemService } from "../../npc-rolagem.service";
import { NpcBlocoAcoes } from "./npc-bloco-acoes.component";
import { ROTULOS_PATENTE } from "../../../simulacao/rotulos";
import type { FichaNpcRecuperadaDto } from "@contratados-rpg/shared/dtos/ficha";
import { validarFormula } from "@contratados-rpg/shared/regras/rolagem";

/** Ícone de categoria — mesma tradução local de `guia-equipamento-loja`/`ficha-inventario`. */
const ICONES_CATEGORIA: Readonly<Record<ItemCategoriaEnum, IconeNome>> = {
    [ItemCategoriaEnum.CORPO_A_CORPO]: "corpo-a-corpo",
    [ItemCategoriaEnum.EXPLOSIVOS]: "explosivos",
    [ItemCategoriaEnum.ARMAS_DE_FOGO]: "armas-de-fogo",
    [ItemCategoriaEnum.MUNICOES]: "municoes",
    [ItemCategoriaEnum.PROTECOES]: "protecoes",
    [ItemCategoriaEnum.EXOTICOS]: "exoticos",
    [ItemCategoriaEnum.ARMAZENAMENTO]: "armazenamento",
    [ItemCategoriaEnum.OPERACIONAL]: "operacional",
    [ItemCategoriaEnum.MEDICINAL]: "medicinal",
    [ItemCategoriaEnum.AMPLIFICADOR]: "amplificador",
    [ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR]: "fragmento-construtor",
    [ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR]: "fragmento-potencializador",
    [ItemCategoriaEnum.SEM_CATEGORIA]: "sem-categoria",
};

/** Cartão do catálogo (painel "Adicionar item"). */
interface CartaoCatalogoVM {
    readonly item: ItemCatalogo;
    readonly categoria: ItemCategoriaEnum;
    readonly custoTexto: string;
    readonly pesoTexto: string;
    readonly stat: string | null;
}

/** Item já no inventário do NPC, com stat resolvido e modificações disponíveis. */
interface ItemEquipamentoVM {
    readonly indice: number;
    readonly nome: string;
    readonly categoria: ItemCategoriaEnum;
    readonly categoriaRotulo: string;
    readonly pesoTexto: string;
    readonly quantidade: number;
    readonly stat: string | null;
    readonly modsUsados: number;
    readonly ehProtecao: boolean;
    readonly equipado: boolean;
    readonly ehArma: boolean;
    readonly danoRolavel: boolean;
    readonly descricao: string;
    readonly modsAtivas: readonly { readonly nome: string; readonly empilhamentos: number;
        readonly minimo: number; readonly maximo: number }[];
    readonly modsDisponiveis: readonly ModificacaoDados[];
}

/**
 * Equipamento do NPC (`m4-20`; layout do inventário do Jogador desde a `m4-21`): inventário
 * (`CarrinhoItemDto[]`, reusa o contrato do agente sem o envelope `FichaInventarioDto` — NPC não
 * tem amplificadores). A Patente Equivalente é escolhida na Identidade; aqui só limita as
 * modificações. Mesmo padrão de bloco de `NpcHabilidadesLista` (lápis no cabeçalho,
 * `NpcBlocoAcoes`, rascunho via `NpcEdicaoFormulario`); "+ Adicionar itens" abre o bloco sozinho.
 * Equipar/guardar Proteção fora do bloco salva na hora, como o toggle do Jogador.
 *
 * **Nenhuma regra de jogo vive aqui**: dano/resistência/bônus vêm de `calcularStatItem`
 * (`shared/regras/compras`), a mesma função do agente — o limite de modificação por patente e o
 * veto de Proteções/Explosivos ao Civil são validados no motor (`shared/regras/npc/equipamento`)
 * e aparecem como violação (`formulario.edicao.violacoes()`), não recalculados aqui.
 */
@Component({
    selector: "app-npc-equipamento",
    imports: [ReactiveFormsModule, Icone, OverflowFade, Tooltip, Botao, BotaoIcone, Chip,
        EstadoVazio, NpcBlocoAcoes, Campo, StepInput, Stat],
    templateUrl: "./npc-equipamento.component.html",
    styleUrls: ["./npc-visualizacao.scss", "./npc-equipamento.component.scss"],
})
export class NpcEquipamento {
    readonly formulario = inject(NpcEdicaoFormulario);
    readonly rolagens = inject(NpcRolagemService);
    readonly gerenciavel = input(false);
    readonly iconesCategoria = ICONES_CATEGORIA;
    readonly ficha = computed(() =>
        this.formulario.edicao.rascunho() ?? this.formulario.edicao.ficha());
    readonly dados = computed(() => this.ficha()!.dados);
    readonly modoEdicao = computed(() => this.formulario.grupo() === "equipamento");
    readonly violacoes = computed(() => this.formulario.edicao.violacoes()
        .filter((violacao) => violacao.startsWith("inventário:")
            || violacao.startsWith("patente equivalente:")));

    readonly ehCivil = computed(() => this.dados().categoria === CategoriaNpcEnum.CIVIL);
    readonly patenteAtual = computed(() => this.dados().patenteEquivalente ?? null);
    readonly limite = computed(() =>
        obterLimiteModificacoesNpc({ patenteEquivalente: this.patenteAtual() ?? undefined }));
    readonly textoLimite = computed(() => {
        if (this.ehCivil()) return "Civil: sem Proteções, Explosivos ou modificações.";
        const limite = this.limite();
        if (!limite) return "Sem Patente Equivalente — defina na Identidade para modificar itens.";
        return `${ROTULOS_PATENTE[limite.patente]}: até ${limite.maxModificacoes} modificações `
            + `por item, ${limite.maxEmpilhamentos} empilhamentos cada.`;
    });
    /** Item com o painel "Modificar" aberto e item com o ✕ pedindo confirmação (um de cada). */
    readonly modificandoIndice = signal<number | null>(null);
    readonly confirmandoRemocao = signal<number | null>(null);
    /** Falha de equipar/guardar fora do bloco — não há campo aberto para segurar o erro. */
    readonly erroEquipar = signal<string | null>(null);
    readonly resistencias = computed(() => montarResistencias({
        itens: this.dados().inventario ?? [], amplificadores: [],
    }));
    readonly podeRolar = computed(() => this.gerenciavel() && !this.formulario.ocupado()
        && !this.formulario.edicao.salvando());

    /** Categorias oferecidas no painel "Adicionar item" — vetadas (Civil) somem da lista. */
    protected readonly categoriasVetadas = computed(() =>
        this.ehCivil() ? CATEGORIAS_VETADAS_NPC_CIVIL : []);
    protected readonly categoriasCatalogo = computed(() => CATALOGO_CATEGORIAS.filter((categoria) =>
        (CATALOGO_ITENS[categoria.categoria]?.length ?? 0) > 0
        && !this.categoriasVetadas().includes(categoria.categoria)));

    protected readonly catalogoAberto = signal(false);
    protected readonly categoriaAtivaCatalogo =
        signal<ItemCategoriaEnum>(ItemCategoriaEnum.CORPO_A_CORPO);
    protected readonly buscaCatalogo = new FormControl("", { nonNullable: true });
    private readonly buscaCatalogoTexto = signal("");

    private readonly secaoLista = viewChild<ElementRef<HTMLElement>>("secaoLista");

    constructor() {
        this.buscaCatalogo.valueChanges.pipe(takeUntilDestroyed())
            .subscribe((valor) => this.buscaCatalogoTexto.set(valor));
        effect(() => {
            if (this.modoEdicao()) {
                const elemento = this.secaoLista()?.nativeElement;
                if (elemento) setTimeout(() => elemento.focus());
            } else {
                this.catalogoAberto.set(false);
                this.modificandoIndice.set(null);
                this.confirmandoRemocao.set(null);
            }
        });
    }

    protected readonly cartoesCatalogo = computed<readonly CartaoCatalogoVM[]>(() => {
        const termo = this.buscaCatalogoTexto().trim().toLowerCase();
        const bruto: { readonly item: ItemCatalogo; readonly categoria: ItemCategoriaEnum }[] = [];
        if (termo) {
            for (const categoria of this.categoriasCatalogo()) {
                for (const item of CATALOGO_ITENS[categoria.categoria] ?? []) {
                    if (item.nome.toLowerCase().includes(termo)) {
                        bruto.push({ item, categoria: categoria.categoria });
                    }
                }
            }
        } else {
            for (const item of CATALOGO_ITENS[this.categoriaAtivaCatalogo()] ?? []) {
                bruto.push({ item, categoria: this.categoriaAtivaCatalogo() });
            }
        }
        return bruto.filter(({ categoria }) => !this.categoriasVetadas().includes(categoria))
            .map(({ item, categoria }) => ({
            item, categoria,
            custoTexto: `$${item.custo.toLocaleString("pt-BR")}`,
            pesoTexto: this.textoSlots(item.peso),
            stat: this.formatarStatCatalogo(item),
        }));
    });

    protected readonly itensVM = computed<readonly ItemEquipamentoVM[]>(() =>
        (this.dados().inventario ?? []).map((item, indice) => {
            const stat = calcularStatItem({ item });
            const disponiveis = listarModificacoesDisponiveis(item).filter((modificacao) =>
                !item.modificacoes.some((ativa) => ativa.nome === modificacao.nome)
                && !verificarConflitoModificacao(
                    { item, modificacao: modificacao.nome },
                ).bloqueada);
            return {
                indice, nome: item.apelido ?? item.nome, categoria: item.categoria,
                categoriaRotulo: this.rotuloCategoria(item.categoria),
                pesoTexto: this.textoSlots(item.peso * item.quantidade),
                quantidade: item.quantidade,
                stat: this.formatarStat(stat),
                modsUsados: contarEmpilhamentosModificacoes(item),
                ehProtecao: item.categoria === ItemCategoriaEnum.PROTECOES,
                equipado: item.equipado === true,
                ehArma: !!stat?.dano || ehEscudo(item),
                danoRolavel: !!stat?.dano && validarFormula(stat.dano),
                descricao: resolverDadosItem(item)?.descricao ?? item.descricao ?? "",
                modsAtivas: item.modificacoes.map((modificacao) => {
                    const definicao = listarModificacoesDisponiveis(item)
                        .find((entrada) => entrada.nome === modificacao.nome);
                    return { ...modificacao, minimo: definicao?.empilhamentosIniciais ?? 1,
                        maximo: definicao?.empilhamentoMaximo ?? modificacao.empilhamentoMaximo
                            ?? Number.POSITIVE_INFINITY };
                }),
                modsDisponiveis: disponiveis,
            };
        }));

    rotuloCategoria(categoria: ItemCategoriaEnum): string {
        return CATALOGO_CATEGORIAS.find((entrada) => entrada.categoria === categoria)?.rotulo ?? "";
    }

    /** "Modificar" só com patente escolhida e algo a fazer (adicionar ou ajustar). */
    podeModificar(item: ItemEquipamentoVM): boolean {
        return !this.ehCivil() && this.limite() !== null
            && (item.modsDisponiveis.length > 0 || item.modsAtivas.length > 0);
    }

    alternarModificar(indice: number): void {
        this.modificandoIndice.update((atual) => atual === indice ? null : indice);
    }

    private textoSlots(valor: number): string {
        const numero = valor % 1 === 0 ? String(valor) : valor.toFixed(1);
        return `${numero} slot${valor !== 1 ? "s" : ""}`;
    }

    private formatarStatCatalogo(item: ItemCatalogo): string | null {
        if (item.dano) return `Dano ${item.dano}${item.informacao ? ` · ${item.informacao}` : ""}`;
        if (item.resistencia) return `Resist. ${item.resistencia}`;
        return null;
    }

    private formatarStat(stat: StatItemDto | null): string | null {
        if (!stat) return null;
        const partes: string[] = [];
        if (stat.dano) partes.push(`Dano ${stat.dano}`);
        if (stat.informacao) partes.push(stat.informacao);
        if (stat.resistencia) partes.push(`Resist. ${stat.resistencia}`);
        if (stat.bonusEsquiva) partes.push(`+${stat.bonusEsquiva} Esquiva`);
        if (stat.bonusBloqueio) partes.push(`+${stat.bonusBloqueio} Bloqueio`);
        if (stat.bonusDefesa) partes.push(`+${stat.bonusDefesa} Defesa`);
        return partes.length ? partes.join(" · ") : null;
    }

    private alterarInventario(inventario: readonly CarrinhoItemDto[]): void {
        if (!this.gerenciavel() || !this.modoEdicao() || this.formulario.edicao.salvando()) return;
        this.formulario.formulario.controls.inventario.setValue(inventario);
    }

    /** Lápis do cabeçalho — liga o modo de edição do bloco (padrão de `NpcHabilidadesLista`). */
    iniciar(): void {
        if (this.gerenciavel()) this.formulario.iniciar("equipamento");
    }

    async salvar(): Promise<void> {
        await this.formulario.salvar();
    }

    cancelar(): void {
        this.formulario.cancelar();
    }

    aoTecla(evento: KeyboardEvent): void {
        if (evento.key === "Escape") { evento.stopPropagation(); this.cancelar(); }
        else if (evento.key === "Enter" && (evento.ctrlKey || evento.metaKey)) {
            evento.preventDefault(); void this.salvar();
        }
    }

    /** "+ Adicionar itens" também abre o bloco — adicionar não exige o lápis antes. */
    alternarCatalogo(): void {
        if (!this.gerenciavel() || this.formulario.edicao.salvando()) return;
        if (!this.modoEdicao()) {
            this.iniciar();
            if (this.modoEdicao()) this.catalogoAberto.set(true);
            return;
        }
        this.catalogoAberto.update((atual) => !atual);
    }

    selecionarCategoriaCatalogo(categoria: ItemCategoriaEnum): void {
        this.categoriaAtivaCatalogo.set(categoria);
    }

    adicionarItem(cartao: CartaoCatalogoVM): void {
        const novo: CarrinhoItemDto = { nome: cartao.item.nome, categoria: cartao.categoria,
            custo: cartao.item.custo, peso: cartao.item.peso, quantidade: 1, guardada: false,
            modificacoes: [] };
        this.alterarInventario([...(this.dados().inventario ?? []), novo]);
    }

    removerItem(indice: number): void {
        this.confirmandoRemocao.set(null);
        this.modificandoIndice.set(null);
        this.alterarInventario((this.dados().inventario ?? []).filter((_, i) => i !== indice));
    }

    ajustarQuantidade(indice: number, quantidade: number): void {
        if (quantidade <= 0) { this.removerItem(indice); return; }
        this.alterarInventario((this.dados().inventario ?? [])
            .map((item, i) => i === indice ? { ...item, quantidade } : item));
    }

    /** Só Proteções equipadas somam Esquiva/Bloqueio/Defesa/resistência
     * (`shared/regras/agente`). No bloco entra no rascunho; fora dele salva só este campo. */
    async alternarEquipado(indice: number): Promise<void> {
        if (!this.gerenciavel() || this.formulario.edicao.salvando()) return;
        const alternar = (inventario: readonly CarrinhoItemDto[]) => inventario
            .map((item, i) => i === indice ? { ...item, equipado: !item.equipado } : item);
        if (this.modoEdicao()) {
            this.alterarInventario(alternar(this.dados().inventario ?? []));
            return;
        }
        this.erroEquipar.set(null);
        this.formulario.editarAvulso("equiparItem");
        if (!this.formulario.emEdicaoDe("equiparItem")) return;
        await this.formulario.confirmarAvulso("equiparItem", (ficha: FichaNpcRecuperadaDto) =>
            ({ ...ficha, dados: { ...ficha.dados,
                inventario: alternar(ficha.dados.inventario ?? []) } }));
        if (!this.formulario.emEdicaoDe("equiparItem")) return;
        this.erroEquipar.set(this.formulario.edicao.violacoes()[0]
            ?? this.formulario.edicao.erro() ?? "Não foi possível alterar o item.");
        this.formulario.cancelarAvulso();
    }

    adicionarModificacao(indice: number, modificacao: ModificacaoDados): void {
        const nova = { nome: modificacao.nome, empilhamentos: modificacao.empilhamentosIniciais };
        this.alterarInventario((this.dados().inventario ?? []).map((item, i) => i === indice
            ? { ...item, modificacoes: [...item.modificacoes, nova] }
            : item));
    }

    ajustarModificacao(indice: number, nome: string, empilhamentos: number): void {
        if (empilhamentos <= 0) { this.removerModificacao(indice, nome); return; }
        this.alterarInventario((this.dados().inventario ?? []).map((item, i) => i === indice
            ? { ...item, modificacoes: item.modificacoes.map((modificacao) =>
                modificacao.nome === nome ? { ...modificacao, empilhamentos } : modificacao) }
            : item));
    }

    removerModificacao(indice: number, nome: string): void {
        this.alterarInventario((this.dados().inventario ?? []).map((item, i) => i === indice
            ? { ...item, modificacoes:
                item.modificacoes.filter((modificacao) => modificacao.nome !== nome) }
            : item));
    }
}
