import { forwardRef, Inject, Injectable } from '@nestjs/common';
import type {
  FichaAcervoListarDto,
  FichaAcessoConcederDto,
  FichaAcessoConcedidoDto,
  FichaAcessoResumoDto,
  FichaAcessoRevogadoDto,
  FichaAcessoRevogarDto,
  FichaAcessosListarDto,
  FichaAlteradaDto,
  FichaCampanhaAtribuidaDto,
  FichaCampanhaInternoAtribuirDto,
  FichaCriadaDto,
  FichaCriarDto,
  FichaDerivadosDto,
  FichaDuplicarDto,
  FichaExcluirDto,
  FichaHabilidadeDto,
  FichaIdentidadeDto,
  FichaImagemAlteradaDto,
  FichaImagemAlterarDto,
  FichaImagemExcluirDto,
  FichaInternoAlterarDto,
  FichaJogadorDadosDto,
  FichaListarDto,
  FichaOrigemDto,
  FichaRecuperadaDto,
  FichaRecuperarDto,
  FichaResumoDto,
  FichaResumoInternoDto,
  FichaRolagemDto,
} from '@contratados-rpg/shared/dtos/ficha';
import {
  ClasseEnum,
  ItemCategoriaEnum,
  TipoCampanhaMembroPapelEnum,
  TipoFichaEnum,
} from '@contratados-rpg/shared/enums';
import {
  MAESTRIA_PONTOS_MINIMO,
  ajusteInventarioAmplificadores,
  calcularDerivados,
  calcularEnergia,
  calcularVida,
  maestriaValida,
} from '@contratados-rpg/shared/regras/agente';
import { calcularResumoCompras } from '@contratados-rpg/shared/regras/compras';
import {
  aplicarFormacaoAosDerivados,
  experimentoComPeculiaridade,
  FORMACOES,
  type FormacaoDefinicaoDto,
} from '@contratados-rpg/shared/regras/identidade';
import { ARMAZENAMENTO_PROVEDOR, type ArmazenamentoProvedor } from '../../core/armazenamento';
import {
  BusinessException,
  ResourceNotFoundException,
  UnauthorizedAccessException,
} from '../../core/exceptions';
import { CampanhaGateway } from '../../core/gateway/campanha.gateway';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import { CampanhaRepository } from '../campanha/campanha.repository';
import { omitirCamposPrivados } from './ficha-campos-privados.util';
import { FichaRepository } from './ficha.repository';

/**
 * MIME permitido para o avatar da ficha (m3-62) → extensão de arquivo correspondente — cobre a
 * validação de formato e a nomeação do blob (`agentes/<uuid>.<extensão>`) num só lugar.
 */
const EXTENSAO_POR_MIME_IMAGEM: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Tamanho máximo do avatar da ficha (m3-62) — 2MB. */
const TAMANHO_MAXIMO_IMAGEM_BYTES = 2 * 1024 * 1024;

/**
 * Preset de rolagem de Iniciativa (m3-47), gerado automaticamente em toda criação de ficha —
 * fonte única no backend para não duplicar com o wizard do frontend. `DESd6` usa a gramática de
 * atributo-como-fonte-de-dados (m3-29): cada ponto de Destreza é 1d6 rolado na Iniciativa.
 */
export const PRESET_INICIATIVA_PADRAO: FichaRolagemDto = {
  nome: 'Iniciativa',
  formula: 'DESd6',
  descricao:
    'Quantidade de dados rolados para a iniciativa. Essa quantidade é relativa ao seu atributo ' +
    'de DESTREZA, sendo cada ponto neste atributo 1 dado de 6 faces (D6) a ser rolado na ' +
    'Iniciativa, somando todos para obter o valor total.',
};

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
    @Inject(ARMAZENAMENTO_PROVEDOR)
    private readonly armazenamentoProvedor: ArmazenamentoProvedor,
  ) {}

  /**
   * Cria uma ficha de jogador — numa campanha de que o autenticado é membro (§14), ou **solta**
   * no acervo do dono (m3-28) quando `campanhaId` está ausente/`null`. Sem `usuarioId` no `dto`,
   * o dono é o próprio autenticado; **com** `usuarioId`, o dono é o membro indicado — só permitido
   * se o autenticado for o **mestre** da campanha (matriz §14: "criar ficha de jogador" é
   * irrestrito para o mestre, só a própria para os demais), e o alvo precisa ser membro
   * (`validarMembroAlvo`, mesma checagem da concessão de acesso — m3-04). O documento de jogo é
   * validado contra `shared/regras` antes de persistir; dados incoerentes → `BusinessException`.
   *
   * **Ficha solta (m3-28).** Sem `campanhaId`, `validarMembro` é pulada por completo — não há
   * campanha para validar o vínculo — e o dono é sempre o próprio autenticado (`usuarioId` do
   * `dto`, que só faz sentido para o mestre atribuir a outro membro, é ignorado). A ficha nasce
   * sem sala de campanha, então `emitirFichaCriada` não dispara (ninguém está esperando).
   */
  async criarFicha(dto: FichaCriarDto, usuarioAtivo: JwtPayload): Promise<FichaCriadaDto> {
    // `== null` cobre `undefined` (corpo da requisição, DTO público) e `null` (repasse direto de
    // `duplicarFicha`, que lê `campanhaId` de uma `FichaRecuperadaDto` já tipada `number | null`).
    if (dto.campanhaId == null) {
      this.validarDadosContraRegras(dto.dados);
      this.validarCor(dto.cor);
      return this.fichaRepositorio.criarFicha({
        campanhaId: null,
        usuarioId: usuarioAtivo.sub,
        tipo: TipoFichaEnum.JOGADOR,
        nome: dto.nome,
        cor: dto.cor ?? null,
        dados: this.aplicarPresetIniciativa(this.aplicarSnapshotDeMaximos(dto.dados)),
      });
    }

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
    this.validarCor(dto.cor);

    const fichaCriada = await this.fichaRepositorio.criarFicha({
      campanhaId: dto.campanhaId,
      usuarioId: donoId,
      tipo: TipoFichaEnum.JOGADOR,
      nome: dto.nome,
      cor: dto.cor ?? null,
      dados: this.aplicarPresetIniciativa(this.aplicarSnapshotDeMaximos(dto.dados)),
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
      const fichas = await this.fichaRepositorio.listarPorCampanha(dto);
      return fichas.map((ficha) => this.paraResumoPublico(ficha));
    }

    const fichas = await this.fichaRepositorio.listarVisiveisParaUsuario({
      campanhaId: dto.campanhaId,
      usuarioId: usuarioAtivo.sub,
    });
    return fichas.map((ficha) => this.paraResumoPublico(ficha));
  }

  /**
   * Lista **todas** as fichas ativas do dono — com e sem campanha (m3-28, o acervo `/fichas`).
   * Sem checagem de permissão além do JWT: cada usuário só enxerga o próprio acervo (`usuarioId`
   * vem do autenticado, montado pela controller).
   */
  async listarAcervo(dto: FichaAcervoListarDto): Promise<FichaResumoDto[]> {
    const fichas = await this.fichaRepositorio.listarPorUsuario(dto);
    return fichas.map((ficha) => this.paraResumoPublico(ficha));
  }

  /**
   * Reduz o `FichaResumoInternoDto` (repository) ao `FichaResumoDto` público, computando
   * `sobrecarregado` com exatidão (`calcularResumoCompras`, `shared/regras/compras` — o mesmo
   * motor da aba Inventário) em vez da aproximação em SQL da 1ª tentativa. Monta o objeto público
   * campo a campo (não um spread) para não vazar `itens`/`amplificadores`/`dinheiro`/`vontade`/
   * `inventarioMaximo` bruto pra fora do backend — esses só existem pra alimentar este cálculo.
   */
  private paraResumoPublico(fichaInterna: FichaResumoInternoDto): FichaResumoDto {
    return {
      id: fichaInterna.id,
      campanhaId: fichaInterna.campanhaId,
      campanhaNome: fichaInterna.campanhaNome,
      usuarioId: fichaInterna.usuarioId,
      nome: fichaInterna.nome,
      cor: fichaInterna.cor,
      imagemUrl: fichaInterna.imagemUrl,
      classe: fichaInterna.classe,
      arquetipo: fichaInterna.arquetipo,
      nivel: fichaInterna.nivel,
      vidaAtual: fichaInterna.vidaAtual,
      vidaMaxima: fichaInterna.vidaMaxima,
      energiaAtual: fichaInterna.energiaAtual,
      energiaMaxima: fichaInterna.energiaMaxima,
      morrendo: fichaInterna.morrendo,
      machucado: fichaInterna.machucado,
      inconsciente: fichaInterna.inconsciente,
      prestigio: fichaInterna.prestigio,
      defesa: fichaInterna.defesa,
      esquiva: fichaInterna.esquiva,
      bloqueio: fichaInterna.bloqueio,
      contraAtaque: fichaInterna.contraAtaque ?? this.calcularContraAtaqueAoVivo(fichaInterna),
      personalidade: fichaInterna.personalidade,
      origemNome: fichaInterna.origemNome,
      sobrecarregado: this.calcularSobrecarregado(fichaInterna),
    };
  }

  /**
   * Contra-ataque **ao vivo** (fallback do resumo, ajuste pós-m2-19): o snapshot `derivados` gravado
   * na criação da ficha nunca ganha a habilidade "Contra-Ataque" sozinho quando ela entra depois
   * (`ajustarHabilidades`/`visualizar.page.ts` não recalcula `derivados` — m3-13, "sem cascata"). A
   * tela da própria ficha já cobre a lacuna caindo no calculado (`montarInformacoesExtras`,
   * "stored > calculado" — m3-10); o mini-card do painel da campanha só lê este resumo, sem onde
   * recalcular no cliente, daí o mesmo fallback aqui — `calcularDerivados` é a mesma fonte única que
   * a tela usa (m3-39), então o valor bate exatamente com o que apareceria na ficha aberta.
   */
  private calcularContraAtaqueAoVivo(fichaInterna: FichaResumoInternoDto): number | undefined {
    return calcularDerivados(
      fichaInterna.classe,
      fichaInterna.nivel,
      fichaInterna.atributos,
      fichaInterna.habilidades,
    ).contraAtaque;
  }

  /**
   * `true` quando o peso do inventário principal excede o Inventário Máximo efetivo (aviso, não
   * trava — `sistema-v4.1.0.md`). Soma o ajuste de amplificador (`ajusteInventarioAmplificadores`)
   * ao snapshot bruto de `inventarioMaximo` antes de chamar `calcularResumoCompras` — mesmo passo
   * que a aba Inventário já faz no cliente (`inventarioMaximoEfetivo`) antes de montar o resumo de
   * compras. `undefined` numa ficha sem `derivados.inventarioMaximo` salvo (retrocompat) — sem o
   * máximo não há o que comparar.
   */
  private calcularSobrecarregado(fichaInterna: FichaResumoInternoDto): boolean | undefined {
    if (fichaInterna.inventarioMaximo === undefined) {
      return undefined;
    }
    const inventarioMaximoEfetivo =
      fichaInterna.inventarioMaximo + ajusteInventarioAmplificadores(fichaInterna.amplificadores);
    const resumoCompras = calcularResumoCompras({
      itens: fichaInterna.itens,
      amplificadores: fichaInterna.amplificadores,
      dinheiro: fichaInterna.dinheiro ?? 0,
      prestigio: fichaInterna.prestigio ?? 0,
      inventario: inventarioMaximoEfetivo,
      vontade: fichaInterna.vontade,
    });
    return resumoCompras.pesoUsado > resumoCompras.inventarioEfetivo;
  }

  /**
   * Recupera uma ficha pelo `id`, exigindo permissão de **visualização** (§14): dono, mestre da
   * campanha ou membro com concessão em `usuario_ficha_acesso`. `ResourceNotFoundException` se a
   * ficha não existir; `UnauthorizedAccessException` se o autor não puder vê-la. Um visualizador
   * só-acesso (nem dono, nem mestre) nunca recebe `CAMPOS_PRIVADOS_FICHA` (m3-50 — `historia`) — o
   * dado nem trafega, não é só ocultado no front.
   */
  async recuperarFicha(
    dto: FichaRecuperarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<FichaRecuperadaDto> {
    const fichaEncontrada = await this.fichaRepositorio.recuperarPorId(dto);
    if (!fichaEncontrada) {
      throw new ResourceNotFoundException('Ficha');
    }

    const ehSoVisualizador = await this.validarPermissaoVisualizacao(fichaEncontrada, usuarioAtivo);
    if (ehSoVisualizador) {
      return { ...fichaEncontrada, dados: omitirCamposPrivados(fichaEncontrada.dados) };
    }
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
    this.validarCor(dto.cor);
    if (fichaEncontrada.usuarioId === usuarioAtivo.sub) {
      this.validarImutabilidadeIdentidade(fichaEncontrada.dados.identidade, dto.dados.identidade);
      this.validarContratoSomenteMestre(fichaEncontrada.dados.contrato, dto.dados.contrato);
    }

    const fichaAlterada = await this.fichaRepositorio.alterarFicha(dto);
    this.campanhaGateway.emitirFichaAlterada(fichaAlterada);
    return fichaAlterada;
  }

  /**
   * Troca o avatar da ficha (m3-62), exigindo permissão de **edição** (§14). Valida MIME
   * (`jpeg`/`png`/`webp`) e tamanho (2MB) — `BusinessException` se falhar, sem afetar o resto da
   * ficha. Ao trocar, exclui o arquivo anterior do armazenamento (não acumula lixo) **antes** de
   * persistir a nova URL — se a ficha já tinha avatar, o antigo já era um blob órfão assim que o
   * novo é gravado, então a ordem (excluir → `UPDATE`) só importa para não vazar exceção de
   * armazenamento com o banco já desatualizado. `ResourceNotFoundException` se a ficha não
   * existir; `UnauthorizedAccessException` se o autor não puder editá-la. Emite `ficha:alterada`
   * (mesmo evento da edição genérica) após persistir — quem está com a ficha aberta vê o avatar
   * novo sem F5.
   */
  async alterarImagem(
    dto: FichaImagemAlterarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<FichaImagemAlteradaDto> {
    const fichaEncontrada = await this.fichaRepositorio.recuperarPorId({ id: dto.id });
    if (!fichaEncontrada) {
      throw new ResourceNotFoundException('Ficha');
    }
    await this.validarPermissaoEdicao(fichaEncontrada, usuarioAtivo);

    const extensao = EXTENSAO_POR_MIME_IMAGEM[dto.arquivo.mimetype];
    if (!extensao) {
      throw new BusinessException('Formato de imagem inválido: use JPEG, PNG ou WEBP');
    }
    if (dto.arquivo.tamanho > TAMANHO_MAXIMO_IMAGEM_BYTES) {
      throw new BusinessException('Imagem maior que o limite permitido (2MB)');
    }

    const imagemSalva = await this.armazenamentoProvedor.salvarImagem({
      conteudo: dto.arquivo.conteudo,
      mimetype: dto.arquivo.mimetype,
      extensao,
    });

    if (fichaEncontrada.imagemUrl) {
      await this.armazenamentoProvedor.excluirImagem({ caminho: fichaEncontrada.imagemUrl });
    }

    const imagemAlterada = await this.fichaRepositorio.alterarImagem({
      id: dto.id,
      imagemUrl: imagemSalva.caminho,
    });
    this.campanhaGateway.emitirFichaAlterada({ ...fichaEncontrada, imagemUrl: imagemAlterada.imagemUrl });
    return imagemAlterada;
  }

  /**
   * Remove o avatar da ficha (m3-62): exclui o arquivo do armazenamento e limpa `imagemUrl`, exigindo
   * permissão de **edição** (§14). No-op no armazenamento se a ficha já não tinha avatar.
   * `ResourceNotFoundException` se a ficha não existir; `UnauthorizedAccessException` se o autor
   * não puder editá-la. Emite `ficha:alterada` após persistir, mesmo racional de `alterarImagem`.
   */
  async excluirImagem(
    dto: FichaImagemExcluirDto,
    usuarioAtivo: JwtPayload,
  ): Promise<FichaImagemAlteradaDto> {
    const fichaEncontrada = await this.fichaRepositorio.recuperarPorId({ id: dto.id });
    if (!fichaEncontrada) {
      throw new ResourceNotFoundException('Ficha');
    }
    await this.validarPermissaoEdicao(fichaEncontrada, usuarioAtivo);

    if (fichaEncontrada.imagemUrl) {
      await this.armazenamentoProvedor.excluirImagem({ caminho: fichaEncontrada.imagemUrl });
    }

    const imagemAlterada = await this.fichaRepositorio.alterarImagem({ id: dto.id, imagemUrl: null });
    this.campanhaGateway.emitirFichaAlterada({ ...fichaEncontrada, imagemUrl: null });
    return imagemAlterada;
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
   * Duplica uma ficha (m3-52, item 26): clona o documento de jogo (`dados`) e cria uma ficha nova
   * com nome `"<nome> (cópia)"`, dono = quem duplicou (nunca o dono original) e sem herdar acessos
   * de visualização (`usuario_ficha_acesso`) — o clone nasce sem nenhuma concessão, já que
   * `criarFicha` nunca as toca. Exige permissão de **edição** da ficha original (§14: só dono ou
   * mestre). Reusa `criarFicha` por inteiro (mesmo snapshot de máximas/preset de Iniciativa/
   * validação contra `shared/regras`), então o retorno é o próprio `FichaCriadaDto` — a duplicação
   * **é** uma criação, sem DTO de saída dedicado. `ResourceNotFoundException` se a ficha original
   * não existir; `UnauthorizedAccessException` se o autor não puder editá-la.
   *
   * **Adaptação de escopo (m3-52, a pedido do autor).** A spec original previa o clone nascendo
   * **solto** (sem campanha) — hoje possível (`campanha_id` nullable, m3-28), mas a superfície de
   * duplicar segue restrita ao **painel da campanha** (`CampanhaDetalhe`), como decidido em m3-52:
   * duplicar uma ficha **em campanha** clona **na mesma campanha** (`campanhaId` repassado
   * intacto); duplicar uma ficha **solta** (hipotético — sem affordance no acervo ainda) clonaria
   * solta também, pela mesma passagem direta. Trazer "duplicar" para o acervo é um passo futuro,
   * não coberto por esta task.
   */
  async duplicarFicha(dto: FichaDuplicarDto, usuarioAtivo: JwtPayload): Promise<FichaCriadaDto> {
    const fichaOriginal = await this.fichaRepositorio.recuperarPorId({ id: dto.id });
    if (!fichaOriginal) {
      throw new ResourceNotFoundException('Ficha');
    }

    await this.validarPermissaoEdicao(fichaOriginal, usuarioAtivo);

    return this.criarFicha(
      {
        campanhaId: fichaOriginal.campanhaId ?? undefined,
        nome: `${fichaOriginal.nome} (cópia)`,
        cor: fichaOriginal.cor,
        dados: fichaOriginal.dados,
      },
      usuarioAtivo,
    );
  }

  /**
   * Move a ficha entre o acervo solto e uma campanha (m3-28) — cardinalidade 1:N (no máximo uma
   * campanha por vez; reatribuir **move**). Só o **dono ou o mestre atual** da ficha atribuem/
   * desatribuem (`validarPermissaoEdicao`, mesma regra de edição — §14); atribuir a uma campanha
   * (`campanhaId !== null`) exige que o **dono da ficha** seja membro dela (`validarMembroAlvo`,
   * mesma checagem da concessão de acesso — m3-04); `campanhaId: null` desatribui sem checagem
   * extra. Ao entrar numa campanha nova, emite `ficha:criada` (resumo) na sala dela — os membros
   * conectados veem a ficha aparecer, mesmo evento de `criarFicha` (m3-05); ao sair de uma
   * campanha (desatribuir ou mover para outra), a sala anterior não recebe evento — fora de
   * escopo desta task (a spec marca como opcional). `ResourceNotFoundException` se a ficha não
   * existir; `UnauthorizedAccessException` se o autor não puder editá-la ou o dono não for membro
   * da campanha-alvo.
   */
  async atribuirCampanha(
    dto: FichaCampanhaInternoAtribuirDto,
    usuarioAtivo: JwtPayload,
  ): Promise<FichaCampanhaAtribuidaDto> {
    const fichaEncontrada = await this.fichaRepositorio.recuperarPorId({ id: dto.id });
    if (!fichaEncontrada) {
      throw new ResourceNotFoundException('Ficha');
    }

    await this.validarPermissaoEdicao(fichaEncontrada, usuarioAtivo);

    if (dto.campanhaId !== null) {
      await this.validarMembroAlvo({
        campanhaId: dto.campanhaId,
        usuarioId: fichaEncontrada.usuarioId,
      });
    }

    const fichaAtribuida = await this.fichaRepositorio.atribuirCampanha(dto);
    if (dto.campanhaId !== null && dto.campanhaId !== fichaEncontrada.campanhaId) {
      this.campanhaGateway.emitirFichaCriada(fichaAtribuida);
    }

    return { id: fichaAtribuida.id, campanhaId: fichaAtribuida.campanhaId };
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
   *
   * **Expulsão em tempo real (m3-51, item 27).** Após persistir, emite `ficha:acesso-revogado` na
   * sala `ficha:<id>` (`CampanhaGateway.emitirAcessoRevogado`) — se o alvo estiver com a ficha aberta,
   * o front o redireciona para fora da tela; o revogado nunca deveria continuar vendo um documento
   * que o REST já negaria num próximo `recuperarFicha`.
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

    const acessoRevogado: FichaAcessoRevogadoDto = { fichaId: dto.fichaId, usuarioId: dto.usuarioId };
    this.campanhaGateway.emitirAcessoRevogado(acessoRevogado);
    return acessoRevogado;
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
   * `UnauthorizedAccessException`. Devolve `true` quando quem pediu é **só-visualizador**
   * (nem dono, nem mestre) — usado por `recuperarFicha` para decidir se omite
   * `CAMPOS_PRIVADOS_FICHA` (m3-50).
   *
   * **Ficha solta (m3-28).** Sem `campanhaId`, não há campanha nem mestre a consultar — o ramo
   * de mestre fica atrás de `ficha.campanhaId !== null` (nunca chama `recuperarMembro` com
   * `null`); a visualização vira dono-ou-concessão explícita.
   */
  private async validarPermissaoVisualizacao(
    ficha: FichaRecuperadaDto,
    usuarioAtivo: JwtPayload,
  ): Promise<boolean> {
    if (ficha.usuarioId === usuarioAtivo.sub) {
      return false;
    }

    if (ficha.campanhaId !== null) {
      const membroEncontrado = await this.campanhaRepositorio.recuperarMembro({
        campanhaId: ficha.campanhaId,
        usuarioId: usuarioAtivo.sub,
      });
      if (membroEncontrado?.papel === TipoCampanhaMembroPapelEnum.MESTRE) {
        return false;
      }
    }

    const acessoConcedido = await this.fichaRepositorio.recuperarAcesso({
      fichaId: ficha.id,
      usuarioId: usuarioAtivo.sub,
    });
    if (!acessoConcedido) {
      throw new UnauthorizedAccessException();
    }
    return true;
  }

  /**
   * Garante permissão de **edição** da ficha (§14): só o dono (posse) ou o mestre da campanha
   * (papel). Um membro com concessão de visualização **nunca** edita. Do contrário lança
   * `UnauthorizedAccessException`.
   *
   * **Ficha solta (m3-28).** Sem `campanhaId`, não há mestre — vira dono-apenas (mesmo racional
   * de `validarPermissaoVisualizacao`, sem chamar `recuperarMembro` com `null`).
   */
  private async validarPermissaoEdicao(
    ficha: FichaRecuperadaDto,
    usuarioAtivo: JwtPayload,
  ): Promise<void> {
    if (ficha.usuarioId === usuarioAtivo.sub) {
      return;
    }

    if (ficha.campanhaId === null) {
      throw new UnauthorizedAccessException();
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
  private async validarMembroAlvo(dto: { campanhaId: number | null; usuarioId: number }): Promise<void> {
    // Ficha solta (m3-28): sem campanha não existe "membro" a validar — o alvo nunca qualifica.
    if (dto.campanhaId === null) {
      throw new ResourceNotFoundException('Membro');
    }

    const membroEncontrado = await this.campanhaRepositorio.recuperarMembro({
      campanhaId: dto.campanhaId,
      usuarioId: dto.usuarioId,
    });
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

    this.validarFormaIdentidade(dados.identidade, dados.classe, dados.habilidades);
    this.validarContagensMunicao(dados);
  }

  /**
   * Valida a **forma** da cor de identidade visual da ficha (m3-61, §11 camada 1): ausente/`null`
   * é sempre válido (sem cor definida); presente, precisa ser hex de 6 dígitos (`#rrggbb`) — o
   * mesmo formato que `<input type="color">` sempre produz no frontend. Sem trava de contraste
   * (ao contrário do accent de tema, M1) — decisão explícita da spec, o picker é livre.
   */
  private validarCor(cor: string | null | undefined): void {
    if (cor == null) {
      return;
    }
    if (!/^#[0-9A-Fa-f]{6}$/.test(cor)) {
      throw new BusinessException('Cor inválida: use o formato hexadecimal #RRGGBB');
    }
  }

  /** Protege o JSONB contra saldo impossível de munição, inclusive clientes externos. */
  private validarContagensMunicao(dados: FichaJogadorDadosDto): void {
    for (const item of dados.inventario.itens) {
      const contagem = item.contagemMunicao;
      if (!contagem) continue;
      const elegivel = item.categoria === ItemCategoriaEnum.MUNICOES ||
        (item.categoria === ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR && item.categoriaEmprestada === ItemCategoriaEnum.MUNICOES);
      if (!elegivel || !Number.isInteger(contagem.atual) || !Number.isInteger(contagem.maxima) ||
        contagem.atual < 0 || contagem.maxima < 0 || contagem.atual > contagem.maxima ||
        (contagem.unidade !== 'CENA' && contagem.unidade !== 'DISPARO')) {
        throw new BusinessException('Contagem de munição inválida');
      }
    }
  }

  /**
   * Valida a **forma** do bloco `identidade` (m3-24, §11 camada 1 — não trava faixa, só forma):
   * Personalidade uma única palavra (sem espaço interno, aparada), Origem com `nome`/`descricao`/
   * `saberDeCampo` preenchidos e exatamente 2 Formações, cada bônus de Formação existente em
   * `FORMACOES` com `parametro` presente quando a definição exige, `texto` sempre obrigatório
   * (inclusive no bônus custom `bonus: null`) e Especialidade com `gatilho`/`efeito` preenchidos
   * (`efeito` é texto livre — o Mestre arbitra o teto de poder, `sistema-v4.1.0.md` "⬦
   * Especialidade" não lista um catálogo fechado como a Formação lista). Reusa o catálogo de
   * `shared/regras/identidade` (m3-23) — nenhuma regra de conteúdo é reimplementada aqui
   * (proibições #26/#28). Ficha sem `identidade` (anterior à m3-23) não valida nada.
   *
   * **Experimento + Peculiaridade zera a Origem (m3-41).** `classe`/`habilidades` entram só pra essa
   * checagem — `experimentoComPeculiaridade` (`shared/regras/identidade`) reusa o mesmo catálogo que
   * já descreve a habilidade "Peculiaridade" das três subclasses de Experimento.
   */
  private validarFormaIdentidade(
    identidade: FichaIdentidadeDto | undefined,
    classe: ClasseEnum,
    habilidades: readonly FichaHabilidadeDto[],
  ): void {
    if (!identidade) {
      return;
    }

    if (identidade.personalidade !== null && /\s/.test(identidade.personalidade)) {
      throw new BusinessException(
        'Personalidade inválida: precisa ser uma única palavra, sem espaços',
      );
    }

    if (identidade.origem !== null) {
      if (experimentoComPeculiaridade(classe, habilidades)) {
        throw new BusinessException(
          'Origem inválida: um Experimento com a habilidade Peculiaridade não pode ter Origem — a Peculiaridade substitui os bônus de Origem',
        );
      }
      this.validarFormaOrigem(identidade.origem);
    }
  }

  /**
   * Valida a forma da Origem (m3-24), incluindo os três textos livres (`nome`/`descricao`/
   * `saberDeCampo`) e a **Especialidade acoplada** (m3-41 — Entregável 3): `especialidade` é campo
   * obrigatório de `FichaOrigemDto` (nunca existe Origem sem Especialidade, por construção do
   * contrato); esta validação garante que nenhum dos textos chega **vazio/incompleto** — mesma
   * exigência já feita para o `texto` de cada Formação.
   */
  private validarFormaOrigem(origem: FichaOrigemDto): void {
    if (!origem.nome.trim()) {
      throw new BusinessException('Origem inválida: o nome é obrigatório');
    }
    if (!origem.descricao.trim()) {
      throw new BusinessException('Origem inválida: a descrição é obrigatória');
    }
    if (!origem.saberDeCampo.trim()) {
      throw new BusinessException('Origem inválida: o Saber de Campo é obrigatório');
    }
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

    if (!origem.especialidade.gatilho.trim()) {
      throw new BusinessException('Especialidade inválida: o gatilho é obrigatório');
    }
    if (!origem.especialidade.efeito.trim()) {
      throw new BusinessException('Especialidade inválida: o efeito é obrigatório');
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
   *
   * **Delta de Formação da Origem (m3-41).** Quando o backend precisa calcular `derivados` do zero
   * (cliente não enviou) e a ficha já chega com `identidade.origem` definida, o snapshot já nasce
   * com o delta da Formação aplicado (`aplicarFormacaoAosDerivados`) — mesmo cálculo que o frontend
   * faz ao vivo (`ficha-visualizacao.component.ts`) e ao trocar a Origem (`ajustarOrigem`,
   * `visualizar.page.ts`), agora também coberto quando é o **backend** quem deriva o snapshot pela
   * primeira vez. Cliente que já manda `derivados` pronto (fluxo normal da UI) não passa por aqui —
   * ele já aplicou o delta antes de enviar.
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
    const derivados = dados.derivados ?? this.calcularDerivadosComOrigem(dados);

    return { ...dados, estado: { ...dados.estado, vidaMaxima, energiaMaxima }, derivados };
  }

  /**
   * Garante o preset de Iniciativa (m3-47) em toda ficha nova, sem duplicar caso o cliente já
   * tenha enviado um preset de mesmo nome (ex.: wizard futuro que replique a mesma semente).
   */
  private aplicarPresetIniciativa(dados: FichaJogadorDadosDto): FichaJogadorDadosDto {
    const rolagens = dados.rolagens ?? [];
    if (rolagens.some((preset) => preset.nome === PRESET_INICIATIVA_PADRAO.nome)) {
      return dados;
    }
    return { ...dados, rolagens: [...rolagens, PRESET_INICIATIVA_PADRAO] };
  }

  /** `calcularDerivados` cru + delta de Formação da Origem, quando `identidade.origem` já está definida. */
  private calcularDerivadosComOrigem(dados: FichaJogadorDadosDto): FichaDerivadosDto {
    const derivadosBase = calcularDerivados(dados.classe, dados.nivel, dados.atributos, dados.habilidades);
    const formacao = dados.identidade?.origem?.formacao ?? [];
    return formacao.length > 0 ? aplicarFormacaoAosDerivados(derivadosBase, formacao) : derivadosBase;
  }
}
