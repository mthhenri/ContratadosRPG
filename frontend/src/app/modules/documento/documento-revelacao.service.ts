import { Injectable, inject } from '@angular/core';
import { EMPTY, type Observable, tap } from 'rxjs';

import type {
  DocumentoOcultadoDto,
  DocumentoRecuperadoDto,
  DocumentoReveladoDto,
} from '@contratados-rpg/shared/dtos/documento';
import { TipoDocumentoEnum } from '@contratados-rpg/shared/enums';

import { NotificacaoService } from '../../shared/ui/notificacao/notificacao.service';
import { DocumentoService } from './documento.service';

/** Um `IMAGEM` sem arquivo não pode ser revelado (o backend recusa): o botão nasce travado. */
export function podeRevelarDocumento(documento: DocumentoRecuperadoDto | null): boolean {
  return !!documento && (documento.tipo === TipoDocumentoEnum.TEXTO || !!documento.imagemUrl);
}

/**
 * Revelar/Ocultar um documento para a mesa (m9-04, extraído na m9-11) — a regra única usada pela
 * página do mestre (`BibliotecaMestre`) e pelo painel flutuante (`BibliotecaLeituraStore` na forma
 * mestre): a trava {@link podeRevelarDocumento}, a chamada certa e o toast. Aplicar a versão nova
 * no documento aberto e na lista é de quem chama, que é o dono desse estado.
 */
@Injectable({ providedIn: 'root' })
export class DocumentoRevelacaoService {
  private readonly documentoService = inject(DocumentoService);
  private readonly notificacaoService = inject(NotificacaoService);

  /** Oculta o revelado, revela o oculto; um `IMAGEM` sem arquivo não sai do lugar (`EMPTY`). */
  alternar(
    documento: DocumentoRecuperadoDto,
  ): Observable<DocumentoReveladoDto | DocumentoOcultadoDto> {
    if (!documento.revelado && !podeRevelarDocumento(documento)) {
      return EMPTY;
    }
    const chamada: Observable<DocumentoReveladoDto | DocumentoOcultadoDto> = documento.revelado
      ? this.documentoService.ocultar(documento.id)
      : this.documentoService.revelar(documento.id);
    return chamada.pipe(
      tap((resposta) =>
        this.notificacaoService.notificar({
          severidade: 'sucesso',
          resumo: resposta.revelado ? 'Revelado para a mesa' : 'Oculto',
          detalhe: resposta.revelado
            ? `${documento.titulo} já aparece para os jogadores.`
            : `${documento.titulo} saiu da vista dos jogadores.`,
        }),
      ),
    );
  }
}
