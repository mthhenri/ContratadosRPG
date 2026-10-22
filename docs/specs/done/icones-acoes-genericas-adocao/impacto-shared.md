# Impacto — catálogo e controles compartilhados

Análogo: controles atuais, mesma caixa e densidade; geometrias da prancha de ações aprovada. 14 nomes novos, nenhum glifo anterior redesenhado. `npm run impacto -- --icone <nome>` rodado para todos antes da edição; novos nomes não tinham consumidores (menu-acoes tinha falso positivo de seletor). Pontos cegos: ternários de janela, botões projetados, consumidores indiretos de modal/gaveta/painel e X de remoção.

| Consumidor direto | Classe | Decisão |
|---|---|---|
| `frontend/src/app/shared/icone/icone.component` | pedido | 14 nomes e geometrias votadas; testes de assinatura, contorno e cópia do desenho |
| `frontend/src/app/shared/ui/modal/modal.component` | pedido | fechar-painel no fechamento de todos os modais |
| `frontend/src/app/shared/ui/gaveta/gaveta.component` | pedido | fechar-painel nas gavetas de Sumário e O que mudou |
| `frontend/src/app/shared/ui/painel-flutuante/painel-flutuante.component` | pedido | janela-minimizar e fechar-painel em todos os painéis |
| `frontend/src/app/shared/ui/notificacao/notificacao.component` | pedido | fechar-painel; severidades preservadas; teste distingue identidade e fechamento |
| `frontend/src/app/shared/bandeja-dados/bandeja-dados.component` | pedido | fechar-painel no resultado |
| `frontend/src/app/shared/historico-rolagens-sidebar/historico-rolagens-sidebar.component` | pedido | fechar-painel; BotaoIcone compacto, mesma receita 26px e 44px no mobile |
| `frontend/src/app/shared/inventario-esquadrao-sidebar/inventario-esquadrao-sidebar.component` | pedido | fechar-painel no inventário |
| `frontend/src/app/shared/montador-rolagem/montador-rolagem.component` | pedido | janela-maximizar/restaurar e fechar-painel no resultado |
| `frontend/src/app/shared/configuracoes-tema/configuracoes-tema.component` | pedido | excluir na remoção real da cor salva |
| `frontend/src/app/shared/ui/ficha-termo/ficha-termo.component` | pedido | excluir no termo removível do montador |
| `frontend/src/app/modules/regras/regras-leitor.component` | pedido | rolar-inicio em Voltar ao topo; retirar rotação do chevron antigo |

## Consumidores indiretos avaliados

Todos os consumidores abaixo são **acompanha**, explicitamente cobertos pela adoção nos primitivos Modal/Gaveta/Notificação/PainelFlutuante e remoção de termo do inventário aprovado. Só o conteúdo gráfico do fechamento/minimização/remoção muda; não muda contrato, regra nem comportamento. Imports e seletores repetidos do mesmo arquivo são consolidados. Inspeção estática não substitui o gate visual de cada superfície.

### modal

| Consumidor | Classe / decisão |
|---|---|
| `frontend/src/app/modules/campanha/componentes/campanha-ficha-acesso/campanha-ficha-acesso.component.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/campanha/componentes/inventario-esquadrao/inventario-esquadrao.component.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/campanha/paginas/criar/criar.page.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/campanha/paginas/detalhe-jogador/detalhe-jogador.page.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/campanha/paginas/detalhe-mestre/detalhe-mestre.page.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/campanha/paginas/entrar/entrar.page.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/cena/componentes/cena-criar-dialog/cena-criar-dialog.component.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/cena/componentes/documentos-cena-espectador/documentos-cena-espectador.component.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/cena/paginas/painel-sem-iniciativa-jogador/painel-sem-iniciativa-jogador.page.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/cena/paginas/painel-sem-iniciativa-mestre/painel-sem-iniciativa-mestre.page.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/cena/paginas/previa-investigacao-jogador/previa-investigacao-jogador.page.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/documento/componentes/documento-criar-dialog/documento-criar-dialog.component.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/documento/componentes/pasta-destino-dialog/pasta-destino-dialog.component.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/documento/componentes/pasta-nome-dialog/pasta-nome-dialog.component.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/ficha/componentes/ficha-campanha-card/ficha-campanha-card.component.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/ficha/componentes/ficha-inventario/ficha-inventario.component.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/ficha/componentes/ficha-rolagens/ficha-rolagens.component.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/ficha/componentes/ficha-sanidade/ficha-sanidade.component.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/ficha/componentes/guia-formula/guia-formula.component.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/ficha/componentes/npc-visualizacao/npc-habilidades-lista.component.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/ficha/paginas/acervo/acervo.page.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/ficha/paginas/criar-criatura/criar-criatura.page.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/ficha/paginas/criar-npc/criar-npc.page.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/ficha/paginas/visualizar/visualizar.page.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/ficha/paginas/visualizar-criatura/visualizar-criatura.page.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/ficha/paginas/visualizar-npc/visualizar-npc.page.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/pagina-caderno/caderno-vinculo-biblioteca.component.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/regras/oficina/oficina-publicar.component.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/simulacao/componentes/ajuda-simulacao/ajuda-simulacao.component.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/shared/configuracoes-tema/configuracoes-tema.component.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/shared/receber-dano/receber-dano-dialog.component.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/shared/ui/confirmacao/confirmacao.component.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/shared/ui/paleta/paleta.component.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/campanha/componentes/campanha-ficha-acesso/campanha-ficha-acesso.component.html` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/campanha/paginas/criar/criar.page.html` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/campanha/paginas/detalhe-jogador/detalhe-jogador.page.html` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/campanha/paginas/detalhe-mestre/detalhe-mestre.page.html` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/campanha/paginas/entrar/entrar.page.html` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/cena/componentes/cena-criar-dialog/cena-criar-dialog.component.html` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/cena/paginas/painel-sem-iniciativa-mestre/painel-sem-iniciativa-mestre.page.html` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/documento/componentes/documento-criar-dialog/documento-criar-dialog.component.html` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/documento/componentes/pasta-destino-dialog/pasta-destino-dialog.component.html` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/documento/componentes/pasta-nome-dialog/pasta-nome-dialog.component.html` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/ficha/paginas/acervo/acervo.page.html` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/ficha/paginas/visualizar/visualizar.page.html` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/ficha/paginas/visualizar-criatura/visualizar-criatura.page.html` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/ficha/paginas/visualizar-npc/visualizar-npc.page.html` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/regras/oficina/oficina-publicar.component.html` | acompanha / aplicar, mesmo sentido do primitivo |

### gaveta

| Consumidor | Classe / decisão |
|---|---|
| `frontend/src/app/modules/regras/regras-leitor.component.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/regras/regras-leitor.component.html` | acompanha / aplicar, mesmo sentido do primitivo |

### painel

| Consumidor | Classe / decisão |
|---|---|
| `frontend/src/app/modules/documento/componentes/biblioteca-flutuante/biblioteca-flutuante.component.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/ficha/componentes/criatura-visualizacao/criatura-visualizacao.component.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/ficha/componentes/ficha-flutuante/ficha-flutuante.component.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/ficha/paginas/visualizar-npc/visualizar-npc.page.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/pagina-caderno/caderno-flutuante.component.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/modules/regras/regras-flutuante.component.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/shared/calculadora-flutuante/calculadora-flutuante.component.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/shared/janela-montador/janela-montador.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/shared/montador-rolagem/montador-rolagem.component.ts` | acompanha / aplicar, mesmo sentido do primitivo |

### notificacao

| Consumidor | Classe / decisão |
|---|---|
| `frontend/src/app/shared/layout/layout.component.ts` | acompanha / aplicar, mesmo sentido do primitivo |
| `frontend/src/app/shared/layout/layout.component.html` | acompanha / aplicar, mesmo sentido do primitivo |

### ficha-termo

| Consumidor | Classe / decisão |
|---|---|
| `frontend/src/app/shared/montador-rolagem/montador-editor-pecas.component.ts` | acompanha / aplicar, mesmo sentido do primitivo |

## Preservados

`apagar-termo` e `rolar-fim` ficam disponíveis no catálogo: os controles do inventário histórico já não existem. A calculadora apaga um caractere, não um termo; as setas de busca navegam ocorrências. Não inventar novas ações. Operadores, marcas editoriais, limpar busca/filtro, Parar execução e ícones de domínio preservados.

Componentes extensos recebem apenas conteúdo gráfico/import standalone, sem nova responsabilidade. A única mudança de primitivo consumido é o fechamento do Histórico, cujo app-botao anterior dependia de receita manual: BotaoIcone já era importado e mantém caixa existente.
