import type {
  BuscaCampanhaResultadoDto,
  PaginaCadernoDto,
} from '@contratados-rpg/shared/dtos/pagina-caderno';
import type { PaginatedResult } from '@contratados-rpg/shared/interfaces';

export const CADERNO_GEOMETRIA_STORAGE_KEY = 'contratados-rpg:caderno-geometria:v1';
export const CADERNO_AUTOSAVE_DELAY = 800;
export const CADERNO_LARGURA_MINIMA = 720;
export const CADERNO_ALTURA_MINIMA = 520;

export type EstadoSalvamentoCaderno =
  | 'INATIVO'
  | 'SALVANDO'
  | 'SALVO'
  | 'FALHA'
  | 'CONFLITO';

export type VistaMobileCaderno = 'LISTA' | 'CONTEUDO';

export interface CadernoRascunho {
  readonly titulo: string;
  readonly conteudoMarkdown: string;
}

export interface CadernoViewport {
  readonly largura: number;
  readonly altura: number;
}

export interface CadernoGeometria {
  readonly x: number;
  readonly y: number;
  readonly largura: number;
  readonly altura: number;
}

export interface CadernoFlutuanteEstado {
  readonly aberto: boolean;
  readonly minimizado: boolean;
  readonly carregando: boolean;
  readonly vistaMobile: VistaMobileCaderno;
  readonly geometria: CadernoGeometria;
}

export const RASCUNHO_CADERNO_VAZIO: CadernoRascunho = {
  titulo: '',
  conteudoMarkdown: '',
};

export const RESULTADOS_BUSCA_CADERNO_VAZIOS: PaginatedResult<BuscaCampanhaResultadoDto> = {
  itens: [],
  totalItens: 0,
  paginaAtual: 1,
  totalPaginas: 0,
};

export type PaginaCadernoEditavel = PaginaCadernoDto | null;

