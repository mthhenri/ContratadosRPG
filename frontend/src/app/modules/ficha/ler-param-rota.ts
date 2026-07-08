import { ActivatedRoute } from '@angular/router';

/**
 * Lê um parâmetro de rota subindo pela cadeia de rotas ativas — necessário porque as telas de
 * ficha são carregadas via `loadChildren` sob `/painel/:campanhaId/ficha`, então o `campanhaId`
 * mora na rota-pai (a estratégia de herança padrão do router, `emptyOnly`, não o propaga para
 * rotas-filhas de caminho não-vazio). Devolve o primeiro valor encontrado ou `null`.
 */
export function lerParamRota(rota: ActivatedRoute, chave: string): string | null {
  let atual: ActivatedRoute | null = rota;
  while (atual) {
    const valor = atual.snapshot.paramMap.get(chave);
    if (valor !== null) {
      return valor;
    }
    atual = atual.parent;
  }
  return null;
}
