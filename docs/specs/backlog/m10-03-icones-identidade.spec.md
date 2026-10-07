# m10-03-icones-identidade.spec.md

> Task do milestone `m10-regras.spec.md`. Independente; pode correr em paralelo com `m10-01`.
> Fonte: aba *Ícones* do exemplão (`docs/design/propostas/m10-regras-exemplao.html`), objeto `ICO`,
> opção marcada em `dec` (decisão conjunta com os testers, 2026-10-06).

## Objetivo

Acrescentar ao `app-icone` (`frontend/src/app/shared/icone/`) os 18 ícones de identidade decididos,
para o leitor de Regras (dossiê de Classe, arquétipos, subclasses, blocos do Guia) e para quem mais
quiser usá-los.

## Entregáveis

1. Novos valores em `IconeNome` e o SVG de cada um no template do `app-icone`, copiado da opção
   decidida no exemplão, no estilo do componente (viewBox 24, traço 1.75, pontas e junções
   arredondadas, contorno):
   - **Classes:** `combatente` (espadas cruzadas), `especialista` (bússola), `suporte` (cruz em
     círculo).
   - **Arquétipos:** `lutador` (halter), `mercenario` (mira), `vanguarda` (escudo com avanço),
     `engenheiro` (chave), `assassino` (adaga a 45°), `academico` (capelo), `paramedico` (cruz),
     `diplomata` (balança), `comandante` (divisas).
   - **Subclasses:** `bestial` (garras), `artificial` (circuito), `hibrido` (hélice).
   - **Personagem/ficha:** `civil` (silhueta), `npc` (peão), `criatura` (logo SCP — usa o SVG da
     `m10-04`; até lá, não entra).
2. Teste do `app-icone` cobrindo os nomes novos.
3. `DESIGN.md`: registrar a família de identidade e onde ela é usada.

## Verificação

Ícones renderizados a 14px, 16px e 24px, tema escuro e claro, lado a lado com os ícones existentes
— mesma espessura e peso visual. Registrar captura no fecho.

## Fora de escopo

Trio Vida/Energia/Defesa (`icones-recursos-sistema`); refino de desenho (Suporte × Paramédico,
espadas pequenas, silhueta — `IDEAS`); trocar ícones existentes no site.
