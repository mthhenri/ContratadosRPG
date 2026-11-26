import { Component, inject, output, signal } from '@angular/core';
import { finalize } from 'rxjs';

import type { TipoFichaEnum } from '@contratados-rpg/shared/enums';

import { Icone } from '../../../../shared/icone/icone.component';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { Campo } from '../../../../shared/ui/campo/campo.component';
import { Modal } from '../../../../shared/ui/modal/modal.component';
import { lerFichaExportada } from '../../ficha-arquivo-json';
import { FichaArquivoJsonService } from '../../ficha-arquivo-json.service';

/** Ficha criada pela importação — o acervo recarrega e abre a ficha nova. */
export interface FichaJsonImportada {
  readonly id: number;
  readonly tipo: TipoFichaEnum;
}

/**
 * Modal "Importar JSON" do acervo (`ficha-json-exportar-importar-admin`): cola ou carrega o
 * arquivo exportado, confere o envelope (`lerFichaExportada`) e cria a ficha solta no acervo.
 * Erro de envelope fica no próprio modal; recusa do backend (regra violada no `dados`) sai pela
 * notificação padrão do interceptor, e o modal continua aberto com o texto para corrigir.
 */
@Component({
  selector: 'app-importar-ficha-json',
  imports: [Botao, Campo, Icone, Modal],
  templateUrl: './importar-ficha-json.component.html',
  styleUrl: './importar-ficha-json.component.scss',
})
export class ImportarFichaJson {
  private readonly arquivoJson = inject(FichaArquivoJsonService);

  readonly fechou = output<void>();
  readonly importada = output<FichaJsonImportada>();

  protected readonly texto = signal('');
  protected readonly erro = signal('');
  protected readonly importando = signal(false);

  protected aoDigitar(evento: Event): void {
    this.texto.set((evento.target as HTMLTextAreaElement).value);
    this.erro.set('');
  }

  protected aoSelecionarArquivo(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const arquivo = entrada.files?.[0];
    entrada.value = '';
    if (!arquivo) {
      return;
    }
    void arquivo.text().then(
      (conteudo) => {
        this.texto.set(conteudo);
        this.erro.set('');
      },
      () => this.erro.set('Não foi possível ler o arquivo.'),
    );
  }

  protected importar(): void {
    const leitura = lerFichaExportada(this.texto());
    if (!leitura.ok) {
      this.erro.set(leitura.erro);
      return;
    }
    this.importando.set(true);
    this.arquivoJson
      .importar(leitura.ficha)
      .pipe(finalize(() => this.importando.set(false)))
      .subscribe({
        next: (id) => this.importada.emit({ id, tipo: leitura.ficha.tipo }),
      });
  }
}
