// Setup global da suíte (`setupFiles` de `angular.json` → `architect.test.options`), executado
// antes de cada arquivo de teste, depois do TestBed já inicializado.
//
// O ambiente de teste (jsdom) reflete o atributo `open` de `<dialog>` (é atributo booleano comum),
// mas não implementa `HTMLDialogElement.showModal()`/`close()` — nenhum navegador real tem essa
// lacuna. Sem isso, qualquer `app-modal` (`shared/ui/modal`, ui-02) quebraria ao montar com
// `[aberto]="true"`, porque o primitivo chama a API real — sem guard defensivo, que só faria
// sentido para servir um ambiente que não existe em produção. Polyfill mínimo, só para teste.
if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement): void {
    this.setAttribute('open', '');
  };
}

if (typeof HTMLDialogElement.prototype.close !== 'function') {
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement): void {
    if (!this.open) return;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}
