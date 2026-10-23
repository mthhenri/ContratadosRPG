import { Injectable } from "@nestjs/common";
import type {
  LivroCodigoRecuperarDto,
  LivroLeituraDto,
  LivroListarDto,
  LivroMudancasPublicadasDto,
  LivroMudancasPublicadasRecuperarDto,
  LivroPublicacaoResumoDto,
  LivroLeituraRecuperarDto,
  LivroPecaDto,
  LivroPendenciaDto,
  LivroPublicadoDto,
  LivroPublicarDto,
  LivroResumoDto,
  LivroVersaoConteudoDto,
  LivroVersaoPorCodigoRecuperarDto,
  LivroVersaoRecuperadaDto,
  LivroVersaoResumoDto,
  RegraPecaArvoreItemDto,
} from "@contratados-rpg/shared/dtos/livro";
import { LIVRO_FORMATO_ATUAL } from "@contratados-rpg/shared/dtos/livro";
import {
  LivroPendenciaCodigoEnum,
  LivroPendenciaGravidadeEnum,
  TipoLivroVersaoSituacaoEnum,
  TipoUsuarioEnum,
} from "@contratados-rpg/shared/enums";
import { validarArvoreLivro } from "@contratados-rpg/shared/livro";
import {
  BusinessException,
  ResourceNotFoundException,
  UnauthorizedAccessException,
} from "../../core/exceptions";
import { TransacaoService } from "../../database/transacao.service";
import type { JwtPayload } from "../autenticacao/jwt-payload.interface";
import { LivroRepository } from "./livro.repository";
import { LivroVersaoRepository } from "./livro-versao.repository";
import { RegraPecaRepository } from "./regra-peca.repository";
import { montarMudancasPublicadas } from "./livro-mudancas-publicadas.util";

const PAPEIS_QUE_VEEM_RASCUNHO: readonly (TipoUsuarioEnum | null)[] = [
  TipoUsuarioEnum.TESTER,
  TipoUsuarioEnum.ADMIN,
];

type Registro = Record<string, unknown>;

/** Acrescenta a `ancora` atual do destino a cada link interno (resolvido por `identificador`). */
function resolverLinks(valor: unknown, ancoraPorIdentificador: ReadonlyMap<string, string | null>): unknown {
  if (Array.isArray(valor)) return valor.map((item) => resolverLinks(item, ancoraPorIdentificador));
  if (typeof valor !== "object" || valor === null) return valor;
  const registro = valor as Registro;
  if (registro["tipo"] === "link-interno" && typeof registro["identificador"] === "string") {
    const ancora = ancoraPorIdentificador.get(registro["identificador"]);
    // Destino sem âncora (ou inexistente) fica sem âncora: o validador acusa o link.
    return { ...registro, ancora: ancora ?? "" };
  }
  return Object.fromEntries(
    Object.entries(registro).map(([chave, conteudo]) => [chave, resolverLinks(conteudo, ancoraPorIdentificador)]),
  );
}

/**
 * Livros de regras (m11-04): monta a fotografia da cópia de trabalho, publica rascunho ou versão
 * (só `ADMIN`) e entrega ao leitor a fotografia que o papel pode ver — visitante e `NORMAL` leem a
 * publicada; `TESTER` e `ADMIN` leem a mais recente entre rascunho e publicada. A permissão vive
 * aqui, nunca na controller.
 */
@Injectable()
export class LivroService {
  constructor(
    private readonly livroRepository: LivroRepository,
    private readonly regraPecaRepository: RegraPecaRepository,
    private readonly livroVersaoRepository: LivroVersaoRepository,
    private readonly transacaoService: TransacaoService,
  ) {}

  /** Livros com fotografia visível ao papel. */
  async listarLivros(dto: LivroListarDto): Promise<LivroResumoDto[]> {
    const livros = await this.livroRepository.listarLivros();
    const visiveis: LivroResumoDto[] = [];
    for (const livro of livros) {
      const leitura = await this.recuperarFotografiaVisivel(livro, dto.tipoUsuario);
      if (leitura) visiveis.push(livro);
    }
    return visiveis;
  }

  /** A fotografia que o papel vê do livro; 404 quando nada foi publicado para ele. */
  async recuperarLivro(dto: LivroLeituraRecuperarDto): Promise<LivroLeituraDto> {
    const livro = await this.recuperarLivroExistente(dto.codigo);
    const versao = await this.recuperarFotografiaVisivel(livro, dto.tipoUsuario);
    if (!versao) throw new ResourceNotFoundException("Versão publicada do livro");
    return {
      codigo: livro.codigo,
      titulo: livro.titulo,
      situacao: versao.situacao,
      numero: versao.numero,
      publicacaoData: versao.publicacaoData,
      conteudo: versao.conteudo,
    };
  }

  /** Leitura vigente explícita para destinos da comparação, inclusive ADMIN/TESTER. */
  async recuperarPublicada(dto: LivroCodigoRecuperarDto): Promise<LivroLeituraDto> {
    return this.recuperarLivro({ codigo: dto.codigo, tipoUsuario: null });
  }

  async listarVersoes(dto: LivroCodigoRecuperarDto, usuarioAtivo: JwtPayload): Promise<LivroVersaoResumoDto[]> {
    this.exigirAdmin(usuarioAtivo);
    const livro = await this.recuperarLivroExistente(dto.codigo);
    return this.livroVersaoRepository.listarVersoes({ livroId: livro.id });
  }

  /** Consulta pública independente do papel: nunca mistura rascunhos e trabalho. */
  async recuperarMudancasPublicadas(dto: LivroMudancasPublicadasRecuperarDto): Promise<LivroMudancasPublicadasDto> {
    const livro = await this.recuperarLivroExistente(dto.codigo);
    if (dto.origemId !== undefined && (!Number.isSafeInteger(dto.origemId) || dto.origemId <= 0)) {
      throw new BusinessException("Publicação de origem inválida.");
    }
    const versoes = (await this.livroVersaoRepository.listarVersoes({ livroId: livro.id }))
      .filter((versao) => versao.livroId === livro.id && versao.situacao === TipoLivroVersaoSituacaoEnum.PUBLICADA)
      .sort((primeira, segunda) => segunda.publicacaoData.localeCompare(primeira.publicacaoData) || segunda.id - primeira.id);
    if (!versoes.length) throw new ResourceNotFoundException("Versão publicada do livro");
    const indiceOrigem = dto.origemId === undefined ? (versoes.length > 1 ? 1 : -1) : versoes.findIndex((versao) => versao.id === dto.origemId);
    if (dto.origemId !== undefined && indiceOrigem <= 0) throw new ResourceNotFoundException("Publicação de origem");
    const resumo = (versao: LivroVersaoResumoDto): LivroPublicacaoResumoDto => ({ id: versao.id, numero: versao.numero, publicacaoData: versao.publicacaoData, nota: versao.nota });
    const origem = indiceOrigem > 0 ? versoes[indiceOrigem] : null;
    const recuperar = async (versao: LivroVersaoResumoDto): Promise<LivroVersaoRecuperadaDto> => {
      const fotografia = await this.livroVersaoRepository.recuperarVersao({ id: versao.id });
      if (!fotografia || fotografia.livroId !== livro.id || fotografia.situacao !== TipoLivroVersaoSituacaoEnum.PUBLICADA) {
        throw new ResourceNotFoundException("Publicação do livro");
      }
      return fotografia;
    };
    const [atualCompleta, origemCompleta] = await Promise.all([recuperar(versoes[0]), origem ? recuperar(origem) : Promise.resolve(null)]);
    return {
      codigo: livro.codigo,
      titulo: livro.titulo,
      publicacoes: versoes.map(resumo),
      atual: resumo(versoes[0]),
      origem: origem ? resumo(origem) : null,
      notas: versoes.slice(0, indiceOrigem > 0 ? indiceOrigem : 1).reverse().map(resumo),
      mudancas: origemCompleta ? montarMudancasPublicadas(origemCompleta.conteudo, atualCompleta.conteudo) : [],
    };
  }

  async recuperarVersao(
    dto: LivroVersaoPorCodigoRecuperarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<LivroVersaoRecuperadaDto> {
    this.exigirAdmin(usuarioAtivo);
    const livro = await this.recuperarLivroExistente(dto.codigo);
    const versao = await this.livroVersaoRepository.recuperarVersao({ id: dto.id });
    if (!versao || versao.livroId !== livro.id) throw new ResourceNotFoundException("Versão do livro");
    return versao;
  }

  /**
   * Fotografa a cópia de trabalho. Rascunho aceita pendência de conteúdo (devolvida na resposta);
   * versão exige zero pendência; pendência estrutural recusa qualquer publicação.
   */
  async publicar(dto: LivroPublicarDto, usuarioAtivo: JwtPayload): Promise<LivroPublicadoDto> {
    this.exigirAdmin(usuarioAtivo);
    const numero = typeof dto.numero === "string" ? dto.numero.trim() : "";
    if (!numero) throw new BusinessException("Informe o número da versão.");
    if (dto.nota !== undefined && dto.nota !== null && typeof dto.nota !== "string") {
      throw new BusinessException("A nota da publicação precisa ser um texto.");
    }
    if (!Object.values(TipoLivroVersaoSituacaoEnum).includes(dto.situacao)) {
      throw new BusinessException("Situação de publicação inválida.");
    }

    return this.transacaoService.executar(async () => {
      const livro = await this.recuperarLivroExistente(dto.codigo);
      const conteudo = await this.montarFotografia(livro, numero);
      if (conteudo.pecas.length === 0) throw new BusinessException("O livro não tem nenhuma peça para publicar.");

      const pendencias = this.conferirPendencias(conteudo);
      const estruturais = pendencias.filter((pendencia) => pendencia.gravidade === LivroPendenciaGravidadeEnum.ESTRUTURAL);
      const bloqueantes = dto.situacao === TipoLivroVersaoSituacaoEnum.PUBLICADA ? pendencias : estruturais;
      if (bloqueantes.length > 0) {
        throw new BusinessException(
          `O livro tem ${bloqueantes.length} pendência(s) que impedem esta publicação.`,
          bloqueantes.slice(0, 20).map((pendencia) => `${pendencia.caminho.join(" > ")}: ${pendencia.mensagem}`),
        );
      }

      const criada = await this.livroVersaoRepository.criarVersao({
        livroId: livro.id,
        situacao: dto.situacao,
        numero,
        formato: LIVRO_FORMATO_ATUAL,
        conteudo,
        usuarioId: usuarioAtivo.sub,
        nota: dto.nota?.trim() || null,
      });
      const versao: LivroVersaoResumoDto = {
        id: criada.id,
        livroId: criada.livroId,
        situacao: criada.situacao,
        numero: criada.numero,
        formato: criada.formato,
        publicacaoData: criada.publicacaoData,
        usuarioId: criada.usuarioId,
        nota: criada.nota,
      };
      return { versao, pendencias };
    });
  }

  /** Árvore da cópia de trabalho como fotografia: links resolvidos para a âncora atual. */
  private async montarFotografia(livro: LivroResumoDto, numero: string): Promise<LivroVersaoConteudoDto> {
    const [arvore, antigas, ultimaPublicada, ultimoRascunho] = await Promise.all([
      this.regraPecaRepository.listarArvore({ livroId: livro.id }),
      this.regraPecaRepository.listarAncorasAntigas({ livroId: livro.id }),
      this.livroVersaoRepository.recuperarVersaoAtual({ livroId: livro.id, situacao: TipoLivroVersaoSituacaoEnum.PUBLICADA }),
      this.livroVersaoRepository.recuperarVersaoAtual({ livroId: livro.id, situacao: TipoLivroVersaoSituacaoEnum.RASCUNHO }),
    ]);
    const ancoraPorIdentificador = new Map(arvore.map((peca) => [peca.identificador, peca.ancora]));
    const filhasPorPai = new Map<number | null, RegraPecaArvoreItemDto[]>();
    for (const peca of arvore) {
      filhasPorPai.set(peca.pecaPaiId, [...(filhasPorPai.get(peca.pecaPaiId) ?? []), peca]);
    }
    const montar = (pai: number | null): LivroPecaDto[] =>
      (filhasPorPai.get(pai) ?? []).map((peca) => ({
        identificador: peca.identificador,
        ancora: peca.ancora,
        tipo: peca.tipo,
        ordem: peca.ordem,
        dados: resolverLinks(peca.dados, ancoraPorIdentificador) as LivroPecaDto["dados"],
        filhos: montar(peca.id),
      }));

    const ancorasAtuais = new Set(arvore.flatMap((peca) => (peca.ancora ? [peca.ancora] : [])));
    const ancorasAntigas: Record<string, string> = {};
    for (const antiga of antigas) {
      const atual = ancoraPorIdentificador.get(antiga.identificador);
      if (atual && atual !== antiga.ancora && !ancorasAtuais.has(antiga.ancora)) {
        ancorasAntigas[antiga.ancora] = atual;
      }
    }

    const anterior = [ultimaPublicada, ultimoRascunho]
      .filter((versao): versao is LivroVersaoRecuperadaDto => versao !== null)
      .sort((primeira, segunda) => segunda.id - primeira.id)[0];
    return {
      formato: LIVRO_FORMATO_ATUAL,
      codigo: livro.codigo,
      titulo: livro.titulo,
      subtitulo: anterior?.conteudo.subtitulo ?? "",
      numero,
      pecas: montar(null),
      ...(Object.keys(ancorasAntigas).length > 0 ? { ancorasAntigas } : {}),
    };
  }

  /** Pendências da árvore como cópia de trabalho e como fotografia (link sem âncora). */
  private conferirPendencias(conteudo: LivroVersaoConteudoDto): LivroPendenciaDto[] {
    const trabalho = validarArvoreLivro({ pecas: conteudo.pecas, modo: "trabalho" });
    // O mesmo link quebrado é acusado nos dois modos; a chave é a peça mais o texto do link.
    const chaveDoLink = (pendencia: LivroPendenciaDto): string =>
      `${pendencia.identificador}|${/"(.*?)"/.exec(pendencia.mensagem)?.[1] ?? pendencia.mensagem}`;
    const jaAcusados = new Set(
      trabalho.filter((pendencia) => pendencia.codigo === LivroPendenciaCodigoEnum.LINK_INEXISTENTE).map(chaveDoLink),
    );
    const fotografia = validarArvoreLivro({ pecas: conteudo.pecas, modo: "fotografia" }).filter(
      (pendencia) =>
        pendencia.codigo === LivroPendenciaCodigoEnum.LINK_INEXISTENTE && !jaAcusados.has(chaveDoLink(pendencia)),
    );
    return [...trabalho, ...fotografia];
  }

  /** A mais recente entre rascunho e publicada para quem vê rascunho; só a publicada para os demais. */
  private async recuperarFotografiaVisivel(
    livro: LivroResumoDto,
    tipoUsuario: TipoUsuarioEnum | null,
  ): Promise<LivroVersaoRecuperadaDto | null> {
    const publicada = await this.livroVersaoRepository.recuperarVersaoAtual({
      livroId: livro.id,
      situacao: TipoLivroVersaoSituacaoEnum.PUBLICADA,
    });
    if (!PAPEIS_QUE_VEEM_RASCUNHO.includes(tipoUsuario)) return publicada;
    const rascunho = await this.livroVersaoRepository.recuperarVersaoAtual({
      livroId: livro.id,
      situacao: TipoLivroVersaoSituacaoEnum.RASCUNHO,
    });
    if (!rascunho) return publicada;
    return !publicada || rascunho.id > publicada.id ? rascunho : publicada;
  }

  private async recuperarLivroExistente(codigo: string): Promise<LivroResumoDto> {
    const livro = await this.livroRepository.recuperarLivro({ codigo });
    if (!livro) throw new ResourceNotFoundException("Livro");
    return livro;
  }

  private exigirAdmin(usuarioAtivo: JwtPayload): void {
    if (usuarioAtivo.tipo !== TipoUsuarioEnum.ADMIN) throw new UnauthorizedAccessException();
  }
}
