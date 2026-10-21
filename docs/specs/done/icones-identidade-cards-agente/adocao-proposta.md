# Identidade — proposta de adoção

Estado: mapas por enum em preparação; aplicação visual aguarda a decisão de alcance.
Decisão já recebida: **sem ícone extra de tipo**. Classe base seguida do ícone e
texto do arquétipo/subclasse; Civil sozinho. Nenhum glifo novo de Experimento.

## Forma

Manter o texto atual, com ícone em tamanho de texto (aproximadamente 16px),
currentColor e tooltip do nome completo em cada ícone. Exemplo: ícone Combatente +
Combatente, separador atual, ícone Lutador + Lutador. Para Bestial: ícone Combatente
+ Combatente e ícone Bestial + Experimento Bestial. Não trocar rótulos ou regras.

Análogos: dossiês de identidade no leitor de Regras; pares ícone/texto das linhas
de recursos do EspectadorFichaCard. Nome longo deve poder quebrar sem novo corte.

## Consumidores

| Tela/uso | Fonte | Proposta |
|---|---|---|
| Card próprio da campanha | modules/ficha/componentes/ficha-campanha-card: faixa patente/classe e chips | Ícone junto de cada classe/arquétipo/subclasse existente |
| Esquadrão do mestre/espectador | modules/campanha/componentes/espectador-ficha-card | Mesma dupla na linha classeTexto; sem mudar permissão |
| Investigação/Resistência do jogador | modules/cena/componentes/esquadrao-cena-jogador | Mesma dupla na linha classeTexto |
| Esquadrão da campanha do jogador/prévia | detalhe-jogador.page.html e campanha-equipe.util.ts | Preservar texto, acrescentar dados de apresentação aos view-models |
| Acervo e cards reutilizados | cartao-ficha-acervo.component e AcervoPage.itens | Linha de classe com dupla; nível/patente preservados |
| Seleção de combatentes | seletor-combatentes.component | Apenas agentes, antes de Nível; criaturas/NPC sem alteração |
| Cards/resumo do encontro | cartao-combatente, resumo-combatente e encontro-leitura.util.ts | Só quando identidade é visível; manter dono e a ocultação atual |
| Ficha completa/leituras reutilizadas | ficha-visualizacao e usos de ficha-campanha-card | Ícones nos rótulos de identidade existentes; flutuante acompanha o componente que já reutiliza |
| Leitor de Regras | regras-identidade-icone.ts: quatro componentes de blocos | Avaliar delegação aos mapas; saída deve permanecer exatamente igual |

Dados continuam vindo dos enums já autorizados, sem interpretar textos para
inferir identidade, sem alterar DTOs/API, sem conceder ícone a dado oculto.
A mudança em componentes reutilizados acompanha as respectivas prévias e janelas.
Nenhum controle/editor será redesenhado ou receberá novo dropdown nesta tarefa.
