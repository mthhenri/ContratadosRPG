# MEMORY.md — Mapa do Sistema

> **O que este arquivo é:** um índice de **localização**. Ele responde *"onde fica X?"* e
> *"o que eu preciso ler antes de mexer em Y?"*.
>
> **O que este arquivo NÃO é:** ele **nunca copia a regra em si**. Se a regra aparecer aqui e na
> fonte, as duas divergem no primeiro dia em que uma mudar — e a cópia errada é pior que nenhuma.
> Aqui só entram ponteiros. Para *o que é verdade agora*, veja [`CONTEXT.md`](CONTEXT.md).

---

## 1. Onde estão as regras

Estas são as fontes da verdade. Em conflito entre código e documento, **o documento vence**.

| Assunto | Fonte | Ler antes de |
|---|---|---|
| Constituição do projeto — precede tudo | [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) | qualquer implementação |
| Convenções de código (referência rápida) | [`docs/CONVENTIONS.md`](../CONVENTIONS.md) | escrever qualquer arquivo |
| <regra de domínio, se houver> | `<caminho>` | <quando consultar> |
| Skills de agente — onde vivem e o contrato que cumprem | `<CLAUDE.md/AGENTS.md, seção relevante>` | criar, corrigir ou revisar qualquer skill |

**Ordem de leitura no início de sessão:** `ARCHITECTURE.md` → `CONVENTIONS.md` →
`docs/context/CONTEXT.md`.

## 2. Onde vive o código de cada coisa

<mapa de "assunto → arquivo/pasta real" — o equivalente de código do mapa de regras acima;
cresce conforme o projeto cresce, nunca é reescrito do zero>

| Assunto | Onde vive |
|---|---|
| <funcionalidade> | `<caminho>` |
