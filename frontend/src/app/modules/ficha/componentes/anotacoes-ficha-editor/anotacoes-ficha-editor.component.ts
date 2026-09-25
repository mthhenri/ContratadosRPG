import { Component, input, model, output, signal } from '@angular/core';

import { Botao } from '../../../../shared/ui/botao/botao.component';
import { EditorMarkdown } from '../../../../shared/ui/editor-markdown/editor-markdown.component';
import { EstadoVazio } from '../../../../shared/ui/estado-vazio/estado-vazio.component';

/**
 * Anotações livres da ficha (m3-32): leitura em markdown e edição com Salvar/Cancelar. Um só bloco
 * para o painel flutuante de `FichaVisualizacao`, o de `CriaturaVisualizacao` e a janela externa
 * (`AnotacoesJanela`). Quem hospeda persiste o que `salvar` emitir.
 *
 * `editando` é `model` porque o hospedeiro precisa saber quando há rascunho aberto (o painel
 * esconde o "Abrir em janela" nesse estado) e a criatura controla a edição pela chave única dela.
 */
@Component({
  selector: 'app-anotacoes-ficha-editor',
  imports: [Botao, EditorMarkdown, EstadoVazio],
  templateUrl: './anotacoes-ficha-editor.component.html',
  styleUrl: './anotacoes-ficha-editor.component.scss',
})
export class AnotacoesFichaEditor {
  readonly valor = input('');
  readonly editando = model(false);
  /** Texto confirmado — só emitido quando difere do `valor` atual. */
  readonly salvar = output<string>();

  protected readonly rascunho = signal('');

  protected editar(): void {
    this.rascunho.set(this.valor());
    this.editando.set(true);
  }

  protected cancelar(): void {
    this.editando.set(false);
  }

  protected confirmar(): void {
    if (!this.editando()) {
      return;
    }
    this.editando.set(false);
    const texto = this.rascunho();
    if (texto !== this.valor()) {
      this.salvar.emit(texto);
    }
  }
}
