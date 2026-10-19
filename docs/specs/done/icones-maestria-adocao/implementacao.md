# Implementação — análogo e impacto

Referências: glifo B da prancha aprovada e controles de Competência/dadinho do
próprio AtributoFicha. Shell, densidade, hierarquia, gaps, nomes, estados de
elegibilidade e organização responsiva conservados. Botão canônico BotaoIcone
compacto com ativo/aria-pressed; alvos existentes do card preservados.

`npm run impacto -- frontend/src/app/shared/ui/atributo-ficha/atributo-ficha.component.ts`:
2 consumidores e 1 teste. FichaVisualizacao é pedido; NpcAtributos recebe
mostrarMaestria=false e mantém Maestria invisível, sem ícone de Competência alterado.
CriarPage e FichaCampanhaCard têm marcas próprias, cobertas expressamente pela spec.
Novo nome maestria no catálogo; outros glifos não redesenhados. Não há cálculo novo.
O componente extenso do card recebe só substituição de apresentação; extrair suas
responsabilidades ou cálculos não é necessário para este recorte.
