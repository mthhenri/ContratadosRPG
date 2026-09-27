import { Component, input, output } from '@angular/core';

import type { DocumentoResumoDto } from '@contratados-rpg/shared/dtos/documento';

import { Icone } from '../../../../shared/icone/icone.component';
import { BotaoIcone } from '../../../../shared/ui/botao-icone/botao-icone.component';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto.component';
import { EstadoVazio } from '../../../../shared/ui/estado-vazio/estado-vazio.component';
import { DocumentoCartao } from '../documento-cartao/documento-cartao.component';

/** Pedido de troca de posição de um documento — `-1` sobe, `+1` desce. */
export interface DocumentoMovimento {
  readonly documento: DocumentoResumoDto;
  readonly deslocamento: -1 | 1;
}

/**
 * A lista da biblioteca (m9-04, extraída na m9-05): esqueleto, estado vazio ou os cartões na ordem
 * manual. O que muda por papel entra por input — o mestre liga o chip de estado (`mostrarEstado`) e
 * as setas de ordem (`ordenavel`); a mesa não tem nenhum dos dois. Só apresenta: selecionar e mover
 * saem como eventos para a página.
 */
@Component({
  selector: 'app-lista-documentos',
  imports: [Icone, BotaoIcone, Esqueleto, EstadoVazio, DocumentoCartao],
  templateUrl: './lista-documentos.component.html',
  styleUrl: './lista-documentos.component.scss',
})
export class ListaDocumentos {
  readonly documentos = input.required<readonly DocumentoResumoDto[]>();
  readonly carregando = input(false);
  readonly abertoId = input<number | null>(null);
  /** Chip Revelado/Oculto em cada cartão — só o mestre. */
  readonly mostrarEstado = input(false);
  /** Setas de ordem — só o mestre. */
  readonly ordenavel = input(false);
  /** Setas travadas (escrita em voo, edição aberta). */
  readonly bloqueado = input(false);
  readonly vazioTitulo = input.required<string>();
  readonly vazioApoio = input.required<string>();

  readonly selecionar = output<number>();
  readonly mover = output<DocumentoMovimento>();
}
