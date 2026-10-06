import { Inject, Injectable } from '@nestjs/common';
import type {
  PatchnoteCacheReiniciadoDto,
  PatchnoteRecuperadoDto,
  PatchnoteRecuperarDto,
  PatchnoteResumoDto,
} from '@contratados-rpg/shared/dtos/patchnote';
import { ehVersaoPatchnoteValida } from '@contratados-rpg/shared/validators';
import {
  ARMAZENAMENTO_PROVEDOR,
  ArmazenamentoPastaEnum,
  type ArmazenamentoProvedor,
} from '../../core/armazenamento';
import { ResourceNotFoundException } from '../../core/exceptions';
import {
  interpretarIndicePatchnotes,
  interpretarPatchnote,
  ordenarPatchnotes,
} from './patchnote-formato.util';

/** Tempo de vida de cada entrada do cache: as notas mudam a cada versão, não a cada visita. */
export const PATCHNOTE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const NOME_INDICE = 'indice.json';

interface EntradaCache<T> {
  readonly expiraEm: number;
  readonly valor: Promise<T>;
}

/**
 * Patchnotes públicos (pn-03) — lê do armazenamento (R2 em produção), que é a fonte de verdade
 * única: não há tabela nem repository. Cada leitura (o índice e cada nota) fica em memória por 24 h
 * (`PATCHNOTE_CACHE_TTL_MS`); o deploy sobe processo novo e esvazia o cache, então uma nota
 * publicada junto do deploy aparece na hora; uma correção sem deploy espera o TTL ou o `ADMIN`
 * esvazia o cache por `reiniciarCache()` (pn-06) — só nesta instância do processo.
 *
 * O cache guarda a **promessa** da leitura: requisições simultâneas compartilham um único acesso ao
 * R2, e uma leitura que falha (ou uma versão inexistente) sai do cache na hora — nunca se cacheia
 * o erro. A versão é sempre validada (`X.Y.Z`) e conferida no índice antes de virar nome de arquivo.
 */
@Injectable()
export class PatchnoteService {
  private readonly cache = new Map<string, EntradaCache<unknown>>();

  constructor(
    @Inject(ARMAZENAMENTO_PROVEDOR) private readonly armazenamentoProvedor: ArmazenamentoProvedor,
  ) {}

  /** Índice de versões publicadas, da mais nova para a mais antiga. */
  async listarPatchnotes(): Promise<PatchnoteResumoDto[]> {
    return this.memorizar('indice', async () => {
      const texto = await this.armazenamentoProvedor.lerTexto({
        pasta: ArmazenamentoPastaEnum.PATCHNOTES,
        nomeArquivo: NOME_INDICE,
      });
      return ordenarPatchnotes(interpretarIndicePatchnotes(texto));
    });
  }

  /** Nota completa de uma versão publicada. */
  async recuperarPatchnote(dto: PatchnoteRecuperarDto): Promise<PatchnoteRecuperadoDto> {
    if (!ehVersaoPatchnoteValida(dto.versao)) {
      throw new ResourceNotFoundException('Patchnote');
    }
    const indice = await this.listarPatchnotes();
    if (!indice.some((item) => item.versao === dto.versao)) {
      throw new ResourceNotFoundException('Patchnote');
    }

    return this.memorizar(`nota:${dto.versao}`, async () => {
      const texto = await this.armazenamentoProvedor.lerTexto({
        pasta: ArmazenamentoPastaEnum.PATCHNOTES,
        nomeArquivo: `${dto.versao}.md`,
      });
      if (texto === null) {
        throw new ResourceNotFoundException('Patchnote');
      }
      const leitura = interpretarPatchnote(texto);
      if ('erros' in leitura || leitura.patchnote.versao !== dto.versao) {
        throw new Error(`Patchnote ${dto.versao} malformado no armazenamento.`);
      }
      return leitura.patchnote;
    });
  }

  /**
   * Esvazia o cache inteiro (índice e notas) — a próxima leitura volta ao armazenamento. Uma leitura
   * em voo não é afetada: quem já a aguarda recebe o resultado, mas ela não volta ao cache.
   */
  reiniciarCache(): PatchnoteCacheReiniciadoDto {
    const entradasRemovidas = this.cache.size;
    this.cache.clear();
    return { entradasRemovidas };
  }

  private memorizar<T>(chave: string, carregar: () => Promise<T>): Promise<T> {
    const agora = Date.now();
    const existente = this.cache.get(chave) as EntradaCache<T> | undefined;
    if (existente && existente.expiraEm > agora) {
      return existente.valor;
    }
    const valor = carregar();
    const entrada: EntradaCache<T> = { expiraEm: agora + PATCHNOTE_CACHE_TTL_MS, valor };
    this.cache.set(chave, entrada);
    valor.catch(() => {
      if (this.cache.get(chave) === entrada) {
        this.cache.delete(chave);
      }
    });
    return valor;
  }
}
