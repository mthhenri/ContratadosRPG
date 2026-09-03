import { Injectable } from '@nestjs/common';
import type {
  CampanhaIdentidadeSeguraDto,
  CampanhaPainelEspectadorDto,
  CampanhaPainelEspectadorRecuperarDto,
  CampanhaPreviaJogadorDto,
  CampanhaPreviaJogadorRecuperarDto,
} from '@contratados-rpg/shared/dtos/campanha';
import { ResourceNotFoundException, UnauthorizedAccessException } from '../../core/exceptions';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import { CampanhaRepository } from '../campanha/campanha.repository';
import { CampanhaService } from '../campanha/campanha.service';
import { FichaService } from '../ficha/ficha.service';
import { RolagemRepository } from '../rolagem/rolagem.repository';

/**
 * Projeções de leitura do módulo `m8-espectadores-campanha` (m8-02, entregáveis 5/6): o painel do
 * espectador e a prévia de jogador. As duas cruzam três domínios — identidade de campanha
 * (`campanha`), fichas visíveis (`ficha`) e feed de rolagens (`rolagem`) — por isso vivem num
 * módulo próprio em vez de em qualquer um dos três: `CampanhaModule` não pode importar
 * `FichaModule`/`RolagemModule` sem criar um ciclo (os dois já importam `CampanhaModule`), e este
 * módulo, importando os três em vez de ser importado por eles, evita o ciclo por completo.
 *
 * Nenhuma regra de permissão é reimplementada aqui (proibição #28): a identidade segura reusa
 * `CampanhaRepository.recuperarPorId` (dono da tabela `campanha`), a checagem de papel reusa os
 * predicados de `CampanhaService`, as fichas visíveis reusam `FichaService.listarFichasParaAlvo`
 * e o feed reusa `RolagemRepository` — cada um já dono da própria regra.
 */
@Injectable()
export class CampanhaProjecaoService {
  constructor(
    private readonly campanhaRepositorio: CampanhaRepository,
    private readonly campanhaService: CampanhaService,
    private readonly fichaService: FichaService,
    private readonly rolagemRepositorio: RolagemRepository,
  ) {}

  /**
   * Painel do espectador (decisão de produto #5): identidade segura + feed paginado de rolagens
   * `PUBLICA`. Legível por `ESPECTADOR` e por `MESTRE` em modo de prévia — o payload é idêntico
   * nos dois casos, nunca vaza privilégio de mestre. `UnauthorizedAccessException` para
   * `JOGADOR` ou não-membro.
   */
  async recuperarPainelEspectador(
    dto: CampanhaPainelEspectadorRecuperarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<CampanhaPainelEspectadorDto> {
    const identidade = await this.recuperarIdentidadeSegura(dto.campanhaId);

    const membroEncontrado = await this.campanhaService.validarMembro({
      campanhaId: dto.campanhaId,
      usuarioId: usuarioAtivo.sub,
    });
    if (
      !this.campanhaService.ehEspectador(membroEncontrado.papel)
      && !this.campanhaService.ehMestre(membroEncontrado.papel)
    ) {
      throw new UnauthorizedAccessException();
    }

    const rolagens = await this.rolagemRepositorio.listarPublicasPorCampanha({
      campanhaId: dto.campanhaId,
      pagina: dto.pagina,
      itensPorPagina: dto.itensPorPagina,
    });

    return { campanha: identidade, rolagens };
  }

  /**
   * Prévia de jogador (decisão de produto #6): fichas visíveis, feed e capacidade de acessar o
   * inventário de esquadrão calculados com a identidade do `usuarioAlvoId`, nunca do mestre que
   * requisita. Só o mestre da campanha pode pedir; o alvo precisa ser `JOGADOR` ativo (validado
   * por `FichaService.listarFichasParaAlvo`). `UnauthorizedAccessException` se o requisitante não
   * for mestre, ou se o alvo não for `JOGADOR` da campanha.
   */
  async recuperarPreviaJogador(
    dto: CampanhaPreviaJogadorRecuperarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<CampanhaPreviaJogadorDto> {
    const identidade = await this.recuperarIdentidadeSegura(dto.campanhaId);

    const membroEncontrado = await this.campanhaService.validarMembro({
      campanhaId: dto.campanhaId,
      usuarioId: usuarioAtivo.sub,
    });
    if (!this.campanhaService.ehMestre(membroEncontrado.papel)) {
      throw new UnauthorizedAccessException();
    }

    const fichas = await this.fichaService.listarFichasParaAlvo({
      campanhaId: dto.campanhaId,
      usuarioAlvoId: dto.usuarioAlvoId,
    });

    const rolagens = await this.rolagemRepositorio.listarPorCampanha({
      campanhaId: dto.campanhaId,
      usuarioId: dto.usuarioAlvoId,
      ehMestre: false,
    });

    return {
      campanha: identidade,
      fichas,
      rolagens,
      podeAcessarInventarioEsquadrao: identidade.naBase,
    };
  }

  /**
   * Identidade segura de campanha (sem código de convite nem membros) — base compartilhada das
   * duas projeções acima.
   */
  private async recuperarIdentidadeSegura(campanhaId: number): Promise<CampanhaIdentidadeSeguraDto> {
    const campanhaEncontrada = await this.campanhaRepositorio.recuperarPorId({ id: campanhaId });
    if (!campanhaEncontrada) {
      throw new ResourceNotFoundException('Campanha');
    }
    return {
      id: campanhaEncontrada.id,
      nome: campanhaEncontrada.nome,
      descricao: campanhaEncontrada.descricao,
      naBase: campanhaEncontrada.naBase,
    };
  }
}
