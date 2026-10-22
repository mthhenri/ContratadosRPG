# Cobertura e correção do montador

Escopo autorizado em 22/10/2026: verificar jogador, criatura e NPC; oferecer rolador
avulso do mestre nas cenas; corrigir P-135; executar testes visuais nas telas.
Análogo: RolagemRapida da ficha completa e rolagem avulsa da campanha do mestre.
Reutilizar shell, controles, densidade, hierarquia e estados do montador Completo.

1. Reproduzir P-135 no notebook e identificar ancestral que prende a janela.
2. Corrigir o consumidor local, com regressão; preservar primitivos e motor.
3. Integrar RolagemRapida no NPC com atributos/nível salvos, permissão de gestão e
   registro privado existente. Fórmula livre permanece livre; teste NPC especializado
   continua separado, com Competências aplicadas pelo fluxo canônico.
4. Rolagem avulsa do mestre nas cenas com/sem iniciativa, pública/privada e autoria
   Mestre via endpoint existente. Sem ficha nem combatente inventado.
5. Testes focados, lint/build e organização; aplicação real em 1920×1080,
   1366×768, 960×1080 e 360×800, montador aberto, edição, inválido, resultado,
   fechamento, foco e histórico (incluindo segundo usuário).
6. Consolidar auditoria, impacto e limites; fechar somente com gates completos.

Impacto: NPC é consumido pela página dedicada; barra comum é reutilizada sem
alteração de contrato. Cenas com e sem iniciativa são os dois alvos do novo rolador.
P-135 será corrigido localmente na campanha de jogador, sem alterar PainelFlutuante.
