import type { FichaJogadorDadosDto } from '@contratados-rpg/shared/dtos/ficha';

/**
 * Campos de `FichaJogadorDadosDto` visíveis só para **dono** ou **mestre** — nunca para um
 * visualizador só-acesso (§14). Introduzido pela `historia` (m3-50); `anotacoes` entra depois
 * (m3-51), mesmo mecanismo.
 */
export const CAMPOS_PRIVADOS_FICHA: readonly (keyof FichaJogadorDadosDto)[] = ['historia'];

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
