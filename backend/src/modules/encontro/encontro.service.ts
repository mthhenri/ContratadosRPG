import { forwardRef, Inject, Injectable } from '@nestjs/common';
import type {
  EncontroCombatenteAdicionarDto,
  EncontroCombatenteCondicaoAtribuirDto,
  EncontroCombatenteCondicaoRemoverDto,
  EncontroCombatenteEnergiaAjustarDto,
  EncontroCombatenteVidaAjustarDto,
  EncontroCombatenteIniciativaAtribuirDto,
  EncontroCombatenteLinhaDto,
  EncontroCriarDto,
  EncontroCriadoDto,
  EncontroEncerrarDto,
  EncontroIniciarDto,
  EncontroIniciativaPedidoDto,
  EncontroIniciativaRolarDto,
  EncontroLinhaDto,
  EncontroRecuperadoDto,
  EncontroRecuperarDto,
  EncontroResumoDto,
  EncontroTurnoAvancarDto,
  EncontroTurnoVoltarDto,
  OrdemTurnoDto,
} from '@contratados-rpg/shared/dtos/encontro';
import type { FichaCriaturaDadosDto } from '@contratados-rpg/shared/dtos/ficha';
import {
  CadenciaEnum,
  EncontroEventoTipoEnum,
  EncontroStatusEnum,
  TipoCampanhaMembroPapelEnum,
  TipoFichaEnum,
} from '@contratados-rpg/shared/enums';
import {
  combatentePerdeTurno,
  expirarCondicoes,
  intercalarCadencia,
  ordenarIniciativa,
} from '@contratados-rpg/shared/regras/encontro';
import { BusinessException, ResourceNotFoundException, UnauthorizedAccessException } from '../../core/exceptions';
import { CampanhaGateway } from '../../core/gateway/campanha.gateway';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import { CampanhaRepository } from '../campanha/campanha.repository';
import { FichaService } from '../ficha/ficha.service';
import { EncontroRepository } from './encontro.repository';
import { montarCombatenteResumo } from './encontro-combatente.mapper';
import { ocultarNaoRevelados } from './encontro-revelacao';

/**
 * Regras do módulo `encontro` (m7-03) — a **montagem** do Encontro de Combate: criar, reunir
 * combatentes e coletar as iniciativas. A condução (turnos, vida, condições, log) é a `m7-04`.
 *
 * **Permissões (§14).** Conduzir e montar é privilégio do **mestre** da campanha; **ler** é de
 * qualquer membro. O papel vem de `CampanhaRepository.recuperarMembro` — a mesma fonte usada pelo
 * feed de rolagens —, nunca reimplementado aqui (proibição #28).
 *
 * **Fonte única.** Vida/energia/condições de combatente com ficha são as da ficha: este módulo lê
 * a ficha para montar o resumo e delega qualquer escrita à `FichaService`. Só o avulso tem estado
 * próprio no encontro.
 *
 * **Motor único.** A ordem da rodada sai de `shared/regras/encontro` (ordenação + intercalação de
 * Cadência); nada de regra de iniciativa reimplementada no backend.
 */
@Injectable()
export class EncontroService {
  constructor(
    private readonly encontroRepositorio: EncontroRepository,
    private readonly campanhaRepositorio: CampanhaRepository,
    private readonly fichaService: FichaService,
    @Inject(forwardRef(() => CampanhaGateway))
    private readonly campanhaGateway: CampanhaGateway,
  ) {}

  /**
   * Cria o encontro da campanha, em `MONTAGEM` e sem combatentes. Só o **mestre** cria, e a
   * campanha aceita no máximo **um** encontro não-encerrado por vez — invariante arbitrada aqui
   * porque o PostgreSQL não aceita subquery no predicado de um índice parcial (migration 0021).
   */
  async criarEncontro(
    dto: EncontroCriarDto & { campanhaId: number },
    usuarioAtivo: JwtPayload,
  ): Promise<EncontroCriadoDto> {
    await this.validarMestre(dto.campanhaId, usuarioAtivo);

    const encontroAberto = await this.encontroRepositorio.recuperarAbertoPorCampanha({
      campanhaId: dto.campanhaId,
    });
    if (encontroAberto) {
      throw new BusinessException(
        'A campanha já tem um encontro em andamento — encerre-o antes de abrir outro',
      );
    }

    const encontroCriado = await this.encontroRepositorio.criarEncontro({
      campanhaId: dto.campanhaId,
      nome: dto.nome,
      status: EncontroStatusEnum.MONTAGEM,
    });

    await this.emitirEstado(encontroCriado, usuarioAtivo);
    return {
      id: encontroCriado.id,
      campanhaId: encontroCriado.campanhaId,
      nome: encontroCriado.nome,
      status: encontroCriado.status,
    };
  }

  /** Recupera o estado completo do encontro. Exige ser **membro** da campanha. */
  async recuperarEncontro(
    dto: EncontroRecuperarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<EncontroRecuperadoDto> {
    const encontroEncontrado = await this.recuperarEncontroObrigatorio(dto.id);
    await this.validarMembro(encontroEncontrado.campanhaId, usuarioAtivo);
    const { estado, fichaIdsIdentidadeVisivel } = await this.montarEstado(encontroEncontrado);
    return this.montarEstadoParaUsuario(estado, fichaIdsIdentidadeVisivel, usuarioAtivo);
  }

  /** Encontros da campanha (corrente + histórico). Exige ser **membro**. */
  async listarPorCampanha(
    dto: { campanhaId: number },
    usuarioAtivo: JwtPayload,
  ): Promise<EncontroResumoDto[]> {
    await this.validarMembro(dto.campanhaId, usuarioAtivo);
    return this.encontroRepositorio.listarPorCampanha(dto);
  }

  /**
   * Adiciona um combatente — ficha da campanha ou avulso digitado na hora. Só o mestre, e só
   * enquanto o encontro não estiver encerrado.
   *
   * Ficha: precisa existir e pertencer à **mesma campanha** do encontro; a Cadência vem da própria
   * ficha quando é criatura (`FichaCriaturaDadosDto.cadencia`) e é `SINGULAR` para agente/NPC —
   * Cadência é conceito de criatura. Avulso: exige nome e vida máxima.
   */
  async adicionarCombatente(
    dto: EncontroCombatenteAdicionarDto & { encontroId: number },
    usuarioAtivo: JwtPayload,
  ): Promise<EncontroRecuperadoDto> {
    const encontroEncontrado = await this.recuperarEncontroObrigatorio(dto.encontroId);
    await this.validarMestre(encontroEncontrado.campanhaId, usuarioAtivo);
    this.validarEncontroMutavel(encontroEncontrado);

    const maiorOrdem = await this.encontroRepositorio.recuperarMaiorOrdem({
      encontroId: dto.encontroId,
    });

    if (dto.fichaId !== null) {
      const fichaEncontrada = await this.fichaService.recuperarFicha({ id: dto.fichaId }, usuarioAtivo);
      if (fichaEncontrada.campanhaId !== encontroEncontrado.campanhaId) {
        throw new BusinessException('A ficha não pertence à campanha deste encontro');
      }
      await this.encontroRepositorio.adicionarCombatente({
        encontroId: dto.encontroId,
        fichaId: dto.fichaId,
        nomeAvulso: null,
        vidaMaximaAvulso: null,
        vidaAtualAvulso: null,
        cadencia: this.resolverCadenciaDaFicha(fichaEncontrada.dados),
        ordem: maiorOrdem + 1,
      });
    } else {
      if (!dto.nomeAvulso || dto.vidaMaximaAvulso === null || dto.vidaMaximaAvulso <= 0) {
        throw new BusinessException('Combatente avulso exige nome e vida máxima');
      }
      await this.encontroRepositorio.adicionarCombatente({
        encontroId: dto.encontroId,
        fichaId: null,
        nomeAvulso: dto.nomeAvulso,
        vidaMaximaAvulso: dto.vidaMaximaAvulso,
        vidaAtualAvulso: dto.vidaMaximaAvulso,
        cadencia: dto.cadencia ?? CadenciaEnum.SINGULAR,
        ordem: maiorOrdem + 1,
      });
    }

    return this.emitirEstado(encontroEncontrado, usuarioAtivo);
  }

  /** Remove um combatente do encontro (soft delete). Só o mestre, e não em encontro encerrado. */
  async removerCombatente(
    dto: { id: number },
    usuarioAtivo: JwtPayload,
  ): Promise<EncontroRecuperadoDto> {
    const combatenteEncontrado = await this.recuperarCombatenteObrigatorio(dto.id);
    const encontroEncontrado = await this.recuperarEncontroObrigatorio(combatenteEncontrado.encontroId);
    await this.validarMestre(encontroEncontrado.campanhaId, usuarioAtivo);
    this.validarEncontroMutavel(encontroEncontrado);

    await this.encontroRepositorio.removerCombatente({ id: dto.id });
    return this.emitirEstado(encontroEncontrado, usuarioAtivo);
  }

  /**
   * Atribui a iniciativa de um combatente — o resultado da rolagem do **jogador** ou o override
   * manual do **mestre**. O valor chega somado (rolagem + bônus): o cálculo é do motor de
   * rolagem/ficha.
   *
   * O jogador só atribui a iniciativa do **próprio** combatente (a ficha tem de ser dele); o
   * mestre atribui a de qualquer um.
   */
  async atribuirIniciativa(
    dto: EncontroCombatenteIniciativaAtribuirDto,
    usuarioAtivo: JwtPayload,
  ): Promise<EncontroRecuperadoDto> {
    const combatenteEncontrado = await this.recuperarCombatenteObrigatorio(dto.id);
    const encontroEncontrado = await this.recuperarEncontroObrigatorio(combatenteEncontrado.encontroId);
    this.validarEncontroMutavel(encontroEncontrado);

    const membro = await this.validarMembro(encontroEncontrado.campanhaId, usuarioAtivo);
    if (membro.papel !== TipoCampanhaMembroPapelEnum.MESTRE) {
      await this.validarCombatenteDoJogador(combatenteEncontrado, usuarioAtivo);
    }

    await this.encontroRepositorio.alterarIniciativa({ id: dto.id, iniciativa: dto.iniciativa });
    return this.emitirEstado(encontroEncontrado, usuarioAtivo);
  }

  /**
   * `Rolar tudo` (mockup): preenche a iniciativa de **quem ainda não tem**, sem sobrescrever o que
   * um jogador já rolou. O valor de cada um chega pronto no mapa `iniciativaPorCombatente` —
   * quem rola é o cliente, com o motor de rolagem; aqui só se persiste o que falta.
   */
  async rolarIniciativasFaltantes(
    dto: EncontroIniciativaRolarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<EncontroRecuperadoDto> {
    const encontroEncontrado = await this.recuperarEncontroObrigatorio(dto.encontroId);
    await this.validarMestre(encontroEncontrado.campanhaId, usuarioAtivo);
    this.validarEncontroMutavel(encontroEncontrado);

    const combatentes = await this.encontroRepositorio.listarCombatentes({
      encontroId: dto.encontroId,
    });
    for (const combatente of combatentes) {
      const iniciativaSorteada = dto.iniciativaPorCombatente[combatente.id];
      if (combatente.iniciativa === null && iniciativaSorteada !== undefined) {
        await this.encontroRepositorio.alterarIniciativa({
          id: combatente.id,
          iniciativa: iniciativaSorteada,
        });
      }
    }

    return this.emitirEstado(encontroEncontrado, usuarioAtivo);
  }

  // ── Condução (m7-04) ───────────────────────────────────────────────────────

  /**
   * Inicia o combate (`MONTAGEM` → `ATIVO`). Exige **todos** os combatentes com iniciativa — sem
   * isso não há ordem. Posiciona na rodada 1, primeiro slot, e abre o log.
   */
  async iniciarEncontro(
    dto: EncontroIniciarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<EncontroRecuperadoDto> {
    const encontroEncontrado = await this.recuperarEncontroObrigatorio(dto.id);
    await this.validarMestre(encontroEncontrado.campanhaId, usuarioAtivo);

    if (encontroEncontrado.status !== EncontroStatusEnum.MONTAGEM) {
      throw new BusinessException('Só um encontro em montagem pode ser iniciado');
    }

    const combatentes = await this.encontroRepositorio.listarCombatentes({
      encontroId: encontroEncontrado.id,
    });
    if (combatentes.length === 0) {
      throw new BusinessException('O encontro precisa de ao menos um combatente');
    }
    if (combatentes.some((combatente) => combatente.iniciativa === null)) {
      throw new BusinessException('Todos os combatentes precisam de iniciativa para começar');
    }

    const encontroIniciado = await this.encontroRepositorio.alterarStatus({
      id: encontroEncontrado.id,
      status: EncontroStatusEnum.ATIVO,
      rodadaAtual: 1,
      turnoIndice: 0,
    });
    await this.encontroRepositorio.registrarEvento({
      encontroId: encontroIniciado.id,
      combatenteId: null,
      tipo: EncontroEventoTipoEnum.RODADA_INICIADA,
      rodada: 1,
      turno: 1,
      texto: 'Rodada 1 iniciada',
    });

    return this.emitirEstado(await this.pularTurnosPerdidos(encontroIniciado), usuarioAtivo);
  }

  /**
   * Avança um turno. Ao passar do último slot da rodada, a rodada **incrementa**: as condições
   * expiram (`expirarCondicoes`), cada expiração vira log e a ordem é recalculada a partir do
   * estado corrente — é aí que entradas, saídas e ajustes de iniciativa passam a valer.
   */
  async avancarTurno(
    dto: EncontroTurnoAvancarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<EncontroRecuperadoDto> {
    const encontroEncontrado = await this.recuperarEncontroObrigatorio(dto.id);
    if (encontroEncontrado.status !== EncontroStatusEnum.ATIVO) {
      throw new BusinessException('O combate não está em andamento');
    }
    const ordemRodada = await this.calcularOrdemRodada(encontroEncontrado.id);
    await this.validarAvancoDeTurno(encontroEncontrado, ordemRodada, usuarioAtivo);
    const proximoIndice = encontroEncontrado.turnoIndice + 1;

    if (proximoIndice < ordemRodada.length) {
      const encontroAvancado = await this.encontroRepositorio.alterarTurno({
        id: encontroEncontrado.id,
        rodadaAtual: encontroEncontrado.rodadaAtual,
        turnoIndice: proximoIndice,
      });
      return this.emitirEstado(await this.pularTurnosPerdidos(encontroAvancado), usuarioAtivo);
    }

    return this.emitirEstado(await this.virarRodada(encontroEncontrado), usuarioAtivo);
  }

  /**
   * Volta um turno — simétrico ao avanço, mas **não ressuscita** condições já expiradas: a
   * expiração é um fato registrado no log, e desfazê-la silenciosamente faria o estado divergir da
   * trilha que a mesa leu. Nunca retrocede além do primeiro turno da rodada 1.
   */
  async voltarTurno(
    dto: EncontroTurnoVoltarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<EncontroRecuperadoDto> {
    const encontroEncontrado = await this.recuperarEncontroAtivo(dto.id, usuarioAtivo);

    if (encontroEncontrado.turnoIndice > 0) {
      const encontroVoltado = await this.encontroRepositorio.alterarTurno({
        id: encontroEncontrado.id,
        rodadaAtual: encontroEncontrado.rodadaAtual,
        turnoIndice: encontroEncontrado.turnoIndice - 1,
      });
      return this.emitirEstado(encontroVoltado, usuarioAtivo);
    }

    if (encontroEncontrado.rodadaAtual <= 1) {
      throw new BusinessException('O combate já está no primeiro turno da primeira rodada');
    }

    const ordemRodada = await this.calcularOrdemRodada(encontroEncontrado.id);
    const encontroVoltado = await this.encontroRepositorio.alterarTurno({
      id: encontroEncontrado.id,
      rodadaAtual: encontroEncontrado.rodadaAtual - 1,
      turnoIndice: Math.max(ordemRodada.length - 1, 0),
    });
    return this.emitirEstado(encontroVoltado, usuarioAtivo);
  }

  /**
   * Encerra o combate (`ATIVO` → `ENCERRADO`). Vira histórico imutável; as fichas ficam com a vida
   * em que pararam — o encontro nunca "desfaz" o que aconteceu na mesa.
   */
  async encerrarEncontro(
    dto: EncontroEncerrarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<EncontroRecuperadoDto> {
    const encontroEncontrado = await this.recuperarEncontroObrigatorio(dto.id);
    await this.validarMestre(encontroEncontrado.campanhaId, usuarioAtivo);
    this.validarEncontroMutavel(encontroEncontrado);

    const encontroEncerrado = await this.encontroRepositorio.alterarStatus({
      id: encontroEncontrado.id,
      status: EncontroStatusEnum.ENCERRADO,
      rodadaAtual: encontroEncontrado.rodadaAtual,
      turnoIndice: encontroEncontrado.turnoIndice,
    });
    return this.emitirEstado(encontroEncerrado, usuarioAtivo);
  }

  /**
   * Aplica dano (delta negativo) ou cura (positivo) à Vida de um combatente.
   *
   * **Fonte única:** quem tem ficha muda **na ficha**, pela `FichaService` — agente por
   * `alterarVitalidade`, criatura por `alterarVitalidadeCriatura` (o documento de criatura guarda
   * `vidaAtual` no topo, não em `estado`). Só o avulso muda no próprio encontro. A vida resultante
   * nunca é recalculada aqui: soma-se o delta ao valor corrente lido da fonte.
   */
  async ajustarVida(
    dto: EncontroCombatenteVidaAjustarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<EncontroRecuperadoDto> {
    const { encontro, combatente } = await this.recuperarContextoMutavel(dto.id, usuarioAtivo);
    if (dto.delta === 0) {
      throw new BusinessException('O ajuste de Vida precisa ser diferente de zero');
    }

    const resumo = montarCombatenteResumo(combatente);
    const vidaResultante = resumo.vidaAtual + dto.delta;

    if (combatente.fichaId === null) {
      await this.encontroRepositorio.alterarVidaAvulso({
        id: combatente.id,
        vidaAtualAvulso: vidaResultante,
      });
    } else if (combatente.tipoFicha === TipoFichaEnum.CRIATURA) {
      await this.fichaService.alterarVitalidadeCriatura(
        { id: combatente.fichaId, vidaAtual: vidaResultante },
        usuarioAtivo,
      );
    } else {
      await this.fichaService.alterarVitalidade(
        { id: combatente.fichaId, estado: { vidaAtual: vidaResultante } },
        usuarioAtivo,
      );
    }

    await this.registrarEventoDoTurno(encontro, {
      combatenteId: combatente.id,
      tipo: dto.delta < 0 ? EncontroEventoTipoEnum.DANO : EncontroEventoTipoEnum.CURA,
      texto:
        dto.delta < 0
          ? `${resumo.nome} sofreu ${Math.abs(dto.delta)} de dano${this.sufixoOrigem(dto.origemTexto)}`
          : `${resumo.nome} recuperou ${dto.delta} de Vida${this.sufixoOrigem(dto.origemTexto)}`,
    });

    return this.emitirEstado(encontro, usuarioAtivo);
  }

  /**
   * Ajusta a Energia de um combatente. Só agente e NPC têm Energia — criatura e avulso não, e o
   * ajuste é recusado em vez de inventar um campo que a regra não prevê.
   */
  async ajustarEnergia(
    dto: EncontroCombatenteEnergiaAjustarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<EncontroRecuperadoDto> {
    const { encontro, combatente } = await this.recuperarContextoMutavel(dto.id, usuarioAtivo);
    const resumo = montarCombatenteResumo(combatente);

    if (combatente.fichaId === null || resumo.energiaAtual === null) {
      throw new BusinessException('Este combatente não tem Energia');
    }
    if (dto.delta === 0) {
      throw new BusinessException('O ajuste de Energia precisa ser diferente de zero');
    }

    await this.fichaService.alterarVitalidade(
      { id: combatente.fichaId, estado: { energiaAtual: resumo.energiaAtual + dto.delta } },
      usuarioAtivo,
    );

    await this.registrarEventoDoTurno(encontro, {
      combatenteId: combatente.id,
      tipo: EncontroEventoTipoEnum.ENERGIA,
      texto:
        dto.delta < 0
          ? `${resumo.nome} gastou ${Math.abs(dto.delta)} de Energia${this.sufixoOrigem(dto.origemTexto)}`
          : `${resumo.nome} recuperou ${dto.delta} de Energia${this.sufixoOrigem(dto.origemTexto)}`,
    });

    return this.emitirEstado(encontro, usuarioAtivo);
  }

  /**
   * Aplica um marcador de condição ao combatente (`Sangramento · 2 rodadas`). Reaplicar o mesmo
   * nome **substitui** a duração em vez de duplicar a linha — é o que a mesa espera ao renovar um
   * efeito.
   */
  async aplicarCondicao(
    dto: EncontroCombatenteCondicaoAtribuirDto,
    usuarioAtivo: JwtPayload,
  ): Promise<EncontroRecuperadoDto> {
    const { encontro, combatente } = await this.recuperarContextoMutavel(dto.id, usuarioAtivo);
    if (!dto.nome.trim()) {
      throw new BusinessException('A condição precisa de um nome');
    }

    const condicoesAtuais = combatente.condicoes ?? [];
    const condicoesResultantes = [
      ...condicoesAtuais.filter((condicao) => condicao.nome !== dto.nome),
      { nome: dto.nome, rodadasRestantes: dto.rodadasRestantes, perdeTurno: dto.perdeTurno },
    ];
    await this.encontroRepositorio.alterarCondicoes({
      id: combatente.id,
      condicoes: condicoesResultantes,
    });

    const resumo = montarCombatenteResumo(combatente);
    await this.registrarEventoDoTurno(encontro, {
      combatenteId: combatente.id,
      tipo: EncontroEventoTipoEnum.CONDICAO_APLICADA,
      texto: `${dto.nome} aplicado em ${resumo.nome}`,
    });

    return this.emitirEstado(encontro, usuarioAtivo);
  }

  /** Remove um marcador de condição antes de ele expirar sozinho. */
  async removerCondicao(
    dto: EncontroCombatenteCondicaoRemoverDto,
    usuarioAtivo: JwtPayload,
  ): Promise<EncontroRecuperadoDto> {
    const { encontro, combatente } = await this.recuperarContextoMutavel(dto.id, usuarioAtivo);

    const condicoesResultantes = (combatente.condicoes ?? []).filter(
      (condicao) => condicao.nome !== dto.nome,
    );
    await this.encontroRepositorio.alterarCondicoes({
      id: combatente.id,
      condicoes: condicoesResultantes,
    });

    const resumo = montarCombatenteResumo(combatente);
    await this.registrarEventoDoTurno(encontro, {
      combatenteId: combatente.id,
      tipo: EncontroEventoTipoEnum.CONDICAO_EXPIRADA,
      texto: `${dto.nome} removido de ${resumo.nome}`,
    });

    return this.emitirEstado(encontro, usuarioAtivo);
  }

  /**
   * Chama os jogadores a rolar a própria iniciativa. É só o **chamado** — a rolagem entra pelo
   * fluxo REST de rolagem, como qualquer outra, e volta como `atribuirIniciativa`.
   */
  async pedirIniciativa(
    dto: EncontroIniciativaPedidoDto,
    usuarioAtivo: JwtPayload,
  ): Promise<EncontroRecuperadoDto> {
    const encontroEncontrado = await this.recuperarEncontroObrigatorio(dto.id);
    await this.validarMestre(encontroEncontrado.campanhaId, usuarioAtivo);
    this.validarEncontroMutavel(encontroEncontrado);

    this.campanhaGateway.emitirEncontroIniciativaPedido({
      id: encontroEncontrado.id,
      campanhaId: encontroEncontrado.campanhaId,
    });
    return (await this.montarEstado(encontroEncontrado)).estado;
  }

  // ── Apoio da condução ──────────────────────────────────────────────────────

  /** Recupera o encontro exigindo mestre e situação `ATIVO`. */
  private async recuperarEncontroAtivo(
    id: number,
    usuarioAtivo: JwtPayload,
  ): Promise<EncontroLinhaDto> {
    const encontroEncontrado = await this.recuperarEncontroObrigatorio(id);
    await this.validarMestre(encontroEncontrado.campanhaId, usuarioAtivo);
    if (encontroEncontrado.status !== EncontroStatusEnum.ATIVO) {
      throw new BusinessException('O combate não está em andamento');
    }
    return encontroEncontrado;
  }

  /** Recupera combatente + encontro, exigindo mestre e encontro ainda mutável. */
  private async recuperarContextoMutavel(
    combatenteId: number,
    usuarioAtivo: JwtPayload,
  ): Promise<{ encontro: EncontroLinhaDto; combatente: EncontroCombatenteLinhaDto }> {
    const combatente = await this.recuperarCombatenteObrigatorio(combatenteId);
    const encontro = await this.recuperarEncontroObrigatorio(combatente.encontroId);
    await this.validarMestre(encontro.campanhaId, usuarioAtivo);
    this.validarEncontroMutavel(encontro);
    return { encontro, combatente };
  }

  /** A ordem de turnos corrente, calculada pelo motor puro a partir de quem tem iniciativa. */
  private async calcularOrdemRodada(encontroId: number): Promise<readonly OrdemTurnoDto[]> {
    const linhas = await this.encontroRepositorio.listarCombatentes({ encontroId });
    const ordenaveis = linhas
      .filter((linha) => linha.iniciativa !== null)
      .map((linha) => ({
        id: linha.id,
        iniciativa: linha.iniciativa as number,
        destreza: montarCombatenteResumo(linha).destreza,
        cadencia: linha.cadencia,
      }));
    return intercalarCadencia(ordenarIniciativa(ordenaveis));
  }

  /** Mestre conduz livremente; jogador só pode encerrar o turno da ficha que possui. */
  private async validarAvancoDeTurno(
    encontro: EncontroLinhaDto,
    ordemRodada: readonly OrdemTurnoDto[],
    usuarioAtivo: JwtPayload,
  ): Promise<void> {
    const membro = await this.validarMembro(encontro.campanhaId, usuarioAtivo);
    if (membro.papel === TipoCampanhaMembroPapelEnum.MESTRE) {
      return;
    }

    const turnoAtual = ordemRodada[encontro.turnoIndice];
    if (
      !turnoAtual ||
      !(await this.encontroRepositorio.combatentePertenceAoUsuario({
        id: turnoAtual.combatenteId,
        usuarioId: usuarioAtivo.sub,
      }))
    ) {
      throw new UnauthorizedAccessException();
    }
  }

  /**
   * Vira a rodada: expira as condições de todos os combatentes (cada expiração vira log), abre a
   * rodada seguinte no primeiro slot e registra o início. A ordem é recalculada naturalmente, já
   * que sai sempre do estado corrente.
   */
  private async virarRodada(encontro: EncontroLinhaDto): Promise<EncontroLinhaDto> {
    const rodadaSeguinte = encontro.rodadaAtual + 1;
    const combatentes = await this.encontroRepositorio.listarCombatentes({
      encontroId: encontro.id,
    });

    for (const combatente of combatentes) {
      const resultado = expirarCondicoes(combatente.condicoes ?? []);
      if (resultado.expiradas.length === 0) {
        continue;
      }
      await this.encontroRepositorio.alterarCondicoes({
        id: combatente.id,
        condicoes: resultado.condicoes,
      });
      const nome = montarCombatenteResumo(combatente).nome;
      for (const condicaoExpirada of resultado.expiradas) {
        await this.encontroRepositorio.registrarEvento({
          encontroId: encontro.id,
          combatenteId: combatente.id,
          tipo: EncontroEventoTipoEnum.CONDICAO_EXPIRADA,
          rodada: rodadaSeguinte,
          turno: 1,
          texto: `${condicaoExpirada.nome} expirou em ${nome}`,
        });
      }
    }

    await this.encontroRepositorio.registrarEvento({
      encontroId: encontro.id,
      combatenteId: null,
      tipo: EncontroEventoTipoEnum.RODADA_INICIADA,
      rodada: rodadaSeguinte,
      turno: 1,
      texto: `Rodada ${rodadaSeguinte} iniciada`,
    });

    const encontroVirado = await this.encontroRepositorio.alterarTurno({
      id: encontro.id,
      rodadaAtual: rodadaSeguinte,
      turnoIndice: 0,
    });
    return this.pularTurnosPerdidos(encontroVirado);
  }

  /**
   * Consome automaticamente os turnos de quem está sob um marcador `perdeTurno` (Inconsciente,
   * Insolação e afins), registrando cada perda no log. O laço é limitado ao tamanho da ordem: se
   * **todos** estiverem impedidos, o turno para onde está em vez de girar para sempre — cabe ao
   * mestre resolver a cena.
   */
  private async pularTurnosPerdidos(encontro: EncontroLinhaDto): Promise<EncontroLinhaDto> {
    const ordemRodada = await this.calcularOrdemRodada(encontro.id);
    if (ordemRodada.length === 0) {
      return encontro;
    }

    const combatentes = await this.encontroRepositorio.listarCombatentes({
      encontroId: encontro.id,
    });
    const combatentePorId = new Map(combatentes.map((combatente) => [combatente.id, combatente]));

    let encontroCorrente = encontro;
    for (let tentativa = 0; tentativa < ordemRodada.length; tentativa += 1) {
      const slot = ordemRodada[encontroCorrente.turnoIndice];
      const combatenteDaVez = slot ? combatentePorId.get(slot.combatenteId) : undefined;
      if (!combatenteDaVez || !combatentePerdeTurno(combatenteDaVez.condicoes ?? [])) {
        return encontroCorrente;
      }

      await this.encontroRepositorio.registrarEvento({
        encontroId: encontroCorrente.id,
        combatenteId: combatenteDaVez.id,
        tipo: EncontroEventoTipoEnum.ESTADO_ALTERADO,
        rodada: encontroCorrente.rodadaAtual,
        turno: encontroCorrente.turnoIndice + 1,
        texto: `${montarCombatenteResumo(combatenteDaVez).nome} perdeu o turno`,
      });

      const proximoIndice = encontroCorrente.turnoIndice + 1;
      if (proximoIndice >= ordemRodada.length) {
        return encontroCorrente;
      }
      encontroCorrente = await this.encontroRepositorio.alterarTurno({
        id: encontroCorrente.id,
        rodadaAtual: encontroCorrente.rodadaAtual,
        turnoIndice: proximoIndice,
      });
    }

    return encontroCorrente;
  }

  /** Registra uma entrada de log na posição corrente do encontro. */
  private async registrarEventoDoTurno(
    encontro: EncontroLinhaDto,
    evento: { combatenteId: number | null; tipo: EncontroEventoTipoEnum; texto: string },
  ): Promise<void> {
    await this.encontroRepositorio.registrarEvento({
      encontroId: encontro.id,
      combatenteId: evento.combatenteId,
      tipo: evento.tipo,
      rodada: Math.max(encontro.rodadaAtual, 1),
      turno: encontro.turnoIndice + 1,
      texto: evento.texto,
    });
  }

  /** Complemento de origem do log ("de V. Corvalho"), quando o mestre informou de onde veio. */
  private sufixoOrigem(origemTexto: string | null): string {
    return origemTexto?.trim() ? ` de ${origemTexto.trim()}` : '';
  }

  // ── Apoio ──────────────────────────────────────────────────────────────────

  /** Recupera o encontro ou estoura 404. */
  private async recuperarEncontroObrigatorio(id: number): Promise<EncontroLinhaDto> {
    const encontroEncontrado = await this.encontroRepositorio.recuperarPorId({ id });
    if (!encontroEncontrado) {
      throw new ResourceNotFoundException('Encontro');
    }
    return encontroEncontrado;
  }

  /** Recupera o combatente ou estoura 404. */
  private async recuperarCombatenteObrigatorio(id: number): Promise<EncontroCombatenteLinhaDto> {
    const combatenteEncontrado = await this.encontroRepositorio.recuperarCombatentePorId({ id });
    if (!combatenteEncontrado) {
      throw new ResourceNotFoundException('Combatente');
    }
    return combatenteEncontrado;
  }

  /** Exige ser membro da campanha; devolve o papel para quem precisa distinguir mestre. */
  private async validarMembro(
    campanhaId: number,
    usuarioAtivo: JwtPayload,
  ): Promise<{ papel: TipoCampanhaMembroPapelEnum }> {
    const membroEncontrado = await this.campanhaRepositorio.recuperarMembro({
      campanhaId,
      usuarioId: usuarioAtivo.sub,
    });
    if (!membroEncontrado) {
      throw new UnauthorizedAccessException();
    }
    return membroEncontrado;
  }

  /** Exige ser o **mestre** da campanha — quem monta e conduz o encontro. */
  private async validarMestre(campanhaId: number, usuarioAtivo: JwtPayload): Promise<void> {
    const membroEncontrado = await this.validarMembro(campanhaId, usuarioAtivo);
    if (membroEncontrado.papel !== TipoCampanhaMembroPapelEnum.MESTRE) {
      throw new UnauthorizedAccessException();
    }
  }

  /** Encontro encerrado é histórico imutável. */
  private validarEncontroMutavel(encontro: EncontroLinhaDto): void {
    if (encontro.status === EncontroStatusEnum.ENCERRADO) {
      throw new BusinessException('Encontro encerrado não aceita alterações');
    }
  }

  /**
   * Um jogador só mexe na iniciativa do combatente cuja ficha ele **pode ver** — a mesma matriz
   * §14 de `FichaService.recuperarFicha`, reusada em vez de reimplementada. Combatente avulso não
   * tem ficha: só o mestre atribui.
   */
  private async validarCombatenteDoJogador(
    combatente: EncontroCombatenteLinhaDto,
    usuarioAtivo: JwtPayload,
  ): Promise<void> {
    if (combatente.fichaId === null) {
      throw new UnauthorizedAccessException();
    }
    await this.fichaService.recuperarFicha({ id: combatente.fichaId }, usuarioAtivo);
  }

  /**
   * Cadência do combatente com ficha. Só o documento de **criatura** tem `cadencia`
   * (`FichaCriaturaDadosDto`) — agente e NPC são sempre `SINGULAR`, porque Cadência é conceito de
   * criatura (`guia_de_mestre-v4.0.0.md`). Por isso a origem é lida do próprio documento, e não de
   * um `tipoFicha`: `FichaRecuperadaDto` não carrega o tipo, e inventar uma segunda consulta só
   * para descobri-lo seria pior que perguntar ao dado que já está em mãos.
   */
  private resolverCadenciaDaFicha(dados: unknown): CadenciaEnum {
    const cadenciaDoDocumento = (dados as Partial<FichaCriaturaDadosDto>).cadencia;
    const cadenciasValidas = Object.values(CadenciaEnum) as string[];
    if (cadenciaDoDocumento && cadenciasValidas.includes(cadenciaDoDocumento)) {
      return cadenciaDoDocumento;
    }
    return CadenciaEnum.SINGULAR;
  }

  /**
   * Monta o estado completo: combatentes resolvidos (ficha lida, nunca duplicada), a ordem da
   * rodada calculada pelo **motor puro** e o log. Combatente sem iniciativa fica fora da ordem —
   * ela só faz sentido quando todos rolaram (o início do combate exige isso, `m7-04`).
   *
   * Junto do estado, devolve `fichaIdsIdentidadeVisivel` (m7-16): os agentes cuja ficha **não**
   * está oculta (`ficha.oculta`, já carregado na mesma linha do combatente — proibição #28 é sobre
   * reimplementar a consulta de **permissão** dos números, não sobre reler uma coluna já em mãos).
   * `montarEstadoParaUsuario` usa esse conjunto pra decidir quem mantém a "carteirinha" mesmo sem
   * `usuario_ficha_acesso`.
   */
  private async montarEstado(
    encontro: EncontroLinhaDto,
  ): Promise<{ estado: EncontroRecuperadoDto; fichaIdsIdentidadeVisivel: ReadonlySet<number> }> {
    const linhasCombatentes = await this.encontroRepositorio.listarCombatentes({
      encontroId: encontro.id,
    });
    const combatentes = linhasCombatentes.map((linha) => montarCombatenteResumo(linha));
    const eventos = await this.encontroRepositorio.listarEventos({ encontroId: encontro.id });

    const ordenaveis = combatentes
      .filter((combatente) => combatente.iniciativa !== null)
      .map((combatente) => ({
        id: combatente.id,
        iniciativa: combatente.iniciativa as number,
        destreza: combatente.destreza,
        cadencia: combatente.cadencia,
      }));
    const ordemRodada = intercalarCadencia(ordenarIniciativa(ordenaveis));

    const fichaIdsIdentidadeVisivel = new Set(
      linhasCombatentes
        .filter((linha) => linha.fichaId !== null && linha.fichaOculta !== true)
        .map((linha) => linha.fichaId as number),
    );

    return {
      estado: {
        id: encontro.id,
        campanhaId: encontro.campanhaId,
        nome: encontro.nome,
        status: encontro.status,
        rodadaAtual: encontro.rodadaAtual,
        turnoIndice: encontro.turnoIndice,
        combatentes,
        ordemRodada,
        eventos,
      },
      fichaIdsIdentidadeVisivel,
    };
  }

  /**
   * Aplica o recorte de revelação (m7-06) do ponto de vista de **um** usuário. O mestre recebe o
   * estado intacto; qualquer outro membro recebe o estado filtrado pelas fichas que ele pode abrir
   * na campanha (números) — e pelas fichas de agente não oculto, pra "carteirinha" (m7-16).
   *
   * O conjunto de fichas com números visíveis vem de `FichaService.listarFichas` — a **service
   * dona** da regra §14, que já distingue mestre de jogador e consulta `usuario_ficha_acesso`.
   * Nada de uma segunda consulta de permissão aqui (proibição #28).
   */
  private async montarEstadoParaUsuario(
    estado: EncontroRecuperadoDto,
    fichaIdsIdentidadeVisivel: ReadonlySet<number>,
    usuarioAtivo: JwtPayload,
  ): Promise<EncontroRecuperadoDto> {
    const membro = await this.validarMembro(estado.campanhaId, usuarioAtivo);
    if (membro.papel === TipoCampanhaMembroPapelEnum.MESTRE) {
      return estado;
    }
    const fichasVisiveis = await this.fichaService.listarFichas(
      { campanhaId: estado.campanhaId },
      usuarioAtivo,
    );
    return ocultarNaoRevelados(
      estado,
      new Set(fichasVisiveis.map((ficha) => ficha.id)),
      fichaIdsIdentidadeVisivel,
    );
  }

  /**
   * Monta o estado e o transmite na sala da campanha (§9, broadcast-only): a emissão acontece
   * **depois** da persistência, e nenhuma escrita entra pelo gateway.
   *
   * **Por que a emissão é por usuário (m7-06).** O payload do encontro carrega Vida e defesas de
   * criatura, e a sala `campanha:<id>` mistura mestre e jogadores — um `emit` único entregaria a
   * todos o que só o mestre pode ver. O precedente do `ficha:alterada` (omitir o campo privado
   * para a sala inteira) não serve aqui: o que é segredo para o jogador é justamente o que o painel
   * do mestre existe para mostrar. Então o gateway percorre os sockets da sala e esta service monta
   * um recorte por **usuário distinto** — uma consulta de fichas visíveis por pessoa conectada, não
   * por socket.
   *
   * O retorno é o recorte de **quem chamou**: um jogador que atribui a própria iniciativa não pode
   * receber pela resposta REST o que o broadcast lhe esconderia.
   */
  private async emitirEstado(
    encontro: EncontroLinhaDto,
    usuarioAtivo: JwtPayload,
  ): Promise<EncontroRecuperadoDto> {
    const { estado, fichaIdsIdentidadeVisivel } = await this.montarEstado(encontro);
    await this.campanhaGateway.emitirEncontroAlterado(estado.campanhaId, (usuarioDoSocket) =>
      this.montarEstadoParaUsuario(estado, fichaIdsIdentidadeVisivel, usuarioDoSocket),
    );
    return this.montarEstadoParaUsuario(estado, fichaIdsIdentidadeVisivel, usuarioAtivo);
  }

}
