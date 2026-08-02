import { Component, computed, inject, input, output } from '@angular/core';

import type {
  FichaJogadorDadosDto,
  FichaRolagemDto,
} from '@contratados-rpg/shared/dtos/ficha';
import {
  calcularAtributosParaDados,
  calcularProficiencia,
} from '@contratados-rpg/shared/regras/agente';

import { Icone } from '../../../../shared/icone/icone.component';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
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

  /** Presets editados — a página persiste em `dados.rolagens` (m3-15). */
  readonly rolagensMudou = output<readonly FichaRolagemDto[]>();
  /** Energia a debitar ao rolar um passo com habilidades — a página aplica em `energiaAtual`. */
  readonly energiaGasta = output<number>();

  /** Flag "Rolagem oculta" + caminho de registro, compartilhados com o card da ficha (item 5). */
  protected readonly registro = inject(FichaRolagemRegistroService);

  /** Atributos **para dados** (lesão + ajuste manual) — a mesma base que o teste de atributo rola. */
  protected readonly atributosParaDados = computed(() =>
    calcularAtributosParaDados(this.dados().atributos, this.dados().estado.lesoes, this.dados().dadosTeste ?? {}),
  );

  /** Proficiência derivada (nível; `null` para Civil) — fonte `PROF` das fórmulas (m3-22). */
  protected readonly proficiencia = computed(() =>
    calcularProficiencia({ classe: this.dados().classe, nivel: this.dados().nivel }),
  );

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
