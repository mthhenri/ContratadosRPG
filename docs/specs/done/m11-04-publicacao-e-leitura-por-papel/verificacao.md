# Verificação da m11-04 (10/10/2026)

> Anexo da [`m11-04`](../m11-04-publicacao-e-leitura-por-papel.spec.md). Evidências brutas (capturas,
> fotografias geradas, scripts) ficam em `.artifacts/m11-04/` (ignorada pelo Git); aqui estão os
> resultados e os limites.

## Estratégia de carga e cache (decisão registrada)

- **API direta** (`GET /livros/<código>`) com `Cache-Control: no-store` (a resposta varia por papel, o
  navegador nunca a reaproveita) e **cache em memória do `RegrasService` por livro e por sessão** (chave
  `livro|token`, `shareReplay`): sair ou entrar nunca reaproveita o que outra sessão recebeu — achado
  da revisão independente (rascunho de tester vazava após o logout). Painel flutuante, pesquisa e
  impressão leem pelo mesmo serviço.
- **Plano B:** só 404 (livro ainda não importado) e status 0 (API inalcançável) usam o JSON estático do
  build; ele **não** fica guardado (a próxima abertura tenta a API de novo) e os demais erros (5xx,
  fotografia malformada) aparecem na tela de falha com "tentar novamente". Sai com o JSON na `m11-10`.
- **Tamanho:** a fotografia do Sistema tem 543 kB (JSON do build: 1,77 MB), pois não carrega os campos
  de auditoria da fonte.
- **Evento `livro:publicado` (item 6):** não incluído; fica como ideia (`IDEAS.md`).

## Equivalência do leitor (aceite da spec)

Fotografia real dos dois livros, gerada pelo conversor da `m11-03`, servida ao leitor por interceptação
da rota `/livros/<código>` (`.artifacts/m11-04/verificar.cjs`, Playwright/Chromium) contra o JSON
estático, no `ng serve` em execução:

| Livro | Viewport | Texto do documento (estático = API = rascunho) | Captura estático × API | Overflow |
|---|---|---|---|---|
| Sistema | 1920×1080 | idêntico (65 190 / 183 023 caracteres no Guia/Sistema) | idêntica byte a byte | não |
| Guia | 1920×1080 | idêntico | idêntica | não |
| Sistema | 360×800 | idêntico | idêntica | não |
| Guia | 360×800 | idêntico | idêntica | não |

Marcador de rascunho: aparece só com `situacao = RASCUNHO` ("RASCUNHO 4.1.4 — Você está vendo uma versão
ainda não publicada."), usando `app-chip severidade="aviso"`; na versão publicada o desenho é o de hoje.
Inspecionado em 1920×1080 e 360×800 (quebra em duas linhas no mobile, sem overflow).
Tempo até o primeiro título (4 aberturas, localhost, interceptado): estático 726–1000 ms, API 708–980 ms.

## Limites (o que não foi verificado)

- **Contra o backend real com dados:** nenhuma fotografia foi gravada no banco de desenvolvimento do
  autor; a API foi exercitada por testes (service, controller, guardas) e a UI por interceptação.
  A rota `/livros` só chega ao backend pelo `ng serve` depois de reiniciar o dev server (entrada nova
  em `frontend/proxy.conf.json`).
- **Guardas reais em HTTP:** o projeto não tem `@nestjs/testing`/`supertest`; o contrato é provado por
  testes unitários dos dois guardas e dos metadados da controller, não por requisição ponta a ponta.
- **Tempo de abertura em rede real** e comportamento offline do painel flutuante não foram medidos.
