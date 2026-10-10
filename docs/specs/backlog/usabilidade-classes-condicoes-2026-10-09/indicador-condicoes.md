# Indicativo de descrição nas Regras

Pedido complementar do autor em 09/10/2026: tornar perceptível que uma condição,
como Morrendo, oferece descrição ao passar o mouse. Referência solicitada:
os pontos abaixo dos rótulos Vida/Energia na ficha.

## Evidência atual

Inspeção pessoal do leitor público `/regras/sistema`: o título Morrendo abre a
descrição ao receber foco de teclado, mas seu estilo computado tem decoração
`none` e cursor `auto`. Captura local:
`.artifacts/usabilidade-classes-condicoes-2026-10-09/16-indicador-ausente-morrendo.png`.
Isso confirma a falta de indicação; não certifica hover ou toque reais.

## Análogo e proposta

Análogo aprovado escolhido pelo autor: `BarraRecurso`, rótulos com `dica`,
em `frontend/src/app/shared/ui/barra-recurso/`. O padrão existente usa
sublinhado pontilhado na cor `var(--text-mute)`, afastamento de 3 px e cursor
`help`. AtributoFicha e BarraEscala repetem essa apresentação. A fonte atual
da receita está no primitivo; não há opção equivalente na API de Tooltip.

Proposta para decisão do autor: ampliar Tooltip com uma opção explícita de
indicativo, desativada por padrão. O próprio primitivo deve aplicar a
apresentação apenas quando a opção estiver habilitada e houver descrição.
O leitor consome essa opção, sem reproduzir a receita em CSS local.

Preservar a casca do leitor, espaçamento, hierarquia, fonte e peso de cada
termo. Não acrescentar ícone ou caixa ao texto. Preservar foco, balão,
posicionamento e modalidades atuais. Em links de condição, distinguir a
dica pelo pontilhado sem impedir a navegação; demais links mantêm seu padrão.

## Cobertura do recorte

- Condições em parágrafos, listas, tabelas e demais consumidores de RegrasInline.
- Termos dentro de negrito e itálico, conservando sua formatação.
- Links internos cujo rótulo identifica uma condição e termos em links externos.
- Títulos das condições renderizados por RegrasSecao.
- Sistema e Guia, que compartilham esses renderizadores.

Não ampliar EditorMarkdown nem alterar regras nesta etapa. A revisão mais ampla
das Regras permanece registrada no relatório e nas specs de UI já abertas.

## Verificação necessária após a decisão

Observar texto comum, negrito, link, título, condição composta e busca destacada
em 1920×1080, 1366×768, 960×1080 e 360×800. Comparar o pontilhado com o análogo;
conferir legibilidade, quebra de linha, foco e ausência de overflow. Verificar
abertura/fecho da descrição e navegação preservada. Testar que texto vazio não
ganha indicativo e que consumidores existentes sem a opção mantêm o comportamento.

## Estado

Autor autorizou o pontilhado e a ampliação do Tooltip em 09/10/2026. Implementado
`appTooltipIndicador`, optativo, com os estilos sob responsabilidade da diretiva.
O host conserva sua tipografia; texto vazio não recebe decoração. A alteração
local acrescenta somente apresentação calculada, sem nova responsabilidade de
interação ao componente extenso. Consumidores antigos mantêm a opção desativada.

Inspeção pessoal em 1920×1080 (Morrendo no texto), 360×800 (texto com descrição
aberta/fechada), 1366×768 (título Morrendo) e 960×1080 (Em Chamas e busca).
Capturas 17…22 no diretório de evidências. Comparação com a receita de BarraRecurso:
mesmo pontilhado, afastamento e token de cor; densidade, hierarquia e casca do
leitor preservadas. Foco visível, descrição legível e sem corte lateral;
largura do conteúdo menor que a janela nos recortes mobile/tela dividida.
Busca mantém destaque e pontilhado. Negrito, texto comum e itálico observados.
Links internos preservados nos testes; sua inspeção visual específica não foi
realizada. Não houve comparação ao vivo com ficha autenticada nesta etapa.

Verificações: 21 testes focados de Tooltip/RegrasInline aprovados, incluindo
mouse/toque sintéticos, navegação e ausência de indicador sem descrição;
lint frontend sem erros (27.009 avisos na árvore com alterações concorrentes);
build CI com dois workers aprovado, fonte dos livros fiel, aviso de bundle
589,95 kB sobre alvo 450 kB. Primeiros testes/build no sandbox falharam por
permissão em temporários/rede de fontes; reexecuções fora dele aprovadas.
HTML formatado; revisão do diff do recorte e `git diff --check` aprovados.

**Gate de interação ainda aberto:** foco/Escape observados, mas hover e toque
reais não disponíveis na API de navegação desta sessão. Testes sintéticos não
substituem esses gestos. Ergonomia de toque e contraste medido não certificados.
A spec geral permanece ativa com suas pendências anteriores. Sem commit novo.
