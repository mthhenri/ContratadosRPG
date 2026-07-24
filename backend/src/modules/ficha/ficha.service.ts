import { forwardRef, Inject, Injectable } from '@nestjs/common';
import type {
  FichaAcessoConcederDto,
  FichaAcessoConcedidoDto,
  FichaAcessoResumoDto,
  FichaAcessoRevogadoDto,
  FichaAcessoRevogarDto,
  FichaAcessosListarDto,
  FichaAlteradaDto,
  FichaCriadaDto,
  FichaCriarDto,
  FichaExcluirDto,
  FichaIdentidadeDto,
  FichaInternoAlterarDto,
  FichaJogadorDadosDto,
  FichaListarDto,
  FichaOrigemDto,
  FichaRecuperadaDto,
  FichaRecuperarDto,
  FichaResumoDto,
} from '@contratados-rpg/shared/dtos/ficha';
import { EspecialidadeEfeitoEnum, TipoCampanhaMembroPapelEnum, TipoFichaEnum } from '@contratados-rpg/shared/enums';
import {
  MAESTRIA_PONTOS_MINIMO,
  calcularDerivados,
  calcularEnergia,
  calcularVida,
  maestriaValida,
} from '@contratados-rpg/shared/regras/agente';
import { FORMACOES, type FormacaoDefinicaoDto } from '@contratados-rpg/shared/regras/identidade';
import {
  BusinessException,
  ResourceNotFoundException,
  UnauthorizedAccessException,
} from '../../core/exceptions';
import { CampanhaGateway } from '../../core/gateway/campanha.gateway';
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
 * (`@ActiveUser().sub`) por padrão — **o mestre pode informar outro dono** (§14: "criar ficha de
 * jogador" é irrestrito para o mestre, só a própria para os demais). A concessão de visualização
 * a outro membro (`usuario_ficha_acesso`) é criada em m3-04; aqui só se **lê** essa concessão
 * para arbitrar a visualização. A criação e a alteração emitem, após persistir,
 * `ficha:criada`/`ficha:alterada` pelo `CampanhaGateway` (broadcast-only — m3-05).
 */
@Injectable()
export class FichaService {
  constructor(
    private readonly fichaRepositorio: FichaRepository,
    private readonly campanhaRepositorio: CampanhaRepository,
    @Inject(forwardRef(() => CampanhaGateway))
    private readonly campanhaGateway: CampanhaGateway,
  ) {}

  /**
   * Cria uma ficha de jogador numa campanha de que o autenticado é membro (§14). Sem `usuarioId`
   * no `dto`, o dono é o próprio autenticado; **com** `usuarioId`, o dono é o membro indicado —
   * só permitido se o autenticado for o **mestre** da campanha (matriz §14: "criar ficha de
   * jogador" é irrestrito para o mestre, só a própria para os demais), e o alvo precisa ser
   * membro (`validarMembroAlvo`, mesma checagem da concessão de acesso — m3-04). O documento de
   * jogo é validado contra `shared/regras` antes de persistir; dados incoerentes →
   * `BusinessException`.
   */
  async criarFicha(dto: FichaCriarDto, usuarioAtivo: JwtPayload): Promise<FichaCriadaDto> {
    const membroAtivo = await this.campanhaRepositorio.recuperarMembro({
      campanhaId: dto.campanhaId,
      usuarioId: usuarioAtivo.sub,
    });
    if (!membroAtivo) {
      throw new UnauthorizedAccessException();
    }

    const donoId = dto.usuarioId ?? usuarioAtivo.sub;
    if (donoId !== usuarioAtivo.sub) {
      if (membroAtivo.papel !== TipoCampanhaMembroPapelEnum.MESTRE) {
        throw new UnauthorizedAccessException();
      }
      await this.validarMembroAlvo({ campanhaId: dto.campanhaId, usuarioId: donoId });
    }

    this.validarDadosContraRegras(dto.dados);

    const fichaCriada = await this.fichaRepositorio.criarFicha({
      campanhaId: dto.campanhaId,
      usuarioId: donoId,
      tipo: TipoFichaEnum.JOGADOR,
      nome: dto.nome,
      dados: this.aplicarSnapshotDeMaximos(dto.dados),
    });

    this.campanhaGateway.emitirFichaCriada(fichaCriada);
    return fichaCriada;
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
   * documento é validado contra `shared/regras` antes de persistir. Para o **dono**, a Identidade
   * já definida (Personalidade/Origem) é travada (m3-24 — `validarImutabilidadeIdentidade`); o
   * mestre altera as duas livremente. O Contrato (m3-40) segue a mesma lógica — o dono nunca o
   * altera, só o mestre (`validarContratoSomenteMestre`). `ResourceNotFoundException` se a ficha
   * não existir; `UnauthorizedAccessException` se o autor não puder editá-la; `BusinessException`
   * se os dados forem incoerentes, a Identidade travada for alterada pelo dono, ou o dono tentar
   * alterar o Contrato.
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
    if (fichaEncontrada.usuarioId === usuarioAtivo.sub) {
      this.validarImutabilidadeIdentidade(fichaEncontrada.dados.identidade, dto.dados.identidade);
      this.validarContratoSomenteMestre(fichaEncontrada.dados.contrato, dto.dados.contrato);
    }

    const fichaAlterada = await this.fichaRepositorio.alterarFicha(dto);
    this.campanhaGateway.emitirFichaAlterada(fichaAlterada);
    return fichaAlterada;
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
   * Concede acesso de **visualização** de uma ficha a outro membro da campanha
   * (`usuario_ficha_acesso`, §14) — m3-04. Só o **dono** ou o **mestre** concedem
   * (`validarPermissaoEdicao`, reusando a mesma regra de permissão — proibição #28); o alvo precisa
   * ser membro da campanha (`ResourceNotFoundException('Membro')` caso contrário). Idempotente: se já
   * houver concessão ativa, devolve a existente sem inserir de novo (a unicidade do par é garantida
   * pelo índice `uix_usuario_ficha_acesso_ficha_usuario_ativo`). `ResourceNotFoundException` se a
   * ficha não existir; `UnauthorizedAccessException` se o autor não puder conceder.
   */
  async concederAcesso(
    dto: FichaAcessoConcederDto,
    usuarioAtivo: JwtPayload,
  ): Promise<FichaAcessoConcedidoDto> {
    const fichaEncontrada = await this.fichaRepositorio.recuperarPorId({ id: dto.fichaId });
    if (!fichaEncontrada) {
      throw new ResourceNotFoundException('Ficha');
    }

    await this.validarPermissaoEdicao(fichaEncontrada, usuarioAtivo);
    await this.validarMembroAlvo({
      campanhaId: fichaEncontrada.campanhaId,
      usuarioId: dto.usuarioId,
    });

    const acessoExistente = await this.fichaRepositorio.recuperarAcesso({
      fichaId: dto.fichaId,
      usuarioId: dto.usuarioId,
    });
    if (acessoExistente) {
      return { id: acessoExistente.id, fichaId: dto.fichaId, usuarioId: dto.usuarioId };
    }

    return this.fichaRepositorio.concederAcesso(dto);
  }

  /**
   * Revoga o acesso de visualização de uma ficha a um membro (soft delete de `usuario_ficha_acesso`,
   * §14) — m3-04. Só o **dono** ou o **mestre** revogam (`validarPermissaoEdicao` — proibição #28).
   * Idempotente: revogar uma concessão inexistente é um no-op. `ResourceNotFoundException` se a ficha
   * não existir; `UnauthorizedAccessException` se o autor não puder revogar.
   */
  async revogarAcesso(
    dto: FichaAcessoRevogarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<FichaAcessoRevogadoDto> {
    const fichaEncontrada = await this.fichaRepositorio.recuperarPorId({ id: dto.fichaId });
    if (!fichaEncontrada) {
      throw new ResourceNotFoundException('Ficha');
    }

    await this.validarPermissaoEdicao(fichaEncontrada, usuarioAtivo);
    await this.fichaRepositorio.revogarAcesso(dto);

    return { fichaId: dto.fichaId, usuarioId: dto.usuarioId };
  }

  /**
   * Lista as concessões de visualização ativas de uma ficha (§14) — m3-04. Só o **dono** ou o
   * **mestre** enxergam a lista de acessos (`validarPermissaoEdicao` — quem gere as concessões).
   * `ResourceNotFoundException` se a ficha não existir; `UnauthorizedAccessException` caso contrário.
   */
  async listarAcessos(
    dto: FichaAcessosListarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<FichaAcessoResumoDto[]> {
    const fichaEncontrada = await this.fichaRepositorio.recuperarPorId({ id: dto.fichaId });
    if (!fichaEncontrada) {
      throw new ResourceNotFoundException('Ficha');
    }

    await this.validarPermissaoEdicao(fichaEncontrada, usuarioAtivo);
    return this.fichaRepositorio.listarAcessos(dto);
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
   * Garante que o **alvo** de uma concessão de acesso é membro da campanha da ficha (§14 — a
   * concessão revela a ficha a "outro membro da campanha"). Alvo não-membro →
   * `ResourceNotFoundException('Membro')` (mesmo tratamento da transferência de mestre em m2-10).
   */
  private async validarMembroAlvo(dto: { campanhaId: number; usuarioId: number }): Promise<void> {
    const membroEncontrado = await this.campanhaRepositorio.recuperarMembro(dto);
    if (!membroEncontrado) {
      throw new ResourceNotFoundException('Membro');
    }
  }

  /**
   * Valida o documento de jogo salvo contra o motor de regras (`shared/regras`, §11 camada 2) — o
   * documento vence (proibição #27).
   *
   * **Revisto em m3-10 — liberdade total de edição.** O backend **não trava mais faixas do estado
   * salvo**: caíram as coerções "Nível/atributo dentro do limite de classe" e "Vida/Energia atual ≤
   * máximo" (o mestre/jogador reflete eventos de campanha; a atual pode exceder a máxima, que é
   * stored/editável — §10.4/§11). A única regra de domínio que permanece na ficha é a **Maestria**:
   * `null` ou um atributo com `MAESTRIA_PONTOS_MINIMO`+ pontos (`maestriaValida`, única por
   * construção). Incoerência → `BusinessException`.
   */
  private validarDadosContraRegras(dados: FichaJogadorDadosDto): void {
    if (!maestriaValida(dados.atributos, dados.maestria)) {
      throw new BusinessException(
        `Maestria inválida: o atributo "${dados.maestria}" precisa existir e ter ${MAESTRIA_PONTOS_MINIMO}+ pontos`,
      );
    }

    this.validarFormaIdentidade(dados.identidade);
  }

  /**
   * Valida a **forma** do bloco `identidade` (m3-24, §11 camada 1 — não trava faixa, só forma):
   * Personalidade uma única palavra (sem espaço interno, aparada), Origem com exatamente 2
   * Formações, cada bônus de Formação existente em `FORMACOES` com `parametro` presente quando a
   * definição exige, `texto` sempre obrigatório (inclusive no bônus custom `bonus: null`) e
   * Especialidade com `efeito` existente em `EspecialidadeEfeitoEnum`. Reusa o catálogo de
   * `shared/regras/identidade` (m3-23) — nenhuma regra de conteúdo é reimplementada aqui
   * (proibições #26/#28). Ficha sem `identidade` (anterior à m3-23) não valida nada.
   */
  private validarFormaIdentidade(identidade: FichaIdentidadeDto | undefined): void {
    if (!identidade) {
      return;
    }

    if (identidade.personalidade !== null && /\s/.test(identidade.personalidade)) {
      throw new BusinessException(
        'Personalidade inválida: precisa ser uma única palavra, sem espaços',
      );
    }

    if (identidade.origem !== null) {
      this.validarFormaOrigem(identidade.origem);
    }
  }

  private validarFormaOrigem(origem: FichaOrigemDto): void {
    if (origem.formacao.length !== 2) {
      throw new BusinessException('Origem inválida: a Formação precisa ter exatamente 2 entradas');
    }

    for (const formacaoAplicada of origem.formacao) {
      if (!formacaoAplicada.texto) {
        throw new BusinessException('Formação inválida: o texto é obrigatório');
      }
      if (formacaoAplicada.bonus !== null) {
        const definicao = FORMACOES[formacaoAplicada.bonus] as FormacaoDefinicaoDto | undefined;
        if (!definicao) {
          throw new BusinessException(`Formação inválida: bônus "${formacaoAplicada.bonus}" não existe`);
        }
        if (definicao.parametro !== null && !formacaoAplicada.parametro) {
          throw new BusinessException(`Formação inválida: "${definicao.rotulo}" exige parâmetro`);
        }
      }
    }

    if (!Object.values(EspecialidadeEfeitoEnum).includes(origem.especialidade.efeito)) {
      throw new BusinessException(
        `Especialidade inválida: efeito "${origem.especialidade.efeito}" não existe`,
      );
    }
  }

  /**
   * Impõe a imutabilidade de Personalidade e Origem já definidas, só para o **dono** da ficha
   * (m3-24 — "trava para o dono, o mestre passa"): `docs/core/sistema-v4.1.0.md` — "Assim que
   * receber a descrição e efeito de sua personalidade, ela não poderá mais ser mudada" e "Uma vez
   * definida, a Origem não pode ser alterada." O mestre é quem constrói as duas (erro de digitação
   * precisa de conserto) e o sistema não versiona ficha (SYSTEM.SPEC) — por isso só o dono é
   * travado. Campo a campo: travar Personalidade não trava Origem; definir pela primeira vez
   * (`null` → valor) é sempre permitido, inclusive ao dono.
   */
  private validarImutabilidadeIdentidade(
    identidadeAtual: FichaIdentidadeDto | undefined,
    identidadeNova: FichaIdentidadeDto | undefined,
  ): void {
    const personalidadeAtual = identidadeAtual?.personalidade ?? null;
    const personalidadeNova = identidadeNova?.personalidade ?? null;
    if (personalidadeAtual !== null && personalidadeNova !== personalidadeAtual) {
      throw new BusinessException('Personalidade já definida — imutável para o dono da ficha');
    }

    const origemAtual = identidadeAtual?.origem ?? null;
    if (origemAtual !== null && !this.origensIguais(origemAtual, identidadeNova?.origem ?? null)) {
      throw new BusinessException('Origem já definida — imutável para o dono da ficha');
    }
  }

  /**
   * Trava o Contrato (m3-40) para o **dono** — só o mestre da campanha define/altera o número
   * (o front já esconde o lápis; aqui é a validação autoritativa, mesmo padrão de
   * `validarImutabilidadeIdentidade`). O dono nunca dispara este caminho pra Contrato; se o
   * payload trouxer um valor diferente do persistido (ex.: chamada direta à API), rejeita.
   */
  private validarContratoSomenteMestre(contratoAtual: string | undefined, contratoNovo: string | undefined): void {
    if ((contratoNovo ?? '') !== (contratoAtual ?? '')) {
      throw new BusinessException('Contrato só pode ser alterado pelo Mestre');
    }
  }

  /**
   * Igualdade estrutural de duas Origens — usada só pela trava de imutabilidade (m3-24): compara
   * campo a campo, não por referência/serialização, porque o payload que o dono reenvia é a mesma
   * Origem persistida, só reconstruída pelo cliente (a ordem das chaves não é garantida).
   */
  private origensIguais(atual: FichaOrigemDto, nova: FichaOrigemDto | null): boolean {
    if (!nova) {
      return false;
    }
    return (
      atual.nome === nova.nome &&
      atual.descricao === nova.descricao &&
      atual.saberDeCampo === nova.saberDeCampo &&
      atual.especialidade.gatilho === nova.especialidade.gatilho &&
      atual.especialidade.efeito === nova.especialidade.efeito &&
      atual.formacao.length === nova.formacao.length &&
      atual.formacao.every(
        (formacaoAtual, indice) =>
          formacaoAtual.bonus === nova.formacao[indice]?.bonus &&
          formacaoAtual.parametro === nova.formacao[indice]?.parametro &&
          formacaoAtual.texto === nova.formacao[indice]?.texto,
      )
    );
  }

  /**
   * Preenche o **snapshot** de derivados no `dados` **na criação** (m3-10 — "nada é exclusivamente
   * calculado"): calcula uma vez por `shared/regras` e grava Vida/Energia máximas (`estado`) e o
   * bloco `derivados` (Defesa, Deslocamento, Dano, Percepção, Inventário, Hab./turno…), que a partir
   * daí são editáveis e nunca recalculados. Respeita valores já enviados pelo cliente (só preenche os
   * ausentes) — a `alterarFicha` **não** passa por aqui, preservando o que foi editado.
   */
  private aplicarSnapshotDeMaximos(dados: FichaJogadorDadosDto): FichaJogadorDadosDto {
    const vidaMaxima =
      dados.estado.vidaMaxima ??
      calcularVida({ classe: dados.classe, nivel: dados.nivel, vigor: dados.atributos.vigor });
    const energiaMaxima =
      dados.estado.energiaMaxima ??
      calcularEnergia({
        classe: dados.classe,
        nivel: dados.nivel,
        destreza: dados.atributos.destreza,
      });
    const derivados =
      dados.derivados ?? calcularDerivados(dados.classe, dados.nivel, dados.atributos);

    return { ...dados, estado: { ...dados.estado, vidaMaxima, energiaMaxima }, derivados };
  }
}
