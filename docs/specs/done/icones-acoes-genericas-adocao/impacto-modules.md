# Impacto — módulos fora de Ficha

Recorte autorizado da `icones-acoes-genericas-adocao`, executado sem mudar comportamento.
Análogo aprovado: os próprios controles existentes de cada superfície, com `app-icone` como
os controles vizinhos. Preservados shell, densidade, hierarquia, classes BEM de dimensão,
inputs dos primitivos, estados, tooltips, nomes acessíveis, eventos e atalhos.

## Levantamento anterior às edições

`npm run impacto -- --icone <nome>` executado para `menu-acoes`, `alca-arrastar`,
`janela-maximizar`, `janela-restaurar`, `mover-acima`, `mover-abaixo`, `rolar-inicio`,
`rolar-fim`, `fechar-painel`, `cancelar-edicao`, `restaurar-padrao` e `excluir`.
Os novos nomes tinham zero usos; `menu-acoes` encontrou só um literal de seletor (falso positivo).
`excluir` tinha 48 consumidores e dois testes: a geometria compartilhada permanece intacta,
e a adoção nova fica limitada à remoção real de item/efeito, no mesmo significado da lixeira.
Pontos cegos cobertos: busca Unicode em HTML e TS de `modules/`, leitura individual do controle,
ternários de janela e pesquisa de `scrollTo` no leitor. Não houve mudança em regra, DTO ou service.

| Consumidor (prefixo `frontend/src/app/modules/`) | Classe | Decisão |
|---|---|---|
| `campanha/paginas/detalhe-jogador/detalhe-jogador.page.html` | pedido | Menu de ações mobile → `menu-acoes`. |
| `campanha/componentes/criatura-esquadrao-card/criatura-esquadrao-card.component.html` | pedido | Menu do cartão → `menu-acoes`. |
| `campanha/componentes/espectador-ficha-card/espectador-ficha-card.component.html` | pedido | Menu do cartão → `menu-acoes`. |
| `campanha/componentes/inventario-esquadrao/inventario-esquadrao.component.html` | pedido | Cancelar confirmação → `cancelar-edicao`; remover item → `excluir`. |
| `pagina-caderno/caderno-flutuante.component.html` | pedido | Ternário maximizar/restaurar → `janela-maximizar`/`janela-restaurar`. |
| `documento/componentes/biblioteca-flutuante/biblioteca-flutuante.component.html` | pedido | Mesmo ternário, com eventos preservados. |
| `regras/regras-flutuante.component.html` | pedido | Mesmo ternário, com eventos preservados. |
| `regras/oficina/oficina-peca.component.html` | pedido | Mover acima/abaixo → nomes próprios, com limites e desabilitados preservados. |
| `regras/oficina/oficina-sumario.component.html` | pedido | Alça e exemplo na instrução → `alca-arrastar`; `cdkDragHandle`, Alt+setas e F2 preservados. |
| `encontro/componentes/rolagem-avulso/rolagem-avulso.component.html` | pedido | Fechar painel de rolagens → `fechar-painel`, preservando a interrupção de pointerdown. |
| `usuario/paginas/gestao/gestao.page.html` | pedido | Cancelar troca de tipo → `cancelar-edicao`. |
| `simulacao/paginas/compras/compras.page.html` | pedido | Cancelar confirmação → `cancelar-edicao`; remover item e efeito → `excluir`. |
| `simulacao/componentes/ajuda-simulacao/ajuda-simulacao.component.html` | pedido | Voltar ao padrão → `restaurar-padrao`, preservando confirmação em dois cliques e `!` armado. |
| `regras/regras-leitor.component.html` (setas da busca) | destoa | Preservado: ↑/↓ navegam ocorrência anterior/próxima, não início/fim. Decisão alinhada com o principal. |
| `regras/regras-leitor.component.html`, `regras/regras-pesquisa.component.html` (× da busca) | destoa | Preservado: limpar pesquisa não é fechar painel, cancelar edição ou apagar último termo. |
| Fórmulas, multiplicação, empilhamento e comentários em TS | destoa | Preservados como texto/notação; nenhum símbolo de domínio foi substituído. |

## Verificação e limites

Prettier do frontend aplicado somente aos 13 HTML tocados; único TS alterado apenas registra
`Icone` nos imports standalone de `AjudaSimulacao`. Nenhum SCSS alterado. A revisão estática
confere preservação dos handlers/nomes acessíveis e diferenças de significado.

Este mapa foi produzido antes do gate integrado. O principal executou os gates e a inspeção em
22/10; resultados e limites em [verificacao.md](verificacao.md). Superfícies do recorte:
campanha do jogador (menu mobile), cartões de criatura e espectador, inventário do esquadrão
(normal e confirmação), três janelas (normal e maximizada), Oficina (peça selecionada e alça),
rolagem avulsa, Gestão de usuários (troca de tipo), Compras (item, confirmação e efeito) e Limpar
das seis calculadoras (normal e confirmação). Verificar claro/escuro em 1920×1080 e 360×800,
incluindo foco e desabilitados. Relato do delegado não encerra a verificação visual.

## Revisão integrada

A revisão independente encontrou o botão real Voltar ao topo no leitor, com chevron rotacionado. Principal adotou `rolar-inicio` ali e removeu a regra de rotação; setas de pesquisa continuam preservadas. `rolar-fim` permanece sem consumidor equivalente atual.
