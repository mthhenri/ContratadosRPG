import {
    Component, ElementRef, computed, effect, inject, input, output, signal, viewChild,
} from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import type { FichaAtributosDto, FichaImagemFocoDto } from "@contratados-rpg/shared/dtos/ficha";
import { calcularDtAtributo } from "@contratados-rpg/shared/regras/npc";
import { Icone } from "../../../../shared/icone/icone.component";
import { Tooltip } from "../../../../shared/tooltip/tooltip.directive";
import { AbaPainel } from "../../../../shared/ui/abas/aba-painel.directive";
import { Aba } from "../../../../shared/ui/abas/aba.component";
import { Abas } from "../../../../shared/ui/abas/abas.component";
import { BotaoIcone } from "../../../../shared/ui/botao-icone/botao-icone.component";
import { Campo } from "../../../../shared/ui/campo/campo.component";
import { Cartao } from "../../../../shared/ui/cartao/cartao.component";
import { Stat } from "../../../../shared/ui/stat/stat.component";
import { StepInput } from "../../../../shared/ui/stepper/step-input.component";
import { NpcEdicaoFormulario, type GrupoEdicaoNpc } from "../../npc-edicao-formulario.service";
import { GRUPOS_ATRIBUTOS } from "../../npc-atributos-campos";
import { NpcBlocoAcoes } from "./npc-bloco-acoes.component";
import { NpcIdentidade } from "./npc-identidade.component";
import { NpcHabilidadesLista } from "./npc-habilidades-lista.component";
import { NpcSanidadeLista } from "./npc-sanidade-lista.component";

@Component({
    selector: "app-npc-visualizacao",
    imports: [ReactiveFormsModule, Icone, Tooltip, AbaPainel, Aba, Abas, BotaoIcone, Campo, Cartao,
        Stat, StepInput, NpcBlocoAcoes, NpcIdentidade, NpcHabilidadesLista, NpcSanidadeLista],
    templateUrl: "./npc-visualizacao.component.html", styleUrl: "./npc-visualizacao.scss",
})
export class NpcVisualizacao {
    readonly formulario = inject(NpcEdicaoFormulario);
    readonly edicao = this.formulario.edicao;
    readonly gerenciavel = input(false);
    readonly apertado = input(false);
    readonly imagemOcupada = input(false);
    readonly imagemAlterada = output<{ arquivo: File | null; foco: FichaImagemFocoDto }>();
    readonly imagemRemovida = output<void>();
    readonly ficha = computed(() => this.edicao.rascunho() ?? this.edicao.ficha());
    readonly dados = computed(() => this.ficha()!.dados);
    readonly grupos = GRUPOS_ATRIBUTOS;
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
    /** Foco ao entrar em edição de bloco (item 3, m4-16): primeiro campo do bloco; o container
     * (`tabindex="-1"`) só recebe o foco se o bloco não tiver campo. */
    private readonly editorAtributos = viewChild<ElementRef<HTMLElement>>("editorAtributos");
    private readonly editorConduta = viewChild<ElementRef<HTMLElement>>("editorConduta");

    constructor() {
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
}
