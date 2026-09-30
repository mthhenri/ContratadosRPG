import { Component, computed, effect, inject, input, output, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { TemaService } from "../../../../core/services/tema.service";
import { CategoriaNpcEnum } from "@contratados-rpg/shared/enums";
import { IMAGEM_MIMES_ACCEPT } from "@contratados-rpg/shared/validators";
import type { FichaAtributosDto, FichaImagemFocoDto } from "@contratados-rpg/shared/dtos/ficha";
import { calcularDtAtributo, calcularEnergia, obterReferenciaCategoria,
    obterReferenciaCooperacao } from "@contratados-rpg/shared/regras/npc";
import { Icone } from "../../../../shared/icone/icone.component";
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
import { NpcHabilidadesLista } from "./npc-habilidades-lista.component";
import { NpcSanidadeLista } from "./npc-sanidade-lista.component";

@Component({
    selector: "app-npc-visualizacao",
    imports: [ReactiveFormsModule, Icone, FocoImagem, Tooltip, AbaPainel, Aba, Abas, Botao,
        BotaoIcone, Campo, Cartao, Chip, Stat, StepInput, ValorEditavel, BarraRecurso,
        AjusteEnquadramentoImagem, NpcHabilidadesLista, NpcSanidadeLista],
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

    constructor() {
        effect(() => this.corSelecionada.setValue(this.ficha()?.cor ?? this.tema.accentEfetivo(),
            { emitEvent: false }));
        this.corSelecionada.valueChanges.pipe(takeUntilDestroyed()).subscribe((cor) => {
            if (this.gerenciavel() && this.formulario.grupo() === "identidade") {
                this.formulario.formulario.controls.cor.setValue(cor);
            }
        });
    }

    iniciar(grupo: GrupoEdicaoNpc): void {
        if (this.gerenciavel()) this.formulario.iniciar(grupo);
    }

    dt(chave: keyof FichaAtributosDto): number {
        return calcularDtAtributo({ nivel: this.dados().nivel,
            valorAtributo: this.dados().atributos[chave] });
    }

    ajustarMaximo(campo: "vidaMaxima" | "energiaMaxima", valor: number): void {
        this.iniciar("recursos");
        if (this.gerenciavel()) this.formulario.formulario.controls[campo].setValue(valor);
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
