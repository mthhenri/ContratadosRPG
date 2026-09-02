import { forwardRef, Inject, Injectable } from '@nestjs/common';
import type {
  RolagemCampanhaListarDto,
  RolagemAvulsoRegistrarDto,
  RolagemListarDto,
  RolagemRegistrarDto,
  RolagemResumoDto,
} from '@contratados-rpg/shared/dtos/rolagem';
import { RolagemVisibilidadeEnum, TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import type { PaginatedResult } from '@contratados-rpg/shared/interfaces';
import { UnauthorizedAccessException } from '../../core/exceptions';
import { CampanhaGateway } from '../../core/gateway/campanha.gateway';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import { CampanhaRepository } from '../campanha/campanha.repository';
import { FichaService } from '../ficha/ficha.service';
import { EncontroRepository } from '../encontro/encontro.repository';
import { RolagemRepository } from './rolagem.repository';

/**
 * Regras do módulo `rolagem` (m3-27): persistência das rolagens disparadas a partir de uma ficha
 * — histórico por ficha + feed em tempo real na campanha. A service é o único árbitro de
 * permissão (proibição #28); as queries de `rolagem` vêm do `RolagemRepository`.
 *
 * **Permissão de registrar/ver o histórico**: reusa `FichaService.recuperarFicha` — quem pode
 * **ver** a ficha pode rolar e ver o histórico dela (mesma matriz §14: dono, mestre ou concessão
 * em `usuario_ficha_acesso`). Nenhuma regra de permissão é reimplementada aqui.
 *
 * **Permissão do feed da campanha**: mesmo gate de `FichaService.listarFichas` — exige ser membro
 * da campanha (`CampanhaRepository.recuperarMembro`); o papel (`MESTRE` ou não) decide se
 * rolagens `PRIVADA` de terceiros aparecem.
 */
@Injectable()
export class RolagemService {
  constructor(
    private readonly rolagemRepositorio: RolagemRepository,
    private readonly fichaService: FichaService,
    private readonly campanhaRepositorio: CampanhaRepository,
    @Inject(forwardRef(() => CampanhaGateway))
    private readonly campanhaGateway: CampanhaGateway,
    private readonly encontroRepositorio: EncontroRepository,
  ) {}

  /**
   * Registra uma rolagem disparada a partir de uma ficha. `fichaId` vem do `@Param` (montado pela
   * controller); `campanhaId`/o dono da ficha são resolvidos por `recuperarFicha`, que já garante
   * a permissão de **visualização** (§14) — quem pode ver a ficha pode rolar. O **autor** é sempre
   * quem disparou a rolagem (`usuarioAtivo.sub`), não necessariamente o dono da ficha. Após
   * persistir, emite `rolagem:registrada` na sala da campanha **só se `PUBLICA`** — uma `PRIVADA`
   * nunca broadcasta (o autor/mestre a vê via este mesmo retorno REST, ou no próximo refresh do
   * feed).
   */
  async registrarRolagem(
    dto: RolagemRegistrarDto & { fichaId: number },
    usuarioAtivo: JwtPayload,
  ): Promise<RolagemResumoDto> {
    const ficha = await this.fichaService.recuperarFicha({ id: dto.fichaId }, usuarioAtivo);

    const rolagemRegistrada = await this.rolagemRepositorio.registrarRolagem({
      fichaId: ficha.id,
      encontroCombatenteId: null,
      campanhaId: ficha.campanhaId,
      usuarioId: usuarioAtivo.sub,
      rotulo: dto.rotulo,
      formula: dto.formula,
      visibilidade: dto.visibilidade,
      resultado: dto.resultado,
    });

    if (rolagemRegistrada.visibilidade === RolagemVisibilidadeEnum.PUBLICA) {
      this.campanhaGateway.emitirRolagemRegistrada(rolagemRegistrada);
    }
    return rolagemRegistrada;
  }

  /** Registra uma rolagem livre em nome de um avulso; somente o mestre da campanha pode fazê-la. */
  async registrarRolagemAvulso(
    dto: RolagemAvulsoRegistrarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<RolagemResumoDto> {
    const combatente = await this.encontroRepositorio.recuperarCombatentePorId({ id: dto.combatenteId });
    if (!combatente || combatente.encontroId !== dto.encontroId || combatente.fichaId !== null) {
      throw new UnauthorizedAccessException();
    }
    const encontro = await this.encontroRepositorio.recuperarPorId({ id: dto.encontroId });
    if (!encontro) {
      throw new UnauthorizedAccessException();
    }
    const membro = await this.campanhaRepositorio.recuperarMembro({
      campanhaId: encontro.campanhaId,
      usuarioId: usuarioAtivo.sub,
    });
    if (membro?.papel !== TipoCampanhaMembroPapelEnum.MESTRE) {
      throw new UnauthorizedAccessException();
    }

    const registrada = await this.rolagemRepositorio.registrarRolagem({
      fichaId: null,
      encontroCombatenteId: combatente.id,
      campanhaId: encontro.campanhaId,
      usuarioId: usuarioAtivo.sub,
      rotulo: dto.rotulo,
      formula: dto.formula,
      visibilidade: dto.visibilidade,
      resultado: dto.resultado,
    });
    if (registrada.visibilidade === RolagemVisibilidadeEnum.PUBLICA) {
      this.campanhaGateway.emitirRolagemRegistrada(registrada);
    }
    return registrada;
  }

  /**
   * Histórico paginado de uma ficha (§10.5), mais recente primeiro. Exige a mesma permissão de
   * **visualização** de `recuperarFicha` (§14) — quem vê a ficha vê o histórico dela.
   */
  async listarPorFicha(
    dto: RolagemListarDto & { pagina: number; itensPorPagina: number },
    usuarioAtivo: JwtPayload,
  ): Promise<PaginatedResult<RolagemResumoDto>> {
    await this.fichaService.recuperarFicha({ id: dto.fichaId }, usuarioAtivo);
    return this.rolagemRepositorio.listarPorFicha(dto);
  }

  /**
   * Feed de uma campanha, mais recente primeiro. Exige ser **membro** da campanha (mesmo gate de
   * `FichaService.listarFichas`); rolagens `PRIVADA` de terceiros só aparecem para o **mestre**.
   */
  async listarPorCampanha(
    dto: RolagemCampanhaListarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<RolagemResumoDto[]> {
    const membroEncontrado = await this.campanhaRepositorio.recuperarMembro({
      campanhaId: dto.campanhaId,
      usuarioId: usuarioAtivo.sub,
    });
    if (!membroEncontrado) {
      throw new UnauthorizedAccessException();
    }

    return this.rolagemRepositorio.listarPorCampanha({
      campanhaId: dto.campanhaId,
      usuarioId: usuarioAtivo.sub,
      ehMestre: membroEncontrado.papel === TipoCampanhaMembroPapelEnum.MESTRE,
    });
  }
}
