import { Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { filter } from 'rxjs';

import type { EncontroCombatenteResumoDto } from '@contratados-rpg/shared/dtos/encontro';
import type { FichaAtributosDto, FichaRecuperadaDto } from '@contratados-rpg/shared/dtos/ficha';
import { RolagemVisibilidadeEnum } from '@contratados-rpg/shared/enums';
import type { ResultadoRolagemDto } from '@contratados-rpg/shared/regras/rolagem';
import { rolarFormula } from '@contratados-rpg/shared/regras/rolagem';

import { BandejaDadosService } from '../../../../shared/bandeja-dados/bandeja-dados.service';
import { BandejaDados } from '../../../../shared/bandeja-dados/bandeja-dados.component';
import { CalculadoraFlutuante } from '../../../../shared/calculadora-flutuante/calculadora-flutuante.component';
import { HistoricoRolagensSidebar } from '../../../../shared/historico-rolagens-sidebar/historico-rolagens-sidebar.component';
import { HistoricoRolagensJanelaService } from '../../../../shared/historico-rolagens-sidebar/historico-rolagens-janela.service';
import { Icone } from '../../../../shared/icone/icone.component';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { NotificacaoService } from '../../../../shared/ui/notificacao/notificacao.service';
import { BotaoIcone } from '../../../../shared/ui/botao-icone/botao-icone.component';
import { Chip } from '../../../../shared/ui/chip/chip.component';
import { ColunaAcoes } from '../../../../shared/ui/coluna-acoes/coluna-acoes.component';
import { ColunaAcoesItem } from '../../../../shared/ui/coluna-acoes/coluna-acoes-item.component';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto.component';
import { EstadoVazio } from '../../../../shared/ui/estado-vazio/estado-vazio.component';
import { SessaoService } from '../../../../core/services/sessao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { CadernoFlutuante } from '../../../pagina-caderno/caderno-flutuante.component';
import { FichaCampanhaCard } from '../../../ficha/componentes/ficha-campanha-card/ficha-campanha-card.component';
import { FichaFlutuante } from '../../../ficha/componentes/ficha-flutuante/ficha-flutuante.component';
import { FichaEdicaoService } from '../../../ficha/ficha-edicao.service';
import { FichaRolagemRegistroService } from '../../../ficha/ficha-rolagem-registro.service';
import { FichaService } from '../../../ficha/ficha.service';
import { rolarIniciativaDaFicha } from '../../../ficha/rolar-iniciativa';
import { AcaoJogador } from '../../componentes/acao-jogador/acao-jogador.component';
import { CartaoCombatente } from '../../componentes/cartao-combatente/cartao-combatente.component';
import { TrilhaTurnos } from '../../componentes/trilha-turnos/trilha-turnos.component';
import { EncontroService } from '../../encontro.service';
import { resolverFichaParaAbrir, turnosAteAVez } from '../../encontro-leitura.util';
import { rotuloStatusEncontro } from '../../rotulos-encontro';
import { EncontroPainelDadosService } from '../painel/encontro-painel-dados.service';

/**
 * Ambiente de atributos da rolagem de iniciativa com fórmula customizada. A fórmula (`XD6+N`)
 * **não referencia nenhuma fonte de atributo**, então o mapa só existe para satisfazer o contrato
 * de `rolarFormula` e todos os valores podem ser zero sem afetar o resultado.
 */
const ATRIBUTOS_NEUTROS: FichaAtributosDto = {
  destreza: 0,
  forca: 0,
  luta: 0,
  pontaria: 0,
  vigor: 0,
  intelecto: 0,
  medicina: 0,
  sentidos: 0,
  social: 0,
  vontade: 0,
};

/**
 * A tela **"Iniciativa" — visão do jogador** (m7-06, redesenhada na `ui-39`): a mesma composição
 * do mestre — coluna de ações, trilha de turnos, Rolagens fixas e palco —, em que a **própria
 * ficha** do jogador ocupa o palco inteiro e as ações dele (rolar a própria iniciativa, avançar o
 * próprio turno) moram num bloco no topo da trilha (`app-acao-jogador`).
 *
 * O jogador só vê o estado que o backend já recortou para ele (§14) e a única coisa que **escreve**
 * é a própria iniciativa, quando há o que rolar (a rolagem sai do preset da ficha dele, não de um
 * motor daqui) — e o avanço do turno, só na própria vez. Sem combatente com ficha em campo (quem
 * só assiste), o palco mostra a grade de leitura; sem encontro, um estado vazio.
 *
 * Extraída do antigo `PainelEncontro` monolítico. Quem a monta é `PainelEncontroShell`, e o dado e
 * o tempo real vêm de `EncontroPainelDadosService`. **Nenhuma regra vive aqui:** a ordem da rodada
 * e a Cadência chegam prontas do backend; o que a tela deriva é só apresentação.
 */
@Component({
  selector: 'app-painel-encontro-jogador',
  imports: [
    RouterLink,
    Icone,
    Tooltip,
    CalculadoraFlutuante,
    HistoricoRolagensSidebar,
    CadernoFlutuante,
    CartaoCombatente,
    AcaoJogador,
    TrilhaTurnos,
    ColunaAcoes,
    ColunaAcoesItem,
    Chip,
    FichaCampanhaCard,
    FichaFlutuante,
    BandejaDados,
    BotaoIcone,
    Esqueleto,
    EstadoVazio,
  ],
  templateUrl: './painel-jogador.page.html',
  styleUrl: './painel-jogador.page.scss',
  // O jogador rola a própria iniciativa **daqui**, e essa rolagem tem de entrar no feed da campanha
  // como qualquer outra (m3-27); e a própria ficha dele fica sempre aberta no palco. Nenhum dos dois
  // serviços é `providedIn: 'root'`: cada página que hospeda uma ficha declara a própria instância e
  // a prende a uma ficha só (mesmo padrão de `CampanhaDetalhe`). A ficha de um combatente **clicado**
  // (a grade de leitura) é outra história: ela vive isolada dentro de `FichaFlutuante`, com a
  // própria instância desses serviços.
  providers: [FichaRolagemRegistroService, FichaEdicaoService],
})
export class PainelEncontroJogador {
  protected readonly dados = inject(EncontroPainelDadosService);
  protected readonly janelaHistorico = inject(HistoricoRolagensJanelaService);
  private readonly encontroService = inject(EncontroService);
  private readonly fichaService = inject(FichaService);
  private readonly tempoRealService = inject(TempoRealService);
  private readonly notificacaoService = inject(NotificacaoService);
  private readonly sessaoService = inject(SessaoService);
  private readonly bandeja = inject(BandejaDadosService);
  private readonly rolagemRegistro = inject(FichaRolagemRegistroService);
  /** Edição da própria ficha, aberta no palco — não a do combatente clicado, que vive isolada
   *  dentro de `FichaFlutuante`. */
  protected readonly fichaEdicao = inject(FichaEdicaoService);

  /** Referência à janela flutuante de ficha (a grade de leitura e o "Ver ficha" do Caderno). */
  private readonly fichaFlutuanteRef = viewChild<FichaFlutuante>('fichaFlutuante');

  /** Janelas abertas pela coluna de ações — sem gatilho próprio. */
  private readonly calculadoraRef = viewChild<CalculadoraFlutuante>('calculadora');
  private readonly cadernoRef = viewChild<CadernoFlutuante>('caderno');
  /** Caderno aberto (mesmo minimizado) — marca o item "Caderno" da coluna de ações. */
  protected readonly cadernoAberto = computed(() => this.cadernoRef()?.aberto() ?? false);
  /** Janela da calculadora aberta — marca o item "Calculadora" da coluna de ações. */
  protected readonly calculadoraAberta = signal(false);

  protected readonly rotuloStatusEncontro = rotuloStatusEncontro;

  /** O mestre pediu a iniciativa e este sinal acende o chamado no bloco de ação (m7-04/m7-06). */
  protected readonly iniciativaPedida = signal(false);

  /** Ids das fichas que **este** usuário joga nesta campanha. */
  private readonly minhasFichaIds = computed<ReadonlySet<number>>(() => {
    const usuarioId = this.sessaoService.usuario()?.id;
    const meuMembro = (this.dados.membros() ?? []).find((membro) => membro.usuarioId === usuarioId);
    return new Set((meuMembro?.fichas ?? []).map((ficha) => ficha.id));
  });

  /**
   * O combatente do próprio jogador no encontro — o único que ele pode mexer, e só na iniciativa.
   * `null` para quem está assistindo sem ficha em campo.
   */
  protected readonly meuCombatente = computed<EncontroCombatenteResumoDto | null>(() => {
    const minhas = this.minhasFichaIds();
    return (
      this.dados
        .combatentes()
        .find((combatente) => combatente.fichaId !== null && minhas.has(combatente.fichaId)) ??
      null
    );
  });

  /** `fichaId` do próprio combatente — `null` para quem assiste sem ficha em campo. */
  private readonly meuFichaId = computed(() => this.meuCombatente()?.fichaId ?? null);

  /**
   * Documento completo da própria ficha — `fichasCampanha()`/`FichaResumoDto` não carrega `dados`,
   * que é o que `<app-ficha-campanha-card>` do palco precisa. Buscado pelo `effect` do construtor
   * sempre que `meuFichaId` muda (o mesmo padrão de `CampanhaDetalhe`).
   */
  protected readonly meuFichaDados = signal<FichaRecuperadaDto | null>(null);

  /**
   * A ficha do jogador está no palco (há encontro e combatente com ficha em campo). Decide o
   * recorte do mobile: a barra da ficha embutida ocupa o rodapé, então a coluna de ações cede o
   * lugar às ferramentas no cabeçalho.
   */
  protected readonly comFichaEmCampo = computed(
    () => !this.dados.carregando() && this.dados.encontro() !== null && this.meuCombatente() !== null,
  );

  /** O turno atual pertence ao combatente controlado pelo jogador que abriu a tela. */
  protected readonly ehMinhaVez = computed(
    () =>
      this.dados.combatenteDaVezId() !== null &&
      this.dados.combatenteDaVezId() === this.meuCombatente()?.id,
  );

  /**
   * `true` quando o jogador tem o que rolar: seu combatente está em campo, ainda sem iniciativa, e
   * o encontro está em montagem. O chamado do mestre (`iniciativaPedida`) destaca o bloco, mas não
   * é pré-requisito — quem chegou atrasado à mesa rola sem esperar um segundo pedido.
   */
  protected readonly possoRolarIniciativa = computed(
    () =>
      this.dados.emMontagem() &&
      this.meuCombatente() !== null &&
      this.meuCombatente()?.iniciativa === null,
  );

  /** Turnos até a vez do jogador, para o "Faltam N turnos" do bloco de ação. */
  protected readonly turnosAteMinhaVez = computed(() => {
    const meuId = this.meuCombatente()?.id;
    return meuId === undefined ? null : turnosAteAVez(this.dados.encontro(), meuId);
  });

  /** Último `combatenteDaVezId` já avisado ao jogador — evita repetir o toast a cada broadcast. */
  private ultimoAvisoDeVezId: number | null = null;

  constructor() {
    // O mestre chamou os jogadores a rolar. É só um chamado — nenhum estado muda por aqui (§9).
    this.tempoRealService.encontroIniciativaPedido$
      .pipe(
        filter((evento) => evento.campanhaId === this.dados.campanhaId),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: () => {
          this.iniciativaPedida.set(true);
          this.notificacaoService.notificar({
            severidade: 'informacao',
            resumo: 'Role sua iniciativa',
            detalhe: 'O mestre pediu a iniciativa do esquadrão.',
          });
        },
      });

    // Liga a ficha do jogador (palco) desde já: `meuFichaId` ainda não tem valor no primeiro tick
    // (falta carregar), mas `inicializar` só lê o getter depois, na hora de gravar — não precisa
    // esperar.
    this.fichaEdicao.inicializar(this.meuFichaDados, () => this.meuFichaId()!);
    this.rolagemRegistro.inicializar(() => this.meuFichaId());
    this.rolagemRegistro.registrada$
      .pipe(takeUntilDestroyed())
      .subscribe({ next: (rolagem) => this.dados.adicionarRolagemAoFeed(rolagem) });

    // Busca o documento completo sempre que `meuFichaId` muda (chegada em campo, ou o combatente
    // sai e volta) — mesmo padrão de `CampanhaDetalhe` (`fichaExibidaId`/`fichaExibidaDados`).
    effect(() => {
      const fichaId = this.meuFichaId();
      if (fichaId === null) {
        untracked(() => this.meuFichaDados.set(null));
        return;
      }
      this.fichaService.recuperarFicha(fichaId).subscribe({
        next: (ficha) =>
          untracked(() => {
            this.meuFichaDados.set(ficha);
            this.fichaEdicao.definirBase(ficha);
          }),
      });
    });

    // O bloco de ação mostra persistentemente de quem é a vez; este toast só chama atenção quando a
    // vez do jogador chega.
    effect(() => {
      const daVezId = this.dados.combatenteDaVezId();
      const meuId = this.meuCombatente()?.id ?? null;
      if (daVezId !== null && daVezId === meuId && daVezId !== this.ultimoAvisoDeVezId) {
        this.ultimoAvisoDeVezId = daVezId;
        this.notificacaoService.notificar({
          severidade: 'informacao',
          resumo: 'Sua vez!',
          detalhe: 'É a sua vez de agir no combate.',
        });
      }
    });
  }

  /** Abre a ficha do combatente clicado (grade de leitura) na janela flutuante. */
  protected abrirFichaFlutuante(combatente: EncontroCombatenteResumoDto): void {
    if (combatente.fichaId === null) {
      return;
    }
    this.tentarAbrirFichaFlutuante(combatente.fichaId, combatente.tipoFicha);
  }

  /** "Ver ficha" disparado de dentro das Anotações (`app-caderno-flutuante`) — só o `fichaId`. */
  protected abrirFichaFlutuanteDeAnotacoes(fichaId: number): void {
    const tipo = this.dados.fichasCampanha().find((ficha) => ficha.id === fichaId)?.tipo ?? null;
    this.tentarAbrirFichaFlutuante(fichaId, tipo);
  }

  private tentarAbrirFichaFlutuante(
    fichaId: number,
    tipo: EncontroCombatenteResumoDto['tipoFicha'],
  ): void {
    const alvo = resolverFichaParaAbrir(fichaId, tipo, this.dados.fichasCampanha());
    if (alvo) {
      this.fichaFlutuanteRef()?.abrir(alvo);
    }
  }

  /**
   * Alterna a janela da calculadora pelo método do próprio componente — só
   * `CalculadoraFlutuante.alternar()` sabe restaurar em vez de fechar quando a janela está aberta
   * **minimizada** (mesmo racional de `detalhe-mestre`).
   */
  protected alternarCalculadora(): void {
    this.calculadoraRef()?.alternar();
  }

  /** Alterna a janela do caderno — mesmo racional de `alternarCalculadora()`. */
  protected alternarCaderno(): void {
    this.cadernoRef()?.alternar();
  }

  /**
   * O jogador rola a **própria** iniciativa e a atribui ao seu combatente.
   *
   * A rolagem sai do preset "Iniciativa" da ficha dele (`rolarIniciativaDaFicha`), com o dado extra
   * de `Atento` e da Formação da Origem já embutido — o mesmo caminho do botão de Iniciativa dentro
   * da ficha, e por isso o mesmo número. É esta a razão de o jogador rolar em vez do mestre: o
   * bônus dele são **dados**, e só o documento completo os resolve (o `Rolar iniciativas` do
   * mestre, que enxerga só o resumo do combatente, é fallback para jogador ausente).
   *
   * Com `iniciativaFormulaCustom` (m7-19), o mestre sobrescreveu a fórmula inteira do combatente —
   * ela vale mesmo aqui, sem buscar a ficha nem somar o dado extra de Formação.
   *
   * O resultado aparece na bandeja e entra no feed da campanha como qualquer outra rolagem (m3-27),
   * antes de virar a iniciativa do combatente.
   */
  protected rolarMinhaIniciativa(): void {
    const combatente = this.meuCombatente();
    if (!combatente || combatente.fichaId === null || this.dados.emOperacao()) {
      return;
    }
    if (combatente.iniciativaFormulaCustom) {
      const resultado = rolarFormula({
        formula: combatente.iniciativaFormulaCustom,
        atributos: ATRIBUTOS_NEUTROS,
      });
      if (resultado) {
        this.concluirRolagemDeIniciativa(
          combatente,
          { rotulo: 'Iniciativa', formula: combatente.iniciativaFormulaCustom, resultado },
          combatente.corFicha,
        );
      }
      return;
    }
    this.dados.executar(this.fichaService.recuperarFicha(combatente.fichaId), (ficha) => {
      const executado = rolarIniciativaDaFicha(ficha.dados);
      if (!executado) {
        this.notificacaoService.notificar({
          severidade: 'aviso',
          resumo: 'Sem preset de Iniciativa',
          detalhe: 'Sua ficha não tem a rolagem "Iniciativa" — peça ao mestre para atribuí-la.',
        });
        return;
      }
      this.concluirRolagemDeIniciativa(combatente, executado, ficha.cor);
    });
  }

  /** Mostra a bandeja, registra a rolagem no feed e atribui o total como iniciativa do combatente. */
  private concluirRolagemDeIniciativa(
    combatente: EncontroCombatenteResumoDto,
    passo: {
      readonly rotulo: string;
      readonly formula: string;
      readonly resultado: ResultadoRolagemDto;
    },
    corFicha: string | null,
  ): void {
    this.bandeja.mostrar({
      rotulo: passo.rotulo,
      formula: passo.formula,
      resultado: passo.resultado,
      corFicha,
      visibilidade: this.rolagemRegistro.oculta()
        ? RolagemVisibilidadeEnum.PRIVADA
        : RolagemVisibilidadeEnum.PUBLICA,
    });
    this.rolagemRegistro.inicializar(() => combatente.fichaId);
    this.rolagemRegistro.registrar({
      rotulo: passo.rotulo,
      formula: passo.formula,
      resultado: passo.resultado,
    });
    this.iniciativaPedida.set(false);
    this.dados.executarNoEncontro(
      this.encontroService.atribuirIniciativa({
        id: combatente.id,
        iniciativa: passo.resultado.total,
      }),
    );
  }
}
