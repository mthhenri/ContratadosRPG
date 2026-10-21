# Identidade — andamento e evidências em 2026-10-18

A spec permanece aberta. Autor escolheu classe e arquétipo/subclasse, sem ícone
extra de tipo; alcance ainda em decisão. Nenhuma tela de cards recebeu ícones.
A proposta e seus consumidores estão em adocao-proposta.md.

Mapas ICONE_CLASSE e ICONE_ARQUETIPO foram preparados com os 7/9 valores dos enums
existentes. Experimentos apontam aos desenhos de subclasse aprovados M10-03.
O adaptador textual do leitor passa a delegar aos mapas, preservando seus 20 nomes
e aliases anteriores, sem redesenho nem mudança da saída visual.

Impacto do adaptador: quatro consumidores (regras-classe, regras-arquetipos,
regras-secao, regras-subclasse) e um teste existente. Todos preservados. Novo teste
cobre nomes/acentos/caixa/espaços e desconhecidos; cobertura total dos enums no mapa.
Teste focado: 10 testes em três arquivos passaram, mais 89 de regras de texto.
Não substitui build/suíte/gate visual da implementação final, ainda pendentes.

Amostra estática proposta-visual.html usa os SVGs já aprovados, análogos leitor de
Regras e linha de recursos dos cards; não é uma tela Angular nem aceite do produto.
O principal inspecionou pessoalmente 1920×1080 e 360×800, bases escura e clara:
classe + arquétipo/subclasse legíveis e com quebra no caso longo, sem overflow.
Evidências locais em .artifacts/icones-identidade-cards-agente/.

Pendente: escolha de alcance, implementação autorizada, aplicação real nos temas e
viewports, testes de integração, build/lint e fecho auditável. Sem commit/push.
