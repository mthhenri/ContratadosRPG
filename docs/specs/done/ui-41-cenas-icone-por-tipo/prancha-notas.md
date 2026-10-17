# UI-41 — proposta para votação

Artefato: [prancha-icones.html](prancha-icones.html). A prancha preserva as opções
apresentadas ao autor; as decisões finais estão registradas abaixo e na spec.

## Votos e alcance aprovados — 2026-10-17

| Item | Escolha do autor |
|---|---|
| Investigação | B — Pista no dossiê |
| Combate | A — Lâminas cruzadas |
| Furtiva | Homem encapuzado, solicitado depois da votação; desenho próprio substitui as duas opções iniciais |
| Perseguição | B — Trajetória |
| Resistência | B — Pilar |
| Genérico Cenas | B — Claquete |

O autor aprovou também hub, cabeçalhos e seletor de nova cena, incluindo mestre.
No seletor nativo, o ícone acompanha o valor selecionado por `Campo[icone]`.
A implementação e as evidências estão em [verificacao.md](verificacao.md).

## Registro da proposta anterior aos votos

## Referências e escopo

- Prancha análoga: `docs/specs/done/icones-recursos-sistema/prancha-icones.html`.
  Preservados cartões comparáveis, grade responsiva, voto por opção e resumo copiável.
- Identidade: snapshot dos tokens de `docs/design/tema/_tokens.scss`; sem dependência web.
- Contexto: `frontend/src/app/shared/ui/coluna-acoes/coluna-acoes-item.component.scss`:
  mínimo 44px, padding/gap 12px, rótulo mono, contorno fino e cor neutra.
  A amostra é estática, retraída/expandida; não é uma tela de produto ou validação do fluxo real.
- Novas geometrias originais de Codex (OpenAI), feitas nesta tarefa; nenhum SVG externo importado.
  A alternativa “Espadas atuais” reúne os mesmos subpaths do glifo `combate` existente no repositório.
- Todas as opções usam `viewBox="0 0 24 24"`, `fill: none`, `stroke: currentColor`,
  `stroke-width: 1.75`, pontas e junções arredondadas, sem mudar a espessura por tamanho.

## Sugestão para o voto

Sugestões sem seleção inicial e sem força de decisão:

| Item | Sugestão | Motivo e limite |
|---|---|---|
| Investigação | A — Lupa | Silhueta reconhecível em 16px; já é uma metáfora conhecida no produto. |
| Combate | A — Lâminas cruzadas | Preserva a linguagem de confronto; o traço é novo e depende de aprovação. |
| Furtiva | B — Máscara | Evita confundir o tipo com o comando de ocultar conteúdo do olho cortado. |
| Perseguição | A — Corrida | Distingue-se das demais silhuetas; a trajetória é a alternativa mais abstrata. |
| Resistência | B — Pilar | Evita a associação imediata do escudo com a estatística Defesa. |
| Genérico Cenas | B — Claquete | Não sugere Combate quando nenhuma cena está ativa; exige decisão sobre mudar o genérico. |

O genérico também oferece A — Espadas atuais e C — Quadros. Cada tipo tem duas opções.
Na etapa de proposta, aplicação em hub, cabeçalho, seletor e mestre dependia de decisão separada do autor, concedida acima.

## Verificação técnica da proposta

Em 2026-10-17, Node executou o script extraído do HTML com DOM controlado:

- Sintaxe válida; seis grupos e 13 opções, totalizando 65 instâncias SVG.
- Votos persistidos com índice fora de faixa, negativo, string ou `null` são descartados.
- Selecionar uma opção retira a anterior do mesmo grupo; clicar novamente desmarca.
- Resumo reflete o voto e `aria-pressed` acompanha o estado, sem recriar os botões e perder o foco.
- Armazenamento local, limpeza e fallback de cópia manual exercitados.
- Nenhuma URL remota em `src`/`href` e nenhuma importação ou chamada de rede no arquivo.

O agente principal inspecionou pessoalmente a prancha renderizada em 1920×1080 e
360×800: seis grupos, leitura dos rótulos, contexto da coluna e reorganização em
uma coluna no celular, sem corte horizontal. Capturas locais em
`.artifacts/ui-41-cenas-icone-por-tipo/`, ignoradas pelo Git.

Limites: clipboard nativo e foco por teclado não foram auditados visualmente.
Os gates da implementação UI-41 (app real, tempo real, mapa, testes, build e lint)
não foram executados nesta etapa de proposta. Em 2026-10-17, a prancha e a decisão
de alcance foram apresentadas ao autor; os votos posteriores constam no início deste registro.
