import { Component, computed, forwardRef, input, output } from "@angular/core";
import { RegrasConteudo, RegrasDocumento } from "../regras.model";
import { RegrasSecaoRender } from "./regras-secao.component";
import { RegrasParagrafo } from "./regras-paragrafo.component";
import { RegrasLista } from "./regras-lista.component";
import { RegrasNota } from "./regras-nota.component";
import { RegrasExemplo } from "./regras-exemplo.component";
import { RegrasTabela } from "./regras-tabela.component";
import { RegrasHabilidade } from "./regras-habilidade.component";
import { RegrasGenerico } from "./regras-generico.component";
import { RegrasRicoFonte } from "./regras-rico-fonte.component";
import { RegrasClasse } from "./regras-classe.component";
import { RegrasArquetipos } from "./regras-arquetipos.component";
import { RegrasOrigens } from "./regras-origens.component";
import { RegrasEquipamentosRender } from "./regras-equipamentos.component";
import { RegrasModificacoesRender } from "./regras-modificacoes.component";
import { RegrasModulosRender } from "./regras-modulos.component";
import { RegrasRoteiro } from "./regras-roteiro.component";
import { RegrasIdentidade } from "./regras-identidade.component";
import { RegrasAtributos } from "./regras-atributos.component";
import { RegrasHabilidadeCriatura } from "./regras-habilidade-criatura.component";
import { RegrasFichaCriatura } from "./regras-ficha-criatura.component";
import { RegrasNiveisAmeaca } from "./regras-niveis-ameaca.component";
import { RegrasSubclasse } from "./regras-subclasse.component";
import { RegrasTermos } from "./regras-termos.component";
import { RegrasGrade } from "./regras-grade.component";
import { RegrasAbertura } from "./regras-abertura.component";

@Component({
    selector: "app-regras-conteudo",
    imports: [
            forwardRef(() => RegrasSecaoRender), RegrasParagrafo, forwardRef(() => RegrasLista),
            RegrasNota, RegrasExemplo, RegrasTabela, RegrasHabilidade,
            forwardRef(() => RegrasGenerico), forwardRef(() => RegrasRicoFonte),
            forwardRef(() => RegrasClasse), forwardRef(() => RegrasArquetipos),
            RegrasOrigens, RegrasEquipamentosRender,
            RegrasModificacoesRender, RegrasModulosRender, forwardRef(() => RegrasRoteiro),
            RegrasIdentidade,
            RegrasAtributos, RegrasHabilidadeCriatura, forwardRef(() => RegrasFichaCriatura),
            RegrasNiveisAmeaca, forwardRef(() => RegrasSubclasse), RegrasTermos, RegrasGrade,
            RegrasAbertura,
    ],
    templateUrl: "./regras-conteudo.component.html",
    styleUrl: "./regras-conteudo.component.scss",
})
export class RegrasConteudoRender {
    readonly filhos = input.required<readonly RegrasConteudo[]>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();
    protected readonly grupos = computed(() => {
        const grupos: { habilidades: boolean; blocos: RegrasConteudo[] }[] = [];
        for (const bloco of this.filhos()) {
            const habilidades = bloco.tipo === "habilidade" || bloco.tipo === "habilidade-criatura";
            const anterior = grupos.at(-1);
            if (habilidades && anterior?.habilidades) {
                anterior.blocos.push(bloco);
            } else {
                grupos.push({ habilidades, blocos: [bloco] });
            }
        }
        return grupos;
    });
}
