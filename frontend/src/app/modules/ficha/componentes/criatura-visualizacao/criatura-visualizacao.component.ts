import { Component, computed, inject, input, output, signal } from '@angular/core';

import {
  CadenciaEnum,
  ModificadorCriaturaEnum,
  NivelAmeacaEnum,
  OrigemCriaturaEnum,
  ComportamentoCriaturaEnum,
  PorteCriaturaEnum,
  RegeneracaoIntensidadeEnum,
  RegeneracaoModoEnum,
  TenacidadeEnum,
} from '@contratados-rpg/shared/enums';
import type {
  FichaAtributosDto,
  FichaCriaturaAtaqueDto,
  FichaCriaturaDadosDto,
  FichaCriaturaDeslocamentoDto,
  FichaCriaturaHabilidadeDto,
  FichaCriaturaIdentidadeDto,
  FichaCriaturaModificadoresDto,
  FichaCriaturaRegeneracaoDto,
  FichaCriaturaResistenciaDto,
} from '@contratados-rpg/shared/dtos/ficha';
import { calcularAtributoEfetivo, calcularLimiteResistencias } from '@contratados-rpg/shared/regras/criatura';

import { Icone } from '../../../../shared/icone/icone.component';
import { BandejaDadosService } from '../../../../shared/bandeja-dados/bandeja-dados.service';
import { FichaRolagemRegistroService } from '../../ficha-rolagem-registro.service';
import { rolarAtaqueCriatura, rolarTesteAtributoCriatura } from '../../criatura-rolagem';
import type { AjusteCriaturaVitalidade } from '../../ficha-edicao-criatura.service';
import {
  rotuloCadencia,
  rotuloComportamento,
  rotuloModificadorCriatura,
  rotuloNivelAmeaca,
  rotuloOrigemCriatura,
  rotuloPorte,
  rotuloRegeneracaoIntensidade,
  rotuloRegeneracaoModo,
  rotuloTenacidade,
} from '../../rotulos-criatura';
import { CriaturaResistenciaLista } from '../criatura-resistencia-lista/criatura-resistencia-lista.component';
import { CriaturaAtaqueLista } from '../criatura-ataque-lista/criatura-ataque-lista.component';
import { CriaturaHabilidadeLista } from '../criatura-habilidade-lista/criatura-habilidade-lista.component';

/** As dez chaves de `FichaAtributosDto`, mesmo apelido do análogo em `FichaVisualizacao`. */
type ChaveAtributo = keyof FichaAtributosDto;

/** Rótulo dos dez atributos (mesma grafia do assistente de criação, `criar-criatura.page.ts`). */
const CAMPOS_ATRIBUTO: readonly { readonly chave: ChaveAtributo; readonly nome: string }[] = [
  { chave: 'destreza', nome: 'Destreza' }, { chave: 'forca', nome: 'Força' }, { chave: 'luta', nome: 'Luta' },
  { chave: 'pontaria', nome: 'Pontaria' }, { chave: 'vigor', nome: 'Vigor' }, { chave: 'intelecto', nome: 'Intelecto' },
  { chave: 'medicina', nome: 'Medicina' }, { chave: 'sentidos', nome: 'Sentidos' }, { chave: 'social', nome: 'Social' },
  { chave: 'vontade', nome: 'Vontade' },
];

/**
 * A **ficha de criatura** numa tela só (m4-04b) — edição no próprio lugar, campo a campo,
 * mirror de `FichaVisualizacao` mas para o documento (bem menor) `FichaCriaturaDadosDto`
 * (`m4-01`). Sem abas: o documento não tem inventário/combos/rolagens-preset/sanidade — todas
 * as seções cabem numa coluna rolável.
 */
@Component({
  selector: 'app-criatura-visualizacao',
  imports: [Icone, CriaturaResistenciaLista, CriaturaAtaqueLista, CriaturaHabilidadeLista],
  templateUrl: './criatura-visualizacao.component.html',
  styleUrl: './criatura-visualizacao.component.scss',
})
export class CriaturaVisualizacao {
  private readonly bandeja = inject(BandejaDadosService);
  private readonly rolagemRegistro = inject(FichaRolagemRegistroService);

  readonly fichaId = input.required<number>();
  readonly nome = input.required<string>();
  readonly cor = input<string | null>(null);
  readonly imagemUrl = input<string | null>(null);
  readonly oculta = input.required<boolean>();
  readonly dados = input.required<FichaCriaturaDadosDto>();
  /** Dono (mestre) edita; visualizador revelado é só-leitura — mesmo sinal de `FichaVisualizacao.ajustavel`. */
  readonly ajustavel = input.required<boolean>();

  readonly vitalidadeMudou = output<AjusteCriaturaVitalidade>();
  readonly defesaMudou = output<number>();
  readonly identidadeMudou = output<FichaCriaturaIdentidadeDto>();
  readonly naMudou = output<NivelAmeacaEnum>();
  readonly vdMudou = output<number>();
  readonly atributosMudou = output<FichaAtributosDto>();
  readonly modificadoresMudou = output<FichaCriaturaModificadoresDto>();
  readonly tenacidadeMudou = output<TenacidadeEnum>();
  readonly resistenciasMudou = output<readonly FichaCriaturaResistenciaDto[]>();
  readonly fraquezasMudou = output<readonly FichaCriaturaResistenciaDto[]>();
  readonly regeneracaoMudou = output<FichaCriaturaRegeneracaoDto | undefined>();
  readonly porteMudou = output<PorteCriaturaEnum>();
  readonly deslocamentoMudou = output<FichaCriaturaDeslocamentoDto>();
  readonly cadenciaMudou = output<CadenciaEnum>();
  readonly iniciativaBonusMudou = output<number | undefined>();
  readonly ataquesMudou = output<readonly FichaCriaturaAtaqueDto[]>();
  readonly habilidadesMudou = output<readonly FichaCriaturaHabilidadeDto[]>();
  readonly anotacoesMudou = output<string>();
  readonly nomeMudou = output<string>();
  readonly corMudou = output<string | null>();
  readonly ocultaMudou = output<boolean>();
  readonly imagemMudou = output<File>();
  readonly removerImagem = output<void>();

  protected readonly camposAtributo = CAMPOS_ATRIBUTO;
  protected readonly origens = Object.values(OrigemCriaturaEnum) as OrigemCriaturaEnum[];
  protected readonly comportamentos = Object.values(ComportamentoCriaturaEnum) as ComportamentoCriaturaEnum[];
  protected readonly niveisAmeaca = Object.values(NivelAmeacaEnum) as NivelAmeacaEnum[];
  protected readonly modificadores = Object.values(ModificadorCriaturaEnum) as ModificadorCriaturaEnum[];
  protected readonly tenacidades = Object.values(TenacidadeEnum) as TenacidadeEnum[];
  protected readonly portes = Object.values(PorteCriaturaEnum) as PorteCriaturaEnum[];
  protected readonly cadencias = Object.values(CadenciaEnum) as CadenciaEnum[];
  protected readonly modosRegeneracao = Object.values(RegeneracaoModoEnum) as RegeneracaoModoEnum[];
  protected readonly intensidadesRegeneracao = Object.values(RegeneracaoIntensidadeEnum) as RegeneracaoIntensidadeEnum[];

  protected readonly rotuloOrigemCriatura = rotuloOrigemCriatura;
  protected readonly rotuloComportamento = rotuloComportamento;
  protected readonly rotuloNivelAmeaca = rotuloNivelAmeaca;
  protected readonly rotuloModificadorCriatura = rotuloModificadorCriatura;
  protected readonly rotuloTenacidade = rotuloTenacidade;
  protected readonly rotuloPorte = rotuloPorte;
  protected readonly rotuloCadencia = rotuloCadencia;
  protected readonly rotuloRegeneracaoModo = rotuloRegeneracaoModo;
  protected readonly rotuloRegeneracaoIntensidade = rotuloRegeneracaoIntensidade;

  /** Chave (única, tipo `secao.campo`) do campo em edição no-próprio-lugar — `null` = nenhum. */
  private readonly campoEmEdicao = signal<string | null>(null);

  protected editando(chave: string): boolean {
    return this.campoEmEdicao() === chave;
  }

  protected editar(chave: string): void {
    this.campoEmEdicao.set(chave);
  }

  protected cancelarEdicao(): void {
    this.campoEmEdicao.set(null);
  }

  /**
   * Limite de pontos de Resistência disponível para `resistencias` (`2×VD`, +25% por Fraqueza
   * extra além da 1ª — `shared/regras/criatura`). `quantidadeFraquezasExtras` conta só a partir
   * da 2ª fraqueza (a 1ª é obrigatória e não soma bônus).
   */
  protected readonly limiteResistencias = computed(() =>
    calcularLimiteResistencias({
      vd: this.dados().vd,
      quantidadeFraquezasExtras: Math.max(0, this.dados().fraquezas.length - 1),
    }),
  );

  /** Atributo Efetivo = valor final + modificador (usado em testes/ataques) — nunca reimplementado aqui. */
  protected atributoEfetivo(chave: ChaveAtributo): number {
    const dados = this.dados();
    return calcularAtributoEfetivo({
      atributoFinal: dados.atributos[chave],
      modificador: dados.modificadores[chave],
      vd: dados.vd,
    });
  }

  protected ajustarVida(delta: number): void {
    const valor = Math.max(0, this.dados().vidaAtual + delta);
    this.vitalidadeMudou.emit({ campo: 'vidaAtual', valor });
  }

  protected ajustarVidaMaxima(valor: number): void {
    this.vitalidadeMudou.emit({ campo: 'vidaMaxima', valor });
  }

  /** Entrada direta (não-delta) de Vida atual — clique-para-editar, ao lado do stepper +/−. */
  protected confirmarVidaAtual(valor: number): void {
    this.vitalidadeMudou.emit({ campo: 'vidaAtual', valor: Math.max(0, valor) });
  }

  protected confirmarDefesa(valor: number): void {
    this.defesaMudou.emit(valor);
  }

  protected confirmarIdentidade(identidade: FichaCriaturaIdentidadeDto): void {
    this.identidadeMudou.emit(identidade);
  }

  /** Confirma um único campo de Identidade — monta o objeto inteiro (`identidadeMudou` é atômico). */
  protected confirmarCampoIdentidade<K extends keyof FichaCriaturaIdentidadeDto>(
    campo: K,
    valor: FichaCriaturaIdentidadeDto[K],
  ): void {
    this.confirmarIdentidade({ ...this.dados().identidade, [campo]: valor });
  }

  protected confirmarNa(na: NivelAmeacaEnum): void {
    this.naMudou.emit(na);
  }

  protected confirmarVd(vd: number): void {
    this.vdMudou.emit(vd);
  }

  protected confirmarAtributos(atributos: FichaAtributosDto): void {
    this.atributosMudou.emit(atributos);
  }

  /** Confirma o Atributo Final de uma única chave — monta o mapa inteiro (`atributosMudou` é atômico). */
  protected confirmarAtributoFinal(chave: ChaveAtributo, valor: number): void {
    this.confirmarAtributos({ ...this.dados().atributos, [chave]: valor });
  }

  protected confirmarModificadores(modificadores: FichaCriaturaModificadoresDto): void {
    this.modificadoresMudou.emit(modificadores);
  }

  /** Confirma o Modificador de uma única chave — monta o mapa inteiro (`modificadoresMudou` é atômico). */
  protected confirmarModificador(chave: ChaveAtributo, valor: ModificadorCriaturaEnum): void {
    this.confirmarModificadores({ ...this.dados().modificadores, [chave]: valor });
  }

  protected confirmarTenacidade(tenacidade: TenacidadeEnum): void {
    this.tenacidadeMudou.emit(tenacidade);
  }

  protected aoResistenciasMudar(resistencias: readonly FichaCriaturaResistenciaDto[]): void {
    this.resistenciasMudou.emit(resistencias);
  }

  protected aoFraquezasMudar(fraquezas: readonly FichaCriaturaResistenciaDto[]): void {
    this.fraquezasMudou.emit(fraquezas);
  }

  protected confirmarRegeneracao(regeneracao: FichaCriaturaRegeneracaoDto | undefined): void {
    this.regeneracaoMudou.emit(regeneracao);
  }

  /** Ativa a Regeneração (opcional) com valores default — o mestre ajusta cada campo em seguida. */
  protected ativarRegeneracao(): void {
    this.confirmarRegeneracao({
      modo: RegeneracaoModoEnum.PASSIVA,
      intensidade: RegeneracaoIntensidadeEnum.RESIDUAL,
      valor: 0,
      condicao: null,
    });
  }

  protected removerRegeneracao(): void {
    this.confirmarRegeneracao(undefined);
  }

  /** Confirma um único campo de Regeneração — monta o objeto inteiro (`regeneracaoMudou` é atômico). */
  protected confirmarCampoRegeneracao<K extends keyof FichaCriaturaRegeneracaoDto>(
    campo: K,
    valor: FichaCriaturaRegeneracaoDto[K],
  ): void {
    const atual = this.dados().regeneracao;
    if (!atual) {
      return;
    }
    this.confirmarRegeneracao({ ...atual, [campo]: valor });
  }

  protected confirmarPorte(porte: PorteCriaturaEnum): void {
    this.porteMudou.emit(porte);
  }

  protected confirmarDeslocamento(deslocamento: FichaCriaturaDeslocamentoDto): void {
    this.deslocamentoMudou.emit(deslocamento);
  }

  /** Confirma um único modo de Deslocamento — monta o objeto inteiro (`deslocamentoMudou` é atômico). */
  protected confirmarCampoDeslocamento<K extends keyof FichaCriaturaDeslocamentoDto>(
    campo: K,
    valor: FichaCriaturaDeslocamentoDto[K],
  ): void {
    this.confirmarDeslocamento({ ...this.dados().deslocamento, [campo]: valor });
  }

  protected confirmarCadencia(cadencia: CadenciaEnum): void {
    this.cadenciaMudou.emit(cadencia);
  }

  protected confirmarIniciativaBonus(valor: number | undefined): void {
    this.iniciativaBonusMudou.emit(valor);
  }

  protected aoAtaquesMudar(ataques: readonly FichaCriaturaAtaqueDto[]): void {
    this.ataquesMudou.emit(ataques);
  }

  protected aoHabilidadesMudar(habilidades: readonly FichaCriaturaHabilidadeDto[]): void {
    this.habilidadesMudou.emit(habilidades);
  }

  protected confirmarAnotacoes(anotacoes: string): void {
    this.anotacoesMudou.emit(anotacoes);
  }

  protected confirmarNome(nome: string): void {
    this.nomeMudou.emit(nome);
  }

  protected confirmarCor(cor: string | null): void {
    this.corMudou.emit(cor);
  }

  protected alternarOculta(): void {
    this.ocultaMudou.emit(!this.oculta());
  }

  protected aoTrocarImagem(arquivo: File): void {
    this.imagemMudou.emit(arquivo);
  }

  /** Rola o dano de um Ataque (`criatura-rolagem.ts`, motor puro) e mostra/registra o resultado. */
  protected rolarAtaque(ataque: FichaCriaturaAtaqueDto): void {
    if (!this.ajustavel()) {
      return;
    }
    const executada = rolarAtaqueCriatura({ atributos: this.dados().atributos }, ataque);
    if (!executada) {
      return;
    }
    this.bandeja.mostrar({ rotulo: executada.rotulo, formula: executada.formula, resultado: executada.resultado, corFicha: this.cor() });
    this.rolagemRegistro.registrar(executada);
  }

  /** Rola um teste do Atributo Efetivo dessa chave e mostra/registra o resultado. */
  protected rolarTesteAtributo(chave: ChaveAtributo): void {
    if (!this.ajustavel()) {
      return;
    }
    const executada = rolarTesteAtributoCriatura(this.dados(), chave, `Teste de ${chave}`);
    if (!executada) {
      return;
    }
    this.bandeja.mostrar({ rotulo: executada.rotulo, formula: executada.formula, resultado: executada.resultado, corFicha: this.cor() });
    this.rolagemRegistro.registrar(executada);
  }
}
