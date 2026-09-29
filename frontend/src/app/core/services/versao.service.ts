import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { VERSAO_SISTEMA } from '@contratados-rpg/shared';

const CHAVE_PERSISTENCIA = 'contratados-rpg.versao-vista';

/**
 * Versão do sistema e o aviso de "há novidades" (pn-01). A versão vem de `VERSAO_SISTEMA`
 * (`shared/`, gerada do `package.json` da raiz — fonte única). Quem abriu `/patchnotes` numa
 * versão a registra como vista (`marcarVista`, `localStorage` best-effort, como o `TemaService`);
 * enquanto a última vista for diferente da atual, `versaoNova` acende o ponto da topbar. Sem
 * storage utilizável, o ponto some só até a próxima recarga — nunca quebra a tela.
 */
@Injectable({ providedIn: 'root' })
export class VersaoService {
  private readonly documento = inject(DOCUMENT);

  /** Versão atual do sistema, no formato `X.Y.Z`. */
  readonly versao = VERSAO_SISTEMA;

  private readonly versaoVista = signal<string | null>(this.restaurar());

  /** Se existe uma versão que este navegador ainda não viu em `/patchnotes`. */
  readonly versaoNova = computed(() => this.versaoVista() !== this.versao);

  /** Registra a versão atual como vista neste navegador. */
  marcarVista(): void {
    this.versaoVista.set(this.versao);
    try {
      this.documento.defaultView?.localStorage.setItem(CHAVE_PERSISTENCIA, this.versao);
    } catch {
      /* persistência é best-effort */
    }
  }

  private restaurar(): string | null {
    try {
      return this.documento.defaultView?.localStorage.getItem(CHAVE_PERSISTENCIA) ?? null;
    } catch {
      return null;
    }
  }
}
