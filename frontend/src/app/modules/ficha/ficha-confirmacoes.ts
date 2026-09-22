import { ConfirmacaoService } from '../../shared/ui/confirmacao/confirmacao.service';

/**
 * Confirmação de "Remover da campanha" — a mesma em todo lugar que oferece a ação (detalhe do
 * jogador/mestre, ficha completa, acervo). A ficha só volta ao acervo solto do dono e pode ser
 * vinculada de novo, então a severidade é `padrao` (não destrutiva, sem o vermelho de exclusão).
 */
export function confirmarRemocaoDaCampanha(
  confirmacaoService: ConfirmacaoService,
  fichaNome: string,
): Promise<boolean> {
  return confirmacaoService.confirmar({
    titulo: 'Remover da campanha',
    mensagem: `Remover ${fichaNome} da campanha? A ficha volta ao acervo do dono e pode ser vinculada de novo depois.`,
    entidade: fichaNome,
    severidade: 'padrao',
    rotuloConfirmar: 'Remover da campanha',
  });
}
