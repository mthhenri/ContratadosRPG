import { forwardRef, Inject, Injectable } from '@nestjs/common';
import type {
  EncontroCombatenteAdicionarDto,
  EncontroCombatenteIniciativaAtribuirDto,
  EncontroCombatenteLinhaDto,
  EncontroCriarDto,
  EncontroCriadoDto,
  EncontroLinhaDto,
  EncontroRecuperadoDto,
  EncontroRecuperarDto,
  EncontroResumoDto,
} from '@contratados-rpg/shared/dtos/encontro';
import type { FichaCriaturaDadosDto } from '@contratados-rpg/shared/dtos/ficha';
import {
  CadenciaEnum,
  EncontroStatusEnum,
  TipoCampanhaMembroPapelEnum,
} from '@contratados-rpg/shared/enums';
import { intercalarCadencia, ordenarIniciativa } from '@contratados-rpg/shared/regras/encontro';
import { BusinessException, ResourceNotFoundException, UnauthorizedAccessException } from '../../core/exceptions';
import { CampanhaGateway } from '../../core/gateway/campanha.gateway';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import { CampanhaRepository } from '../campanha/campanha.repository';
import { FichaService } from '../ficha/ficha.service';
import { EncontroRepository } from './encontro.repository';
import { montarCombatenteResumo } from './encontro-combatente.mapper';

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

    await this.emitirEstado(encontroCriado);
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
    return this.montarEstado(encontroEncontrado);
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

    return this.emitirEstado(encontroEncontrado);
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
    return this.emitirEstado(encontroEncontrado);
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
    return this.emitirEstado(encontroEncontrado);
  }

  /**
   * `Rolar tudo` (mockup): preenche a iniciativa de **quem ainda não tem**, sem sobrescrever o que
   * um jogador já rolou. O valor de cada um chega pronto no mapa `iniciativaPorCombatente` —
   * quem rola é o cliente, com o motor de rolagem; aqui só se persiste o que falta.
   */
  async rolarIniciativasFaltantes(
    dto: { encontroId: number; iniciativaPorCombatente: Readonly<Record<number, number>> },
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

    return this.emitirEstado(encontroEncontrado);
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
   */
  private async montarEstado(encontro: EncontroLinhaDto): Promise<EncontroRecuperadoDto> {
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

    return {
      id: encontro.id,
      campanhaId: encontro.campanhaId,
      nome: encontro.nome,
      status: encontro.status,
      rodadaAtual: encontro.rodadaAtual,
      turnoIndice: encontro.turnoIndice,
      combatentes,
      ordemRodada,
      eventos,
    };
  }

  /**
   * Monta o estado e o transmite na sala da campanha (§9, broadcast-only): a emissão acontece
   * **depois** da persistência, e nenhuma escrita entra pelo gateway.
   */
  private async emitirEstado(encontro: EncontroLinhaDto): Promise<EncontroRecuperadoDto> {
    const estado = await this.montarEstado(encontro);
    this.campanhaGateway.emitirEncontroAlterado({ encontro: estado });
    return estado;
  }

}
