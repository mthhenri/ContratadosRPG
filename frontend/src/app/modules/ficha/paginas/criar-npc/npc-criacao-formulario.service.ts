import { Injectable, computed, inject, signal } from "@angular/core";
import { takeUntilDestroyed, toSignal } from "@angular/core/rxjs-interop";
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from "@angular/forms";
import { map, startWith } from "rxjs";
import type {
    FichaAtributosDto, FichaNpcDadosDto, FichaNpcHabilidadeDto,
} from "@contratados-rpg/shared/dtos/ficha";
import { CategoriaNpcEnum, HabilidadeTipoNpcEnum } from "@contratados-rpg/shared/enums";
import {
    calcularBloquear, calcularDefesaBase, calcularDtAtributo, calcularEnergia, calcularEsquivar,
    calcularVidaMaxima, consultarAtributosCriacao, obterPontosELimitePorCategoria,
    obterReferenciaCategoria, obterReferenciaCooperacao, obterVolumeHabilidadesPorCategoria,
    validarVolumeHabilidades,
} from "@contratados-rpg/shared/regras/npc";

function criarHabilidadeFormulario(tipo: HabilidadeTipoNpcEnum) {
    return new FormGroup({
        nomeNeutro: new FormControl("", { nonNullable: true, validators: Validators.required }),
        nomeNarrativo: new FormControl("", { nonNullable: true }),
        tipo: new FormControl(tipo, { nonNullable: true }),
        custoEnergia: new FormControl(0, { nonNullable: true, validators: Validators.min(0) }),
        descricao: new FormControl("", { nonNullable: true, validators: Validators.required }),
        restricao: new FormControl("", { nonNullable: true }),
    });
}

function criarRegistroSanidade() {
    return new FormGroup({
        nome: new FormControl("", { nonNullable: true, validators: Validators.required }),
        descricao: new FormControl("", { nonNullable: true }),
        tratado: new FormControl(false, { nonNullable: true }),
    });
}

/** Estado transitório do assistente; cálculos e coerência permanecem no motor compartilhado. */
@Injectable()
export class NpcCriacaoFormulario {
    private readonly construtor = inject(FormBuilder).nonNullable;
    readonly habilidades = new FormArray<ReturnType<typeof criarHabilidadeFormulario>>([]);
    readonly sequelas = new FormArray<ReturnType<typeof criarRegistroSanidade>>([]);
    readonly traumas = new FormArray<ReturnType<typeof criarRegistroSanidade>>([]);
    readonly lutaCivilLiberada = signal(false);
    readonly pontariaCivilLiberada = signal(false);
    readonly formulario = this.construtor.group({
        nome: ["", Validators.required], funcao: ["", Validators.required],
        categoria: [CategoriaNpcEnum.OPERATIVO],
        nivel: [3, [Validators.required, Validators.min(0), Validators.max(20)]],
        cooperacao: [5, [Validators.required, Validators.min(0), Validators.max(10)]],
        atributos: this.construtor.group({
            destreza: 1, forca: 1, luta: 1, pontaria: 1, vigor: 1,
            intelecto: 1, medicina: 1, sentidos: 1, social: 1, vontade: 1,
        }),
        habilidades: this.habilidades,
        gatilhosFuga: ["", Validators.required], prioridadesAlvo: ["", Validators.required],
        reacaoFerimentoSevero: ["", Validators.required],
        sequelas: this.sequelas, traumas: this.traumas, anotacoes: "",
    });
    readonly estado = toSignal(this.formulario.valueChanges.pipe(
        startWith(this.formulario.getRawValue()), map(() => this.formulario.getRawValue()),
    ), { requireSync: true });
    readonly referenciaCategoria = computed(() =>
        obterReferenciaCategoria({ categoria: this.estado().categoria }));
    readonly referenciaCooperacao = computed(() => {
        const cooperacao = this.estado().cooperacao;
        return this.formulario.controls.cooperacao.valid && Number.isInteger(cooperacao)
            ? obterReferenciaCooperacao({ cooperacao }) : null;
    });
    readonly pontos = computed(() =>
        obterPontosELimitePorCategoria({ categoria: this.estado().categoria }));
    readonly distribuicao = computed(() => consultarAtributosCriacao({
        categoria: this.estado().categoria, atributos: this.estado().atributos,
        lutaCivilLiberada: this.lutaCivilLiberada(),
        pontariaCivilLiberada: this.pontariaCivilLiberada(),
    }));
    readonly volume = computed(() =>
        obterVolumeHabilidadesPorCategoria({ categoria: this.estado().categoria }));
    readonly dados = computed<FichaNpcDadosDto>(() => {
        const estado = this.estado();
        const { categoria, nivel, atributos } = estado;
        const vidaMaxima = calcularVidaMaxima({ categoria, nivel, vigor: atributos.vigor });
        const defesaBase = calcularDefesaBase({ nivel });
        const energia = calcularEnergia({ categoria, destreza: atributos.destreza });
        const maxima = typeof energia === "number" ? energia : energia.pool;
        return {
            identidadeNarrativa: { nome: estado.nome.trim(), funcao: estado.funcao.trim() },
            categoria, nivel, cooperacao: estado.cooperacao, atributos,
            vidaMaxima, vidaAtual: vidaMaxima, defesaBase,
            bloquear: calcularBloquear({ defesaBase, vigor: atributos.vigor }),
            esquivar: calcularEsquivar({ defesaBase, destreza: atributos.destreza }),
            energia: { maxima, atual: maxima,
                recargaPorTurno: typeof energia === "number" ? null : energia.recarga },
            condicoes: { morrendo: false },
            habilidades: estado.habilidades.map((habilidade): FichaNpcHabilidadeDto => ({
                nomeNeutro: habilidade.nomeNeutro.trim(), tipo: habilidade.tipo,
                descricao: habilidade.descricao.trim(),
                ...(habilidade.nomeNarrativo.trim()
                    ? { nomeNarrativo: habilidade.nomeNarrativo.trim() } : {}),
                ...(habilidade.restricao.trim() ? { restricao: habilidade.restricao.trim() } : {}),
                ...(habilidade.tipo === HabilidadeTipoNpcEnum.ATIVA
                    ? { custoEnergia: habilidade.custoEnergia } : {}),
            })),
            condutaCombate: { gatilhosFuga: estado.gatilhosFuga.trim(),
                prioridadesAlvo: estado.prioridadesAlvo.trim(),
                reacaoFerimentoSevero: estado.reacaoFerimentoSevero.trim() },
            sanidade: {
                sequelas: estado.sequelas.map(({ nome, descricao }) => ({ nome: nome.trim(),
                    ...(descricao.trim() ? { descricao: descricao.trim() } : {}) })),
                traumas: estado.traumas.map(({ nome, descricao, tratado }) => ({
                    nome: nome.trim(), tratado,
                    ...(descricao.trim() ? { descricao: descricao.trim() } : {}),
                })),
            },
            ...(estado.anotacoes.trim() ? { anotacoes: estado.anotacoes.trim() } : {}),
        };
    });
    readonly pendencias = computed(() => [0, 1, 2, 3].flatMap((etapa) =>
        this.violacoesEtapa(etapa).map((mensagem) => ({ etapa, mensagem }))));
    readonly passivas = computed(() => this.dados().habilidades.filter(
        (habilidade) => habilidade.tipo === HabilidadeTipoNpcEnum.PASSIVA).length);
    readonly ativas = computed(() => this.dados().habilidades.filter(
        (habilidade) => habilidade.tipo === HabilidadeTipoNpcEnum.ATIVA).length);

    constructor() {
        this.formulario.controls.categoria.valueChanges.pipe(takeUntilDestroyed())
            .subscribe((categoria) => {
                this.lutaCivilLiberada.set(false);
                this.pontariaCivilLiberada.set(false);
                for (const chave of ["luta", "pontaria"] as const) {
                    const controle = this.formulario.controls.atributos.controls[chave];
                    if (categoria === CategoriaNpcEnum.CIVIL) {
                        controle.setValue(0);
                        controle.disable();
                    } else {
                        controle.enable();
                        if (controle.value === 0) controle.setValue(1);
                    }
                }
            });
    }

    /** Civil inicia os atributos de combate bloqueados; liberação é transitória e por atributo. */
    liberarCombateCivil(chave: "luta" | "pontaria"): void {
        const liberado = chave === "luta" ? this.lutaCivilLiberada : this.pontariaCivilLiberada;
        liberado.update((valor) => !valor);
        const controle = this.formulario.controls.atributos.controls[chave];
        if (liberado()) { controle.enable(); controle.setValue(1); }
        else { controle.setValue(0); controle.disable(); }
        this.formulario.markAsDirty();
    }

    /** Civil usa o modelo sem Energia e não possui habilidades especiais. */
    ehCivil(): boolean { return this.estado().categoria === CategoriaNpcEnum.CIVIL; }

    /** Consulta contextual, nunca gravada como DT única no documento. */
    calcularDt(chave: keyof FichaAtributosDto): number {
        return calcularDtAtributo({ nivel: this.estado().nivel,
            valorAtributo: this.estado().atributos[chave] });
    }

    /** Abre uma linha nova sem substituir as habilidades já preenchidas. */
    adicionarHabilidade(tipo: HabilidadeTipoNpcEnum): void {
        this.habilidades.push(criarHabilidadeFormulario(tipo));
        this.formulario.markAsDirty();
    }

    /** Listas de Sanidade são opcionais, mas cada registro precisa de um nome. */
    adicionarSanidade(tipo: "sequelas" | "traumas"): void {
        this[tipo].push(criarRegistroSanidade());
        this.formulario.markAsDirty();
    }

    /** Remoção local antes de registrar; participa da proteção de saída. */
    removerLinha(tipo: "habilidades" | "sequelas" | "traumas", indice: number): void {
        this[tipo].removeAt(indice);
        this.formulario.markAsDirty();
    }

    /** Pendências por etapa; pode voltar sem perder campos nem recalcular estado persistido. */
    violacoesEtapa(etapa: number): readonly string[] {
        const dados = this.dados();
        if (etapa === 0) return [
            ...(!dados.identidadeNarrativa.nome ? ["Defina o nome do NPC"] : []),
            ...(!dados.identidadeNarrativa.funcao ? ["Descreva sua função narrativa"] : []),
            ...(!this.formulario.controls.nivel.valid || !Number.isInteger(dados.nivel)
                ? ["Nível deve ser inteiro entre 0 e 20"] : []),
            ...(!this.referenciaCooperacao() ? ["Cooperação deve ser inteira entre 0 e 10"] : []),
        ];
        if (etapa === 1) return this.distribuicao().violacoes;
        if (etapa === 2) return [
            ...validarVolumeHabilidades(dados),
            ...dados.habilidades.flatMap((habilidade, indice) => [
                ...(!habilidade.nomeNeutro || !habilidade.descricao
                    ? [`Complete nome e descrição da habilidade ${indice + 1}`] : []),
                ...(habilidade.tipo === HabilidadeTipoNpcEnum.ATIVA
                    && (!Number.isInteger(habilidade.custoEnergia)
                        || (habilidade.custoEnergia ?? 0) < 0)
                    ? [`Defina o custo da habilidade ${indice + 1}`] : []),
            ]),
        ];
        if (etapa === 3) return [
            ...(Object.values(dados.condutaCombate).some((texto) => !texto)
                ? ["Complete os três campos de conduta de combate"] : []),
            ...([...dados.sanidade.sequelas, ...dados.sanidade.traumas].some((linha) => !linha.nome)
                ? ["Dê nome a cada registro de Sanidade"] : []),
        ];
        return this.pendencias().map(({ mensagem }) => mensagem);
    }
}
