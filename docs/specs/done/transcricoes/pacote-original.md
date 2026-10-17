# Contratados Transcriber — pacote de specs e pedidos Work

Preparado em 2026-10-14 a partir das decisões do autor e das convenções do repositório `mthhenri/ContratadosRPG`.

## Conteúdo

- `docs/specs/done/transcricoes.spec.md`: guarda-chuva, escopo aprovado e sequenciamento.
- `docs/specs/done/transcricoes-01-...` até `transcricoes-09-...`: nove specs executáveis; **01–07** constituem a V1 local, **08–09** são nuvem posterior.
- `DECISOES-E-PENDENCIAS.md`: decisões aprovadas x opções técnicas a investigar.
- `pedidos/01-work-revisar-e-propor-pr.md`: pedido para o Work conferir repo e propor PR **somente documental**.
- `pedidos/02-work-implementar-v1-apos-aprovacao.md`: pedido separado para implementar depois da aprovação, sem cloud.

## Como usar

1. Abra o ChatGPT **Work** e anexe este ZIP (ou os Markdown extraídos).
2. Copie o conteúdo de `pedidos/01-work-revisar-e-propor-pr.md`. Ele exige ler as regras e verificar a árvore atual antes de alterar docs.
3. Revise os apontamentos e autorize/ajuste as specs e o PR documental.
4. **Somente após aprovação**, use o pedido 2. Ainda não há deploy, código ou mudanças no GitHub decorrentes deste pacote.

## Notas importantes

- Os paths `docs/specs/backlog/` são **destinos propostos no repositório**, e não prova de que os arquivos já estejam commitados nele.
- O texto mantém intencionalmente questões técnicas em aberto (ex.: empacotamento Windows, protocolo de vínculo e mecanismo de áudio local no editor), para que Work recomende decisões fundamentadas em código real **sem inventar decisões de produto**.
- A retenção 24h/7d/14d/30d aplica-se aos WAVs enviados à nuvem na etapa posterior, e **não** aos WAVs locais do Mestre.
- As políticas especiais de consentimento/avisos e cotas comerciais foram adiadas; acesso Mestre-only e segurança básica continuam obrigatórios.
