import { forwardRef, Inject, Injectable } from '@nestjs/common';
import type {
  CenaAbrirDto,
  CenaCriadaDto,
  CenaCriarDto,
  CenaEncerrarDto,
  CenaLinhaDto,
  CenaRecuperadaDto,
  CenaRecuperarDto,
  CenaReordenarDto,
  CenaResumoDto,
} from '@contratados-rpg/shared/dtos/cena';
import type {
  EncontroCriadoDto,
  EncontroCriarDto,
  EncontroEncerrarDto,
  EncontroRecuperadoDto,
} from '@contratados-rpg/shared/dtos/encontro';
import {
  CenaStatusEnum,
  CenaTipoEnum,
  EncontroStatusEnum,
  TipoCampanhaMembroPapelEnum,
} from '@contratados-rpg/shared/enums';
import { cenaTemIniciativa } from '@contratados-rpg/shared/regras/cena';
import { BusinessException, ResourceNotFoundException, UnauthorizedAccessException } from '../../core/exceptions';
import { CampanhaGateway } from '../../core/gateway/campanha.gateway';
import { TransacaoService } from '../../database/transacao.service';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import { CampanhaRepository } from '../campanha/campanha.repository';
import { EncontroRepository } from '../encontro/encontro.repository';
import { EncontroService } from '../encontro/encontro.service';
import { CenaRepository } from './cena.repository';

/**
 * Regras do módulo `cena` (m7-22) — a raiz tipada da mesa: criar, abrir, encerrar, reordenar,
 * listar e recuperar. O `encontro` (iniciativa) é uma estrutura que a cena tem quando
 * `cenaTemIniciativa(tipo)` — nunca um `if` de tipo decidido aqui.
 *
 * **Invariante (decisão #4 do milestone).** No máximo uma cena `ATIVA` por campanha: abrir ou criar
 * já ativa encerra a ativa atual **na mesma transação** (`TransacaoService`), sem janela com duas
 * ativas nem com nenhuma. Arbitrada aqui, não por índice parcial (fora de escopo, mesma decisão de
 * `m7-01`).
 *
 * **Ciclo de vida junto (decisão #5).** Encerrar a cena encerra o encontro dela na mesma transação:
 * nunca existe cena `ENCERRADA` com encontro aberto, nem encontro `ENCERRADO` em cena `ATIVA`.
 *
 * **Trava anti-vazamento (decisão #7).** Cena `PLANEJADA` é exclusiva do mestre: `GET` recusa (403)
 * quem não é mestre, a listagem a omite e o `cena:alterada` só vai à sala do mestre. O encontro dela
 * tem a mesma trava no `EncontroService`.
 *
 * **Emissão depois de confirmar (§9).** Toda escrita roda dentro da transação; `cena:alterada` e
 * `encontro:alterado` saem só depois do commit.
 */
@Injectable()
export class CenaService {
  constructor(
    private readonly cenaRepositorio: CenaRepository,
    private readonly encontroRepositorio: EncontroRepository,
    private readonly encontroService: EncontroService,
    private readonly campanhaRepositorio: CampanhaRepository,
    private readonly transacaoService: TransacaoService,
    @Inject(forwardRef(() => CampanhaGateway))
    private readonly campanhaGateway: CampanhaGateway,
  ) {}

  /**
   * Cria a cena — `PLANEJADA` no fim da fila ou, com `ativarImediatamente`, já `ATIVA` (encerrando
   * a ativa atual). Tipo com iniciativa nasce com o seu encontro em `MONTAGEM`, na mesma transação
   * (o `created_date` igual ao da cena é o que o `DOWN` da migration 0032 espera).
   */
  async criarCena(
    dto: CenaCriarDto & { campanhaId: number },
    usuarioAtivo: JwtPayload,
  ): Promise<CenaCriadaDto> {
    await this.validarMestre(dto.campanhaId, usuarioAtivo);
    const nome = dto.nome?.trim();
    if (!nome) {
      throw new BusinessException('A cena precisa de um nome');
    }
    if (!(Object.values(CenaTipoEnum) as string[]).includes(dto.tipo)) {
      throw new BusinessException('Tipo de cena inválido');
    }
    const ativarImediatamente = dto.ativarImediatamente === true;

    const { cenaCriada, cenaEncerrada } = await this.transacaoService.executar(async () => {
      const cenaEncerradaNaTroca = ativarImediatamente
        ? await this.encerrarCenaAtivaDaCampanha(dto.campanhaId)
        : null;
      const maiorOrdem = await this.cenaRepositorio.recuperarMaiorOrdem({ campanhaId: dto.campanhaId });
      const cenaInserida = await this.cenaRepositorio.criarCena({
        campanhaId: dto.campanhaId,
        nome,
        tipo: dto.tipo,
        status: ativarImediatamente ? CenaStatusEnum.ATIVA : CenaStatusEnum.PLANEJADA,
        ordem: maiorOrdem + 1,
      });
      if (cenaTemIniciativa(dto.tipo)) {
        await this.encontroRepositorio.criarEncontro({
          campanhaId: dto.campanhaId,
          cenaId: cenaInserida.id,
          nome,
          status: EncontroStatusEnum.MONTAGEM,
        });
      }
      return {
        cenaCriada: await this.recuperarCenaObrigatoria(cenaInserida.id),
        cenaEncerrada: cenaEncerradaNaTroca,
      };
    });

    await this.emitirAlteracoes([cenaEncerrada, cenaCriada]);
    return {
      id: cenaCriada.id,
      campanhaId: cenaCriada.campanhaId,
      nome: cenaCriada.nome,
      tipo: cenaCriada.tipo,
      status: cenaCriada.status,
    };
  }

  /**
   * `POST campanha/:id/encontro` — a rota de criação anterior às cenas, mantida para o painel de
   * Iniciativa atual até a `m7-23` trocá-lo pelo hub de cenas. Cria uma cena `COMBATE` já `ATIVA`
   * com o seu encontro e devolve o encontro, como antes. Preserva também a recusa de antes: com uma
   * cena em andamento a rota não a encerra por baixo — o mestre encerra primeiro.
   */
  async criarEncontro(
    dto: EncontroCriarDto & { campanhaId: number },
    usuarioAtivo: JwtPayload,
  ): Promise<EncontroCriadoDto> {
    await this.validarMestre(dto.campanhaId, usuarioAtivo);
    const cenaAtiva = await this.cenaRepositorio.recuperarAtivaPorCampanha({ campanhaId: dto.campanhaId });
    if (cenaAtiva) {
      throw new BusinessException(
        'A campanha já tem uma cena em andamento — encerre-a antes de abrir outra',
      );
    }

    const cenaCriada = await this.criarCena(
      { campanhaId: dto.campanhaId, nome: dto.nome, tipo: CenaTipoEnum.COMBATE, ativarImediatamente: true },
      usuarioAtivo,
    );
    const cena = await this.recuperarCenaObrigatoria(cenaCriada.id);
    const encontroCriado = await this.encontroRepositorio.recuperarPorId({ id: cena.encontroId as number });
    if (!encontroCriado) {
      throw new ResourceNotFoundException('Encontro');
    }
    return {
      id: encontroCriado.id,
      campanhaId: encontroCriado.campanhaId,
      nome: encontroCriado.nome,
      status: encontroCriado.status,
    };
  }

  /**
   * Abre uma cena planejada (`PLANEJADA → ATIVA`), encerrando a ativa atual na mesma transação. A
   * partir daqui ela — e o encontro dela — passam a chegar aos jogadores.
   */
  async abrirCena(dto: CenaAbrirDto, usuarioAtivo: JwtPayload): Promise<CenaRecuperadaDto> {
    const cenaEncontrada = await this.recuperarCenaObrigatoria(dto.id);
    await this.validarMestre(cenaEncontrada.campanhaId, usuarioAtivo);
    if (cenaEncontrada.status !== CenaStatusEnum.PLANEJADA) {
      throw new BusinessException('Só uma cena planejada pode ser aberta');
    }

    const { cenaAberta, cenaEncerrada } = await this.transacaoService.executar(async () => ({
      cenaEncerrada: await this.encerrarCenaAtivaDaCampanha(cenaEncontrada.campanhaId),
      cenaAberta: await this.cenaRepositorio.alterarStatus({
        id: cenaEncontrada.id,
        status: CenaStatusEnum.ATIVA,
      }),
    }));

    await this.emitirAlteracoes([cenaEncerrada, cenaAberta]);
    return this.recuperarCena({ id: cenaAberta.id }, usuarioAtivo);
  }

  /**
   * Encerra a cena ativa (`ATIVA → ENCERRADA`) e, na mesma transação, o encontro dela. Só a cena
   * ativa encerra: uma `ENCERRADA` é sempre uma cena que a mesa já viu, então o histórico do
   * jogador nunca expõe um preparo que o mestre não chegou a abrir.
   */
  async encerrarCena(dto: CenaEncerrarDto, usuarioAtivo: JwtPayload): Promise<CenaRecuperadaDto> {
    const cenaEncontrada = await this.recuperarCenaObrigatoria(dto.id);
    await this.validarMestre(cenaEncontrada.campanhaId, usuarioAtivo);
    if (cenaEncontrada.status !== CenaStatusEnum.ATIVA) {
      throw new BusinessException('Só a cena em andamento pode ser encerrada');
    }

    const cenaEncerrada = await this.transacaoService.executar(() =>
      this.encerrarCenaComEncontro(cenaEncontrada),
    );

    await this.emitirAlteracoes([cenaEncerrada]);
    return this.recuperarCena({ id: cenaEncerrada.id }, usuarioAtivo);
  }

  /**
   * `POST encontro/:id/encerrar` — o "Encerrar" do painel de Iniciativa (decisão #5 do milestone):
   * encerra a **cena-mãe** do encontro, e com ela o encontro. Devolve o estado do encontro, como a
   * rota sempre devolveu.
   */
  async encerrarCenaDoEncontro(
    dto: EncontroEncerrarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<EncontroRecuperadoDto> {
    const encontroEncontrado = await this.encontroRepositorio.recuperarPorId({ id: dto.id });
    if (!encontroEncontrado) {
      throw new ResourceNotFoundException('Encontro');
    }
    await this.encerrarCena({ id: encontroEncontrado.cenaId }, usuarioAtivo);
    return this.encontroService.recuperarEncontro({ id: dto.id }, usuarioAtivo);
  }

  /**
   * Reordena as cenas planejadas da campanha. `ordem` precisa listar **exatamente** as planejadas,
   * cada uma uma vez — uma lista parcial deixaria posições repetidas na fila.
   */
  async reordenarCenas(dto: CenaReordenarDto, usuarioAtivo: JwtPayload): Promise<CenaResumoDto[]> {
    await this.validarMestre(dto.campanhaId, usuarioAtivo);
    const cenas = await this.cenaRepositorio.listarPorCampanha({
      campanhaId: dto.campanhaId,
      incluirPlanejadas: true,
    });
    const planejadas = cenas.filter((cena) => cena.status === CenaStatusEnum.PLANEJADA);
    const idsPlanejados = new Set(planejadas.map((cena) => cena.id));
    const ordem = dto.ordem ?? [];
    if (
      ordem.length !== idsPlanejados.size ||
      new Set(ordem).size !== ordem.length ||
      ordem.some((id) => !idsPlanejados.has(id))
    ) {
      throw new BusinessException('A nova ordem precisa listar exatamente as cenas planejadas da campanha');
    }

    await this.transacaoService.executar(async () => {
      for (const [indice, id] of ordem.entries()) {
        await this.cenaRepositorio.alterarOrdem({ id, ordem: indice + 1 });
      }
    });

    const cenasReordenadas = await this.cenaRepositorio.listarPorCampanha({
      campanhaId: dto.campanhaId,
      incluirPlanejadas: true,
    });
    for (const cena of cenasReordenadas.filter((cenaListada) => idsPlanejados.has(cenaListada.id))) {
      this.campanhaGateway.emitirCenaAlterada({ campanhaId: dto.campanhaId, cena });
    }
    return cenasReordenadas;
  }

  /**
   * Estado completo da cena, com o encontro dela no recorte de quem pediu. Exige ser membro — e,
   * com a cena `PLANEJADA`, ser o mestre: a recusa é de acesso (403), nunca um payload vazio.
   */
  async recuperarCena(dto: CenaRecuperarDto, usuarioAtivo: JwtPayload): Promise<CenaRecuperadaDto> {
    const cenaEncontrada = await this.recuperarCenaObrigatoria(dto.id);
    const membro = await this.validarMembro(cenaEncontrada.campanhaId, usuarioAtivo);
    if (
      membro.papel !== TipoCampanhaMembroPapelEnum.MESTRE &&
      cenaEncontrada.status === CenaStatusEnum.PLANEJADA
    ) {
      throw new UnauthorizedAccessException();
    }

    return {
      id: cenaEncontrada.id,
      campanhaId: cenaEncontrada.campanhaId,
      nome: cenaEncontrada.nome,
      tipo: cenaEncontrada.tipo,
      status: cenaEncontrada.status,
      encontro:
        cenaEncontrada.encontroId === null
          ? null
          : await this.encontroService.recuperarEncontro({ id: cenaEncontrada.encontroId }, usuarioAtivo),
    };
  }

  /**
   * Cenas da campanha. O mestre recebe todas; jogador e espectador, só a `ATIVA` e as
   * `ENCERRADA` (histórico) — decisão da m7-22 para o ponto em aberto do milestone.
   */
  async listarPorCampanha(
    dto: { campanhaId: number },
    usuarioAtivo: JwtPayload,
  ): Promise<CenaResumoDto[]> {
    const membro = await this.validarMembro(dto.campanhaId, usuarioAtivo);
    return this.cenaRepositorio.listarPorCampanha({
      campanhaId: dto.campanhaId,
      incluirPlanejadas: membro.papel === TipoCampanhaMembroPapelEnum.MESTRE,
    });
  }

  // ── Apoio ──────────────────────────────────────────────────────────────────

  /**
   * Encerra a cena ativa da campanha, se houver, com o encontro dela — o primeiro passo de abrir ou
   * criar outra já ativa. Só chamado dentro de uma transação.
   */
  private async encerrarCenaAtivaDaCampanha(campanhaId: number): Promise<CenaLinhaDto | null> {
    const cenaAtiva = await this.cenaRepositorio.recuperarAtivaPorCampanha({ campanhaId });
    return cenaAtiva ? this.encerrarCenaComEncontro(cenaAtiva) : null;
  }

  /** `→ ENCERRADA` e, junto, o encontro da cena (regra de encerramento do `EncontroService`). */
  private async encerrarCenaComEncontro(cena: CenaLinhaDto): Promise<CenaLinhaDto> {
    if (cena.encontroId !== null) {
      await this.encontroService.encerrarEncontroDaCena({ id: cena.encontroId });
    }
    return this.cenaRepositorio.alterarStatus({ id: cena.id, status: CenaStatusEnum.ENCERRADA });
  }

  /**
   * Transmite, já depois do commit, cada cena alterada (`cena:alterada`) e o encontro dela
   * (`encontro:alterado`, com o recorte por usuário e a trava de cena planejada do `EncontroService`).
   */
  private async emitirAlteracoes(cenas: readonly (CenaLinhaDto | null)[]): Promise<void> {
    for (const cena of cenas) {
      if (!cena) {
        continue;
      }
      this.campanhaGateway.emitirCenaAlterada({
        campanhaId: cena.campanhaId,
        cena: {
          id: cena.id,
          nome: cena.nome,
          tipo: cena.tipo,
          status: cena.status,
          temEncontro: cena.encontroId !== null,
        },
      });
      if (cena.encontroId !== null) {
        await this.encontroService.emitirEncontroAlterado({ id: cena.encontroId });
      }
    }
  }

  /** Recupera a cena ou estoura 404. */
  private async recuperarCenaObrigatoria(id: number): Promise<CenaLinhaDto> {
    const cenaEncontrada = await this.cenaRepositorio.recuperarPorId({ id });
    if (!cenaEncontrada) {
      throw new ResourceNotFoundException('Cena');
    }
    return cenaEncontrada;
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

  /** Exige ser o **mestre** da campanha — quem prepara, abre e encerra as cenas. */
  private async validarMestre(campanhaId: number, usuarioAtivo: JwtPayload): Promise<void> {
    const membroEncontrado = await this.validarMembro(campanhaId, usuarioAtivo);
    if (membroEncontrado.papel !== TipoCampanhaMembroPapelEnum.MESTRE) {
      throw new UnauthorizedAccessException();
    }
  }
}
