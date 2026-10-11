import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type {
  LivroCodigoRecuperarDto,
  LivroPecaDto,
  LivroResumoDto,
  RegraPecaAlteradaDto,
  RegraPecaCriadaDto,
  RegraPecaCriarDto,
  RegraPecaArvoreItemDto,
  RegraPecaDadosAlterarDto,
  RegraPecaDuplicadaDto,
  RegraPecaDuplicarDto,
  RegraPecaEsqueletoDto,
  RegraPecaExcluidaDto,
  RegraPecaExcluirDto,
  RegraPecaMovidaDto,
  RegraPecaNomeAlteradaDto,
  RegraPecaNomeAlterarDto,
  RegraPecaPosicaoAlterarDto,
  RegraPecaRecuperadaDto,
  RegraPecaRecuperarDto,
  RegraPecaRestauradaDto,
  RegraPecaRestaurarDto,
} from "@contratados-rpg/shared/dtos/livro";
import { LivroPendenciaCodigoEnum, TipoRegraPecaEnum, TipoUsuarioEnum } from "@contratados-rpg/shared/enums";
import {
  campoNomeDaPeca,
  derivarAncoraUnica,
  LIVRO_FILHOS_PERMITIDOS,
  LIVRO_RAIZ_PERMITIDA,
  validarArvoreLivro,
} from "@contratados-rpg/shared/livro";
import {
  BusinessException,
  ResourceConflictException,
  ResourceNotFoundException,
  UnauthorizedAccessException,
} from "../../core/exceptions";
import { TransacaoService } from "../../database/transacao.service";
import type { JwtPayload } from "../autenticacao/jwt-payload.interface";
import { LivroRepository } from "./livro.repository";
import { RegraPecaRepository } from "./regra-peca.repository";

/** Códigos de pendência que tornam um `dados` inaceitável já na edição (o resto é trabalho por terminar). */
const PENDENCIAS_QUE_RECUSAM_EDICAO: readonly LivroPendenciaCodigoEnum[] = [
  LivroPendenciaCodigoEnum.DADOS_INVALIDOS,
  LivroPendenciaCodigoEnum.LINK_SEM_IDENTIFICADOR,
];

/** Maior valor de uma coluna `integer`; acima disso o banco recusaria com erro 500. */
const INTEIRO_MAXIMO = 2_147_483_647;

/** Teto de peças num esqueleto enviado de uma vez (o maior esqueleto real tem 2). */
const ESQUELETO_MAXIMO_DE_PECAS = 20;

/** Tipos cuja âncora vira link na leitura: ganham uma sozinhos quando recebem o primeiro nome. */
const TIPOS_COM_ANCORA_AUTOMATICA: readonly TipoRegraPecaEnum[] = [
  TipoRegraPecaEnum.SECAO,
  TipoRegraPecaEnum.CLASSE,
  TipoRegraPecaEnum.SUBCLASSE,
];

const CONFLITO_DE_REVISAO =
  "A peça foi alterada por outra pessoa ou em outra aba. Recarregue a peça antes de continuar.";

/**
 * Edição da cópia de trabalho dos livros (m11-06): alterar `dados`, mover, duplicar, excluir e
 * restaurar peças, só `ADMIN`. Toda alteração de peça existente carrega a `revisao` que o cliente
 * leu (trava otimista): revisão defasada é conflito (409), nunca sobrescrita. O SQL é dos
 * repositórios; aqui ficam permissão, aninhamento, validação do `dados` e orquestração.
 */
@Injectable()
export class RegraPecaService {
  constructor(
    private readonly livroRepository: LivroRepository,
    private readonly regraPecaRepository: RegraPecaRepository,
    private readonly transacaoService: TransacaoService,
  ) {}

  /** Cópia de trabalho do livro, em lista plana (a Oficina monta o aninhamento). */
  async listarArvore(dto: LivroCodigoRecuperarDto, usuarioAtivo: JwtPayload): Promise<RegraPecaArvoreItemDto[]> {
    this.exigirAdmin(usuarioAtivo);
    const livro = await this.recuperarLivroExistente(dto.codigo);
    return this.regraPecaRepository.listarArvore({ livroId: livro.id });
  }

  async recuperarPeca(
    dto: RegraPecaRecuperarDto & { readonly codigo: string },
    usuarioAtivo: JwtPayload,
  ): Promise<RegraPecaRecuperadaDto> {
    this.exigirAdmin(usuarioAtivo);
    const livro = await this.recuperarLivroExistente(dto.codigo);
    return this.recuperarPecaDoLivro(dto.id, livro);
  }

  async alterarDados(dto: RegraPecaDadosAlterarDto, usuarioAtivo: JwtPayload): Promise<RegraPecaAlteradaDto> {
    this.exigirAdmin(usuarioAtivo);
    this.exigirRevisao(dto.revisao);
    const livro = await this.recuperarLivroExistente(dto.codigo);
    const peca = await this.recuperarPecaDoLivro(dto.id, livro);

    this.exigirDadosValidos(peca.tipo, dto.dados);

    const alterada = await this.regraPecaRepository.alterarDados({
      id: dto.id,
      dados: dto.dados,
      revisao: dto.revisao,
    });
    if (!alterada) throw new ResourceConflictException(CONFLITO_DE_REVISAO);
    return { peca: (await this.atribuirAncoraInicial(livro, alterada)) ?? alterada };
  }

  /**
   * Seção, classe e subclasse criadas na Oficina nascem sem âncora (sem nome ainda); no primeiro nome
   * ganham a âncora derivada dele, senão ficariam sem link no sumário público. Quem já tem âncora não muda:
   * trocar a âncora é o "Renomear", que guarda a antiga.
   */
  private async atribuirAncoraInicial(
    livro: LivroResumoDto,
    peca: RegraPecaRecuperadaDto,
  ): Promise<RegraPecaRecuperadaDto | null> {
    const campo = campoNomeDaPeca(peca.tipo);
    if (peca.ancora !== null || campo === null || !TIPOS_COM_ANCORA_AUTOMATICA.includes(peca.tipo)) return null;
    const valor = (peca.dados as unknown as Record<string, unknown>)[campo];
    const nome = typeof valor === "string" ? valor.trim() : "";
    if (!nome) return null;
    return this.transacaoService.executar(async () => {
      await this.livroRepository.bloquearLivro({ livroId: livro.id });
      const atual = await this.regraPecaRepository.recuperarPeca({ id: peca.id });
      if (!atual || atual.ancora !== null) return null;
      const ancora = await this.ancoraDisponivel(livro.id, atual.id, nome);
      return this.regraPecaRepository.alterarAncora({ id: atual.id, ancora, revisao: atual.revisao });
    });
  }

  /** Âncora do nome que não colide com a atual nem com as antigas de outra peça do livro. */
  private async ancoraDisponivel(livroId: number, pecaId: number, nome: string): Promise<string> {
    const arvore = await this.regraPecaRepository.listarArvore({ livroId });
    const antigas = await this.regraPecaRepository.listarAncorasAntigas({ livroId });
    const indisponiveis = new Set<string>();
    for (const outra of arvore) if (outra.id !== pecaId && outra.ancora) indisponiveis.add(outra.ancora);
    for (const antiga of antigas) if (antiga.regraPecaId !== pecaId) indisponiveis.add(antiga.ancora);
    return derivarAncoraUnica(nome, indisponiveis);
  }

  /**
   * Cria uma peça (sem âncora) na posição pedida, deslocando as irmãs seguintes. O `dados` precisa ter
   * a forma do tipo, e o tipo precisa caber no pai (mesma tabela da Oficina: `LIVRO_FILHOS_PERMITIDOS`).
   * Os `filhos` do esqueleto (ex.: a habilidade inicial do arquétipo) nascem na mesma transação: ou a
   * peça e todas as filhas existem, ou nenhuma.
   */
  async criar(dto: RegraPecaCriarDto, usuarioAtivo: JwtPayload): Promise<RegraPecaCriadaDto> {
    this.exigirAdmin(usuarioAtivo);
    if (!Number.isInteger(dto.indice) || dto.indice < 0 || dto.indice > INTEIRO_MAXIMO) {
      throw new BusinessException("A posição precisa ser um número inteiro a partir de 0.");
    }
    return this.transacaoService.executar(async () => {
      const livro = await this.recuperarLivroExistente(dto.codigo);
      await this.livroRepository.bloquearLivro({ livroId: livro.id });
      const arvore = await this.regraPecaRepository.listarArvore({ livroId: livro.id });
      const pai = dto.pecaPaiId === null ? null : arvore.find((item) => item.id === dto.pecaPaiId);
      if (pai === undefined) throw new ResourceNotFoundException("Peça de destino");
      const permitidos = pai === null ? LIVRO_RAIZ_PERMITIDA : LIVRO_FILHOS_PERMITIDOS[pai.tipo];
      if (!permitidos.includes(dto.tipo)) {
        throw new BusinessException(`${dto.tipo} não pode ficar dentro de ${pai?.tipo ?? "a raiz do livro"}.`);
      }
      this.exigirPaiSemQuantidades(pai, "criar peças em");
      this.exigirDadosValidos(dto.tipo, dto.dados);
      this.exigirEsqueletoValido(dto.tipo, dto.filhos ?? []);

      const irmas = this.irmasOrdenadas(arvore, dto.pecaPaiId);
      const indice = Math.min(dto.indice, irmas.length);
      const alteradas = new Set<number>();
      for (const [posicao, irma] of irmas.entries()) {
        const ordemNova = posicao >= indice ? posicao + 1 : posicao;
        if (irma.ordem !== ordemNova) {
          await this.regraPecaRepository.alterarOrdem({ id: irma.id, ordem: ordemNova });
          alteradas.add(irma.id);
        }
      }
      const criada = await this.regraPecaRepository.criarPeca({
        livroId: livro.id,
        pecaPaiId: dto.pecaPaiId,
        tipo: dto.tipo,
        identificador: randomUUID(),
        ancora: null,
        ordem: indice,
        dados: dto.dados,
      });
      if (!criada) throw new ResourceConflictException("Não foi possível criar a peça: o pai mudou.");
      const filhasCriadas = new Set<number>();
      const criarFilhas = async (pecaPaiId: number, filhos: readonly RegraPecaEsqueletoDto[]): Promise<void> => {
        for (const [ordem, filho] of filhos.entries()) {
          const filha = await this.regraPecaRepository.criarPeca({
            livroId: livro.id,
            pecaPaiId,
            tipo: filho.tipo,
            identificador: randomUUID(),
            ancora: null,
            ordem,
            dados: filho.dados,
          });
          if (!filha) throw new ResourceConflictException("Não foi possível criar a peça: o pai mudou.");
          filhasCriadas.add(filha.id);
          await criarFilhas(filha.id, filho.filhos ?? []);
        }
      };
      await criarFilhas(criada.id, dto.filhos ?? []);
      const atual = await this.regraPecaRepository.listarArvore({ livroId: livro.id });
      return {
        peca: criada,
        pecas: atual.filter((item) => alteradas.has(item.id)),
        filhas: atual.filter((item) => filhasCriadas.has(item.id)),
      };
    });
  }

  /**
   * Renomeia a peça: grava o nome (ou título) novo e deriva dele a âncora nova, que não pode colidir com
   * nenhuma âncora atual nem antiga de outra peça do livro. A âncora que ela deixa fica registrada, e os
   * links e URLs antigos continuam resolvendo (a leitura herdada da `m11-04` usa `ancorasAntigas`).
   */
  async alterarNome(dto: RegraPecaNomeAlterarDto, usuarioAtivo: JwtPayload): Promise<RegraPecaNomeAlteradaDto> {
    this.exigirAdmin(usuarioAtivo);
    this.exigirRevisao(dto.revisao);
    const nome = typeof dto.nome === "string" ? dto.nome.trim() : "";
    if (!nome || nome.length > 200) throw new BusinessException("Informe um nome de até 200 caracteres.");
    return this.transacaoService.executar(async () => {
      const livro = await this.recuperarLivroExistente(dto.codigo);
      await this.livroRepository.bloquearLivro({ livroId: livro.id });
      const peca = await this.recuperarPecaDoLivro(dto.id, livro);
      const campo = campoNomeDaPeca(peca.tipo);
      if (campo === null) throw new BusinessException("Este tipo de peça não tem nome para renomear.");
      if (peca.revisao !== dto.revisao) throw new ResourceConflictException(CONFLITO_DE_REVISAO);

      const ancoraNova = await this.ancoraDisponivel(livro.id, peca.id, nome);

      const dadosNovos = { ...(peca.dados as object), [campo]: nome } as LivroPecaDto["dados"];
      const comNome = await this.regraPecaRepository.alterarDados({ id: peca.id, dados: dadosNovos, revisao: peca.revisao });
      if (!comNome) throw new ResourceConflictException(CONFLITO_DE_REVISAO);
      if (comNome.ancora === ancoraNova) return { peca: comNome, ancoraAntiga: null };

      const comAncora = await this.regraPecaRepository.alterarAncora({
        id: peca.id,
        ancora: ancoraNova,
        revisao: comNome.revisao,
      });
      if (!comAncora) throw new ResourceConflictException(CONFLITO_DE_REVISAO);
      if (peca.ancora) await this.regraPecaRepository.criarAncoraAntiga({ regraPecaId: peca.id, ancora: peca.ancora });
      return { peca: comAncora, ancoraAntiga: peca.ancora };
    });
  }

  /** Move a peça e reajusta a `ordem` das irmãs do pai de destino, tudo numa transação. */
  async alterarPosicao(dto: RegraPecaPosicaoAlterarDto, usuarioAtivo: JwtPayload): Promise<RegraPecaMovidaDto> {
    this.exigirAdmin(usuarioAtivo);
    this.exigirRevisao(dto.revisao);
    if (!Number.isInteger(dto.indice) || dto.indice < 0 || dto.indice > INTEIRO_MAXIMO) {
      throw new BusinessException("A posição precisa ser um número inteiro a partir de 0.");
    }
    return this.transacaoService.executar(async () => {
      const livro = await this.recuperarLivroExistente(dto.codigo);
      await this.livroRepository.bloquearLivro({ livroId: livro.id });
      const arvore = await this.regraPecaRepository.listarArvore({ livroId: livro.id });
      const peca = arvore.find((item) => item.id === dto.id);
      if (!peca) throw new ResourceNotFoundException("Peça");

      const novoPai = dto.pecaPaiId === null ? null : arvore.find((item) => item.id === dto.pecaPaiId);
      if (novoPai === undefined) throw new ResourceNotFoundException("Peça de destino");
      const permitidos = novoPai === null ? LIVRO_RAIZ_PERMITIDA : LIVRO_FILHOS_PERMITIDOS[novoPai.tipo];
      if (!permitidos.includes(peca.tipo)) {
        throw new BusinessException(`${peca.tipo} não pode ficar dentro de ${novoPai?.tipo ?? "a raiz do livro"}.`);
      }
      this.exigirPaiSemQuantidades(arvore.find((item) => item.id === peca.pecaPaiId), "mover peças de");
      this.exigirPaiSemQuantidades(novoPai, "mover peças para");
      if (this.ehDescendenteOuIgual(arvore, dto.pecaPaiId, peca.id)) {
        throw new BusinessException("Uma peça não pode ser movida para dentro dela mesma.");
      }

      const irmas = this.irmasOrdenadas(arvore, dto.pecaPaiId).filter((irma) => irma.id !== peca.id);
      const indice = Math.min(dto.indice, irmas.length);
      const movida = await this.regraPecaRepository.alterarPosicao({
        id: peca.id,
        pecaPaiId: dto.pecaPaiId,
        ordem: indice,
        revisao: dto.revisao,
      });
      if (!movida) throw new ResourceConflictException(CONFLITO_DE_REVISAO);

      const alteradas = new Set<number>([peca.id]);
      const seguintes = [...irmas.slice(0, indice), peca, ...irmas.slice(indice)];
      for (const [posicao, irma] of seguintes.entries()) {
        if (irma.id === peca.id || irma.ordem === posicao) continue;
        await this.regraPecaRepository.alterarOrdem({ id: irma.id, ordem: posicao });
        alteradas.add(irma.id);
      }
      const atual = await this.regraPecaRepository.listarArvore({ livroId: livro.id });
      return { pecas: atual.filter((item) => alteradas.has(item.id)) };
    });
  }

  /** Copia a peça com as descendentes logo depois dela: identificadores novos e sem âncora. */
  async duplicar(dto: RegraPecaDuplicarDto, usuarioAtivo: JwtPayload): Promise<RegraPecaDuplicadaDto> {
    this.exigirAdmin(usuarioAtivo);
    return this.transacaoService.executar(async () => {
      const livro = await this.recuperarLivroExistente(dto.codigo);
      await this.livroRepository.bloquearLivro({ livroId: livro.id });
      const arvore = await this.regraPecaRepository.listarArvore({ livroId: livro.id });
      const original = arvore.find((item) => item.id === dto.id);
      if (!original) throw new ResourceNotFoundException("Peça");
      this.exigirPecaAvulsa(arvore, original, "duplicada");

      const irmas = this.irmasOrdenadas(arvore, original.pecaPaiId);
      const posicaoOriginal = irmas.findIndex((irma) => irma.id === original.id);
      const alteradas = new Set<number>();
      for (const [indice, irma] of irmas.entries()) {
        const ordemNova = indice > posicaoOriginal ? indice + 1 : indice;
        if (irma.ordem !== ordemNova) {
          await this.regraPecaRepository.alterarOrdem({ id: irma.id, ordem: ordemNova });
          alteradas.add(irma.id);
        }
      }

      const filhasPorPai = new Map<number, RegraPecaArvoreItemDto[]>();
      for (const item of arvore) {
        if (item.pecaPaiId !== null) {
          filhasPorPai.set(item.pecaPaiId, [...(filhasPorPai.get(item.pecaPaiId) ?? []), item]);
        }
      }
      const criadas = new Set<number>();
      const copiar = async (modelo: RegraPecaArvoreItemDto, pecaPaiId: number | null, ordem: number): Promise<number> => {
        const copia = await this.regraPecaRepository.criarPeca({
          livroId: livro.id,
          pecaPaiId,
          tipo: modelo.tipo,
          identificador: randomUUID(),
          ancora: null,
          ordem,
          dados: modelo.dados,
        });
        if (!copia) throw new ResourceConflictException("Não foi possível criar a cópia: o pai mudou.");
        criadas.add(copia.id);
        const filhas = (filhasPorPai.get(modelo.id) ?? []).sort(
          (primeira, segunda) => primeira.ordem - segunda.ordem || primeira.id - segunda.id,
        );
        for (const [indice, filha] of filhas.entries()) await copiar(filha, copia.id, indice);
        return copia.id;
      };
      const copiaId = await copiar(original, original.pecaPaiId, posicaoOriginal + 1);

      const atual = await this.regraPecaRepository.listarArvore({ livroId: livro.id });
      return { copiaId, pecas: atual.filter((item) => criadas.has(item.id) || alteradas.has(item.id)) };
    });
  }

  async excluir(dto: RegraPecaExcluirDto, usuarioAtivo: JwtPayload): Promise<RegraPecaExcluidaDto> {
    this.exigirAdmin(usuarioAtivo);
    this.exigirRevisao(dto.revisao);
    const livro = await this.recuperarLivroExistente(dto.codigo);
    await this.recuperarPecaDoLivro(dto.id, livro);
    const arvore = await this.regraPecaRepository.listarArvore({ livroId: livro.id });
    const alvo = arvore.find((item) => item.id === dto.id);
    if (alvo) this.exigirPecaAvulsa(arvore, alvo, "excluída");
    const removidas = await this.regraPecaRepository.removerPeca({ id: dto.id, revisao: dto.revisao });
    if (removidas === 0) throw new ResourceConflictException(CONFLITO_DE_REVISAO);
    return { removidas };
  }

  /** Desfaz a exclusão (o "Desfazer" da Oficina): a peça e o que saiu junto voltam ao mesmo lugar. */
  async restaurar(dto: RegraPecaRestaurarDto, usuarioAtivo: JwtPayload): Promise<RegraPecaRestauradaDto> {
    this.exigirAdmin(usuarioAtivo);
    return this.transacaoService.executar(async () => {
      const livro = await this.recuperarLivroExistente(dto.codigo);
      await this.livroRepository.bloquearLivro({ livroId: livro.id });
      let restauradas: number;
      try {
        restauradas = await this.regraPecaRepository.restaurarPeca({ id: dto.id, livroId: livro.id });
      } catch (erro) {
        if ((erro as { code?: string }).code === "23505") {
          throw new ResourceConflictException(
            "Outra peça passou a usar a âncora desta; não dá para desfazer a exclusão.",
          );
        }
        throw erro;
      }
      if (restauradas === 0) {
        throw new ResourceConflictException("Nada para restaurar: a peça não está excluída ou o pai dela está.");
      }
      const arvore = await this.regraPecaRepository.listarArvore({ livroId: livro.id });
      const filhasPorPai = new Map<number, number[]>();
      for (const item of arvore) {
        if (item.pecaPaiId !== null) {
          filhasPorPai.set(item.pecaPaiId, [...(filhasPorPai.get(item.pecaPaiId) ?? []), item.id]);
        }
      }
      // Percurso a partir da raiz: não depende de o id do pai ser menor que o do filho.
      const subarvore = new Set<number>();
      const pendentes = [dto.id];
      for (let atual = pendentes.pop(); atual !== undefined; atual = pendentes.pop()) {
        subarvore.add(atual);
        pendentes.push(...(filhasPorPai.get(atual) ?? []));
      }
      return { pecas: arvore.filter((item) => subarvore.has(item.id)) };
    });
  }

  /**
   * Os filhos de um ROTEIRO são fatiados por contagem fixa (introdução/conclusão): criar, mover, duplicar ou
   * excluir um deles descolocaria as fatias, e a Oficina só estrutura roteiros quando ajustar essas contagens.
   */
  private exigirPaiSemQuantidades(pai: RegraPecaArvoreItemDto | null | undefined, acao: string): void {
    if (pai?.tipo === TipoRegraPecaEnum.ROTEIRO) {
      throw new BusinessException(`Ainda não dá para ${acao} um roteiro: a introdução e a conclusão dele dependem da posição.`);
    }
  }

  /** Peça que o livro exige existir uma vez (habilidade inicial) e filha de roteiro não se exclui nem se duplica sozinha. */
  private exigirPecaAvulsa(arvore: readonly RegraPecaArvoreItemDto[], peca: RegraPecaArvoreItemDto, acao: string): void {
    this.exigirPaiSemQuantidades(arvore.find((item) => item.id === peca.pecaPaiId), `${acao === "excluída" ? "excluir" : "duplicar"} peças de`);
    const inicial = peca.tipo === TipoRegraPecaEnum.HABILIDADE && (peca.dados as { inicial?: boolean }).inicial === true;
    if (inicial) throw new BusinessException(`A habilidade inicial não pode ser ${acao}: o arquétipo ou a subclasse depende dela.`);
  }

  /** Recusa (400) um `dados` sem a forma do tipo; campo vazio é pendência, não erro. */
  private exigirDadosValidos(tipo: TipoRegraPecaEnum, dados: LivroPecaDto["dados"]): void {
    const candidata: LivroPecaDto = {
      identificador: "00000000-0000-4000-8000-000000000000",
      ancora: null,
      tipo,
      ordem: 0,
      dados,
      filhos: [],
    };
    const recusadas = validarArvoreLivro({ pecas: [candidata], modo: "trabalho" }).filter((pendencia) =>
      PENDENCIAS_QUE_RECUSAM_EDICAO.includes(pendencia.codigo),
    );
    if (recusadas.length > 0) {
      throw new BusinessException(
        "Os dados enviados não têm a forma de uma peça deste tipo.",
        recusadas.map((pendencia) => pendencia.mensagem),
      );
    }
  }

  /** Esqueleto enviado pelo cliente: cada filho cabe no pai, tem a forma do tipo e o total é limitado. */
  private exigirEsqueletoValido(tipoPai: TipoRegraPecaEnum, filhos: readonly RegraPecaEsqueletoDto[]): void {
    let total = 0;
    const percorrer = (pai: TipoRegraPecaEnum, lista: unknown): void => {
      if (!Array.isArray(lista)) throw new BusinessException("Os filhos do esqueleto precisam ser uma lista.");
      for (const filho of lista as readonly RegraPecaEsqueletoDto[]) {
        total += 1;
        if (total > ESQUELETO_MAXIMO_DE_PECAS) throw new BusinessException("O esqueleto tem peças demais.");
        if (!LIVRO_FILHOS_PERMITIDOS[pai]?.includes(filho.tipo)) {
          throw new BusinessException(`${filho.tipo} não pode ficar dentro de ${pai}.`);
        }
        this.exigirDadosValidos(filho.tipo, filho.dados);
        this.exigirHabilidadeInicial(filho.tipo, filho.filhos ?? []);
        percorrer(filho.tipo, filho.filhos ?? []);
      }
    };
    this.exigirHabilidadeInicial(tipoPai, filhos);
    percorrer(tipoPai, filhos);
  }

  /** Arquétipo e subclasse não existem sem a habilidade inicial: sem ela a projeção do livro quebra. */
  private exigirHabilidadeInicial(tipo: TipoRegraPecaEnum, filhos: readonly RegraPecaEsqueletoDto[]): void {
    if (tipo !== TipoRegraPecaEnum.ARQUETIPO && tipo !== TipoRegraPecaEnum.SUBCLASSE) return;
    const iniciais = filhos.filter(
      (filho) => filho.tipo === TipoRegraPecaEnum.HABILIDADE && (filho.dados as { inicial?: boolean }).inicial === true,
    );
    if (iniciais.length !== 1) {
      throw new BusinessException(`${tipo} precisa nascer com exatamente uma habilidade inicial.`);
    }
  }

  /** As irmãs de um pai (`null` = raiz), na ordem em que a árvore as mostra. */
  private irmasOrdenadas(arvore: readonly RegraPecaArvoreItemDto[], pecaPaiId: number | null): RegraPecaArvoreItemDto[] {
    return arvore
      .filter((item) => item.pecaPaiId === pecaPaiId)
      .sort((primeira, segunda) => primeira.ordem - segunda.ordem || primeira.id - segunda.id);
  }

  /** `true` quando `candidata` é a própria `pecaId` ou está abaixo dela. */
  private ehDescendenteOuIgual(
    arvore: readonly RegraPecaArvoreItemDto[],
    candidata: number | null,
    pecaId: number,
  ): boolean {
    const porId = new Map(arvore.map((item) => [item.id, item]));
    for (let atual = candidata; atual !== null; atual = porId.get(atual)?.pecaPaiId ?? null) {
      if (atual === pecaId) return true;
    }
    return false;
  }

  private async recuperarPecaDoLivro(id: number, livro: LivroResumoDto): Promise<RegraPecaRecuperadaDto> {
    const peca = await this.regraPecaRepository.recuperarPeca({ id });
    if (!peca || peca.livroId !== livro.id) throw new ResourceNotFoundException("Peça");
    return peca;
  }

  private async recuperarLivroExistente(codigo: string): Promise<LivroResumoDto> {
    const livro = await this.livroRepository.recuperarLivro({ codigo });
    if (!livro) throw new ResourceNotFoundException("Livro");
    return livro;
  }

  private exigirRevisao(revisao: unknown): void {
    if (!Number.isInteger(revisao) || (revisao as number) < 1 || (revisao as number) > INTEIRO_MAXIMO) {
      throw new BusinessException("Informe a revisão da peça que você leu.");
    }
  }

  private exigirAdmin(usuarioAtivo: JwtPayload): void {
    if (usuarioAtivo.tipo !== TipoUsuarioEnum.ADMIN) throw new UnauthorizedAccessException();
  }
}
