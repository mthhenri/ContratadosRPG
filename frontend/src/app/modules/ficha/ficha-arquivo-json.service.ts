import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { type Observable, map, tap } from 'rxjs';

import { TipoFichaEnum } from '@contratados-rpg/shared/enums';

import { NotificacaoService } from '../../shared/ui/notificacao/notificacao.service';
import { FichaService } from './ficha.service';
import {
  type FichaExportada,
  montarCriaturaExportada,
  montarNpcExportado,
  nomeArquivoFichaExportada,
  serializarFichaExportada,
} from './ficha-arquivo-json';

/** Tipos de ficha que viajam como JSON nesta versão (Agente fica fora — ver a spec). */
export type TipoFichaArquivoJson = TipoFichaEnum.CRIATURA | TipoFichaEnum.NPC;

/** Como a ficha exportada sai: área de transferência ou arquivo baixado. */
export type ModoExportacaoJson = 'copiar' | 'baixar';

export function ehTipoFichaArquivoJson(tipo: TipoFichaEnum): tipo is TipoFichaArquivoJson {
  return tipo === TipoFichaEnum.CRIATURA || tipo === TipoFichaEnum.NPC;
}

/**
 * Efeitos do arquivo JSON de ficha (`ficha-json-exportar-importar-admin`): ler a ficha pela rota de
 * sempre, copiar/baixar o texto e criar a ficha importada solta no acervo pela rota administrativa
 * `POST /ficha/importar`, que confere o administrador e valida `dados` contra `shared/regras`.
 */
@Injectable({ providedIn: 'root' })
export class FichaArquivoJsonService {
  private readonly fichaService = inject(FichaService);
  private readonly documento = inject(DOCUMENT);
  private readonly notificacao = inject(NotificacaoService);

  /**
   * Exporta a ficha (acervo e cabeçalho da ficha usam esta mesma ação): lê do servidor, copia ou
   * baixa, e avisa o resultado da cópia — o navegador pode recusar a área de transferência.
   */
  exportar(id: number, tipo: TipoFichaArquivoJson, modo: ModoExportacaoJson): Observable<void> {
    return this.recuperar(id, tipo).pipe(
      tap((ficha) => {
        if (modo === 'baixar') {
          this.baixar(ficha);
          return;
        }
        this.copiar(ficha).then(
          () =>
            this.notificacao.notificar({
              severidade: 'sucesso',
              resumo: 'JSON copiado',
              detalhe: `"${ficha.nome}" está na área de transferência.`,
            }),
          () =>
            this.notificacao.notificar({
              severidade: 'erro',
              resumo: 'Não foi possível copiar',
              detalhe: 'O navegador recusou a área de transferência. Use "Baixar JSON".',
            }),
        );
      }),
      map(() => undefined),
    );
  }

  /** Recupera a ficha e monta o envelope — sempre do estado atual no servidor. */
  recuperar(id: number, tipo: TipoFichaArquivoJson): Observable<FichaExportada> {
    return tipo === TipoFichaEnum.CRIATURA
      ? this.fichaService
          .recuperarFichaCriatura(id)
          .pipe(map((ficha) => montarCriaturaExportada(ficha)))
      : this.fichaService.recuperarFichaNpc(id).pipe(map((ficha) => montarNpcExportado(ficha)));
  }

  copiar(ficha: FichaExportada): Promise<void> {
    return navigator.clipboard.writeText(serializarFichaExportada(ficha));
  }

  baixar(ficha: FichaExportada): void {
    const arquivo = new Blob([serializarFichaExportada(ficha)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(arquivo);
    const link = this.documento.createElement('a');
    link.href = url;
    link.download = nomeArquivoFichaExportada(ficha);
    try {
      this.documento.body.append(link);
      link.click();
    } finally {
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  /**
   * Cria a ficha importada no acervo de quem importa pela rota administrativa, que valida como
   * edição (uma criatura ajustada depois de criada volta igual); devolve o `id` novo.
   */
  importar(ficha: FichaExportada): Observable<number> {
    return this.fichaService.importarFicha({ ficha }).pipe(map((importada) => importada.id));
  }
}
