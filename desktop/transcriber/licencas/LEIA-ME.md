# Licenças de software de terceiros — Contratados Transcriber

Este aplicativo redistribui software de terceiros. Esta pasta reúne os textos de licença, copiados
**sem alteração** das fontes oficiais, e acompanha o programa instalado.

| Arquivo | Software | Origem (cópia exata) | SHA-256 |
|---|---|---|---|
| `LGPL-3.0-only.txt` | Qt 6.8.3 e Qt for Python (PySide6/Shiboken6) 6.8.3, licenciados como LGPL-3.0-only **ou** GPL-2.0-only **ou** GPL-3.0-only | `qt/qtbase`, tag `v6.8.3`, `LICENSES/LGPL-3.0-only.txt` | `da7eabb7bafdf7d3ae5e9f223aa5bdc1eece45ac569dc21b3b037520b4464768` |
| `GPL-3.0-only.txt` | Texto da GPLv3, que a LGPLv3 incorpora por referência | `qt/qtbase`, tag `v6.8.3`, `LICENSES/GPL-3.0-only.txt` | `8ceb4b9ee5adedde47b31e975c1d90c73ad27b6b165a1dcd80c7c545eb65b903` |
| `Python-3.12-LICENSE.txt` | Python 3.12 (runtime embutido) | `python/cpython`, tag `v3.12.10`, `LICENSE` | `3b2f81fe21d181c499c59a256c8e1968455d6689d269aa85373bfb6af41da3bf` |
| `PyInstaller-6.12.0-COPYING.txt` | PyInstaller 6.12.0 (GPL com exceção para o bootloader) | `pyinstaller/pyinstaller`, tag `v6.12.0`, `COPYING.txt` (idêntico ao `COPYING.txt` do pacote 6.12.0 instalado) | `dcf75fdb959db1e3b41c0f8505069d2ece781b5ec6b3d0a4d30975cfc6580245` |

Baixados em 2026-10-15. Para conferir uma cópia: compare o SHA-256 acima com o do arquivo.

## Qt e PySide6 (LGPL)

O aplicativo usa o Qt for Python como biblioteca dinâmica (modo onedir): as bibliotecas do Qt ficam
em arquivos separados na pasta do programa e podem ser substituídas por outra versão compatível.
Código-fonte correspondente: repositório oficial do Qt for Python
(`https://code.qt.io/cgit/pyside/pyside-setup.git/`, versão 6.8.3) e do Qt
(`https://code.qt.io/cgit/qt/qtbase.git/`, versão 6.8.3).

## O que esta pasta NÃO cobre (pendente de revisão antes de distribuir)

- **Componentes de terceiros dentro do próprio Qt** (por exemplo ICU, FreeType, HarfBuzz, libpng,
  zlib, PCRE2), cada um com licença e aviso próprios. A lista oficial está em "Licenses Used in Qt"
  (documentação do Qt 6.8) e nos arquivos `qt_attribution.json` de cada módulo; conferir quais
  bibliotecas realmente entram no instalador Windows (o relatório de `coletar-evidencias.ps1` lista
  os módulos presentes) e acrescentar os avisos correspondentes.
- **Runtime C++ da Microsoft** (`vcruntime140*.dll` e semelhantes) que o Python/Qt carregam: regida
  pelos termos de redistribuição da Microsoft, não por licença de código aberto.
- **Revisão jurídica.** Estes textos e a forma da oferta de código-fonte acima são o mínimo técnico;
  a adequação para distribuição pública deve ser confirmada pelo responsável pelo projeto.
