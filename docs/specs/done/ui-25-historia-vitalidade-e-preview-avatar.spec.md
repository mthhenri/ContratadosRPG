# ui-25-historia-vitalidade-e-preview-avatar.spec.md

> Task avulsa de interface: melhora o aproveitamento da aba História, a leitura de vitalidade na ficha e no Esquadrão do mestre, e o preview de avatar já existente.

## Objetivo

Dar espaço útil ao texto da aba História e tornar Vida/Energia mais compactas e comparáveis no desktop, sem sacrificar o empilhamento confortável no celular. Ampliar o preview flutuante de avatar de 200px para 300px nos dois lugares em que ele já existe.

## Entregáveis

1. A aba História recebe classes próprias para que sua caixa e seu conteúdo de leitura/edição ocupem o espaço disponível do cartão sem alterar a seção de Anotações.
2. `app-barra-recurso` expõe a variante visual `compacto`, responsável apenas pela densidade interna do primitivo, com contrato coberto por teste.
3. A ficha usa a variante compacta para Vida e Energia: no desktop elas dividem a linha quando a coluna comporta as duas; em `360px` continuam uma abaixo da outra, sem overflow.
4. Os cartões de jogadores no Esquadrão da visão de mestre passam a mostrar as duas barras compactas preservando os controles de aumentar/reduzir; cartões de criaturas permanecem fora desta alteração.
5. Os previews flutuantes de avatar do Acervo e do Esquadrão passam a 300×300px e mantêm o cálculo que os prende à viewport.

## Critérios de Aceite

1. Testes focados cobrem o modificador `barra-recurso--compacta`, a ficha e a página de campanha, e a suíte do frontend passa.
2. Em execução real, História em leitura e edição, Ficha e Esquadrão do mestre são observados em `1920×1080` e `360×800`; o desktop não corta Vida/Energia, o mobile as empilha e não há rolagem horizontal.
3. Em execução real, os cartões de jogadores exibem barra de Vida e Energia com os steppers existentes e o preview de avatar mede 300px quando houver avatar.
4. A comparação visual usa `FichaVisualizacao` como análogo aprovado para a densidade de recursos e as regras de `docs/design/` para shell, tokens, controles e responsividade.

## Fora de Escopo

- Alterar regras, valores ou permissões de vitalidade.
- Redesenhar o cartão de criatura/NPC no Esquadrão.
- Criar previews de avatar em novos fluxos ou mudar seu atraso de abertura.
- Alterar o conteúdo, autorização ou persistência da História.

## Dependências

- `docs/design/DESIGN.md` e `docs/design/tema/`.
- Primitivo existente `frontend/src/app/shared/ui/barra-recurso/`.

## Riscos e Mitigação

- O mesmo bloco SCSS atende Anotações e História; modificadores exclusivos da História impedem que a expansão mude a outra aba.
- A ficha pode aparecer em painéis estreitos mesmo no desktop; o grid preserva o reflow por largura de contêiner em vez de forçar duas colunas pelo viewport.
