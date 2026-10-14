/** Hash e nome são os únicos dados do pedido; segredo nunca sai do dispositivo. */
export interface DispositivoVinculoCriarDto { readonly segredoHash: string; readonly nome: string; }
export interface DispositivoVinculoCriadoDto { readonly identificador: string; readonly codigo: string; readonly expiraEm: string; }
export interface DispositivoVinculoRecuperadoDto { readonly identificador: string; readonly nome: string; readonly codigo: string; readonly expiraEm: string; }
export interface DispositivoVinculoConfirmarDto { readonly identificador: string; readonly codigo: string; }
export interface DispositivoResumoDto { readonly identificador: string; readonly nome: string; readonly ultimoUso: string; }
export interface DispositivoEstadoDto { readonly vinculado: boolean; readonly expirado: boolean; readonly usuarioId: number | null; readonly login: string | null; }
export interface TranscricaoIntencaoCriarDto { readonly sessaoId: number; }
export interface TranscricaoIntencaoCriadaDto { readonly identificador: string; readonly expiraEm: string; }
export interface TranscricaoIntencaoEstadoDto { readonly confirmada: boolean; readonly expirada: boolean; }
export interface DispositivoContextoDto { readonly sessaoId: number; readonly campanhaId: number; readonly titulo: string; }

/** Contratos internos: nenhum deles expõe credencial em resposta pública. */
export interface DispositivoVinculoInternoCriarDto { readonly identificador: string; readonly codigo: string; readonly nome: string; readonly segredoHash: string; }
export interface DispositivoIdentificadorRecuperarDto { readonly identificador: string; }
export interface DispositivoVinculoInternoConfirmarDto { readonly identificador: string; readonly codigo: string; readonly usuarioId: number; readonly tokenVersao: number; }
export interface DispositivoCredencialInternoRecuperarDto { readonly segredoHash: string; }
export interface DispositivoUsuarioInternoListarDto { readonly usuarioId: number; }
export interface DispositivoInternoRevogarDto { readonly identificador: string; readonly usuarioId: number; }
export interface TranscricaoIntencaoInternoCriarDto { readonly identificador: string; readonly sessaoId: number; readonly usuarioId: number; }
export interface TranscricaoIntencaoInternoConsumirDto { readonly identificador: string; readonly usuarioId: number; readonly dispositivoId: number; readonly tokenVersao: number; }
export interface TranscricaoIntencaoInternoRecuperarDto { readonly identificador: string; readonly usuarioId: number; }
export interface TranscricaoIntencaoConsumidaDto { readonly sessaoId: number; }
