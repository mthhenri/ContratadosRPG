import { Component, computed, forwardRef, inject, input, output } from "@angular/core";
import { RegrasLeitorContexto } from "../regras-leitor-contexto";
import { RegrasArquetipos as BlocoArquetipos, RegrasClasse as BlocoClasse, RegrasDocumento } from "../regras.model";
import { Cartao } from "../../../shared/ui/cartao/cartao.component";
import { Icone } from "../../../shared/icone/icone.component";
import { RegrasInline } from "./regras-inline.component";
import { RegrasArquetipos } from "./regras-arquetipos.component";
import { RegrasConteudoRender } from "./regras-conteudo.component";
import { recuperarIconeIdentidade } from "./regras-identidade-icone";
import { RegrasSaude } from "./regras-saude.component";
import { TipoRegraPecaEnum } from "@contratados-rpg/shared/enums";
import { OficinaInsercao } from "../oficina/oficina-insercao.component";

@Component({
    selector: "app-regras-classe",
    imports: [
        Cartao, Icone, RegrasInline, RegrasArquetipos, RegrasSaude, OficinaInsercao,
        forwardRef(() => RegrasConteudoRender),
    ],
    templateUrl: "./regras-classe.component.html",
    styleUrl: "./regras-classe.component.scss",
})
export class RegrasClasse {
    readonly bloco = input.required<BlocoClasse>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();
    /** O "+ Arquétipo" no fim da classe só oferece o que a classe aceita como filho além da habilidade. */
    protected readonly tiposArquetipo = [TipoRegraPecaEnum.ARQUETIPO];
    private readonly contexto = inject(RegrasLeitorContexto, { optional: true });
    protected readonly identificador = computed(() => {
        const ancora = this.bloco().ancora;
        return ancora ? this.contexto?.identificar(ancora) ?? ancora : null;
    });
    protected readonly icone = computed(() => recuperarIconeIdentidade(this.bloco().nome));
    protected readonly arquetipos = computed<readonly BlocoArquetipos[]>(() => {
        const bloco = this.bloco();
        if (bloco.filhos?.length) return bloco.filhos;
        if (!bloco.arquetipos.length) return [];
        return [{ tipo: "arquetipos", classe: bloco.nome, cabecalho: [], linhas: [],
            arquetipos: bloco.arquetipos.map(arquetipo => ({ nome: arquetipo.nome, citacao: [],
                atributosBonus: [], habilidades: [], habilidadesGeraisMelhoradas: [] })) }];
    });
}
