import { Injectable } from '@nestjs/common';
import type {
  CampanhaIdentidadeSeguraDto,
  CampanhaPainelEspectadorDto,
  CampanhaPainelEspectadorRecuperarDto,
  CampanhaPreviaJogadorDto,
  CampanhaPreviaJogadorFichaRecuperarDto,
  CampanhaPreviaJogadorRecuperarDto,
} from '@contratados-rpg/shared/dtos/campanha';
import type { FichaRecuperadaDto } from '@contratados-rpg/shared/dtos/ficha';
import { ResourceNotFoundException, UnauthorizedAccessException } from '../../core/exceptions';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import { CampanhaRepository } from '../campanha/campanha.repository';
import { CampanhaService } from '../campanha/campanha.service';
import { EncontroService } from '../encontro/encontro.service';
import { FichaService } from '../ficha/ficha.service';
import { RolagemRepository } from '../rolagem/rolagem.repository';

/**
 * Projeções de leitura do módulo `m8-espectadores-campanha` (m8-02/m8-05, entregáveis 5/6): o
 * painel do espectador e a prévia de jogador. As duas cruzam quatro domínios — identidade de
 * campanha (`campanha`), fichas visíveis (`ficha`), feed de rolagens (`rolagem`) e o encontro
 * ativo (`encontro`) — por isso vivem num módulo próprio em vez de em qualquer um deles:
 * `CampanhaModule` não pode importar `EncontroModule`/`FichaModule`/`RolagemModule` sem criar um
 * ciclo (os três já importam `CampanhaModule`), e este módulo, importando os quatro em vez de ser
 * importado por eles, evita o ciclo por completo.
 *
 * Nenhuma regra de permissão é reimplementada aqui (proibição #28): a identidade segura reusa
 * `CampanhaRepository.recuperarPorId` (dono da tabela `campanha`), a checagem de papel reusa os
 * predicados de `CampanhaService`, as fichas visíveis reusam `FichaService.listarFichasParaAlvo`,
 * o feed reusa `RolagemRepository` e o encontro ativo reusa
 * `EncontroService.recuperarEncontroAtivoParaEspectador`/`recuperarEncontroAtivoParaAlvo` — cada
 * um já dono da própria regra.
 */
@Injectable()
export class CampanhaProjecaoService {
  constructor(
    private readonly campanhaRepositorio: CampanhaRepository,
    private readonly campanhaService: CampanhaService,
    private readonly encontroService: EncontroService,
    private readonly fichaService: FichaService,
    private readonly rolagemRepositorio: RolagemRepository,
  ) {}

  /**
   * Painel do espectador (decisão de produto #5): identidade segura + feed paginado de rolagens
   * `PUBLICA` + encontro ativo redigido (m8-05). Legível por `ESPECTADOR` e por `MESTRE` em modo
   * de prévia — o payload é idêntico nos dois casos, nunca vaza privilégio de mestre.
   * `UnauthorizedAccessException` para `JOGADOR` ou não-membro.
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

    const encontroAtivo = await this.encontroService.recuperarEncontroAtivoParaEspectador({
      campanhaId: dto.campanhaId,
    });

    return { campanha: identidade, rolagens, encontroAtivo };
  }

  /**
   * Prévia de jogador (decisão de produto #6, `membros` estendido na m8-04): fichas visíveis,
   * membros/Equipe, feed e capacidade de acessar o inventário de esquadrão calculados com a
   * identidade do `usuarioAlvoId`, nunca do mestre que requisita. Só o mestre da campanha pode
   * pedir; o alvo precisa ser `JOGADOR` ativo (validado por `FichaService.listarFichasParaAlvo`).
   * `UnauthorizedAccessException` se o requisitante não for mestre, ou se o alvo não for
   * `JOGADOR` da campanha.
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

    // `listarFichasParaAlvo` já valida que `usuarioAlvoId` é `JOGADOR` ativo da campanha — os dois
    // acessos abaixo (membros, ficha completa) reusam essa validação em vez de repeti-la.
    const fichas = await this.fichaService.listarFichasParaAlvo({
      campanhaId: dto.campanhaId,
      usuarioAlvoId: dto.usuarioAlvoId,
    });

    // Coluna "Equipe" da visão de jogador (m8-04): mesma consulta que `CampanhaService.listarMembros`
    // usa pro mestre, mas com a identidade do **alvo** — `acessoCompleto` por ficha e a visibilidade
    // de ficha `oculta` de terceiro saem calculados como o alvo veria, nunca como o mestre vê.
    const membros = await this.campanhaRepositorio.listarMembros({
      campanhaId: dto.campanhaId,
      usuarioAtivoId: dto.usuarioAlvoId,
      usuarioAtivoEhMestre: false,
    });

    const rolagens = await this.rolagemRepositorio.listarPorCampanha({
      campanhaId: dto.campanhaId,
      usuarioId: dto.usuarioAlvoId,
      ehMestre: false,
    });

    const encontroAtivo = await this.encontroService.recuperarEncontroAtivoParaAlvo({
      campanhaId: dto.campanhaId,
      usuarioAlvoId: dto.usuarioAlvoId,
    });

    return {
      campanha: identidade,
      fichas,
      membros,
      rolagens,
      podeAcessarInventarioEsquadrao: identidade.naBase,
      encontroAtivo,
    };
  }

  /**
   * Ficha completa (com `dados`) dentro da prévia de jogador (m8-04, decisão de produto #6
   * estendida): delega inteiramente a `FichaService.recuperarFichaParaAlvo`, que já checa mestre
   * requisitante + alvo `JOGADOR` + visibilidade da ficha para o alvo (proibição #28 — nenhuma
   * regra de permissão duplicada aqui). `campanhaId` do `@Param` é conferido contra a campanha
   * real da ficha só como defesa em profundidade; a autorização de fato não depende dele.
   * `ResourceNotFoundException` se a ficha não existir, não tiver campanha, ou pertencer a uma
   * campanha diferente da do `@Param`.
   */
  async recuperarFichaPreviaJogador(
    dto: CampanhaPreviaJogadorFichaRecuperarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<FichaRecuperadaDto> {
    const fichaEncontrada = await this.fichaService.recuperarFichaParaAlvo(
      { fichaId: dto.fichaId, usuarioAlvoId: dto.usuarioAlvoId },
      usuarioAtivo,
    );
    if (fichaEncontrada.campanhaId !== dto.campanhaId) {
      throw new ResourceNotFoundException('Ficha');
    }
    return fichaEncontrada;
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
