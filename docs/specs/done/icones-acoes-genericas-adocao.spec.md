# icones-acoes-genericas-adocao.spec.md

> Task própria prevista por `icones-recursos-glifos-e-pendencias` para as 14 ações e glifos genéricos votados pelo autor
> em 2026-10-20. Os desenhos estão aprovados; **o alcance abaixo precisa da aprovação explícita do autor antes de qualquer
> código** (decisão da spec de origem).

> Execução e alcance autorizados pelo autor em 21/10/2026: “bora fazer aquela ali do ícones”.

## Objetivo

Adotar em `app-icone` os 14 glifos votados e substituí-los, nos consumidores aprovados, pelos caracteres de texto que hoje
fazem o papel de ícone (`⋯`, `⋮⋮`, `❐`/`□`, `−`, `↑`/`↓`, `✕`…), sem mudar o comportamento dos controles.

## Votos (desenho aprovado)

Menu de ações **B — Três módulos** · Alça de arrastar **A — Seis apoios** · Apagar último termo **B — Termo retirado** ·
Rolagem encadeada **B — Fluxo** · Minimizar janela **A — Traço inferior** · Maximizar janela **B — Quatro cantos** ·
Restaurar janela **A — Quadros sobrepostos** · Mover peça acima **A — Seta e lista** · Mover peça abaixo **A — Seta e
lista** · Rolar ao início **B — Duas etapas** · Rolar ao fim **B — Duas etapas** · Fechar painel **A — Cruz aberta** ·
Cancelar edição **B — Interromper** · Restaurar valores padrão **B — Ciclo e referência**. Geometrias na
[prancha](../done/icones-recursos-glifos-e-pendencias/prancha-acoes.html); registro em
[decisoes.md](../done/icones-recursos-glifos-e-pendencias/decisoes.md).

## Alcance aprovado pelo autor em 21/10/2026

Fonte: [inventário](../done/icones-recursos-glifos-e-pendencias/inventario.md) (seção "Interfaces genéricas") e
[ocorrências](../done/icones-recursos-glifos-e-pendencias/ocorrencias.md), 261 ocorrências em 68 arquivos.

| Glifo | Consumidores propostos |
|---|---|
| Menu de ações (`⋯`) | `detalhe-jogador`, `espectador-ficha-card`, `criatura-esquadrao-card` e os demais menus listados no inventário |
| Alça de arrastar (`⋮⋮`) | `oficina-sumario` (tem alternativa de teclado por Alt+setas) |
| Maximizar / Restaurar janela | `painel-flutuante` e as janelas `caderno-flutuante`, `regras-flutuante`, `biblioteca-flutuante` e o montador |
| Minimizar janela | `painel-flutuante` |
| Mover peça acima/abaixo | `oficina-peca`, `ficha-combos` |
| Rolar ao início/fim | `regras-leitor` |
| Fechar / Cancelar / Apagar último termo / Rolagem encadeada / Restaurar padrão | usos listados no inventário; cada superfície confere o significado antes de trocar |

Ficam de fora (manter texto, como o inventário classifica): marcadores `●` de estado, setas editoriais (`→`, `←`, `›`),
`+`/`−` editoriais e o texto autoral dos livros.

## Critérios de Aceite

- Os 14 nomes em `IconeNome`/`@case`, com teste de assinatura distinta (como `icone.component.spec.ts` já faz).
- Cada troca preserva o comportamento, o foco, o `aria-label`/`appTooltip` e a alternativa de teclado.
- `npm run impacto` por glifo antes de editar; gate visual (`design-fidelity` + `verify`) em `1920×1080` e `360×800`,
  tema escuro e claro, por superfície; testes, lint, `repo:verificar`.
- Se a matriz visual ficar grande, dividir por superfície em tasks menores.

## Fora de Escopo

Redesenhar os glifos votados, alterar o significado de qualquer controle, mexer em ícones de domínio ou de recursos.

## Dependências

`docs/design/DESIGN.md`, skills `gerenciamento-de-impacto`, `design-fidelity`, `verify`.
