import { Component, computed, input, output, signal } from '@angular/core';

import type { EncontroCombatenteResumoDto } from '@contratados-rpg/shared/dtos/encontro';
import { CombatenteOrigemEnum, NivelAmeacaEnum, TipoFichaEnum } from '@contratados-rpg/shared/enums';
import { calcularTurnosPorRodada } from '@contratados-rpg/shared/regras/encontro';

import { Icone } from '../../../../shared/icone/icone.component';
import { FocoImagem } from '../../../../shared/foco-imagem.directive';
import { ReceberDanoDialog } from '../../../../shared/receber-dano/receber-dano-dialog.component';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { rotuloNivelAmeaca } from '../../../ficha/rotulos-criatura';
import { rotuloClasseCompleto } from '../../../ficha/rotulos-ficha';

/**
 * Uma defesa exibida na faixa do cartão — só as que o combatente realmente possui. O `rotuloCurto`
 * é a forma que o mockup mobile usa (`Def · Esq · Blo · Con`); os dois viajam juntos porque a
 * troca é de **largura de tela**, decidida no CSS, e não de estado do componente.
 */
interface DefesaExibidaDto {
  readonly rotulo: string;
  readonly rotuloCurto: string;
  readonly valor: number;
}

/**
 * Cartão de um combatente na tela "Iniciativa" (m7-05) — fiel a
 * `docs/design/examples/iniciativa-desktop.html`: avatar hachurado com o selo de iniciativa
 * ancorado no canto, etiqueta de estado/natureza, linha de origem, nome, steppers de Vida/Energia,
 * faixa de defesas e chips de condição.
 *
 * **A regra vence o mockup (§16 #27).** O mockup desenha `Esquiva`/`Bloqueio`/`Contra` no cartão da
 * Ameaça, mas criatura **não reage a ataques** — `FichaCriaturaDadosDto` só tem `defesa`, e o
 * backend manda os outros três nulos. O cartão desenha **o que existe**: `defesas()` monta a faixa
 * a partir dos campos não-nulos, então a criatura mostra só Defesa e o avulso, defesa nenhuma.
 *
 * **Combatente não revelado (m7-06).** O backend já responde ao jogador com a Vida, as defesas e
 * as condições zeradas de quem ele não pode ver — o cartão não "esconde" nada, ele desenha o que
 * chegou. Só a linha `revelado: false` é lida diretamente, para trocar Vida por um traço em vez de
 * exibir um honesto porém confuso "0/0".
 *
 * O componente é **burro**: recebe o combatente já resolvido e emite intenções. Quem decide
 * permissão é a página (e, de verdade, o backend — §14).
 */
@Component({
  selector: 'app-cartao-combatente',
  imports: [Icone, Tooltip, FocoImagem, ReceberDanoDialog],
  templateUrl: './cartao-combatente.component.html',
  styleUrl: './cartao-combatente.component.scss',
})
export class CartaoCombatente {
  readonly combatente = input.required<EncontroCombatenteResumoDto>();

  /** `true` quando é a vez deste combatente — pinta o cartão com o accent e a etiqueta "Age agora". */
  readonly ehTurnoAtual = input(false);

  /** `true` quando ele já gastou todos os turnos desta rodada. */
  readonly jaAgiu = input(false);

  /**
   * `true` só com o combate em curso. Fora dele não existe "vez": em montagem ninguém agiu ainda e
   * num combate encerrado a etiqueta de turno seria uma informação morta — o cartão cai na etiqueta
   * de **natureza**, a mesma que criatura, NPC e avulso usam o tempo todo.
   */
  readonly emCombate = input(false);

  /** Nível de Ameaça da criatura, para a etiqueta "Ameaça · Alta". Nulo para os demais. */
  readonly nivelAmeaca = input<NivelAmeacaEnum | null>(null);

  /** Habilita os steppers de Vida/Energia — só o mestre, e só com o encontro mutável. */
  readonly podeAjustar = input(false);

  /** Modo de edição explícito: só então aparecem o campo de iniciativa e o botão de remover. */
  readonly emEdicao = input(false);

  /** Ajuste de Vida pedido pelos steppers (`-1`/`+1`). */
  readonly vidaAjustada = output<number>();
  /** Ajuste de Energia pedido pelos steppers (`-1`/`+1`). */
  readonly energiaAjustada = output<number>();
  /** Iniciativa digitada à mão pelo mestre (override / jogador ausente). */
  readonly iniciativaAtribuida = output<number>();
  /** Remoção do combatente pedida pelo botão de lixeira. */
  readonly removido = output<void>();
  /** Pedido de abrir a ficha completa deste combatente (janela flutuante — quem hospeda decide). */
  readonly abrirFicha = output<void>();

  /**
   * Steppers abertos (m7-08). Só tem efeito **no mobile**: o mockup de 360px desenha o cartão sem
   * steppers, e um `−`/`+` de 44px em cada recurso dobraria a altura de cada cartão. No desktop os
   * steppers ficam sempre visíveis e este sinal é ignorado pelo CSS — daí ele não ser um `input`
   * nem consultar `matchMedia`: quem sabe a largura da tela é a folha de estilo.
   */
  protected readonly ajustando = signal(false);

  /** Estado do dialog "Receber dano" (m7-17) — sem resistência automática aqui: o cartão não
   *  carrega a ficha completa, só o resumo do encontro (`EncontroCombatenteResumoDto`). */
  protected readonly receberDanoAberto = signal(false);

  protected readonly TipoFichaEnum = TipoFichaEnum;

  /** Quantos turnos ele tem na rodada — o motor puro decide, não este componente. */
  protected readonly turnosPorRodada = computed(() =>
    calcularTurnosPorRodada(this.combatente().cadencia),
  );

  /**
   * `true` quando quem está olhando pode ver a ficha deste combatente. O mestre recebe sempre
   * `true`; o jogador, só nas fichas que já podia abrir fora do combate.
   */
  protected readonly revelado = computed(() => this.combatente().revelado);

  /** `true` para a ficha de jogador — o único combatente com as três condições narrativas. */
  protected readonly ehAgente = computed(
    () => this.combatente().tipoFicha === TipoFichaEnum.JOGADOR,
  );

  /**
   * `true` quando a "carteirinha" do agente (avatar, dono, classe/arquétipo) chegou mesmo sem
   * `revelado` (m7-16) — mesma identidade que `CampanhaRepository.listarMembros` já mostra fora do
   * encontro pra qualquer ficha não oculta. O backend só popula `donoNome` nesse caso; a ausência
   * já diz que a ficha está oculta ou que o combatente não é um agente.
   */
  protected readonly identidadeVisivel = computed(
    () => this.ehAgente() && this.combatente().donoNome !== null,
  );

  /**
   * Linha de origem do cartão: o agente mostra quem o joga e a classe/arquétipo, em duas linhas
   * (`\n` + `white-space: pre-line` no SCSS) — o nível fica de fora, a carteirinha identifica quem
   * é o agente, não avalia sua força. Os demais dizem de onde vieram, numa linha só. A Cadência só
   * entra quando de fato multiplica os turnos — "Cadência 1" seria ruído em todo agente (Cadência
   * é atributo de criatura; o agente é sempre Singular).
   */
  protected readonly linhaOrigem = computed<string>(() => {
    const sufixoCadencia =
      this.turnosPorRodada() > 1 ? ` · Cadência ${this.turnosPorRodada()}` : '';
    const combatenteAtual = this.combatente();
    // A carteirinha do agente vale tanto revelado quanto só-identidade — as duas populam
    // `donoNome` do mesmo jeito (m7-16); só os números diferem, e esta linha não os usa.
    if (this.identidadeVisivel()) {
      const classeLabel = combatenteAtual.classe
        ? rotuloClasseCompleto(combatenteAtual.classe, combatenteAtual.arquetipo)
        : 'Agente';
      return `${combatenteAtual.donoNome}\n${classeLabel}${sufixoCadencia}`;
    }
    // A Cadência fica: ela é visível de qualquer forma — quem age duas vezes na rodada age duas
    // vezes na frente de todo mundo.
    if (!this.revelado()) {
      return `Em campo${sufixoCadencia}`;
    }
    if (combatenteAtual.origem === CombatenteOrigemEnum.AVULSO) {
      return `Digitado nesta sessão${sufixoCadencia}`;
    }
    if (combatenteAtual.tipoFicha === TipoFichaEnum.CRIATURA) {
      return `Criatura da campanha${sufixoCadencia}`;
    }
    if (combatenteAtual.tipoFicha === TipoFichaEnum.JOGADOR) {
      return `Agente${sufixoCadencia}`;
    }
    return `Adicionado pelo mestre${sufixoCadencia}`;
  });

  /**
   * Etiqueta do topo do cartão. O agente mostra o **estado** no combate (Morrendo tem precedência
   * sobre a vez); criatura, NPC e avulso mostram a **natureza**, como no mockup.
   */
  protected readonly etiqueta = computed<{ texto: string; variante: string } | null>(() => {
    const combatenteAtual = this.combatente();
    // Sem revelação **nem** identidade visível não há natureza **nem** estado a anunciar. Dizer
    // "Ameaça · Alta" entregaria metade do que o mestre está guardando; um agente de identidade
    // visível (m7-16), porém, já mostra a carteirinha na linha de origem — a etiqueta segue pro
    // estado de turno normalmente, que é público (ordem/iniciativa sempre foram).
    if (!this.revelado() && !this.identidadeVisivel()) {
      return { texto: 'Não revelado', variante: 'neutro' };
    }
    if (this.ehAgente()) {
      if (this.revelado() && combatenteAtual.morrendo) {
        return { texto: 'Morrendo', variante: 'perigo' };
      }
      if (this.emCombate()) {
        if (this.ehTurnoAtual()) {
          return { texto: 'Age agora', variante: 'ativo' };
        }
        return this.jaAgiu()
          ? { texto: 'Já agiu', variante: 'neutro' }
          : { texto: 'Aguarda', variante: 'neutro' };
      }
      return { texto: 'Agente', variante: 'neutro' };
    }
    if (combatenteAtual.origem === CombatenteOrigemEnum.AVULSO) {
      return { texto: 'Avulso', variante: 'neutro' };
    }
    if (combatenteAtual.tipoFicha === TipoFichaEnum.CRIATURA) {
      const na = this.nivelAmeaca();
      return {
        texto: na ? `Ameaça · ${rotuloNivelAmeaca(na)}` : 'Ameaça',
        variante: 'ameaca',
      };
    }
    return { texto: 'Aliado NPC', variante: 'neutro' };
  });

  /**
   * As defesas que este combatente **de fato** possui. A criatura chega com Esquiva/Bloqueio/
   * Contra nulos (ela não reage — a regra vence o mockup), então a faixa dela sai só com Defesa;
   * o avulso, sem nenhuma, e a faixa não é desenhada.
   */
  protected readonly defesas = computed<readonly DefesaExibidaDto[]>(() => {
    const combatenteAtual = this.combatente();
    const candidatas: readonly (readonly [string, string, number | null])[] = [
      ['Defesa', 'Def', combatenteAtual.defesa],
      ['Esquiva', 'Esq', combatenteAtual.esquiva],
      ['Bloqueio', 'Blo', combatenteAtual.bloqueio],
      ['Contra', 'Con', combatenteAtual.contraAtaque],
    ];
    return candidatas
      .filter((trio): trio is readonly [string, string, number] => trio[2] !== null)
      .map(([rotulo, rotuloCurto, valor]) => ({ rotulo, rotuloCurto, valor }));
  });

  /** `true` quando o combatente tem Energia — agente e NPC têm; criatura e avulso, não. */
  protected readonly temEnergia = computed(() => this.combatente().energiaMaxima !== null);

  /**
   * Rodapé narrativo do cartão: as condições da ficha que quem joga alternou à mão
   * (`morrendo`/`machucado`/`inconsciente` — m3-10), lidas e nunca deduzidas da Vida. "Morrendo"
   * fica de fora porque já é a etiqueta do topo.
   */
  protected readonly estadoNarrativo = computed<string | null>(() => {
    const combatenteAtual = this.combatente();
    const marcas: string[] = [];
    if (combatenteAtual.inconsciente) {
      marcas.push('Inconsciente · perde o turno');
    }
    if (combatenteAtual.machucado) {
      marcas.push('Machucado');
    }
    return marcas.length > 0 ? marcas.join(' · ') : null;
  });

  /** Abre/fecha os steppers do cartão (só o mobile os esconde). */
  protected alternarAjuste(): void {
    this.ajustando.update((aberto) => !aberto);
  }

  /**
   * Abate o total já efetivo do dialog "Receber dano" (m7-17) — clampado à Vida atual do
   * combatente, mesmo piso 0 que os steppers já respeitam via `[disabled]`. Sem o clamp, um dano
   * maior que a Vida atual gera um delta que o backend rejeita inteiro (`vidaAtual` não pode ficar
   * negativa), e a Vida não muda — o dono do dialog nunca vê o valor negativo, só o efeito.
   */
  protected receberDano(total: number): void {
    const delta = -Math.min(total, this.combatente().vidaAtual);
    this.vidaAjustada.emit(delta);
  }

  /** Repassa a iniciativa digitada, ignorando o campo vazio ou não-numérico. */
  protected confirmarIniciativa(valorBruto: string): void {
    const valor = Number(valorBruto);
    if (valorBruto.trim() !== '' && Number.isFinite(valor)) {
      this.iniciativaAtribuida.emit(Math.trunc(valor));
    }
  }
}
