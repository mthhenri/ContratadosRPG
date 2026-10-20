/** Leitura de bytes no recorte atual; contextos de prévia são reautorizados no servidor. */
export interface FichaImagemRecuperarDto {
  readonly caminho: string;
  readonly campanhaId?: number;
  readonly usuarioAlvoId?: number;
  readonly espectador?: boolean;
}
import type { TipoCampanhaMembroPapelEnum } from '../../enums';
import type { FichaRecuperadaDto } from './ficha-operacao.dtos';


/** Snapshot factual único, sem decidir autorização no SQL. */
export interface FichaImagemContextoRecuperarDto {
  readonly caminho: string;
  readonly usuarioId: number | null;
  readonly usuarioAlvoId: number | null;
}

export interface FichaImagemContextoDto {
  readonly ficha: FichaRecuperadaDto;
  readonly papelUsuario: TipoCampanhaMembroPapelEnum | null;
  readonly papelAlvo: TipoCampanhaMembroPapelEnum | null;
  readonly acessoUsuario: boolean;
  readonly acessoAlvo: boolean;
}

/** Fatos consumidos pelo árbitro único de leitura; concessão ausente pede consulta posterior. */
export interface FichaVisibilidadeContextoDto {
  readonly ficha: FichaRecuperadaDto;
  readonly usuarioId: number;
  readonly papel: TipoCampanhaMembroPapelEnum | null;
  readonly acessoConcedido?: boolean;
}
