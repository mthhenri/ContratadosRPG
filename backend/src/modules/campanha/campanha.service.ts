import { randomBytes, randomUUID } from 'node:crypto';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ItemCategoriaEnum, TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import type {
  CampanhaAlteradaDto,
  CampanhaConviteEspectadorRegeneradoDto,
  CampanhaConviteEspectadorRegenerarDto,
  CampanhaConviteRegeneradoDto,
  CampanhaConviteRegenerarDto,
  CampanhaCriadaDto,
  CampanhaCriarDto,
  CampanhaEntradaDto,
  CampanhaEntrarDto,
  CampanhaEstadoAlteradaDto,
  CampanhaEstadoAlterarDto,
  CampanhaExcluirDto,
  CampanhaInternoAlterarDto,
  CampanhaInventarioDto,
  CampanhaInventarioItemAdicionarDto,
  CampanhaInventarioItemAlterarDto,
  CampanhaInventarioItemDto,
  CampanhaInventarioItemQuantidadeAjustarDto,
  CampanhaInventarioItemRemoverDto,
  CampanhaInventarioRecuperarDto,
  CampanhaListarDto,
  CampanhaMembroInternoRecuperadoDto,
  CampanhaMembroInternoRecuperarDto,
  CampanhaMembroPapelAlteradoDto,
  CampanhaMembroPapelAlterarDto,
  CampanhaMembroRemoverDto,
  CampanhaMembroRemovidoDto,
  CampanhaMembroResumoDto,
  CampanhaMembrosListarDto,
  CampanhaMestreTransferidoDto,
  CampanhaMestreTransferirDto,
  CampanhaRecuperadaDto,
  CampanhaRecuperarDto,
  CampanhaResumoDto,
} from '@contratados-rpg/shared/dtos/campanha';
import {
  BusinessException,
  ResourceNotFoundException,
  UnauthorizedAccessException,
} from '../../core/exceptions';
import { CampanhaGateway } from '../../core/gateway/campanha.gateway';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import { CampanhaRepository } from './campanha.repository';

/** Alfabeto do código de convite — sem caracteres ambíguos (0/O/1/I). */
const ALFABETO_CONVITE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Tamanho do código de convite gerado na criação da campanha. */
const TAMANHO_CONVITE = 8;

const CATEGORIAS_EMPILHAVEIS_INVENTARIO = new Set<ItemCategoriaEnum>([
  ItemCategoriaEnum.OPERACIONAL,
  ItemCategoriaEnum.MEDICINAL,
]);

function modificacoesSaoIdenticas(
  modificacoes: CampanhaInventarioItemDto['modificacoes'],
  outrasModificacoes: CampanhaInventarioItemAdicionarDto['modificacoes'],
): boolean {
  return JSON.stringify(modificacoes ?? []) === JSON.stringify(outrasModificacoes ?? []);
}

/** Compara apenas a identidade descritiva; `id` e `quantidade` pertencem ao registro/stack. */
function itensInventarioSaoIdenticos(
  item: CampanhaInventarioItemDto,
  dto: CampanhaInventarioItemAdicionarDto,
): boolean {
  return item.nome === dto.nome
    && item.categoria === dto.categoria
    && item.custo === dto.custo
    && item.peso === dto.peso
    && item.descricao === dto.descricao
    && item.dano === dto.dano
    && item.informacao === dto.informacao
    && item.resistencia === dto.resistencia
    && item.bonus === dto.bonus
    && modificacoesSaoIdenticas(item.modificacoes, dto.modificacoes);
}

/**
 * Regras de campanha (SYSTEM.SPEC §13/§14): CRUD com o criador virando `MESTRE`, listagem
 * das campanhas de que o usuário é membro, gestão (alterar/excluir) restrita ao mestre,
 * entrada por código de convite (papel `JOGADOR`), regeneração do convite (só mestre) e
 * listagem de membros. Toda a inteligência — incluindo as **permissões** — vive aqui; a
 * service é o único árbitro (proibição #28) e a controller apenas repassa (proibição #2). As
 * queries vêm do `CampanhaRepository` (módulo dono — proibição #23).
 */
@Injectable()
export class CampanhaService {
  constructor(
    private readonly campanhaRepositorio: CampanhaRepository,
    @Inject(forwardRef(() => CampanhaGateway))
    private readonly campanhaGateway: CampanhaGateway,
  ) {}

  /**
   * Cria uma campanha: gera os dois convites únicos (`codigoConvite` de `JOGADOR`,
   * `codigoConviteEspectador` de `ESPECTADOR` — m8-01), persiste a `campanha` e cria o
   * `campanha_membro` do criador com papel `MESTRE`. Uma campanha tem exatamente um mestre
   * no v1 (SYSTEM.SPEC §14).
   */
  async criarCampanha(
    dto: CampanhaCriarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<CampanhaCriadaDto> {
    const campanhaCriada = await this.campanhaRepositorio.criarCampanha({
      nome: dto.nome,
      descricao: dto.descricao,
      codigoConvite: this.gerarCodigoConvite(),
      codigoConviteEspectador: this.gerarCodigoConvite(),
    });

    await this.campanhaRepositorio.criarMembro({
      campanhaId: campanhaCriada.id,
      usuarioId: usuarioAtivo.sub,
      papel: TipoCampanhaMembroPapelEnum.MESTRE,
    });

    return campanhaCriada;
  }

  /**
   * Lista as campanhas de que o usuário autenticado é membro (o `usuarioId` vem do JWT via
   * `@ActiveUser()`), com o `papel` dele em cada uma.
   */
  async listarCampanhas(dto: CampanhaListarDto): Promise<CampanhaResumoDto[]> {
    return this.campanhaRepositorio.listarPorUsuario(dto);
  }

  /**
   * Recupera uma campanha pelo `id`. Exige que o usuário autenticado seja `MESTRE` ou `JOGADOR`
   * dela — **m8-02**: `ESPECTADOR` é rejeitado (`UnauthorizedAccessException`), porque este
   * recorte inclui código de convite e outros dados de gestão que o papel nunca deveria ver
   * (decisão de produto #4/#5 de `m8-espectadores-campanha`); o espectador usa a projeção
   * dedicada do painel (`CampanhaProjecaoService`). `ResourceNotFoundException` se a campanha
   * não existir. **`P-046`**: `codigoConvite`/`codigoConviteEspectador` só voltam preenchidos
   * para o `MESTRE` — `null` para `JOGADOR`, mesmo recorte de `CampanhaResumoDto`.
   */
  async recuperarCampanha(
    dto: CampanhaRecuperarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<CampanhaRecuperadaDto> {
    const campanhaEncontrada = await this.campanhaRepositorio.recuperarPorId(dto);
    if (!campanhaEncontrada) {
      throw new ResourceNotFoundException('Campanha');
    }

    const membroEncontrado = await this.validarMembro({ campanhaId: dto.id, usuarioId: usuarioAtivo.sub });
    if (this.ehEspectador(membroEncontrado.papel)) {
      throw new UnauthorizedAccessException();
    }
    if (this.ehMestre(membroEncontrado.papel)) {
      return campanhaEncontrada;
    }
    return { ...campanhaEncontrada, codigoConvite: null, codigoConviteEspectador: null };
  }

  /**
   * Garante que o usuário é membro ativo da campanha, **qualquer papel** (m8-02) — usado pelo
   * `CampanhaGateway` para autorizar a entrada na sala `campanha:<id>`. Diferente de
   * `recuperarCampanha` (REST, nega `ESPECTADOR` e devolve dados de gestão), aqui o espectador
   * também entra: ele só recebe os broadcasts que o gateway deliberadamente lhe envia (rolagem
   * `PUBLICA`), nunca dados privados — a sala em si não é o gate de conteúdo.
   * `ResourceNotFoundException` se a campanha não existir; `UnauthorizedAccessException` se não
   * for membro.
   */
  async validarAcessoSalaCampanha(
    dto: CampanhaRecuperarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<CampanhaMembroInternoRecuperadoDto> {
    const campanhaEncontrada = await this.campanhaRepositorio.recuperarPorId(dto);
    if (!campanhaEncontrada) {
      throw new ResourceNotFoundException('Campanha');
    }
    return this.validarMembro({ campanhaId: dto.id, usuarioId: usuarioAtivo.sub });
  }

  /**
   * Altera `nome`/`descricao` da campanha — só o mestre pode (SYSTEM.SPEC §14). O `id` vem no
   * DTO (montado pela controller com o `@Param`). `ResourceNotFoundException` se a campanha
   * não existir; `UnauthorizedAccessException` se o autor não for o mestre.
   */
  async alterarCampanha(
    dto: CampanhaInternoAlterarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<CampanhaAlteradaDto> {
    const campanhaEncontrada = await this.campanhaRepositorio.recuperarPorId({ id: dto.id });
    if (!campanhaEncontrada) {
      throw new ResourceNotFoundException('Campanha');
    }

    await this.validarMestre({ campanhaId: dto.id, usuarioId: usuarioAtivo.sub });
    return this.campanhaRepositorio.alterarCampanha(dto);
  }

  /**
   * Exclui a campanha (soft delete) — só o mestre pode (SYSTEM.SPEC §14).
   * `ResourceNotFoundException` se a campanha não existir; `UnauthorizedAccessException` se o
   * autor não for o mestre.
   */
  async excluirCampanha(dto: CampanhaExcluirDto, usuarioAtivo: JwtPayload): Promise<void> {
    const campanhaEncontrada = await this.campanhaRepositorio.recuperarPorId({ id: dto.id });
    if (!campanhaEncontrada) {
      throw new ResourceNotFoundException('Campanha');
    }

    await this.validarMestre({ campanhaId: dto.id, usuarioId: usuarioAtivo.sub });
    await this.campanhaRepositorio.excluirCampanha(dto);
  }

  /**
   * Faz o usuário autenticado ingressar numa campanha informando um `codigoConvite` — **m8-02**:
   * o mesmo campo aceita tanto o convite de `JOGADOR` quanto o de `ESPECTADOR`; o repositório
   * resolve qual dos dois bateu e devolve o papel correspondente
   * (`recuperarPorCodigoConviteOuEspectador`), nunca o cliente. Código inexistente/inválido →
   * `ResourceNotFoundException`; usuário que já é membro (com **qualquer** papel, inclusive
   * quando o código informado corresponderia a um papel diferente do atual — sem autoelevação
   * nem autorrebaixamento por convite, decisão de produto #3) → `BusinessException`, respeitando
   * o índice único `uix_campanha_membro_campanha_usuario_ativo`.
   */
  async entrarCampanha(
    dto: CampanhaEntrarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<CampanhaEntradaDto> {
    const campanhaEncontrada = await this.campanhaRepositorio.recuperarPorCodigoConviteOuEspectador({
      codigoConvite: dto.codigoConvite,
    });
    if (!campanhaEncontrada) {
      throw new ResourceNotFoundException('Campanha');
    }

    const membroExistente = await this.campanhaRepositorio.recuperarMembro({
      campanhaId: campanhaEncontrada.id,
      usuarioId: usuarioAtivo.sub,
    });
    if (membroExistente) {
      throw new BusinessException('Você já é membro desta campanha');
    }

    await this.campanhaRepositorio.criarMembro({
      campanhaId: campanhaEncontrada.id,
      usuarioId: usuarioAtivo.sub,
      papel: campanhaEncontrada.papel,
    });

    this.campanhaGateway.emitirMembroEntrou({
      campanhaId: campanhaEncontrada.id,
      usuarioId: usuarioAtivo.sub,
    });

    return {
      id: campanhaEncontrada.id,
      nome: campanhaEncontrada.nome,
      descricao: campanhaEncontrada.descricao,
      papel: campanhaEncontrada.papel,
    };
  }

  /**
   * Regenera o `codigoConvite` da campanha — só o mestre pode (SYSTEM.SPEC §14). Gera um novo
   * código único e invalida o anterior (o antigo deixa de resolver para a campanha). O `id`
   * vem no DTO (montado pela controller com o `@Param`). `ResourceNotFoundException` se a
   * campanha não existir; `UnauthorizedAccessException` se o autor não for o mestre.
   */
  async regenerarConvite(
    dto: CampanhaConviteRegenerarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<CampanhaConviteRegeneradoDto> {
    const campanhaEncontrada = await this.campanhaRepositorio.recuperarPorId({ id: dto.id });
    if (!campanhaEncontrada) {
      throw new ResourceNotFoundException('Campanha');
    }

    await this.validarMestre({ campanhaId: dto.id, usuarioId: usuarioAtivo.sub });
    return this.campanhaRepositorio.alterarConvite({
      id: dto.id,
      codigoConvite: this.gerarCodigoConvite(),
    });
  }

  /**
   * Regenera o `codigoConviteEspectador` da campanha (m8-02) — mesma regra de `regenerarConvite`,
   * para o segundo convite: só o mestre pode, gera um código novo e invalida o anterior, sem
   * afetar o convite de `JOGADOR`. `ResourceNotFoundException` se a campanha não existir;
   * `UnauthorizedAccessException` se o autor não for o mestre.
   */
  async regenerarConviteEspectador(
    dto: CampanhaConviteEspectadorRegenerarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<CampanhaConviteEspectadorRegeneradoDto> {
    const campanhaEncontrada = await this.campanhaRepositorio.recuperarPorId({ id: dto.id });
    if (!campanhaEncontrada) {
      throw new ResourceNotFoundException('Campanha');
    }

    await this.validarMestre({ campanhaId: dto.id, usuarioId: usuarioAtivo.sub });
    return this.campanhaRepositorio.alterarConviteEspectador({
      id: dto.id,
      codigoConviteEspectador: this.gerarCodigoConvite(),
    });
  }

  /**
   * Altera o papel de um membro entre `JOGADOR` e `ESPECTADOR` (m8-02, decisão de produto #3) —
   * só o mestre pode (gate `validarMestre`, único árbitro — proibição #28). Não pode alterar a si
   * mesmo (o único mestre da campanha — `BusinessException`); o alvo não pode ser o mestre
   * (defensivo: por invariante, só o próprio requisitante poderia ser, já barrado acima). Para
   * promover um espectador a mestre, o mestre primeiro o torna `JOGADOR` por aqui e só depois usa
   * `transferirMestre` (que rejeita alvo `ESPECTADOR`). `ResourceNotFoundException` se a campanha
   * ou o membro-alvo não existirem. Emite `campanha:membro-papel-alterado` após persistir, para os
   * clientes recarregarem os dados de membro.
   */
  async alterarPapelMembro(
    dto: CampanhaMembroPapelAlterarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<CampanhaMembroPapelAlteradoDto> {
    const campanhaEncontrada = await this.campanhaRepositorio.recuperarPorId({ id: dto.id });
    if (!campanhaEncontrada) {
      throw new ResourceNotFoundException('Campanha');
    }

    await this.validarMestre({ campanhaId: dto.id, usuarioId: usuarioAtivo.sub });

    if (dto.usuarioId === usuarioAtivo.sub) {
      throw new BusinessException(
        'O mestre não pode alterar o próprio papel; transfira o papel de mestre ou exclua a campanha',
      );
    }

    const membroAlvo = await this.campanhaRepositorio.recuperarMembro({
      campanhaId: dto.id,
      usuarioId: dto.usuarioId,
    });
    if (!membroAlvo) {
      throw new ResourceNotFoundException('Membro da campanha');
    }
    if (this.ehMestre(membroAlvo.papel)) {
      throw new BusinessException('O mestre da campanha não tem o papel alterado por esta ação');
    }

    const papelAlterado = await this.campanhaRepositorio.alterarPapelMembro({
      campanhaId: dto.id,
      usuarioId: dto.usuarioId,
      papel: dto.papel,
    });
    this.campanhaGateway.emitirPapelMembroAlterado(papelAlterado);
    return papelAlterado;
  }

  /**
   * Lista os membros da campanha (nome/papel/fichas — m3-65). Visível a `MESTRE`/`JOGADOR` — m8-02:
   * `ESPECTADOR` é rejeitado (`UnauthorizedAccessException`), pela mesma decisão de produto #4 de
   * `recuperarCampanha` ("nunca vê... membros"). Resolve o papel do requisitante via
   * `recuperarMembro` (precisa dele de qualquer forma, pra decidir `acessoCompleto`/carteirinha no
   * repositório) — substitui o antigo `validarMembro` só-checagem por essa mesma chamada.
   * `ResourceNotFoundException` se a campanha não existir; `UnauthorizedAccessException` se o autor
   * não for membro ou for `ESPECTADOR`.
   */
  async listarMembros(
    dto: CampanhaMembrosListarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<CampanhaMembroResumoDto[]> {
    const campanhaEncontrada = await this.campanhaRepositorio.recuperarPorId({
      id: dto.campanhaId,
    });
    if (!campanhaEncontrada) {
      throw new ResourceNotFoundException('Campanha');
    }

    const membroAtivo = await this.campanhaRepositorio.recuperarMembro({
      campanhaId: dto.campanhaId,
      usuarioId: usuarioAtivo.sub,
    });
    if (!membroAtivo || this.ehEspectador(membroAtivo.papel)) {
      throw new UnauthorizedAccessException();
    }

    return this.campanhaRepositorio.listarMembros({
      campanhaId: dto.campanhaId,
      usuarioAtivoId: usuarioAtivo.sub,
      usuarioAtivoEhMestre: this.ehMestre(membroAtivo.papel),
    });
  }

  /**
   * Gate único do inventário de esquadrão (proibição #28 — árbitro único desta regra, chamado
   * também pelo módulo `ficha` nas rotas de transferência): exige que o usuário seja `MESTRE` ou
   * `JOGADOR` da campanha — **m8-02**: `ESPECTADOR` é sempre rejeitado, mesmo sendo membro (o
   * inventário de esquadrão é conteúdo de jogo, fora do escopo do papel — decisão de produto #4).
   * `JOGADOR` exige `naBase = true` (o Mestre sempre acessa, mesmo Em Missão). Devolve a campanha
   * (quem chama já precisa dela, evita reconsultar). `ResourceNotFoundException` se a campanha não
   * existir; `UnauthorizedAccessException` se não for membro, se for espectador, ou se for jogador
   * com a campanha Em Missão.
   */
  async validarAcessoInventario(dto: CampanhaMembroInternoRecuperarDto): Promise<CampanhaRecuperadaDto> {
    const campanhaEncontrada = await this.campanhaRepositorio.recuperarPorId({ id: dto.campanhaId });
    if (!campanhaEncontrada) {
      throw new ResourceNotFoundException('Campanha');
    }

    const membroEncontrado = await this.campanhaRepositorio.recuperarMembro(dto);
    if (!membroEncontrado || this.ehEspectador(membroEncontrado.papel)) {
      throw new UnauthorizedAccessException();
    }
    if (this.ehJogador(membroEncontrado.papel) && !campanhaEncontrada.naBase) {
      throw new UnauthorizedAccessException(
        'Inventário de esquadrão só pode ser acessado enquanto a campanha está na Base da Fundação',
      );
    }

    return campanhaEncontrada;
  }

  /**
   * Valida somente a leitura do inventário de esquadrão: `MESTRE`/`JOGADOR` podem consultá-lo —
   * `ESPECTADOR` é rejeitado (m8-02, mesma decisão de produto #4 de `validarAcessoInventario`).
   */
  async validarLeituraInventario(dto: CampanhaMembroInternoRecuperarDto): Promise<CampanhaRecuperadaDto> {
    const campanhaEncontrada = await this.campanhaRepositorio.recuperarPorId({ id: dto.campanhaId });
    if (!campanhaEncontrada) {
      throw new ResourceNotFoundException('Campanha');
    }
    const membroEncontrado = await this.campanhaRepositorio.recuperarMembro(dto);
    if (!membroEncontrado || this.ehEspectador(membroEncontrado.papel)) {
      throw new UnauthorizedAccessException();
    }
    return campanhaEncontrada;
  }

  /** Lista os itens do inventário de esquadrão para qualquer membro, inclusive Em Missão. */
  async listarInventario(
    dto: CampanhaInventarioRecuperarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<CampanhaInventarioDto> {
    await this.validarLeituraInventario({ campanhaId: dto.campanhaId, usuarioId: usuarioAtivo.sub });
    const itens = await this.campanhaRepositorio.recuperarInventario({ campanhaId: dto.campanhaId });
    return { itens };
  }

  /** Adiciona item; Operacional/Medicinal idêntico incrementa o stack existente. */
  async adicionarItemInventario(
    dto: CampanhaInventarioItemAdicionarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<CampanhaInventarioDto> {
    await this.validarAcessoInventario({ campanhaId: dto.campanhaId, usuarioId: usuarioAtivo.sub });
    const itensAtuais = await this.campanhaRepositorio.recuperarInventario({ campanhaId: dto.campanhaId });

    const itemEmpilhavel = CATEGORIAS_EMPILHAVEIS_INVENTARIO.has(dto.categoria)
      ? itensAtuais.find((item) => itensInventarioSaoIdenticos(item, dto))
      : undefined;
    const itensNovos = itemEmpilhavel
      ? itensAtuais.map((item) => item.id === itemEmpilhavel.id
        ? { ...item, quantidade: item.quantidade + dto.quantidade }
        : item)
      : [...itensAtuais, {
          id: randomUUID(),
          nome: dto.nome,
          categoria: dto.categoria,
          custo: dto.custo,
          peso: dto.peso,
          quantidade: dto.quantidade,
          descricao: dto.descricao,
          dano: dto.dano,
          informacao: dto.informacao,
          resistencia: dto.resistencia,
          bonus: dto.bonus,
          ...(dto.modificacoes?.length ? { modificacoes: dto.modificacoes } : {}),
        }];
    const inventarioAlterado = await this.campanhaRepositorio.alterarInventario({
      campanhaId: dto.campanhaId,
      itens: itensNovos,
    });
    this.campanhaGateway.emitirInventarioAlterado({ campanhaId: dto.campanhaId });
    return inventarioAlterado;
  }

  /**
   * Altera nome/custo/peso/descrição de um item existente — respeita o gate. Campos mecânicos
   * (categoria, dano, informação, resistência, bônus), quantidade e modificações permanecem
   * intocados, mesmo recorte do editor análogo na ficha (`FichaInventario.confirmarEdicaoItem`).
   */
  async alterarItemInventario(
    dto: CampanhaInventarioItemAlterarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<CampanhaInventarioDto> {
    await this.validarAcessoInventario({ campanhaId: dto.campanhaId, usuarioId: usuarioAtivo.sub });
    const itensAtuais = await this.campanhaRepositorio.recuperarInventario({ campanhaId: dto.campanhaId });
    if (!itensAtuais.some((item) => item.id === dto.itemId)) {
      throw new ResourceNotFoundException('Item do inventário de esquadrão');
    }

    const itensNovos = itensAtuais.map((item) => {
      if (item.id !== dto.itemId) {
        return item;
      }
      const itemSemDescricao = { ...item };
      delete itemSemDescricao.descricao;
      return {
        ...itemSemDescricao,
        nome: dto.nome,
        custo: dto.custo,
        peso: dto.peso,
        ...(dto.descricao ? { descricao: dto.descricao } : {}),
      };
    });

    const inventarioAlterado = await this.campanhaRepositorio.alterarInventario({
      campanhaId: dto.campanhaId,
      itens: itensNovos,
    });
    this.campanhaGateway.emitirInventarioAlterado({ campanhaId: dto.campanhaId });
    return inventarioAlterado;
  }

  /** Remove um item inteiro do inventário de esquadrão — respeita o gate. */
  async removerItemInventario(
    dto: CampanhaInventarioItemRemoverDto,
    usuarioAtivo: JwtPayload,
  ): Promise<CampanhaInventarioDto> {
    await this.validarAcessoInventario({ campanhaId: dto.campanhaId, usuarioId: usuarioAtivo.sub });
    const itensAtuais = await this.campanhaRepositorio.recuperarInventario({ campanhaId: dto.campanhaId });
    if (!itensAtuais.some((item) => item.id === dto.itemId)) {
      throw new ResourceNotFoundException('Item do inventário de esquadrão');
    }

    const inventarioAlterado = await this.campanhaRepositorio.alterarInventario({
      campanhaId: dto.campanhaId,
      itens: itensAtuais.filter((item) => item.id !== dto.itemId),
    });
    this.campanhaGateway.emitirInventarioAlterado({ campanhaId: dto.campanhaId });
    return inventarioAlterado;
  }

  /**
   * Ajusta a quantidade de um item por delta (stepper +/-1, mesmo padrão de Vida/Energia da
   * ficha) — respeita o gate. Quantidade que chega a `<= 0` remove o item.
   */
  async ajustarQuantidadeItemInventario(
    dto: CampanhaInventarioItemQuantidadeAjustarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<CampanhaInventarioDto> {
    await this.validarAcessoInventario({ campanhaId: dto.campanhaId, usuarioId: usuarioAtivo.sub });
    const itensAtuais = await this.campanhaRepositorio.recuperarInventario({ campanhaId: dto.campanhaId });
    const itemEncontrado = itensAtuais.find((item) => item.id === dto.itemId);
    if (!itemEncontrado) {
      throw new ResourceNotFoundException('Item do inventário de esquadrão');
    }

    const novaQuantidade = itemEncontrado.quantidade + dto.delta;
    const itensNovos =
      novaQuantidade <= 0
        ? itensAtuais.filter((item) => item.id !== dto.itemId)
        : itensAtuais.map((item) =>
            item.id === dto.itemId ? { ...item, quantidade: novaQuantidade } : item,
          );

    const inventarioAlterado = await this.campanhaRepositorio.alterarInventario({
      campanhaId: dto.campanhaId,
      itens: itensNovos,
    });
    this.campanhaGateway.emitirInventarioAlterado({ campanhaId: dto.campanhaId });
    return inventarioAlterado;
  }

  /**
   * Remove um jogador da campanha (soft delete do `campanha_membro`) — só o mestre pode (§14,
   * gate `validarMestre`, único árbitro — proibição #28). O mestre **não** pode remover a si
   * mesmo (deixaria a campanha sem mestre) → `BusinessException` (transfira o papel ou exclua a
   * campanha). Campanha inexistente ou membro-alvo inexistente → `ResourceNotFoundException`.
   */
  async removerMembro(
    dto: CampanhaMembroRemoverDto,
    usuarioAtivo: JwtPayload,
  ): Promise<CampanhaMembroRemovidoDto> {
    const campanhaEncontrada = await this.campanhaRepositorio.recuperarPorId({ id: dto.id });
    if (!campanhaEncontrada) {
      throw new ResourceNotFoundException('Campanha');
    }

    await this.validarMestre({ campanhaId: dto.id, usuarioId: usuarioAtivo.sub });

    if (dto.usuarioId === usuarioAtivo.sub) {
      throw new BusinessException(
        'O mestre não pode remover a si mesmo; transfira o papel de mestre ou exclua a campanha',
      );
    }

    const membroAlvo = await this.campanhaRepositorio.recuperarMembro({
      campanhaId: dto.id,
      usuarioId: dto.usuarioId,
    });
    if (!membroAlvo) {
      throw new ResourceNotFoundException('Membro da campanha');
    }

    await this.campanhaRepositorio.removerMembro({
      campanhaId: dto.id,
      usuarioId: dto.usuarioId,
    });

    return { campanhaId: dto.id, usuarioId: dto.usuarioId };
  }

  /**
   * Transfere o papel de mestre para outro membro — só o mestre atual pode (§14, gate
   * `validarMestre`). Promove o `novoMestreUsuarioId` (que deve ser membro `JOGADOR`) a
   * `MESTRE` e rebaixa o mestre atual a `JOGADOR`, **atomicamente**, mantendo exatamente um
   * mestre. **m8-02**: um `ESPECTADOR` nunca vira mestre por aqui — o mestre precisa primeiro
   * usar `alterarPapelMembro` pra torná-lo `JOGADOR` (decisão de produto #3: "para promover
   * alguém a mestre, primeiro o torna jogador"). Campanha inexistente / alvo não-membro →
   * `ResourceNotFoundException`; alvo = o próprio mestre, alvo já `MESTRE` ou alvo `ESPECTADOR` →
   * `BusinessException`.
   */
  async transferirMestre(
    dto: CampanhaMestreTransferirDto,
    usuarioAtivo: JwtPayload,
  ): Promise<CampanhaMestreTransferidoDto> {
    const campanhaEncontrada = await this.campanhaRepositorio.recuperarPorId({ id: dto.id });
    if (!campanhaEncontrada) {
      throw new ResourceNotFoundException('Campanha');
    }

    await this.validarMestre({ campanhaId: dto.id, usuarioId: usuarioAtivo.sub });

    if (dto.novoMestreUsuarioId === usuarioAtivo.sub) {
      throw new BusinessException('Você já é o mestre desta campanha');
    }

    const membroAlvo = await this.campanhaRepositorio.recuperarMembro({
      campanhaId: dto.id,
      usuarioId: dto.novoMestreUsuarioId,
    });
    if (!membroAlvo) {
      throw new ResourceNotFoundException('Membro da campanha');
    }
    if (this.ehMestre(membroAlvo.papel)) {
      throw new BusinessException('O usuário indicado já é o mestre desta campanha');
    }
    if (!this.ehJogador(membroAlvo.papel)) {
      throw new BusinessException(
        'Só um jogador pode ser promovido a mestre; torne o espectador jogador primeiro',
      );
    }

    await this.campanhaRepositorio.transferirMestre({
      campanhaId: dto.id,
      mestreAtualUsuarioId: usuarioAtivo.sub,
      novoMestreUsuarioId: dto.novoMestreUsuarioId,
    });

    return {
      campanhaId: dto.id,
      mestreAnteriorUsuarioId: usuarioAtivo.sub,
      novoMestreUsuarioId: dto.novoMestreUsuarioId,
    };
  }

  /**
   * Altera o estado "Na Base"/"Em Missão" da campanha — só o mestre pode (gate `validarMestre`,
   * único árbitro — proibição #28). Gateia o acesso ao inventário de esquadrão: `naBase = false`
   * bloqueia jogadores em todas as rotas de `§ inventário`, o mestre sempre acessa.
   * `ResourceNotFoundException` se a campanha não existir; `UnauthorizedAccessException` se o
   * autor não for o mestre.
   */
  async alterarEstado(
    dto: CampanhaEstadoAlterarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<CampanhaEstadoAlteradaDto> {
    const campanhaEncontrada = await this.campanhaRepositorio.recuperarPorId({ id: dto.id });
    if (!campanhaEncontrada) {
      throw new ResourceNotFoundException('Campanha');
    }

    await this.validarMestre({ campanhaId: dto.id, usuarioId: usuarioAtivo.sub });

    const estadoAlterado = await this.campanhaRepositorio.alterarEstado(dto);
    this.campanhaGateway.emitirEstadoAlterado(estadoAlterado);
    return estadoAlterado;
  }

  /**
   * Garante que o usuário é membro da campanha, **qualquer papel** (mestre, jogador ou
   * espectador) — do contrário lança `UnauthorizedAccessException`. Devolve o vínculo (com o
   * `papel`) porque toda chamada precisa dele de qualquer forma para decidir a permissão
   * específica (m8-02 — antes só confirmava a existência do vínculo, agora é a base dos
   * predicados `ehMestre`/`ehJogador`/`ehEspectador` usados em todo o módulo, incluindo por
   * `ficha`/`rolagem`/`pagina-caderno` via `CampanhaRepository.recuperarMembro` reusado sem
   * duplicar a regra — proibição #28).
   */
  async validarMembro(
    dto: CampanhaMembroInternoRecuperarDto,
  ): Promise<CampanhaMembroInternoRecuperadoDto> {
    const membroEncontrado = await this.campanhaRepositorio.recuperarMembro(dto);
    if (!membroEncontrado) {
      throw new UnauthorizedAccessException();
    }
    return membroEncontrado;
  }

  /**
   * Garante que o usuário é o mestre da campanha — do contrário lança
   * `UnauthorizedAccessException`. Gate da gestão de campanha (alterar/excluir — §14).
   */
  private async validarMestre(dto: CampanhaMembroInternoRecuperarDto): Promise<void> {
    const membroEncontrado = await this.campanhaRepositorio.recuperarMembro(dto);
    if (!membroEncontrado || !this.ehMestre(membroEncontrado.papel)) {
      throw new UnauthorizedAccessException();
    }
  }

  /**
   * Predicados de papel de campanha (m8-02) — centralizados aqui para que `ficha`, `rolagem` e
   * `pagina-caderno` nunca comparem `papel === TipoCampanhaMembroPapelEnum.X` por conta própria;
   * todos reusam estes três métodos (injetando `CampanhaService`), evitando `if` equivalente
   * espalhado pelos outros módulos (entregável 3 de `m8-02-backend-permissoes-projecoes`).
   */
  ehMestre(papel: TipoCampanhaMembroPapelEnum): boolean {
    return papel === TipoCampanhaMembroPapelEnum.MESTRE;
  }

  /** V. `ehMestre`. */
  ehJogador(papel: TipoCampanhaMembroPapelEnum): boolean {
    return papel === TipoCampanhaMembroPapelEnum.JOGADOR;
  }

  /** V. `ehMestre`. */
  ehEspectador(papel: TipoCampanhaMembroPapelEnum): boolean {
    return papel === TipoCampanhaMembroPapelEnum.ESPECTADOR;
  }

  /**
   * Gera um código de convite aleatório (alfabeto sem caracteres ambíguos). A unicidade entre
   * campanhas ativas é garantida pelo índice único parcial `uix_campanha_codigo_convite_ativo`.
   */
  private gerarCodigoConvite(): string {
    const bytes = randomBytes(TAMANHO_CONVITE);
    let codigo = '';
    for (let indice = 0; indice < TAMANHO_CONVITE; indice += 1) {
      codigo += ALFABETO_CONVITE[bytes[indice] % ALFABETO_CONVITE.length];
    }
    return codigo;
  }
}
