# ui-27-auditoria-componentes-fantasma.spec.md

> Task avulsa de diagnóstico, solicitada pelo autor após a expansão da biblioteca própria nas
> tasks UI-12…UI-26. Reabre somente o inventário estático da UI-06; não corrige os consumidores.

## Objetivo

Identificar componentes visuais implementados localmente que já são cobertos por `shared/ui`, que
pedem uma evolução pequena de um primitivo existente ou que justificam um novo primitivo.

## Entregáveis

1. Auditoria versionada com método reproduzível, evidência por família e classificação em três
   categorias: adotar, evoluir ou criar.
2. Lista priorizada dos recortes de correção, sem refatoração oportunista.
3. Registro dos desvios atuais em `PROBLEMS.md` e atualização do contexto persistente.

## Critérios de Aceite

- A busca cobre todos os templates e SCSS de `frontend/src/app`, excluindo o código interno dos
  próprios primitivos quando a pergunta for adoção.
- Cada achado cita consumidores concretos e explica por que a composição local não é exceção de
  domínio.
- O diff é somente documental; lint de Markdown/checagens estruturais e revisão manual do diff
  passam antes do fecho.

## Fora de Escopo

- Alterar HTML, SCSS ou TypeScript do frontend.
- Declarar fidelidade visual dos futuros patches sem executar o gate ao vivo de cada spec filha.
- Transformar todo botão nativo ou todo texto vazio em componente por contagem mecânica.

## Dependências

- `docs/design/DESIGN.md`, `docs/design/AUDITORIA-BIBLIOTECA-VISUAL.md` e `shared/ui/`.
- Tasks `ui-01`…`ui-26` concluídas.

## Riscos e Mitigação

- **Confundir widget de domínio com fantasma.** A busca só seleciona candidatos; o veredito exige
  comparação de contrato, marcação e identidade visual.
