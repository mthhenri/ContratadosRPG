import {
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { of, switchMap } from 'rxjs';

import type {
  EncontroCombatenteResumoDto,
  EncontroResumoDto,
} from '@contratados-rpg/shared/dtos/encontro';
import type { FichaAtributosDto, FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';
import { CadenciaEnum, EncontroStatusEnum } from '@contratados-rpg/shared/enums';
import { rolarFormula } from '@contratados-rpg/shared/regras/rolagem';

import { BandejaDados } from '../../../../shared/bandeja-dados/bandeja-dados.component';
import { CalculadoraFlutuante } from '../../../../shared/calculadora-flutuante/calculadora-flutuante.component';
import { HistoricoRolagensSidebar } from '../../../../shared/historico-rolagens-sidebar/historico-rolagens-sidebar.component';
import { Icone } from '../../../../shared/icone/icone.component';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { ConfirmacaoService } from '../../../../shared/ui/confirmacao/confirmacao.service';
import { NotificacaoService } from '../../../../shared/ui/notificacao/notificacao.service';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { BotaoIcone } from '../../../../shared/ui/botao-icone/botao-icone.component';
import { Campo } from '../../../../shared/ui/campo/campo.component';
import { Chip } from '../../../../shared/ui/chip/chip.component';
import { ColunaAcoes } from '../../../../shared/ui/coluna-acoes/coluna-acoes.component';
import { ColunaAcoesItem } from '../../../../shared/ui/coluna-acoes/coluna-acoes-item.component';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto.component';
import { EstadoVazio } from '../../../../shared/ui/estado-vazio/estado-vazio.component';
import { Modal } from '../../../../shared/ui/modal/modal.component';
import { AutoFocus } from '../../../../shared/auto-focus/auto-focus.directive';
import { CadernoFlutuante } from '../../../pagina-caderno/caderno-flutuante.component';
import { FichaFlutuante } from '../../../ficha/componentes/ficha-flutuante/ficha-flutuante.component';
import { nomeCadencia } from '../../../ficha/rotulos-criatura';
import { CartaoCombatente } from '../../componentes/cartao-combatente/cartao-combatente.component';
import { ConducaoTurno } from '../../componentes/conducao-turno/conducao-turno.component';
import { ResumoCombatente } from '../../componentes/resumo-combatente/resumo-combatente.component';
import { RolagemAvulso } from '../../componentes/rolagem-avulso/rolagem-avulso.component';
import { SeletorCombatentes } from '../../componentes/seletor-combatentes/seletor-combatentes.component';
import { TrilhaTurnos } from '../../componentes/trilha-turnos/trilha-turnos.component';
import { EncontroService } from '../../encontro.service';
import { resolverFichaParaAbrir } from '../../encontro-leitura.util';
import { rotuloStatusEncontro } from '../../rotulos-encontro';
import { EncontroPainelDadosService } from '../painel/encontro-painel-dados.service';

/**
 * Ambiente de atributos da rolagem de `Rolar tudo`. A fórmula montada (`XD6+N`) **não referencia
 * nenhuma fonte de atributo** — a quantidade de dados já vem resolvida da Destreza efetiva do
 * combatente —, então o mapa existe só para satisfazer o contrato de `rolarFormula` e todos os
 * valores podem ser zero sem afetar o resultado.
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
 * A tela **"Iniciativa" — visão do mestre** (m7-05, `ui-37`/`ui-38`), fiel a
 * `docs/design/examples/iniciativa-desktop.html`. Monta o encontro (adicionar ficha da campanha ou
 * avulso, atribuir iniciativa), conduz (avançar/voltar turno, dano/cura) e encerra. Com um encontro
 * carregado, a tela é o palco da `ui-37`: coluna de ações, trilha de turnos, condução, ficha
 * resumida de quem age, grade de combatentes e a coluna fixa de rolagens; sem encontro, a mesma
 * casca com um estado vazio (`ui-38`).
 *
 * Extraída do antigo `PainelEncontro` monolítico (`ui-39`), que alternava mestre e jogador por
 * `@if`. Quem a monta é `PainelEncontroShell`, e o dado e o tempo real vêm de
 * `EncontroPainelDadosService`. Enquanto o papel ainda é desconhecido (membros a caminho) a
 * casca também monta esta página, que já traz o esqueleto de carregamento da visão do mestre —
 * quem carrega não "pula" de uma visão para outra.
 *
 * A separação é de UI; quem barra de verdade é o backend (§14), que recorta o próprio payload por
 * usuário antes de responder e de transmitir. **Nenhuma regra vive aqui:** a ordem da rodada e a
 * intercalação de Cadência chegam prontas do backend (`ordemRodada`, `shared/regras/encontro`); o
 * `Rolar iniciativas` usa o motor de rolagem do shared (`rolarFormula`), não um `Math.random`.
 */
@Component({
  selector: 'app-painel-encontro-mestre',
  imports: [
    DatePipe,
    NgTemplateOutlet,
    AutoFocus,
    RouterLink,
    ReactiveFormsModule,
    Icone,
    Tooltip,
    CalculadoraFlutuante,
    HistoricoRolagensSidebar,
    CadernoFlutuante,
    CartaoCombatente,
    ConducaoTurno,
    ResumoCombatente,
    TrilhaTurnos,
    ColunaAcoes,
    ColunaAcoesItem,
    Chip,
    FichaFlutuante,
    SeletorCombatentes,
    RolagemAvulso,
    BandejaDados,
    Botao,
    BotaoIcone,
    Campo,
    Esqueleto,
    EstadoVazio,
    Modal,
  ],
  templateUrl: './painel-mestre.page.html',
  styleUrl: './painel-mestre.page.scss',
  // `Escape` fecha o menu de encerrados mesmo com o foco fora dele (o menu não fecha por clique-fora,
  // como o dropdown de perfil da topbar) — o método só age com o menu aberto.
  host: { '(document:keydown.escape)': 'fecharHistoricoPeloTeclado()' },
})
export class PainelEncontroMestre {
  protected readonly dados = inject(EncontroPainelDadosService);
  private readonly encontroService = inject(EncontroService);
  private readonly notificacaoService = inject(NotificacaoService);
  private readonly confirmacaoService = inject(ConfirmacaoService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly roteador = inject(Router);

  /** Referência à janela flutuante de ficha (o mestre olhando qualquer combatente) — aberta
   *  imperativamente por `abrirFichaFlutuante`. */
  private readonly fichaFlutuanteRef = viewChild<FichaFlutuante>('fichaFlutuante');

  /** Janelas abertas pela coluna de ações do mestre (`ui-37`) — sem gatilho próprio. */
  private readonly calculadoraRef = viewChild<CalculadoraFlutuante>('calculadora');
  /** Gatilho "N encerrados" — recebe o foco de volta quando o menu fecha por `Escape`. */
  private readonly historicoGatilho = viewChild('historicoGatilho', { read: ElementRef });
  private readonly cadernoRef = viewChild<CadernoFlutuante>('caderno');
  /** Caderno aberto (mesmo minimizado) — marca o item "Caderno" da coluna de ações. */
  protected readonly cadernoAberto = computed(() => this.cadernoRef()?.aberto() ?? false);

  /** Janela da calculadora aberta — marca o item "Calculadora" da coluna de ações. */
  protected readonly calculadoraAberta = signal(false);

  /** Encontros já encerrados, do mais recente para o mais antigo — o histórico da campanha. */
  protected readonly historico = computed<readonly EncontroResumoDto[]>(() =>
    this.dados
      .encontrosDaCampanha()
      .filter((resumo) => resumo.status === EncontroStatusEnum.ENCERRADO)
      .filter((resumo) => resumo.id !== this.dados.encontro()?.id),
  );

  /** `true` quando a campanha tem um combate em montagem ou em andamento (não só encerrados). */
  protected readonly temCombateAberto = computed(() =>
    this.dados
      .encontrosDaCampanha()
      .some((resumo) => resumo.status !== EncontroStatusEnum.ENCERRADO),
  );

  /** Lista de encontros anteriores aberta. */
  protected readonly historicoAberto = signal(false);

  /** Modo de edição explícito: só nele aparecem o campo de iniciativa e o remover de cada cartão. */
  protected readonly modoEdicao = signal(false);
  protected readonly avulsoRolando = signal<EncontroCombatenteResumoDto | null>(null);
  private readonly rolagensOcultasAvulso = signal<Readonly<Record<number, boolean>>>({});

  /**
   * Seletor de combatentes aberto — os cartões sumarizados de agentes/criaturas/NPCs da campanha,
   * clicáveis para entrar ou sair do encontro. Reabrir mostra marcado quem já está em campo.
   */
  protected readonly selecionandoCombatentes = signal(false);

  /** Painel de adicionar avulso aberto — fluxo à parte, porque não há ficha nenhuma para escolher. */
  protected readonly adicionandoAvulso = signal(false);

  protected readonly EncontroStatusEnum = EncontroStatusEnum;
  protected readonly CadenciaEnum = CadenciaEnum;
  protected readonly rotuloStatusEncontro = rotuloStatusEncontro;
  protected readonly nomeCadencia = nomeCadencia;
  protected readonly cadencias = Object.values(CadenciaEnum);

  /** Dialog "Novo combate" aberto — o mestre nomeia o encontro e a montagem começa (`ui-38`). */
  protected readonly criandoEncontro = signal(false);

  /** Formulário de criação do encontro (quando a campanha ainda não tem um aberto). */
  protected readonly formularioCriacao = this.formBuilder.nonNullable.group({
    nome: ['', [Validators.required, Validators.maxLength(120)]],
  });

  /**
   * Formulário do combatente avulso — a ficha da campanha entra pelo seletor de cartões
   * (`SeletorCombatentes`), não por aqui; este formulário só existe para quem não tem ficha.
   */
  protected readonly formularioAvulso = this.formBuilder.nonNullable.group({
    nomeAvulso: ['', [Validators.required, Validators.maxLength(120)]],
    vidaMaximaAvulso: [10, [Validators.required, Validators.min(1)]],
    cadencia: [CadenciaEnum.SINGULAR],
    turnosPorRodada: [4, [Validators.required, Validators.min(4)]],
    corAvulso: ['#d53030', [Validators.required, Validators.pattern(/^#[0-9a-f]{6}$/i)]],
  });

  /** Arquivo e prévia locais; o upload só começa depois que o combatente recebe um id. */
  protected readonly imagemAvulsoArquivo = signal<File | null>(null);
  protected readonly imagemAvulsoPreview = signal<string | null>(null);

  /** Abre a ficha do combatente clicado na janela flutuante. */
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

  /**
   * Avulso (`tipoFicha: null`) e NPC (sem ficha na campanha ainda) não têm o que abrir; o dono vem
   * do resumo já carregado (`fichasCampanha()`), não de uma nova consulta.
   */
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
   * Alterna a janela da calculadora pelo método do próprio componente, não `calculadoraAberta.set(
   * !calculadoraAberta())` — só `CalculadoraFlutuante.alternar()` sabe restaurar em vez de fechar
   * quando a janela está aberta **minimizada** (mesmo racional de `detalhe-mestre`).
   */
  protected alternarCalculadora(): void {
    this.calculadoraRef()?.alternar();
  }

  /** Alterna a janela do caderno — mesmo racional de `alternarCalculadora()`. */
  protected alternarCaderno(): void {
    this.cadernoRef()?.alternar();
  }

  // ── Montagem ───────────────────────────────────────────────────────────────

  /** Abre o dialog "Novo combate" com o campo limpo. */
  protected abrirNovoCombate(): void {
    this.formularioCriacao.reset({ nome: '' });
    this.criandoEncontro.set(true);
  }

  /** Fecha o dialog sem criar nada. */
  protected fecharNovoCombate(): void {
    this.criandoEncontro.set(false);
  }

  /** Cria o encontro da campanha e já abre o painel de montagem. */
  protected criarEncontro(): void {
    if (this.formularioCriacao.invalid || this.dados.emOperacao()) {
      return;
    }
    this.dados.executar(
      this.encontroService.criarEncontro(this.dados.campanhaId, {
        nome: this.formularioCriacao.getRawValue().nome.trim(),
      }),
      (criado) => {
        this.formularioCriacao.reset({ nome: '' });
        this.criandoEncontro.set(false);
        this.encontroService
          .recuperarEncontro(criado.id)
          .subscribe({ next: (estado) => this.dados.definirEncontro(estado) });
      },
    );
  }

  /** Abre/fecha o seletor de combatentes (cartões de agente/criatura/NPC). */
  protected alternarSelecaoCombatentes(): void {
    this.selecionandoCombatentes.update((aberto) => !aberto);
  }

  /** Abre/fecha o formulário do avulso. */
  protected alternarAdicaoAvulso(): void {
    this.adicionandoAvulso.update((aberto) => !aberto);
  }

  /** Cancela o avulso em digitação: limpa o formulário e fecha o painel. */
  protected cancelarAvulso(): void {
    this.formularioAvulso.reset({
      nomeAvulso: '',
      vidaMaximaAvulso: 10,
      cadencia: CadenciaEnum.SINGULAR,
      turnosPorRodada: 4,
      corAvulso: '#d53030',
    });
    this.imagemAvulsoArquivo.set(null);
    this.imagemAvulsoPreview.set(null);
    this.adicionandoAvulso.set(false);
  }

  /** Liga/desliga o modo de edição dos cartões (iniciativa à mão + remover). */
  protected alternarEdicao(): void {
    this.modoEdicao.update((ativo) => !ativo);
  }

  /**
   * O clique num cartão do seletor: se a ficha já tem um combatente no encontro, remove; senão,
   * adiciona. É o próprio `SeletorCombatentes` que já decide o "marcado" — aqui só se espelha essa
   * mesma leitura para escolher a chamada certa.
   */
  protected alternarFichaNoEncontro(ficha: FichaResumoDto): void {
    const encontroAtual = this.dados.encontro();
    if (!encontroAtual || this.dados.emOperacao()) {
      return;
    }
    const jaNoEncontro = this.dados
      .combatentes()
      .find((combatente) => combatente.fichaId === ficha.id);
    if (jaNoEncontro) {
      this.dados.executarNoEncontro(this.encontroService.removerCombatente(jaNoEncontro.id));
      return;
    }
    this.dados.executarNoEncontro(
      this.encontroService.adicionarCombatente(encontroAtual.id, {
        fichaId: ficha.id,
        nomeAvulso: null,
        vidaMaximaAvulso: null,
        cadencia: null,
      }),
    );
  }

  /** Adiciona o combatente avulso digitado no formulário. */
  protected adicionarAvulso(): void {
    const encontroAtual = this.dados.encontro();
    if (!encontroAtual || this.formularioAvulso.invalid || this.dados.emOperacao()) {
      return;
    }
    const valores = this.formularioAvulso.getRawValue();
    const idsAnteriores = new Set(encontroAtual.combatentes.map((combatente) => combatente.id));
    const arquivo = this.imagemAvulsoArquivo();
    const adicao = this.encontroService.adicionarCombatente(encontroAtual.id, {
      fichaId: null,
      nomeAvulso: valores.nomeAvulso.trim(),
      vidaMaximaAvulso: valores.vidaMaximaAvulso,
      cadencia: valores.cadencia,
      corAvulso: valores.corAvulso,
      ...(valores.cadencia === CadenciaEnum.FRENETICA
        ? { turnosPorRodada: valores.turnosPorRodada }
        : {}),
    });
    this.dados.executar(
      adicao.pipe(
        switchMap((estado) => {
          const novoAvulso = estado.combatentes.find(
            (combatente) => !idsAnteriores.has(combatente.id) && combatente.fichaId === null,
          );
          return arquivo && novoAvulso
            ? this.encontroService.alterarImagemAvulso(novoAvulso.id, arquivo)
            : of(estado);
        }),
      ),
      (estado) => {
        this.dados.definirEncontro(estado);
        this.formularioAvulso.reset({
          nomeAvulso: '',
          vidaMaximaAvulso: 10,
          cadencia: CadenciaEnum.SINGULAR,
          turnosPorRodada: 4,
          corAvulso: '#d53030',
        });
        this.imagemAvulsoArquivo.set(null);
        this.imagemAvulsoPreview.set(null);
      },
    );
  }

  /** Valida e prepara a prévia da imagem opcional do formulário. */
  protected selecionarImagemAvulso(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const arquivo = entrada.files?.[0];
    if (!arquivo) return;
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(arquivo.type) ||
      arquivo.size > 2 * 1024 * 1024
    ) {
      entrada.value = '';
      this.notificacaoService.notificar({
        severidade: 'aviso',
        resumo: 'Imagem inválida',
        detalhe: 'Use JPEG, PNG ou WEBP de até 2MB.',
      });
      return;
    }
    this.imagemAvulsoArquivo.set(arquivo);
    const leitor = new FileReader();
    leitor.onload = () => this.imagemAvulsoPreview.set(String(leitor.result));
    leitor.readAsDataURL(arquivo);
  }

  /** Persiste a cor escolhida no cartão editável do avulso. */
  protected alterarCorAvulso(combatente: EncontroCombatenteResumoDto, cor: string): void {
    this.dados.executarNoEncontro(
      this.encontroService.alterarIdentidadeAvulso(combatente.id, cor),
    );
  }

  /** Valida e substitui a imagem do cartão editável do avulso. */
  protected alterarImagemAvulso(combatente: EncontroCombatenteResumoDto, arquivo: File): void {
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(arquivo.type) ||
      arquivo.size > 2 * 1024 * 1024
    ) {
      this.notificacaoService.notificar({
        severidade: 'aviso',
        resumo: 'Imagem inválida',
        detalhe: 'Use JPEG, PNG ou WEBP de até 2MB.',
      });
      return;
    }
    this.dados.executarNoEncontro(this.encontroService.alterarImagemAvulso(combatente.id, arquivo));
  }

  /** Remove a imagem do cartão editável do avulso. */
  protected removerImagemAvulso(combatente: EncontroCombatenteResumoDto): void {
    this.dados.executarNoEncontro(this.encontroService.excluirImagemAvulso(combatente.id));
  }

  /** Visibilidade das próximas rolagens, preservada por avulso durante esta sessão da página. */
  protected rolagemAvulsoOculta(combatenteId: number): boolean {
    return this.rolagensOcultasAvulso()[combatenteId] ?? true;
  }

  protected alterarVisibilidadeRolagemAvulso(combatenteId: number, oculta: boolean): void {
    this.rolagensOcultasAvulso.update((atuais) => ({ ...atuais, [combatenteId]: oculta }));
  }

  /** Pede confirmação (ui-15) e remove um combatente do encontro — não tem desfazer. */
  protected removerCombatente(combatente: EncontroCombatenteResumoDto): void {
    this.confirmacaoService
      .confirmar({
        titulo: 'Remover combatente',
        mensagem: `Remover ${combatente.nome} do combate? Ele sai da lista de iniciativa.`,
        entidade: combatente.nome,
        rotuloConfirmar: 'Remover',
      })
      .then((confirmado) => {
        if (confirmado) {
          this.dados.executarNoEncontro(this.encontroService.removerCombatente(combatente.id));
        }
      });
  }

  /** Grava a iniciativa digitada à mão pelo mestre. */
  protected atribuirIniciativa(combatente: EncontroCombatenteResumoDto, valor: number): void {
    this.dados.executarNoEncontro(
      this.encontroService.atribuirIniciativa({ id: combatente.id, iniciativa: valor }),
    );
  }

  /**
   * Sobrescreve (ou remove, com `formula: null`) a expressão de dados de Iniciativa de um
   * combatente **neste encontro** (m7-19) — mestre-only, validada pelo backend.
   */
  protected alterarFormulaIniciativa(
    combatente: EncontroCombatenteResumoDto,
    formula: string | null,
  ): void {
    this.dados.executarNoEncontro(
      this.encontroService.alterarFormulaIniciativa({ id: combatente.id, formula }),
    );
  }

  /**
   * `Rolar iniciativas` — rola `XD6 + bônus` para **cada combatente sem iniciativa**, onde `X` é a
   * Destreza efetiva mais o dado extra de Iniciativa (m7-18, `dadoExtraIniciativa` — amplificador
   * `Atento` + Formação da Origem, já somados pelo backend) e o bônus é o fixo da criatura. O
   * backend ignora quem já tem valor, então a iniciativa que um jogador rolou nunca é sobrescrita.
   *
   * Um combatente com `iniciativaFormulaCustom` (m7-19) usa exatamente essa expressão em vez da
   * fórmula padrão — o mestre sobrescreveu a fórmula inteira, então o dado extra de Formação não
   * entra na conta.
   *
   * É o **fallback do mestre** (jogador ausente), não o caminho principal — a decisão do milestone
   * continua sendo o jogador rolar a própria iniciativa pelo fluxo normal da ficha (m7-06).
   */
  protected rolarTudo(): void {
    const encontroAtual = this.dados.encontro();
    if (!encontroAtual || this.dados.emOperacao()) {
      return;
    }
    const iniciativaPorCombatente: Record<number, number> = {};
    for (const combatente of this.dados.combatentes()) {
      if (combatente.iniciativa !== null) {
        continue;
      }
      const formula =
        combatente.iniciativaFormulaCustom ??
        `${Math.max(1, combatente.destreza) + combatente.dadoExtraIniciativa}D6+${combatente.iniciativaBonus}`;
      const resultado = rolarFormula({ formula, atributos: ATRIBUTOS_NEUTROS });
      if (resultado) {
        iniciativaPorCombatente[combatente.id] = resultado.total;
      }
    }
    if (Object.keys(iniciativaPorCombatente).length === 0) {
      this.notificacaoService.notificar({
        severidade: 'informacao',
        resumo: 'Nada a rolar',
        detalhe: 'Todo mundo já tem iniciativa.',
      });
      return;
    }
    this.dados.executarNoEncontro(
      this.encontroService.rolarIniciativasFaltantes(encontroAtual.id, iniciativaPorCombatente),
    );
  }

  /** Chama os jogadores a rolar a própria iniciativa (broadcast, sem mudar estado). */
  protected pedirIniciativa(): void {
    const encontroAtual = this.dados.encontro();
    if (!encontroAtual || this.dados.emOperacao()) {
      return;
    }
    this.dados.executarNoEncontro(this.encontroService.pedirIniciativa(encontroAtual.id), () =>
      this.notificacaoService.notificar({
        severidade: 'sucesso',
        resumo: 'Iniciativa pedida',
        detalhe: 'Os jogadores foram chamados a rolar a própria iniciativa.',
      }),
    );
  }

  // ── Condução ───────────────────────────────────────────────────────────────

  /** Inicia o combate — exige todo mundo com iniciativa. */
  protected iniciarCombate(): void {
    const encontroAtual = this.dados.encontro();
    if (!encontroAtual || this.dados.emOperacao()) {
      return;
    }
    this.modoEdicao.set(false);
    this.selecionandoCombatentes.set(false);
    this.adicionandoAvulso.set(false);
    this.dados.executarNoEncontro(this.encontroService.iniciarEncontro(encontroAtual.id));
  }

  /** Volta um turno. */
  protected voltarTurno(): void {
    const encontroAtual = this.dados.encontro();
    if (encontroAtual && !this.dados.emOperacao()) {
      this.dados.executarNoEncontro(this.encontroService.voltarTurno(encontroAtual.id));
    }
  }

  /** Pede confirmação (ui-15) e encerra o combate — depois disso o encontro fica só de leitura. */
  protected encerrarCombate(): void {
    const encontroAtual = this.dados.encontro();
    if (!encontroAtual || this.dados.emOperacao()) {
      return;
    }
    this.confirmacaoService
      .confirmar({
        titulo: 'Encerrar combate',
        mensagem: 'Encerrar o combate? Ele passa a ficar só de leitura.',
        rotuloConfirmar: 'Encerrar',
      })
      .then((confirmado) => {
        if (confirmado) {
          this.dados.executarNoEncontro(this.encontroService.encerrarEncontro(encontroAtual.id));
        }
      });
  }

  /** Aplica dano/cura de 1 ponto pelos steppers do cartão. */
  protected ajustarVida(combatente: EncontroCombatenteResumoDto, delta: number): void {
    this.dados.executarNoEncontro(
      this.encontroService.ajustarVida({ id: combatente.id, delta, origemTexto: null }),
    );
  }

  /** Gasta/recupera 1 de Energia pelos steppers do cartão. */
  protected ajustarEnergia(combatente: EncontroCombatenteResumoDto, delta: number): void {
    this.dados.executarNoEncontro(
      this.encontroService.ajustarEnergia({ id: combatente.id, delta, origemTexto: null }),
    );
  }

  // ── Histórico ──────────────────────────────────────────────────────────────

  /** Abre/fecha o menu de encontros anteriores (só existe com um encontro na tela). */
  protected alternarHistorico(): void {
    this.historicoAberto.update((aberto) => !aberto);
  }

  /** `Escape` fecha o menu e devolve o foco ao gatilho — só age com o menu aberto. */
  protected fecharHistoricoPeloTeclado(): void {
    if (!this.historicoAberto()) {
      return;
    }
    this.historicoAberto.set(false);
    (this.historicoGatilho()?.nativeElement as HTMLElement | undefined)?.focus();
  }

  /**
   * Abre um encontro do histórico. Navega em vez de trocar o sinal para que a URL identifique o que
   * está na tela — o combate encerrado é um documento, e um documento tem endereço.
   */
  protected abrirDoHistorico(resumo: EncontroResumoDto): void {
    this.historicoAberto.set(false);
    void this.roteador.navigate(['/campanhas', this.dados.campanhaId, 'iniciativa', resumo.id]);
  }

  /** Volta do histórico para o combate corrente da campanha. */
  protected voltarAoCorrente(): void {
    void this.roteador.navigate(['/campanhas', this.dados.campanhaId, 'iniciativa']);
  }
}
