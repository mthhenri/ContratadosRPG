# Proposta de adoção — VD e Tenacidade

Estado: **rodada 2 escolhida: VD A — Patamares de nível; Tenacidade B — Coração reforçado. Alcance de adoção aprovado pelo autor; implementação pendente**.

Votação atual: [prancha da rodada 2](prancha-icones-rodada-2.html). A [rodada 1](prancha-icones.html) e seus seis candidatos foram preservados como histórico.
Autoria da proposta e dos seis candidatos de cada rodada: Codex (OpenAI), 2026-10-18.
Não houve alteração de `app-icone`, contratos, regras ou consumidores nesta etapa.

## Análogo e intenção

A [prancha atual](prancha-icones-rodada-2.html), assim como a rodada 1, usa o formato de votação da
[UI-41](../../done/ui-41-cenas-icone-por-tipo/prancha-icones.html): shell de documento técnico,
cartões com borda discreta, títulos mono, densidade de 12–16px, foco visível, alvo de voto
amplo, seleção reversível e resumo copiável. A grade cai para uma coluna no mobile;
as amostras claro/escuro ficam lado a lado no desktop e empilhadas em janelas menores.
É anexo offline para decisão, sem dependência de Angular nem extensão de primitivo do produto.

O contexto de domínio vem da fileira compacta VD / Defesa / Tenacidade de
`criatura-visualizacao.component.html:218–325`. Cada candidato aparece em 16/24/40px,
nas duas bases, e em 16px ao lado de texto e dos vizinhos Defesa/Vida.
A comparação inclui as geometrias reais de `patente`, `dt`, `defesa`, `vida`, `scp`, `cena-perseguicao` e `cena-resistencia`.
Os tokens foram congelados de `docs/design/tema/_tokens.scss` e de `TOKENS_CLARO`
em `frontend/src/app/core/services/tema.service.ts:56–64`.

Fontes semânticas: `docs/core/guia_de_mestre-v4.2.0.md:223–241` (VD como meta),
`:398–416` (Tenacidade e Vida), `:534–536` (Porte ≠ Tenacidade),
`:618` (Cadência ≠ VD). Não se altera nenhuma regra.

## Rodada 1 — histórico exploratório, substituído pela direção do autor

| Conceito | A | B | C |
|---|---|---|---|
| VD | Escala de confronto | Grupo convergente | Equilíbrio de confronto |
| Tenacidade | Núcleo sob pressão | Arco sustentado | Trama resistente |

Sugestão para avaliar: **VD A** e **Tenacidade A**, por menos detalhe e silhuetas distintas
de medalha, mira, escudo, coração e marca SCP. A escala pode sugerir progressão genérica;
o núcleo precisa comunicar pressão sem ser lido como Defesa. B/C preservam alternativas
narrativas e estruturais; os cartões registram os riscos de leitura em 16px.
**Associações adicionais a avaliar no voto:** VD A (escala de confronto, ascensão diagonal)
pode lembrar `cena-perseguicao` (trajetória/seta diagonal); Tenacidade B (arco sustentado)
pode lembrar `cena-resistencia` (pilar). As geometrias reais desses dois glifos, introduzidos
pela UI-41, foram acrescentadas à comparação em ambas as bases e 16/24/40px.
São limites perceptivos da proposta, não colisões corrigidas ou opções rejeitadas.
Os seis desenhos e suas opções foram preservados, pois a votação já foi apresentada ao autor.

Nenhuma sugestão foi marcada automaticamente nem constitui aprovação.

Geometrias candidatas originais, criadas nesta tarefa com primitivas SVG; sem assets externos.
Os vizinhos existentes preservam suas geometrias e procedência no repositório. Na implementação,
registrar crédito/procedência/licença aplicável junto dos novos casos conforme a decisão do autor,
sem atribuir licença de biblioteca a desenhos originais.

## Impacto — adição dos dois nomes e adoção visual

Busca em 2026-10-18: `npm run impacto -- --simbolo tenacidade` → 10 consumidores e 10 testes;
`npm run impacto -- --simbolo vd` → 26 consumidores e 24 testes. Complementada por busca textual
nos templates e pelos usos de `app-criatura-visualizacao`. As contagens são do símbolo de dado,
não de lugares que devem receber ícone: regras, DTOs, SQL e cálculos permanecem intactos.
A adoção abaixo foi aprovada pelo autor em todos os locais propostos, incluindo seletor e flutuante, e ainda não foi aplicada. O card do mestre fica como está.

| Consumidor atual | Classe | Proposta após aprovação |
|---|---|---|
| `frontend/src/app/modules/ficha/componentes/criatura-visualizacao/criatura-visualizacao.component.html:220` | pedido | Novo ícone junto de “VD”, com `appTooltip="Valor de Desafio"`, mantendo texto e edição. |
| Mesmo arquivo `:287` | pedido | Novo ícone junto de “Tenacidade”, com `appTooltip="Tenacidade"`, mantendo texto, seleção e multiplicador. |
| `frontend/src/app/modules/ficha/paginas/visualizar-criatura/visualizar-criatura.page.html:153` | pedido | Já reutiliza o componente acima: acompanha os dois ícones, sem cópia local. Validar página completa. |
| `frontend/src/app/modules/ficha/componentes/ficha-flutuante/ficha-flutuante-conteudo.component.html:39` | pedido | Já reutiliza o mesmo componente: acompanha os dois ícones. Validar largura da janela flutuante. |
| `frontend/src/app/modules/ficha/paginas/criar-criatura/criar-criatura.page.html:313` | pedido | Ícone VD no rótulo do campo de entrada, sem alterar a explicação ou cálculo. |
| Mesmo arquivo `:468` | pedido | Ícone Tenacidade no rótulo do seletor. |
| Mesmo arquivo `:1119` e `:1123` | pedido | Resumo de revisão: adotar os ícones no trecho correspondente de NA / VD e Tenacidade / Vida Máxima, preservando os pares e rótulos. |
| Mesmo arquivo `:1203` | pedido | Resumo operacional: novo ícone ao lado de VD; a linha de Vida `:1207` continua sendo Vida, mesmo estando condicionada a Tenacidade `:1205`. |
| `frontend/src/app/modules/ficha/componentes/cartao-ficha-acervo/cartao-ficha-acervo.component.html:31` | pedido | Ícone VD junto de “VD …” na linha “NA … · VD …”; não adicionar Tenacidade, ausente neste resumo. |
| `frontend/src/app/modules/encontro/componentes/seletor-combatentes/seletor-combatentes.component.ts:82–90` | acompanha, aprovado pelo autor | `metaCriatura()` também gera texto “VD …”, consumido em `frontend/src/app/modules/encontro/componentes/seletor-combatentes/seletor-combatentes.component.html:69`. Proposta: acrescentar ícone VD no trecho do template que exibe esse metadado, preservando texto acessível; inclusão expressamente aprovada pelo autor nesta rodada. |
| `frontend/src/app/modules/campanha/componentes/criatura-esquadrao-card/criatura-esquadrao-card.component.html:25–56` | manter, decidido pelo autor | Hoje exibe Porte/Comportamento/NA, Vida e Defesa; **não mostra VD nem Tenacidade**. Não acrescentar os campos automaticamente. |

Pontos cegos conferidos: conteúdo interpolado de VD, rótulos compostos, metadado montado em TS,
componente compartilhado da página/janela, e condição `tenacidade` envolvendo stat que exibe Vida.
Novos glifos próprios não substituem nem redesenham os sete vizinhos existentes.

## Decisão do autor e rodada 2

O autor pediu que **VD lembre um ícone de nível** e que **Tenacidade se relacione à Vida,
“meio que um coração rígido”**. Essa direção substitui a recomendação exploratória da rodada 1
de evitar coração; a rodada 1 permanece preservada e não deve guiar a seleção atual.
O autor aprovou todos os locais do mapa, incluindo seletor de combatentes e ficha flutuante,
e determinou **manter o card do mestre como está**, sem acrescentar VD/Tenacidade.

A [rodada 2](prancha-icones-rodada-2.html) apresenta geometrias novas:

| Conceito | R2 A | R2 B | R2 C |
|---|---|---|---|
| VD | Patamares de nível | Níveis crescentes | Régua de nível |
| Tenacidade | Coração facetado | Coração reforçado | Coração com núcleo |

Cada opção explicita seu limite: VD pode lembrar pilha/gráfico/ajuste, respectivamente;
Tenacidade mantém parentesco deliberado com Vida, distinguindo-se por faceta, reforço ou núcleo.
Rótulos e tooltips devem permanecer explícitos para distinguir perfil de resistência e recurso.
Os sete vizinhos reais continuam na comparação, incluindo `vida`, `patente`, `dt`,
`cena-perseguicao` e `cena-resistencia`, com os mesmos tamanhos/bases da rodada anterior.

IDs de grupo `vd-r2` / `tenacidade-r2` e a chave de armazenamento
`criatura-vd-tenacidade-rodada-2-votos-v1` são exclusivos desta rodada:
nenhum voto da primeira rodada é herdado. Nenhum candidato começa escolhido.

**Decisão recebida em 2026-10-18:** VD A — Patamares de nível; Tenacidade B — Coração reforçado.
Alcance reafirmado em todos os locais propostos, incluindo seletor e flutuante; card do mestre como está. Nenhum código de produto aplicado nesta etapa.

Depois das decisões, usar nomes próprios em `IconeNome`/`@case` e teste dos nomes;
`appTooltip` com os rótulos exatos acima e texto adjacente preservado.
A adoção de produto exige `design-fidelity` + `verify`, em 1920×1080/360×800 e ambas as bases,
com comparação aos ícones vizinhos, além de lint/build/testes e `repo:verificar`.

## Evidência desta etapa e limites

A verificação estrutural/funcional do anexo está em [verificacao-prancha.md](verificacao-prancha.md).
O principal inspecionou a rodada 2 no navegador interno em desktop; viewport exato mobile dessa rodada ainda não certificado. Os dois desenhos e o alcance foram decididos conforme o registro acima.
Os arquivos de tarefa continuam em `active/`; a prancha não comprova adoção ou fecho da spec.
