# Decisões pendentes do B4 — licenças do instalador

Resumo para quem decide. O que está pronto e o que falta está em `verificacao.md`
(seção "Licenças empacotadas") e em `desktop/transcriber/licencas/LEIA-ME.md`.
Isto **não é parecer jurídico**: lista as perguntas e as opções técnicas.

## Pergunta zero: o instalador vai ser distribuído?

As exigências abaixo nascem **ao distribuir** o programa a outras pessoas. Usar só na própria
máquina ou numa VM de teste não as aciona; entregar a um grupo fechado (por exemplo, os Mestres
da mesa) já conta como distribuição. A resposta decide a urgência de tudo o que segue.

## 1. Avisos de terceiros embutidos no Qt

- **O quê:** as bibliotecas do Qt carregam componentes de outros autores (por exemplo ICU, FreeType,
  HarfBuzz, libpng, zlib, PCRE2), cada um com licença e aviso próprios, além das licenças do Qt.
- **Estado:** a pasta `licencas/` já traz LGPL-3.0, GPL-3.0, Python 3.12 e PyInstaller 6.12.0. Faltam
  os avisos desses componentes, e só se sabe quais entram de fato olhando o instalador **Windows**.
- **Opções:**
  1. Gerar o relatório na VM (`coletar-evidencias.ps1` lista os módulos Qt presentes) e então reunir
     só os avisos do que realmente entra. *(Recomendada: evita copiar aviso do que não vai.)*
  2. Reduzir o que é empacotado (`excludes` no `.spec`, hoje o bundle leva módulos que o app não
     usa), o que também diminui o tamanho e o que precisa de aviso. Exige testar no Windows.
  3. Copiar a lista inteira de "Licenses Used in Qt" (documentação do Qt 6.8): mais simples, porém
     cobre bibliotecas que o instalador não leva.

## 2. Runtime C++ da Microsoft

- **O quê:** o Python e o Qt carregam DLLs do runtime C++ da Microsoft (`vcruntime140*.dll` e afins).
  Elas seguem os termos de redistribuição da Microsoft, não uma licença de código aberto.
- **Pergunta:** o instalador deve embutir essas DLLs (como o PyInstaller faz hoje, copiando-as do Python
  da máquina de build) ou exigir o redistribuível oficial da Microsoft instalado no Windows?
- **Opções:** confirmar nos termos de redistribuição da Microsoft o que pode acompanhar o
  aplicativo; ou deixar o instalador checar/baixar o redistribuível oficial. Qualquer uma exige
  decisão sua e teste em VM limpa.

## 3. Revisão do conjunto e da oferta de código-fonte

- **O quê:** o Qt for Python é LGPL-3.0 (ou GPL). Em linhas gerais, o uso como biblioteca dinâmica
  exige incluir a licença, não impedir a troca da biblioteca e informar onde obter o código-fonte
  correspondente. O app já usa o modo "onedir" (bibliotecas separadas), que favorece isso, e o
  `LEIA-ME.md` traz os endereços do código-fonte da versão usada.
- **Pergunta:** quem confirma que o conjunto (textos + oferta + avisos) basta para o tipo de
  distribuição escolhido?
- **Alternativa fora do código:** licença comercial do Qt, caso a distribuição pública peça outra
  base de licenciamento.

## O que eu preciso de volta

1. A resposta da pergunta zero (distribuição pública, grupo fechado ou só uso próprio).
2. Para cada item acima, a opção escolhida ou quem ficou de decidir.
