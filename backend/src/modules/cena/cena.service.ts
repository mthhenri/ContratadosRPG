import { forwardRef, Inject, Injectable } from '@nestjs/common';
import type {
  CenaAbrirDto,
  CenaCriadaDto,
  CenaCriarDto,
  CenaEncerrarDto,
  CenaEspectadorAtivaRecuperarDto,
  CenaLinhaDto,
  CenaRecuperadaDto,
  CenaRecuperarDto,
  CenaReordenarDto,
  CenaResumoDto,
  CenaTipoAlterarDto,
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
import { recorteCenasDoPapel, validarCenaVisivelAoPapel } from './cena-visibilidade';
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
 * quem não é mestre, a listagem a omite e o `cena:alterada` só vai à sala do mestre. O jogador lê só
 * a cena `ATIVA` (`jogador-acesso-somente-cena-atual`). A política vive em `cena-visibilidade.ts`,
 * a mesma que o `EncontroService` e a `CenaDocumentoService` aplicam.
 *
 * **Um encontro aberto por cena (`cena-trocar-tipo`).** Trocar o tipo encerra o encontro corrente e,
 * se o tipo novo tem iniciativa, abre outro em `MONTAGEM` — a cena acumula encontros encerrados no
 * histórico, mas nunca dois abertos. Arbitrado aqui, na transação (migration 0041). O repositório
 * devolve o encontro mais recente; `linhaNoTipo` o descarta quando o tipo atual não tem iniciativa.
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
        await this.criarEncontroDaCena(cenaInserida);
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
      cenaAberta: this.linhaNoTipo(
        await this.cenaRepositorio.alterarStatus({
          id: cenaEncontrada.id,
          status: CenaStatusEnum.ATIVA,
        }),
      ),
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

    const cenaEncerrada = await this.transacaoService.executar(async () => {
      // Relida sob trava: uma troca de tipo concorrente pode ter aberto outro encontro.
      const cenaTravada = await this.travarERecuperarCena(cenaEncontrada.id);
      if (cenaTravada.status !== CenaStatusEnum.ATIVA) {
        throw new BusinessException('Só a cena em andamento pode ser encerrada');
      }
      return this.encerrarCenaComEncontro(cenaTravada);
    });

    await this.emitirAlteracoes([cenaEncerrada]);
    return this.recuperarCena({ id: cenaEncerrada.id }, usuarioAtivo);
  }

  /**
   * Troca o tipo da cena planejada ou ativa (`cena-trocar-tipo`). Na mesma transação: encerra o
   * encontro corrente (se houver), altera o tipo e, se o tipo novo tem iniciativa, abre um encontro
   * novo em `MONTAGEM` — toda troca que passa por iniciativa começa um combate do zero (decisões 1 e
   * 2 da spec). Em cena `PLANEJADA` a montagem descartada é excluída (soft delete), não encerrada:
   * a mesa nunca a viu (decisão 4). Os documentos da Investigação (`cena_documento`) não são tocados.
   */
  async alterarTipo(dto: CenaTipoAlterarDto, usuarioAtivo: JwtPayload): Promise<CenaRecuperadaDto> {
    const cenaEncontrada = await this.recuperarCenaObrigatoria(dto.id);
    await this.validarMestre(cenaEncontrada.campanhaId, usuarioAtivo);
    if (cenaEncontrada.status === CenaStatusEnum.ENCERRADA) {
      throw new BusinessException('Uma cena encerrada não troca de tipo');
    }
    if (!(Object.values(CenaTipoEnum) as string[]).includes(dto.tipo)) {
      throw new BusinessException('Tipo de cena inválido');
    }
    if (dto.tipo === cenaEncontrada.tipo) {
      throw new BusinessException('A cena já é desse tipo');
    }

    const { cenaAlterada, encontroEncerradoId } = await this.transacaoService.executar(async () => {
      // Relida sob trava (`FOR UPDATE`): duas trocas, ou uma troca e um encerramento, da mesma cena
      // em paralelo não deixam dois encontros abertos nem um encontro aberto em cena encerrada.
      const cenaTravada = await this.travarERecuperarCena(cenaEncontrada.id);
      if (cenaTravada.status === CenaStatusEnum.ENCERRADA) {
        throw new BusinessException('Uma cena encerrada não troca de tipo');
      }
      if (dto.tipo === cenaTravada.tipo) {
        throw new BusinessException('A cena já é desse tipo');
      }
      // Cena planejada: a mesa nunca viu a montagem — ela é descartada (soft delete), não vai ao
      // histórico, senão vazaria aos jogadores quando a cena abrir. Cena ativa: encerra e fica.
      const encontroAbertoId = cenaTravada.encontroId;
      const descartarMontagem = cenaTravada.status === CenaStatusEnum.PLANEJADA;
      if (encontroAbertoId !== null) {
        if (descartarMontagem) {
          await this.encontroRepositorio.excluirEncontro({ id: encontroAbertoId });
        } else {
          await this.encontroService.encerrarEncontroDaCena({ id: encontroAbertoId });
        }
      }
      const cenaComTipoNovo = await this.cenaRepositorio.alterarTipo({ id: cenaEncontrada.id, tipo: dto.tipo });
      if (cenaTemIniciativa(dto.tipo)) {
        await this.criarEncontroDaCena(cenaComTipoNovo);
      }
      return {
        cenaAlterada: await this.recuperarCenaObrigatoria(cenaEncontrada.id),
        encontroEncerradoId: descartarMontagem ? null : encontroAbertoId,
      };
    });

    if (encontroEncerradoId !== null) {
      await this.encontroService.emitirEncontroAlterado({ id: encontroEncerradoId });
    }
    await this.emitirAlteracoes([cenaAlterada]);
    return this.recuperarCena({ id: cenaAlterada.id }, usuarioAtivo);
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
      incluirEncerradas: true,
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
      incluirEncerradas: true,
    });
    const resumos = cenasReordenadas.map((cena) => this.resumoNoTipo(cena));
    for (const cena of resumos.filter((cenaListada) => idsPlanejados.has(cenaListada.id))) {
      this.campanhaGateway.emitirCenaAlterada({ campanhaId: dto.campanhaId, cena });
    }
    return resumos;
  }

  /**
   * Estado completo da cena, com o encontro dela no recorte de quem pediu. Exige ser membro e poder
   * ler a cena (`validarCenaVisivelAoPapel`): planejada só o mestre; o jogador só a `ATIVA`. A
   * recusa é de acesso (403), nunca um payload vazio — o cliente com URL antiga não recebe nada.
   */
  async recuperarCena(dto: CenaRecuperarDto, usuarioAtivo: JwtPayload): Promise<CenaRecuperadaDto> {
    const cenaEncontrada = await this.recuperarCenaObrigatoria(dto.id);
    const membro = await this.validarMembro(cenaEncontrada.campanhaId, usuarioAtivo);
    validarCenaVisivelAoPapel(membro.papel, cenaEncontrada.status);

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
   * Cenas da campanha, no recorte do papel (`recorteCenasDoPapel`): o mestre recebe todas; o
   * jogador, só a `ATIVA` (nenhum histórico nem planejada); o espectador, a `ATIVA` e as
   * `ENCERRADA` (política da m7-22, de spec própria).
   */
  async listarPorCampanha(
    dto: { campanhaId: number },
    usuarioAtivo: JwtPayload,
  ): Promise<CenaResumoDto[]> {
    const membro = await this.validarMembro(dto.campanhaId, usuarioAtivo);
    const cenas = await this.cenaRepositorio.listarPorCampanha({
      campanhaId: dto.campanhaId,
      ...recorteCenasDoPapel(membro.papel),
    });
    return cenas.map((cena) => this.resumoNoTipo(cena));
  }

  // ── Apoio ──────────────────────────────────────────────────────────────────

  /** Cena ativa no recorte espectador; a projeção chamadora já autorizou o papel da campanha. */
  async recuperarCenaAtivaParaEspectador(
    dto: CenaEspectadorAtivaRecuperarDto,
  ): Promise<CenaRecuperadaDto | null> {
    const cena = await this.cenaRepositorio.recuperarAtivaPorCampanha(dto);
    if (!cena || cena.status !== CenaStatusEnum.ATIVA || cena.campanhaId !== dto.campanhaId) {
      return null;
    }
    const encontro = cenaTemIniciativa(cena.tipo) && cena.encontroId !== null
      ? await this.encontroService.recuperarEncontroAtivoParaEspectador(dto)
      : null;
    return {
      id: cena.id,
      campanhaId: cena.campanhaId,
      nome: cena.nome,
      tipo: cena.tipo,
      status: cena.status,
      encontro: encontro?.id === cena.encontroId && encontro?.cenaId === cena.id ? encontro : null,
    };
  }

  /**
   * Encerra a cena ativa da campanha, se houver, com o encontro dela — o primeiro passo de abrir ou
   * criar outra já ativa. Só chamado dentro de uma transação.
   */
  private async encerrarCenaAtivaDaCampanha(campanhaId: number): Promise<CenaLinhaDto | null> {
    const cenaAtiva = await this.cenaRepositorio.recuperarAtivaPorCampanha({ campanhaId });
    return cenaAtiva ? this.encerrarCenaComEncontro(await this.travarERecuperarCena(cenaAtiva.id)) : null;
  }

  /** `→ ENCERRADA` e, junto, o encontro da cena (regra de encerramento do `EncontroService`). */
  private async encerrarCenaComEncontro(cena: CenaLinhaDto): Promise<CenaLinhaDto> {
    if (cena.encontroId !== null) {
      await this.encontroService.encerrarEncontroDaCena({ id: cena.encontroId });
    }
    return this.linhaNoTipo(
      await this.cenaRepositorio.alterarStatus({ id: cena.id, status: CenaStatusEnum.ENCERRADA }),
    );
  }

  /**
   * Abre o encontro da cena em `MONTAGEM`, com o nome dela — na criação de cena de tipo com
   * iniciativa e na troca para um. Só chamado dentro de uma transação.
   */
  private async criarEncontroDaCena(cena: CenaLinhaDto): Promise<void> {
    await this.encontroRepositorio.criarEncontro({
      campanhaId: cena.campanhaId,
      cenaId: cena.id,
      nome: cena.nome,
      status: EncontroStatusEnum.MONTAGEM,
    });
  }

  /**
   * O repositório devolve o encontro mais recente da cena; ele só vale para a cena quando o tipo
   * atual tem iniciativa. Depois de trocar Combate → Investigação, o encontro encerrado continua no
   * histórico, mas a cena não o tem mais.
   */
  private linhaNoTipo(cena: CenaLinhaDto): CenaLinhaDto {
    return cenaTemIniciativa(cena.tipo) ? cena : { ...cena, encontroId: null };
  }

  /** O mesmo recorte de `linhaNoTipo` para o item de listagem. */
  private resumoNoTipo(cena: CenaResumoDto): CenaResumoDto {
    return cena.temEncontro && !cenaTemIniciativa(cena.tipo) ? { ...cena, temEncontro: false } : cena;
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

  /** Trava a cena (`FOR UPDATE`) e a relê já sob a trava. Só chamado dentro de uma transação. */
  private async travarERecuperarCena(id: number): Promise<CenaLinhaDto> {
    await this.cenaRepositorio.travarPorId({ id });
    return this.recuperarCenaObrigatoria(id);
  }

  /** Recupera a cena ou estoura 404. */
  private async recuperarCenaObrigatoria(id: number): Promise<CenaLinhaDto> {
    const cenaEncontrada = await this.cenaRepositorio.recuperarPorId({ id });
    if (!cenaEncontrada) {
      throw new ResourceNotFoundException('Cena');
    }
    return this.linhaNoTipo(cenaEncontrada);
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
