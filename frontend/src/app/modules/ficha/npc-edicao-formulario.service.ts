import { DestroyRef, Injectable, computed, effect, inject, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormArray, FormBuilder, FormControl, Validators } from "@angular/forms";
import { HabilidadeTipoNpcEnum, CategoriaNpcEnum, PatenteEnum } from "@contratados-rpg/shared/enums";
import type {
    FichaAtributosDto, FichaNpcHabilidadeDto, FichaNpcRecuperadaDto, FichaSequelaDto, FichaTraumaDto,
} from "@contratados-rpg/shared/dtos/ficha";
import type { CarrinhoItemDto } from "@contratados-rpg/shared/regras/compras";
import { FichaEdicaoNpcService } from "./ficha-edicao-npc.service";
import { mesclarDocumento } from "./mesclar-ficha";
import { criarMapaAjustesNpc } from "./npc-ajustes-formulario";
import { CHAVES_ATRIBUTOS_NPC } from "@contratados-rpg/shared/regras/npc";

/** Blocos de vários campos — lápis some, Salvar/Cancelar aparecem no próprio bloco (m4-16). */
export type GrupoEdicaoNpc = "atributos" | "conduta" | "habilidades" | "sequelas" | "traumas"
    | "anotacoes" | "equipamento";
const TEXTO_OBRIGATORIO = [Validators.required, Validators.pattern(/\S/)];

/** Rótulo humano de cada bloco/valor avulso, usado no aviso "Conclua ou cancele a edição de X". */
const ROTULOS_EDICAO: Record<string, string> = {
    atributos: "Atributos", conduta: "Conduta", habilidades: "Habilidades",
    sequelas: "Sequelas", traumas: "Traumas", anotacoes: "Anotações", equipamento: "Equipamento",
    nome: "nome", funcao: "função narrativa", categoria: "categoria", nivel: "nível",
    cooperacao: "Cooperação", defesaBase: "Defesa", bloquear: "Bloquear", esquivar: "Esquivar",
    vidaMaxima: "Vida máxima", energiaMaxima: "Energia máxima",
    recargaPorTurno: "Recarga por turno",
};

export function criarHabilidadeFormulario(habilidade?: FichaNpcHabilidadeDto) {
    const tipo = new FormControl(habilidade?.tipo ?? HabilidadeTipoNpcEnum.PASSIVA,
        { nonNullable: true });
    const custoEnergia = new FormControl(habilidade?.custoEnergia ?? 0,
        { nonNullable: true, validators: [Validators.min(0), Validators.pattern(/^\d+$/)] });
    return new FormBuilder().nonNullable.group({
        nomeNeutro: [habilidade?.nomeNeutro ?? "", TEXTO_OBRIGATORIO],
        nomeNarrativo: habilidade?.nomeNarrativo ?? "", tipo, custoEnergia,
        descricao: [habilidade?.descricao ?? "", TEXTO_OBRIGATORIO],
        restricao: habilidade?.restricao ?? "",
    });
}

export function criarSequelaFormulario(registro?: FichaSequelaDto) {
    return new FormBuilder().nonNullable.group({
        nome: [registro?.nome ?? "", TEXTO_OBRIGATORIO], descricao: registro?.descricao ?? "",
    });
}

export function criarTraumaFormulario(registro?: FichaTraumaDto) {
    return new FormBuilder().nonNullable.group({
        nome: [registro?.nome ?? "", TEXTO_OBRIGATORIO], descricao: registro?.descricao ?? "",
        tratado: registro?.tratado ?? false,
    });
}

/**
 * Adapta Reactive Forms ao rascunho; não usa o distribuidor/calculador da criação.
 *
 * Dois mecanismos de edição (m4-16, decisão do autor — mesmo desenho de Criatura/Jogador):
 * - **Bloco** (`grupo`): Atributos/Conduta/Habilidades/Sequelas/Traumas/Anotações — lápis some,
 *   Salvar/Cancelar aparecem no próprio bloco, via este `FormGroup` reativo.
 * - **Valor avulso** (`campoAvulso`): nome, função, categoria, nível, cooperação, Defesa/
 *   Bloquear/Esquivar, máximos de Vida/Energia, recarga — fora do `FormGroup`, cada confirmação
 *   (Enter) persiste só aquele campo via {@link FichaEdicaoNpcService.salvarCampo}.
 *
 * Só um bloco OU um valor avulso edita por vez (`ocupado`) — decisão 1 do autor, sem rascunho
 * acumulado entre grupos.
 */
@Injectable()
export class NpcEdicaoFormulario {
    readonly edicao = inject(FichaEdicaoNpcService);
    private readonly formularios = inject(FormBuilder).nonNullable;
    private baseFormulario: FichaNpcRecuperadaDto | null = null;
    readonly grupo = signal<GrupoEdicaoNpc | null>(null);
    readonly campoAvulso = signal<string | null>(null);
    readonly erroFormulario = signal("");
    readonly habilidades = new FormArray<ReturnType<typeof criarHabilidadeFormulario>>([]);
    readonly sequelas = new FormArray<ReturnType<typeof criarSequelaFormulario>>([]);
    readonly traumas = new FormArray<ReturnType<typeof criarTraumaFormulario>>([]);
    readonly formulario = this.formularios.group({
        categoria: CategoriaNpcEnum.CIVIL,
        competencias: new FormControl<readonly (keyof FichaAtributosDto)[]>([], { nonNullable: true }),
        modificadoresTeste: criarMapaAjustesNpc(), dadosTeste: criarMapaAjustesNpc(),
        atributos: this.formularios.group({
            destreza: 1, forca: 1, luta: 0, pontaria: 0, vigor: 1,
            intelecto: 1, medicina: 1, sentidos: 1, social: 1, vontade: 1,
        }),
        gatilhosFuga: ["", TEXTO_OBRIGATORIO], prioridadesAlvo: ["", TEXTO_OBRIGATORIO],
        reacaoFerimentoSevero: ["", TEXTO_OBRIGATORIO], anotacoes: "",
        habilidades: this.habilidades, sequelas: this.sequelas, traumas: this.traumas,
        patenteEquivalente: new FormControl<PatenteEnum | null>(null),
        inventario: new FormControl<readonly CarrinhoItemDto[]>([], { nonNullable: true }),
    });
    /** Algum bloco ou valor avulso em edição — os demais gatilhos ficam bloqueados. */
    readonly ocupado = computed(() => this.grupo() !== null || this.campoAvulso() !== null);
    /** Elemento focado ao abrir a edição — restaurado ao salvar/cancelar (m4-16, item 3). */
    private elementoFoco: HTMLElement | null = null;
    /** `aria-label` do elemento capturado — o lápis/valor some do DOM durante a edição (`@if`) e
     * volta como um nó **novo**; sem isto, `elementoFoco` fica órfão e o foco nunca retorna. */
    private seletorFoco: string | null = null;

    constructor() {
        this.formulario.valueChanges.pipe(takeUntilDestroyed(inject(DestroyRef)))
            .subscribe(() => {
                const base = this.baseFormulario;
                if (!base || !this.grupo()) return;
                this.erroFormulario.set("");
                const local = this.aplicarFormulario(base);
                // O 3º lado é a ficha confirmada, não o rascunho: contra o rascunho, voltar um
                // campo ao valor salvo (99 → 1) parecia "sem edição" e mantinha o 99 (m4-16).
                this.edicao.alterarRascunho((atual) =>
                    mesclarDocumento(base, local, this.edicao.ficha() ?? atual));
            });
        effect(() => {
            const rascunho = this.edicao.rascunho();
            if (!rascunho) { this.grupo.set(null); this.campoAvulso.set(null); }
            else if (this.grupo()) this.preencher(rascunho);
        });
    }

    /** Rótulo humano do que está em edição agora (bloco ou valor avulso), ou `null`. */
    rotuloEdicaoAtiva(): string | null {
        const chave = this.grupo() ?? this.campoAvulso();
        return chave ? (ROTULOS_EDICAO[chave] ?? chave) : null;
    }

    /** `chave` é o bloco/valor em edição agora (gatilhos do mesmo bloco continuam ativos). */
    emEdicaoDe(chave: string): boolean {
        return this.grupo() === chave || this.campoAvulso() === chave;
    }

    /** Um *outro* bloco/valor está em edição — gatilho de `chave` deve ficar desabilitado. */
    bloqueadoPorOutro(chave: string): boolean {
        return this.ocupado() && !this.emEdicaoDe(chave);
    }

    /** Texto de `appTooltip` para um gatilho bloqueado por outra edição em curso, ou `null`. */
    tooltipBloqueio(chave: string): string | null {
        if (!this.bloqueadoPorOutro(chave)) return null;
        return `Conclua ou cancele a edição de ${this.rotuloEdicaoAtiva()}`;
    }

    iniciar(grupo: GrupoEdicaoNpc): void {
        if (this.edicao.salvando()) return;
        if (this.grupo() !== null) { if (this.grupo() !== grupo) return; }
        else {
            if (this.campoAvulso() !== null) return;
            this.capturarFoco();
        }
        this.edicao.iniciarEdicao();
        this.baseFormulario = this.edicao.rascunho();
        if (!this.baseFormulario) return;
        this.preencher(this.baseFormulario);
        this.erroFormulario.set("");
        this.grupo.set(grupo);
        if (grupo === "atributos") this.edicao.alterarRascunho((ficha) => ({ ...ficha,
            dados: { ...ficha.dados, competencias: ficha.dados.competencias ?? [] } }));
    }

    cancelar(): void {
        this.edicao.cancelarEdicao();
        if (!this.edicao.salvando()) {
            this.grupo.set(null); this.baseFormulario = null; this.erroFormulario.set("");
            this.restaurarFoco();
        }
    }

    async salvar(): Promise<boolean> {
        if (this.formulario.invalid) {
            this.formulario.markAllAsTouched();
            this.erroFormulario.set("Preencha os campos obrigatórios e corrija os valores.");
            return false;
        }
        const salvo = await this.edicao.salvar();
        if (salvo) { this.grupo.set(null); this.baseFormulario = null; this.restaurarFoco(); }
        return salvo;
    }

    /** Abre um valor avulso (`campoAvulso`) — bloqueado se outro bloco/valor já edita. */
    editarAvulso(campo: string): void {
        if (this.edicao.salvando() || this.ocupado()) return;
        this.capturarFoco();
        this.campoAvulso.set(campo);
    }

    /**
     * Cancela o valor avulso em edição, sem persistir — restaura o texto original (template).
     * Descarta também o rascunho deixado por uma confirmação anterior que falhou (decisão 4: a
     * falha mantém o valor editável com o erro inline até o autor corrigir ou cancelar de vez).
     */
    cancelarAvulso(): void {
        if (this.edicao.salvando()) return;
        if (this.edicao.edicaoPendente()) this.edicao.cancelarEdicao();
        this.campoAvulso.set(null);
        this.restaurarFoco();
    }

    /**
     * Confirma (Enter/blur) um valor avulso — persiste só aquele campo via PUT da ficha inteira
     * (`FichaEdicaoNpcService.salvarCampo`). Falha mantém o campo em edição com o erro inline
     * (`edicao.erro()`) e o valor digitado preservado (decisão 4 do autor).
     */
    async confirmarAvulso(
        campo: string, mutar: (ficha: FichaNpcRecuperadaDto) => FichaNpcRecuperadaDto,
    ): Promise<void> {
        // Enter salva e tira o input do DOM; o blur que vem atrás não pode disparar um 2º PUT.
        if (this.campoAvulso() !== campo || this.edicao.salvando()) return;
        const salvo = await this.edicao.salvarCampo(mutar);
        if (salvo) { this.campoAvulso.set(null); this.restaurarFoco(); }
    }

    private capturarFoco(): void {
        const ativo = (document.activeElement as HTMLElement) ?? null;
        this.elementoFoco = ativo;
        const rotulo = ativo?.getAttribute("aria-label") ?? null;
        this.seletorFoco = rotulo ? `[aria-label="${rotulo.replace(/"/g, '\\"')}"]` : null;
    }

    /** Adia pro próximo macrotask — o gatilho (lápis/valor) só volta ao DOM após o template
     * re-renderizar fora do modo de edição (mesmo racional do `app-valor-editavel`). O nó
     * capturado em {@link capturarFoco} costuma já estar desconectado (o `@if` recriou o
     * lápis/valor como um elemento novo) — por isso o reencontra pelo `aria-label`. */
    private restaurarFoco(): void {
        const elemento = this.elementoFoco;
        const seletor = this.seletorFoco;
        this.elementoFoco = null; this.seletorFoco = null;
        setTimeout(() => {
            if (elemento?.isConnected) { elemento.focus(); return; }
            if (seletor) document.querySelector<HTMLElement>(seletor)?.focus();
        });
    }

    private preencher(ficha: FichaNpcRecuperadaDto): void {
        const dados = ficha.dados;
        this.formulario.patchValue({ atributos: dados.atributos, ...dados.condutaCombate,
            categoria: dados.categoria,
            competencias: dados.competencias ?? [],
            modificadoresTeste: Object.fromEntries(CHAVES_ATRIBUTOS_NPC.map((chave) => [chave, dados.modificadoresTeste?.[chave] ?? 0])),
            dadosTeste: Object.fromEntries(CHAVES_ATRIBUTOS_NPC.map((chave) => [chave, dados.dadosTeste?.[chave] ?? 0])),
            anotacoes: dados.anotacoes ?? "",
            patenteEquivalente: dados.patenteEquivalente ?? null,
            inventario: dados.inventario ?? [] }, { emitEvent: false });
        this.preencherLista(this.habilidades, dados.habilidades, criarHabilidadeFormulario);
        this.preencherLista(this.sequelas, dados.sanidade.sequelas, criarSequelaFormulario);
        this.preencherLista(this.traumas, dados.sanidade.traumas, criarTraumaFormulario);
    }

    private preencherLista<T, C extends ReturnType<typeof criarSequelaFormulario>
        | ReturnType<typeof criarTraumaFormulario> | ReturnType<typeof criarHabilidadeFormulario>>(
        lista: FormArray<C>, valores: readonly T[], criar: (valor: T) => C,
    ): void {
        if (lista.length !== valores.length) {
            lista.clear({ emitEvent: false });
            valores.forEach((valor) => lista.push(criar(valor), { emitEvent: false }));
        } else {
            valores.forEach((valor, indice) => lista.at(indice).patchValue(
                criar(valor).getRawValue() as never,
                { emitEvent: false }));
        }
    }

    private aplicarFormulario(base: FichaNpcRecuperadaDto): FichaNpcRecuperadaDto {
        const valor = this.formulario.getRawValue();
        const dados = base.dados;
        switch (this.grupo()) {
            case "atributos": return { ...base, dados: { ...dados, atributos: valor.atributos, categoria: valor.categoria,
                competencias: valor.competencias, modificadoresTeste: valor.modificadoresTeste,
                dadosTeste: valor.dadosTeste } };
            case "habilidades": return { ...base, dados: { ...dados,
                habilidades: valor.habilidades.map((habilidade) => ({
                    nomeNeutro: habilidade.nomeNeutro, tipo: habilidade.tipo,
                    descricao: habilidade.descricao,
                    ...(habilidade.nomeNarrativo.trim()
                        ? { nomeNarrativo: habilidade.nomeNarrativo } : {}),
                    ...(habilidade.restricao.trim() ? { restricao: habilidade.restricao } : {}),
                    ...(habilidade.tipo === HabilidadeTipoNpcEnum.ATIVA
                        ? { custoEnergia: habilidade.custoEnergia } : {}),
                })) } };
            case "conduta": return { ...base, dados: { ...dados, condutaCombate: {
                gatilhosFuga: valor.gatilhosFuga, prioridadesAlvo: valor.prioridadesAlvo,
                reacaoFerimentoSevero: valor.reacaoFerimentoSevero,
            } } };
            case "sequelas": return { ...base, dados: { ...dados,
                sanidade: { ...dados.sanidade, sequelas: valor.sequelas } } };
            case "traumas": return { ...base, dados: { ...dados,
                sanidade: { ...dados.sanidade, traumas: valor.traumas } } };
            case "anotacoes": return { ...base, dados: { ...dados, anotacoes: valor.anotacoes } };
            case "equipamento": return { ...base, dados: { ...dados, inventario: valor.inventario,
                patenteEquivalente: valor.patenteEquivalente ?? undefined } };
            default: return base;
        }
    }
}
