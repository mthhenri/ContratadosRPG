import { Injectable } from '@nestjs/common';
import type {
  FichaAlteradaDto,
  FichaCriadaDto,
  FichaCriarDto,
  FichaExcluirDto,
  FichaInternoAlterarDto,
  FichaJogadorDadosDto,
  FichaListarDto,
  FichaRecuperadaDto,
  FichaRecuperarDto,
  FichaResumoDto,
} from '@contratados-rpg/shared/dtos/ficha';
import { TipoCampanhaMembroPapelEnum, TipoFichaEnum } from '@contratados-rpg/shared/enums';
import {
  calcularEnergia,
  calcularVida,
  obterLimitesClasse,
} from '@contratados-rpg/shared/regras/agente';
import {
  BusinessException,
  ResourceNotFoundException,
  UnauthorizedAccessException,
} from '../../core/exceptions';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import { CampanhaRepository } from '../campanha/campanha.repository';
import { FichaRepository } from './ficha.repository';

/**
 * Regras da ficha de jogador (SYSTEM.SPEC §13/§14): CRUD com a **matriz de permissões** (§14) e a
 * **validação do documento de jogo contra `shared/regras`** (§11 camada 2) antes de persistir.
 * Toda a inteligência — permissões e validação — vive aqui; a service é o único árbitro (proibição
 * #28) e a controller apenas repassa (proibição #2). As queries de `ficha`/`usuario_ficha_acesso`
 * vêm do `FichaRepository` (módulo dono — proibição #23); o papel do usuário na campanha vem do
 * `CampanhaRepository` (módulo dono de `campanha_membro`), reusado sem duplicar a regra.
 *
 * Escopo m3-03: a ficha criada aqui é sempre do tipo `JOGADOR`, com dono = usuário autenticado
 * (`@ActiveUser().sub`). A concessão de visualização a outro membro (`usuario_ficha_acesso`) é
 * criada em m3-04; aqui só se **lê** essa concessão para arbitrar a visualização. A emissão de
 * eventos WebSocket pós-mutação é cabeada em m3-05.
 */
@Injectable()
export class FichaService {
  constructor(
    private readonly fichaRepositorio: FichaRepository,
    private readonly campanhaRepositorio: CampanhaRepository,
  ) {}

  /**
   * Cria a ficha de jogador do usuário autenticado numa campanha de que ele é membro (§14). O
   * documento de jogo é validado contra `shared/regras` antes de persistir; dados incoerentes →
   * `BusinessException`. O usuário precisa ser membro da campanha (`UnauthorizedAccessException`
   * caso contrário).
   */
  async criarFicha(dto: FichaCriarDto, usuarioAtivo: JwtPayload): Promise<FichaCriadaDto> {
    await this.validarMembro({ campanhaId: dto.campanhaId, usuarioId: usuarioAtivo.sub });
    this.validarDadosContraRegras(dto.dados);

    return this.fichaRepositorio.criarFicha({
      campanhaId: dto.campanhaId,
      usuarioId: usuarioAtivo.sub,
      tipo: TipoFichaEnum.JOGADOR,
      nome: dto.nome,
      dados: dto.dados,
    });
  }

  /**
   * Lista as fichas de uma campanha respeitando a matriz de permissões (§14): o mestre vê todas; um
   * membro comum vê só as próprias e as concedidas (`usuario_ficha_acesso`). Exige que o autor seja
   * membro da campanha (`UnauthorizedAccessException` caso contrário).
   */
  async listarFichas(dto: FichaListarDto, usuarioAtivo: JwtPayload): Promise<FichaResumoDto[]> {
    const membroEncontrado = await this.campanhaRepositorio.recuperarMembro({
      campanhaId: dto.campanhaId,
      usuarioId: usuarioAtivo.sub,
    });
    if (!membroEncontrado) {
      throw new UnauthorizedAccessException();
    }

    if (membroEncontrado.papel === TipoCampanhaMembroPapelEnum.MESTRE) {
      return this.fichaRepositorio.listarPorCampanha(dto);
    }

    return this.fichaRepositorio.listarVisiveisParaUsuario({
      campanhaId: dto.campanhaId,
      usuarioId: usuarioAtivo.sub,
    });
  }

  /**
   * Recupera uma ficha pelo `id`, exigindo permissão de **visualização** (§14): dono, mestre da
   * campanha ou membro com concessão em `usuario_ficha_acesso`. `ResourceNotFoundException` se a
   * ficha não existir; `UnauthorizedAccessException` se o autor não puder vê-la.
   */
  async recuperarFicha(
    dto: FichaRecuperarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<FichaRecuperadaDto> {
    const fichaEncontrada = await this.fichaRepositorio.recuperarPorId(dto);
    if (!fichaEncontrada) {
      throw new ResourceNotFoundException('Ficha');
    }

    await this.validarPermissaoVisualizacao(fichaEncontrada, usuarioAtivo);
    return fichaEncontrada;
  }

  /**
   * Altera `nome` e o documento de jogo de uma ficha, exigindo permissão de **edição** (§14): só o
   * dono ou o mestre da campanha. O `id` vem no DTO (montado pela controller com o `@Param`). O
   * documento é validado contra `shared/regras` antes de persistir. `ResourceNotFoundException` se
   * a ficha não existir; `UnauthorizedAccessException` se o autor não puder editá-la;
   * `BusinessException` se os dados forem incoerentes.
   */
  async alterarFicha(
    dto: FichaInternoAlterarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<FichaAlteradaDto> {
    const fichaEncontrada = await this.fichaRepositorio.recuperarPorId({ id: dto.id });
    if (!fichaEncontrada) {
      throw new ResourceNotFoundException('Ficha');
    }

    await this.validarPermissaoEdicao(fichaEncontrada, usuarioAtivo);
    this.validarDadosContraRegras(dto.dados);

    return this.fichaRepositorio.alterarFicha(dto);
  }

  /**
   * Exclui uma ficha (soft delete), exigindo permissão de **edição** (§14): só o dono ou o mestre
   * da campanha. `ResourceNotFoundException` se a ficha não existir; `UnauthorizedAccessException`
   * se o autor não puder editá-la.
   */
  async excluirFicha(dto: FichaExcluirDto, usuarioAtivo: JwtPayload): Promise<void> {
    const fichaEncontrada = await this.fichaRepositorio.recuperarPorId({ id: dto.id });
    if (!fichaEncontrada) {
      throw new ResourceNotFoundException('Ficha');
    }

    await this.validarPermissaoEdicao(fichaEncontrada, usuarioAtivo);
    await this.fichaRepositorio.excluirFicha(dto);
  }

  /**
   * Garante permissão de **visualização** da ficha (§14): dono (posse), mestre da campanha (papel)
   * ou membro com concessão ativa em `usuario_ficha_acesso`. Do contrário lança
   * `UnauthorizedAccessException`.
   */
  private async validarPermissaoVisualizacao(
    ficha: FichaRecuperadaDto,
    usuarioAtivo: JwtPayload,
  ): Promise<void> {
    if (ficha.usuarioId === usuarioAtivo.sub) {
      return;
    }

    const membroEncontrado = await this.campanhaRepositorio.recuperarMembro({
      campanhaId: ficha.campanhaId,
      usuarioId: usuarioAtivo.sub,
    });
    if (membroEncontrado?.papel === TipoCampanhaMembroPapelEnum.MESTRE) {
      return;
    }

    const acessoConcedido = await this.fichaRepositorio.recuperarAcesso({
      fichaId: ficha.id,
      usuarioId: usuarioAtivo.sub,
    });
    if (!acessoConcedido) {
      throw new UnauthorizedAccessException();
    }
  }

  /**
   * Garante permissão de **edição** da ficha (§14): só o dono (posse) ou o mestre da campanha
   * (papel). Um membro com concessão de visualização **nunca** edita. Do contrário lança
   * `UnauthorizedAccessException`.
   */
  private async validarPermissaoEdicao(
    ficha: FichaRecuperadaDto,
    usuarioAtivo: JwtPayload,
  ): Promise<void> {
    if (ficha.usuarioId === usuarioAtivo.sub) {
      return;
    }

    const membroEncontrado = await this.campanhaRepositorio.recuperarMembro({
      campanhaId: ficha.campanhaId,
      usuarioId: usuarioAtivo.sub,
    });
    if (membroEncontrado?.papel !== TipoCampanhaMembroPapelEnum.MESTRE) {
      throw new UnauthorizedAccessException();
    }
  }

  /**
   * Garante que o usuário é membro da campanha (dono/mestre ou jogador) — do contrário lança
   * `UnauthorizedAccessException`. Base da criação de ficha e da visualização (§14).
   */
  private async validarMembro(dto: { campanhaId: number; usuarioId: number }): Promise<void> {
    const membroEncontrado = await this.campanhaRepositorio.recuperarMembro(dto);
    if (!membroEncontrado) {
      throw new UnauthorizedAccessException();
    }
  }

  /**
   * Valida o documento de jogo salvo contra o motor de regras (`shared/regras`, §11 camada 2) — o
   * documento vence (proibição #27), reusando as fórmulas do M1 sem reimplementar regra:
   *
   * - Nível dentro do intervalo da classe (`obterLimitesClasse`);
   * - cada atributo dentro do intervalo da classe (`obterLimitesClasse`);
   * - Vida atual ≤ Vida máxima calculada para classe/nível/Vigor (`calcularVida`);
   * - Energia atual ≤ Energia máxima calculada para classe/nível/Destreza (`calcularEnergia`) — a
   *   Energia pode negativar (penalidades), então só o teto superior é limitado.
   *
   * Incoerência → `BusinessException`.
   */
  private validarDadosContraRegras(dados: FichaJogadorDadosDto): void {
    const limites = obterLimitesClasse({ classe: dados.classe });

    if (dados.nivel < limites.nivelMinimo || dados.nivel > limites.nivelMaximo) {
      throw new BusinessException(
        `Nível ${dados.nivel} fora do intervalo permitido para a classe (${limites.nivelMinimo}–${limites.nivelMaximo})`,
      );
    }

    for (const [nomeAtributo, valorAtributo] of Object.entries(dados.atributos)) {
      if (valorAtributo < limites.atributoMinimo || valorAtributo > limites.atributoMaximo) {
        throw new BusinessException(
          `Atributo ${nomeAtributo} (${valorAtributo}) fora do intervalo permitido para a classe (${limites.atributoMinimo}–${limites.atributoMaximo})`,
        );
      }
    }

    const vidaMaxima = calcularVida({
      classe: dados.classe,
      nivel: dados.nivel,
      vigor: dados.atributos.vigor,
    });
    if (dados.estado.vidaAtual > vidaMaxima) {
      throw new BusinessException(
        `Vida atual (${dados.estado.vidaAtual}) acima do máximo calculado (${vidaMaxima})`,
      );
    }

    const energiaMaxima = calcularEnergia({
      classe: dados.classe,
      nivel: dados.nivel,
      destreza: dados.atributos.destreza,
    });
    if (dados.estado.energiaAtual > energiaMaxima) {
      throw new BusinessException(
        `Energia atual (${dados.estado.energiaAtual}) acima do máximo calculado (${energiaMaxima})`,
      );
    }
  }
}
