import { DestroyRef, Injectable, effect, inject, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormArray, FormBuilder, FormControl, Validators } from "@angular/forms";
import { CategoriaNpcEnum, HabilidadeTipoNpcEnum } from "@contratados-rpg/shared/enums";
import type {
    FichaNpcHabilidadeDto, FichaNpcRecuperadaDto, FichaSequelaDto, FichaTraumaDto,
} from "@contratados-rpg/shared/dtos/ficha";
import { FichaEdicaoNpcService } from "./ficha-edicao-npc.service";
import { mesclarDocumento } from "./mesclar-ficha";

export type GrupoEdicaoNpc = "identidade" | "atributos" | "recursos" | "habilidades"
    | "conduta" | "sanidade" | "anotacoes";
const TEXTO_OBRIGATORIO = [Validators.required, Validators.pattern(/\S/)];

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

/** Adapta Reactive Forms ao rascunho; não usa o distribuidor/calculador da criação. */
@Injectable()
export class NpcEdicaoFormulario {
    readonly edicao = inject(FichaEdicaoNpcService);
    private readonly formularios = inject(FormBuilder).nonNullable;
    private baseFormulario: FichaNpcRecuperadaDto | null = null;
    readonly grupo = signal<GrupoEdicaoNpc | null>(null);
    readonly erroFormulario = signal("");
    readonly habilidades = new FormArray<ReturnType<typeof criarHabilidadeFormulario>>([]);
    readonly sequelas = new FormArray<ReturnType<typeof criarSequelaFormulario>>([]);
    readonly traumas = new FormArray<ReturnType<typeof criarTraumaFormulario>>([]);
    readonly formulario = this.formularios.group({
        nome: ["", TEXTO_OBRIGATORIO], funcao: ["", TEXTO_OBRIGATORIO],
        categoria: this.formularios.control<CategoriaNpcEnum>(CategoriaNpcEnum.CIVIL),
        nivel: [0, [Validators.min(0), Validators.max(20)]],
        cooperacao: [5, [Validators.min(0), Validators.max(10)]],
        cor: "", atributos: this.formularios.group({
            destreza: 1, forca: 1, luta: 0, pontaria: 0, vigor: 1,
            intelecto: 1, medicina: 1, sentidos: 1, social: 1, vontade: 1,
        }),
        vidaMaxima: [0, Validators.min(0)], defesaBase: [0, Validators.min(0)],
        bloquear: [0, Validators.min(0)], esquivar: [0, Validators.min(0)],
        energiaMaxima: [0, Validators.min(0)],
        recargaPorTurno: new FormControl<number | null>(null, Validators.min(0)),
        gatilhosFuga: ["", TEXTO_OBRIGATORIO], prioridadesAlvo: ["", TEXTO_OBRIGATORIO],
        reacaoFerimentoSevero: ["", TEXTO_OBRIGATORIO], anotacoes: "",
        habilidades: this.habilidades, sequelas: this.sequelas, traumas: this.traumas,
    });

    constructor() {
        this.formulario.valueChanges.pipe(takeUntilDestroyed(inject(DestroyRef)))
            .subscribe(() => {
                const base = this.baseFormulario;
                if (!base || !this.grupo()) return;
                this.erroFormulario.set("");
                const local = this.aplicarFormulario(base);
                this.edicao.alterarRascunho((atual) => mesclarDocumento(base, local, atual));
            });
        effect(() => {
            const rascunho = this.edicao.rascunho();
            if (!rascunho) this.grupo.set(null);
            else if (this.grupo()) this.preencher(rascunho);
        });
    }

    iniciar(grupo: GrupoEdicaoNpc): void {
        if (this.edicao.salvando()) return;
        this.edicao.iniciarEdicao();
        this.baseFormulario = this.edicao.rascunho();
        if (!this.baseFormulario) return;
        this.preencher(this.baseFormulario);
        this.erroFormulario.set("");
        this.grupo.set(grupo);
    }

    cancelar(): void {
        this.edicao.cancelarEdicao();
        if (!this.edicao.salvando()) {
            this.grupo.set(null); this.baseFormulario = null; this.erroFormulario.set("");
        }
    }

    async salvar(): Promise<boolean> {
        if (this.formulario.invalid) {
            this.formulario.markAllAsTouched();
            this.erroFormulario.set("Preencha os campos obrigatórios e corrija os valores.");
            return false;
        }
        const salvo = await this.edicao.salvar();
        if (salvo) { this.grupo.set(null); this.baseFormulario = null; }
        return salvo;
    }

    private preencher(ficha: FichaNpcRecuperadaDto): void {
        const dados = ficha.dados;
        this.formulario.patchValue({ nome: ficha.nome, cor: ficha.cor ?? "",
            funcao: dados.identidadeNarrativa.funcao, categoria: dados.categoria,
            nivel: dados.nivel, cooperacao: dados.cooperacao, atributos: dados.atributos,
            vidaMaxima: dados.vidaMaxima, defesaBase: dados.defesaBase, bloquear: dados.bloquear,
            esquivar: dados.esquivar, energiaMaxima: dados.energia.maxima,
            recargaPorTurno: dados.energia.recargaPorTurno, ...dados.condutaCombate,
            anotacoes: dados.anotacoes ?? "" }, { emitEvent: false });
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
            case "identidade": return { ...base, nome: valor.nome, cor: valor.cor || null,
                dados: { ...dados, identidadeNarrativa: { nome: valor.nome,
                    funcao: valor.funcao }, categoria: valor.categoria,
                    nivel: valor.nivel, cooperacao: valor.cooperacao } };
            case "atributos": return { ...base, dados: { ...dados, atributos: valor.atributos } };
            case "recursos": return { ...base, dados: { ...dados, vidaMaxima: valor.vidaMaxima,
                defesaBase: valor.defesaBase, bloquear: valor.bloquear, esquivar: valor.esquivar,
                energia: { ...dados.energia, maxima: valor.energiaMaxima,
                    recargaPorTurno: valor.recargaPorTurno } } };
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
            case "sanidade": return { ...base, dados: { ...dados, sanidade: {
                sequelas: valor.sequelas, traumas: valor.traumas,
            } } };
            case "anotacoes": return { ...base, dados: { ...dados, anotacoes: valor.anotacoes } };
            default: return base;
        }
    }
}
