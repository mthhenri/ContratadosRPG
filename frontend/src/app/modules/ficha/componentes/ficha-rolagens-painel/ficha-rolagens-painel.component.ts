import { Component, computed, inject, input, output } from '@angular/core';

import type {
  FichaAtributosDto,
  FichaJogadorDadosDto,
  FichaRolagemDto,
} from '@contratados-rpg/shared/dtos/ficha';
import {
  ajusteDadoIniciativaAmplificadores,
  calcularAjusteDadosEquipamento,
  calcularAtributosEfetivos,
  calcularAtributosParaDados,
  calcularProficiencia,
} from '@contratados-rpg/shared/regras/agente';
import { obterDadoExtraIniciativaFormacao } from '@contratados-rpg/shared/regras/identidade';

import { Icone } from '../../../../shared/icone/icone.component';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { NOME_PRESET_INICIATIVA } from '../../executar-rolagem';
import { FichaRolagemRegistroService } from '../../ficha-rolagem-registro.service';
import { montarInformacoesExtras, normalizarEntrada } from '../../status-derivado';
import { FichaRolagens } from '../ficha-rolagens/ficha-rolagens.component';

/**
 * Painel de **Rolagens** de uma ficha (m2-21, item 4): o toggle "Rolagem oculta" + o editor
 * `FichaRolagens`, com os derivados que ele consome (`atributos` efetivos, `proficiencia`,
 * `atalhosDano`) calculados aqui a partir do documento.
 *
 * Existe porque o painel passou a ter **dois lugares**: a aba Rolagens da ficha completa
 * (`modo="padrao"` de `FichaVisualizacao`, que delega pra cá) e a coluna lateral da visão do
 * jogador de `/painel/:id` (`CampanhaDetalhe`), onde ele vive **fora** do card da ficha, ao lado do
 * histórico da sessão. Sem este componente, os três `computed` derivados teriam de ser duplicados
 * na página.
 *
 * **Nenhuma regra de jogo vive aqui** (proibições #26/#27): `calcularAtributosParaDados` e
 * `calcularProficiencia` são de `shared/regras/agente`, e `normalizarEntrada`/
 * `montarInformacoesExtras` são as mesmas funções de `status-derivado` que `FichaVisualizacao`
 * chama — nenhuma delas mudou de lugar. O registro do histórico (m3-27) e a visibilidade das
 * próximas rolagens são do `FichaRolagemRegistroService` da página, compartilhado com o card.
 */
@Component({
  selector: 'app-ficha-rolagens-painel',
  imports: [FichaRolagens, Icone, Tooltip],
  templateUrl: './ficha-rolagens-painel.component.html',
  styleUrl: './ficha-rolagens-painel.component.scss',
})
export class FichaRolagensPainel {
  /** Documento de jogo da ficha — fonte de presets, atributos, habilidades e derivados de dano. */
  readonly dados = input.required<FichaJogadorDadosDto>();
  /** Dono/mestre edita os presets; para os demais é só leitura (a página liga por `podeGerenciar`). */
  readonly editavel = input(false);
  /** `true` quando o autor pode **rolar** (m3-51) — gate do toggle e de cada passo. */
  readonly podeRolar = input(false);
  /** Cor de identidade visual da ficha (m3-61) — repassada ao editor `FichaRolagens`. */
  readonly cor = input<string | null>(null);
  /**
   * `true` esconde o preset "Iniciativa" da lista editável do `FichaRolagens` (redesenho — a ficha
   * completa passou a rolar Iniciativa direto da aba Informações, `FichaVisualizacao.rolarIniciativa`).
   * Só a ficha completa liga essa flag: a coluna lateral de `CampanhaDetalhe` não tem aba Informações
   * pra hospedar o preset, então continua mostrando-o aqui normalmente (default `false`).
   */
  readonly esconderIniciativa = input(false);

  /** Presets editados — a página persiste em `dados.rolagens` (m3-15). */
  readonly rolagensMudou = output<readonly FichaRolagemDto[]>();
  /** Energia a debitar ao rolar um passo com habilidades — a página aplica em `energiaAtual`. */
  readonly energiaGasta = output<number>();

  /** Flag "Rolagem oculta" + caminho de registro, compartilhados com o card da ficha (item 5). */
  protected readonly registro = inject(FichaRolagemRegistroService);

  /** Ajuste de dados vindo de itens equipados (`shared/regras/agente/defesa`) — soma por cima do manual. */
  private readonly ajusteDadosEquipamento = computed(() =>
    calcularAjusteDadosEquipamento(this.dados().inventario.itens),
  );

  /** Atributos **para dados** (lesão + ajuste manual + ajuste de equipamento) — a mesma base que o teste de atributo rola. */
  protected readonly atributosParaDados = computed(() => {
    const manual = this.dados().dadosTeste ?? {};
    const equipamento = this.ajusteDadosEquipamento();
    const combinado: Partial<Record<keyof FichaAtributosDto, number>> = { ...manual };
    (Object.keys(equipamento) as (keyof FichaAtributosDto)[]).forEach((chave) => {
      combinado[chave] = (combinado[chave] ?? 0) + (equipamento[chave] ?? 0);
    });
    return calcularAtributosParaDados(this.dados().atributos, this.dados().estado.lesoes, combinado);
  });

  /**
   * Atributos **efetivos** (lesão, sem ajuste de teste) — repassados ao editor pra rolar Iniciativa
   * pelo atributo puro de Destreza, não pelo `atributosParaDados` acima (que só vale pra testes
   * normais de atributo).
   */
  protected readonly atributosEfetivos = computed(() =>
    calcularAtributosEfetivos(this.dados().atributos, this.dados().estado.lesoes),
  );

  /** Proficiência derivada (nível; `null` para Civil) — fonte `PROF` das fórmulas (m3-22). */
  protected readonly proficiencia = computed(() =>
    calcularProficiencia({ classe: this.dados().classe, nivel: this.dados().nivel }),
  );

  /**
   * Dado extra de Iniciativa: amplificador `Atento` (`inventario.amplificadores`) + Formação da
   * Origem `PERICIA_DADO_INICIATIVA` (`identidade.origem.formacao`) — repassado ao editor, que só o
   * aplica quando o preset rolado se chama "Iniciativa" (`executarPassoPreset`).
   */
  protected readonly dadoExtraIniciativa = computed(
    () =>
      ajusteDadoIniciativaAmplificadores(this.dados().inventario.amplificadores) +
      obterDadoExtraIniciativaFormacao(this.dados().identidade?.origem?.formacao ?? []),
  );

  /** Presets passados ao editor — sem o "Iniciativa" quando `esconderIniciativa()` (ver docstring do input). */
  protected readonly rolagensExibidas = computed(() => {
    const todas = this.dados().rolagens ?? [];
    return this.esconderIniciativa() ? todas.filter((preset) => preset.nome !== NOME_PRESET_INICIATIVA) : todas;
  });

  /**
   * Repassa a lista editada pro consumidor persistir. Quando "Iniciativa" está escondida, ela nunca
   * chega ao `FichaRolagens` — sem isso, qualquer edição (reordenar, adicionar outro preset) devolveria
   * a lista **sem** ela e a apagaria da ficha. Reinjeta o preset original de volta antes de emitir.
   */
  protected aoRolagensMudou(presets: readonly FichaRolagemDto[]): void {
    if (!this.esconderIniciativa()) {
      this.rolagensMudou.emit(presets);
      return;
    }
    const iniciativa = this.dados().rolagens?.find((preset) => preset.nome === NOME_PRESET_INICIATIVA);
    this.rolagensMudou.emit(iniciativa ? [...presets, iniciativa] : presets);
  }

  /** Status derivado do documento — só o recorte de dano interessa aqui (ver `atalhosDano`). */
  private readonly informacoesExtras = computed(() => {
    const dados = this.dados();
    return montarInformacoesExtras(
      normalizarEntrada(dados.classe, dados.nivel, dados.atributos),
      dados.habilidades,
      dados.derivados,
      dados.inventario.amplificadores,
      dados.inventario.itens,
    );
  });

  /**
   * Dano C. a C./Furtivo **atuais** (stored vence calculado, m3-10) — expandem os atalhos
   * `CORPO`/`FURTIVO` da rolagem avulsa. Civil não tem Furtivo — vira `null`.
   */
  protected readonly atalhosDano = computed(() => {
    const mapa = new Map(this.informacoesExtras().map((info) => [info.chave, info] as const));
    const corpo = mapa.get('danoCorpoACorpo')?.bruto;
    const furtivo = mapa.get('danoFurtivo')?.bruto;
    return {
      corpo: typeof corpo === 'string' ? corpo : null,
      furtivo: typeof furtivo === 'string' ? furtivo : null,
    };
  });
}
