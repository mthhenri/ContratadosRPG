import { Injectable, signal } from '@angular/core';

/** Recorte de campanha exibido no seletor da topbar — só o que a apresentação precisa. */
export interface CampanhaContexto {
  readonly id: number;
  readonly nome: string;
  readonly codigoConvite: string;
}

/**
 * Estado de apresentação da "campanha ativa" (m2-09) — alimenta o seletor da topbar
 * (`shared/layout`) enquanto o usuário está dentro de `/painel/:id`. `CampanhaDetalhe` define o
 * contexto ao carregar e limpa ao desmontar; fora dessa rota o seletor simplesmente não aparece.
 * Puramente apresentação: nenhuma regra de permissão mora aqui, a autoridade continua no
 * backend (§14).
 */
@Injectable({ providedIn: 'root' })
export class CampanhaContextoService {
  private readonly campanhaAtualSinal = signal<CampanhaContexto | null>(null);

  readonly campanhaAtual = this.campanhaAtualSinal.asReadonly();

  definir(campanha: CampanhaContexto): void {
    this.campanhaAtualSinal.set(campanha);
  }

  limpar(): void {
    this.campanhaAtualSinal.set(null);
  }
}
