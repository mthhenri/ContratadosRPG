# Avisos de redistribuição

Python 3.12: Python Software Foundation License; redistribuir LICENSE do runtime.
PySide6/Shiboken6/Qt 6.8.3: LGPLv3/GPLv3 ou licença comercial do fornecedor.
Usar distribuição dinâmica onedir, não esconder bibliotecas nem restringir substituição.
A ferramenta de build deve incluir as licenças efetivas dos wheels/runtime no bundle;
conferir os avisos Qt de terceiros e acesso ao código-fonte correspondente antes da distribuição.
PyInstaller: GPL com exceção de bootloader, conforme distribuição 6.12.0.
Inno Setup: licença própria do compilador; registrar versão na prova Windows.

Os textos de licença (LGPLv3/GPLv3 do Qt for Python, Python 3.12 e PyInstaller) estão em `licencas/`, copiados sem alteração
das fontes oficiais e empacotados com o programa; o `licencas/LEIA-ME.md` registra origem, hash e o que ainda falta
(avisos de terceiros dentro do Qt, runtime C++ da Microsoft e revisão jurídica).

Nenhum instalador foi produzido ou distribuído nesta execução Linux. A conferência
de licenças dos binários efetivamente empacotados é gate antes da distribuição.
