import type { FichaJogadorDadosDto } from '@contratados-rpg/shared/dtos/ficha';

/**
 * Campos de `FichaJogadorDadosDto` visíveis só para **dono** ou **mestre** — nunca para um
 * visualizador só-acesso (§14). Introduzido pela `historia` (m3-50); `anotacoes` entra na m3-51,
 * mesmo mecanismo (item 4 — "gate de visualização, igual à História").
 */
export const CAMPOS_PRIVADOS_FICHA: readonly (keyof FichaJogadorDadosDto)[] = ['historia', 'anotacoes'];

/**
 * Remove os `CAMPOS_PRIVADOS_FICHA` de um `dados` de ficha. Reusado por
 * `FichaService.recuperarFicha` (omite só para quem é só-visualizador) e por
 * `CampanhaGateway.emitirFichaAlterada` (o broadcast de `ficha:alterada` é um único `emit()` para
 * toda a sala `ficha:<id>`, sem distinção por socket — por isso omite sempre, mesmo para
 * dono/mestre, que recuperam o valor atualizado via REST).
 */
export function omitirCamposPrivados(dados: FichaJogadorDadosDto): FichaJogadorDadosDto {
  const dadosFiltrados = { ...dados };
  for (const campo of CAMPOS_PRIVADOS_FICHA) {
    delete dadosFiltrados[campo];
  }
  return dadosFiltrados;
}

/**
 * Devolve `recebidos` com os `CAMPOS_PRIVADOS_FICHA` que **faltam** nele copiados de `armazenados`.
 * O broadcast de `ficha:alterada` chega sem esses campos a toda a sala, então uma aba que absorve o
 * evento e depois salva manda o documento sem eles — gravar assim apagava anotações e história
 * escritas em outra aba ou pelo mestre (P-080). Chave ausente é "não enviei"; string vazia continua
 * sendo "apaguei" e é gravada. Vale para jogador e criatura (a criatura também tem `anotacoes`).
 * Não muta os documentos recebidos.
 */
export function preservarCamposPrivados<T extends object>(armazenados: object, recebidos: T): T {
  const preservados = { ...recebidos } as Record<string, unknown>;
  for (const campo of CAMPOS_PRIVADOS_FICHA) {
    if (!(campo in preservados) && campo in armazenados) {
      preservados[campo] = (armazenados as Record<string, unknown>)[campo];
    }
  }
  return preservados as T;
}
