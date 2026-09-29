import type { ConfiguracaoArmazenamento } from '../../config/config.service';
import { ArmazenamentoLocalProvedor } from './armazenamento-local.provedor';
import type { ArmazenamentoProvedor } from './armazenamento-provedor.interface';
import { ArmazenamentoR2Provedor } from './armazenamento-r2.provedor';

/**
 * Instancia o provedor escolhido pela configuração (`ARMAZENAMENTO_PROVEDOR`): só o selecionado é
 * construído — em `local`, o R2 (e suas credenciais) nunca é tocado. Usada pelo `ArmazenamentoModule`
 * e pelo script de publicação de patchnotes (`tools/patchnotes/publicar.ts`), para os dois falarem
 * com o mesmo destino.
 */
export function criarArmazenamentoProvedor(
  configuracao: ConfiguracaoArmazenamento,
): ArmazenamentoProvedor {
  return configuracao.provedor === 'r2'
    ? new ArmazenamentoR2Provedor(configuracao)
    : new ArmazenamentoLocalProvedor();
}
