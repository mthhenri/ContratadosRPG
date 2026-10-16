"""Cartão `03 Importação` (task 02): escolher WAVs, ver a sugestão de identidade, confirmar, ajustar o offset e registrar.

A janela só desenha e encaminha. A regra vive em `importacao.py` e nas regras puras; nada aqui lê áudio na thread da interface
(o trabalho pesado roda em `executar`, o mesmo executor de fundo da janela) e nenhum WAV, caminho ou hash sai do computador.
"""
from pathlib import Path

from PySide6.QtCore import Qt
from PySide6.QtWidgets import QFileDialog, QFrame, QHBoxLayout, QLabel, QLineEdit, QVBoxLayout, QWidget

from .importacao import Importacao, ParecidoError, obter_glossario, preparar_importacao
from .regras_transcricao import normalizar_rotulo
from .theme import rotular
from .widgets import RotuloElidido, button, card, label

ESTADOS = {"erro": "Erro", "registrada": "Registrada", "confirmada": "Confirmada", "sugerida": "Sugerida", "vazia": "Sem identidade"}
ALERTAS = {
    "DUPLICADO": "Arquivos repetidos: {nomes}. Mantenha só um deles.",
    "MESMO_NOME_DIFERENTE": "Mesmo nome com conteúdo diferente: {nomes}. Confira qual é o arquivo certo.",
    "POSSIVEL_COPIA_RENOMEADA": "Possível cópia com outro nome: {nomes}.",
}


def formatar_duracao(milissegundos: int) -> str:
    """`m:ss,mmm` (ou `h:mm:ss,mmm`), com vírgula decimal como no restante do app."""
    segundos, resto = divmod(max(0, int(milissegundos)), 1000)
    minutos, segundos = divmod(segundos, 60)
    horas, minutos = divmod(minutos, 60)
    base = f"{horas}:{minutos:02d}:{segundos:02d}" if horas else f"{minutos}:{segundos:02d}"
    return f"{base},{resto:03d}"


def formatar_segundos(milissegundos: int) -> str:
    return f"{milissegundos / 1000:.1f}".replace(".", ",") + " s"


def descrever_faixa(info) -> str:
    canais = {1: "mono", 2: "estéreo"}.get(info.canais, f"{info.canais} canais")
    texto = f"{info.taxa_hz} Hz · {canais} · {info.bits} bits · {formatar_duracao(info.duracao_ms)}"
    if info.sem_fala:
        return texto + " · sem fala detectada"
    return texto + f" · silêncio inicial {formatar_segundos(info.silencio_inicial_ms)}"


def estado_da_faixa(faixa) -> str:
    if faixa.info is None:
        return "erro"
    if faixa.confirmada and faixa.sincronizada:
        return "registrada"
    if faixa.confirmada:
        return "confirmada"
    return "sugerida" if faixa.participante else "vazia"


def linhas_de_alerta(importacao: Importacao) -> list[str]:
    linhas = []
    for achado in importacao.alertas_duplicidade():
        nomes = ", ".join(importacao.faixas[i].nome_arquivo for i in achado["indices"])
        linhas.append(ALERTAS[achado["tipo"]].format(nomes=nomes))
    faltantes = importacao.participantes_faltantes() if importacao.faixas else []
    if faltantes:
        linhas.append("Sem faixa neste lote: " + ", ".join(faltantes) + " (já associados a esta campanha).")
    return linhas


def situacao_do_pacote(importacao: Importacao, termos: list[str], idioma: str) -> str:
    """Diz em linguagem do Mestre o que falta para o pacote do motor ficar pronto."""
    validas = [f for f in importacao.faixas if f.info is not None]
    if not validas:
        return "Pacote do motor: aguardando faixas válidas."
    sem_identidade = sum(1 for f in validas if not f.confirmada)
    if sem_identidade:
        return f"Pacote do motor: pendente — confirme a identidade de {sem_identidade} faixa(s)."
    sem_registro = sum(1 for f in validas if not f.sincronizada)
    if sem_registro:
        return f"Pacote do motor: pendente — registre {sem_registro} faixa(s) no servidor."
    resultado = importacao.pacote_trabalho(termos, idioma.strip())
    if resultado["ok"]:
        pacote = resultado["pacote"]
        return f"Pacote do motor: pronto — {len(pacote['faixas'])} faixa(s), {len(pacote['glossario'])} termo(s) de glossário."
    return "Pacote do motor: pendente — " + resultado["erros"][0]


def escolher_arquivos_wav(pai) -> list[Path]:
    caminhos, _ = QFileDialog.getOpenFileNames(pai, "Selecionar arquivos WAV", "", "Áudio WAV (*.wav)")
    return [Path(c) for c in caminhos]


class PainelImportacao(QWidget):
    def __init__(self, executar, selecionar=escolher_arquivos_wav):
        super().__init__()
        self._executar, self._selecionar = executar, selecionar
        self._sessao = None
        self.importacao: Importacao | None = None
        self.termos: list[str] = []
        self._mensagens: dict[int, str] = {}
        self._pendente_parecido: tuple[int, str] | None = None
        self._rascunhos: dict[int, tuple[str, str]] = {}  # o que o usuário digitou, para não perder ao redesenhar após um aviso
        raiz = QVBoxLayout(self)
        raiz.setContentsMargins(0, 0, 0, 0)
        self.cartao, corpo = card("03", "Importação")
        raiz.addWidget(self.cartao)
        self.alertas = label()
        self.alertas.setProperty("papel", "aviso")
        self.alertas.hide()
        corpo.addWidget(self.alertas)
        self.selecionar_botao = button("Selecionar arquivos WAV")
        self.selecionar_botao.clicked.connect(self.escolher)
        corpo.addWidget(self.selecionar_botao)
        dica = label("Escolha os .wav da sessão ou arraste-os para a janela. Os arquivos ficam neste computador: só o nome, o "
                     "participante e o deslocamento vão ao servidor. O deslocamento é manual e opcional (pode ser negativo); o "
                     "silêncio inicial é só uma medida informativa e nunca é aplicado sozinho.")
        dica.setProperty("papel", "dados")
        corpo.addWidget(dica)
        self.lista = QVBoxLayout()
        self.lista.setSpacing(12)
        corpo.addLayout(self.lista)
        rotulo_idioma = label("Idioma da transcrição")
        rotulo_idioma.setProperty("papel", "rotulo")
        rotular(rotulo_idioma, 111)
        self.idioma = QLineEdit("pt")
        self.idioma.setMinimumHeight(44)
        self.idioma.setMaxLength(35)
        rotulo_idioma.setBuddy(self.idioma)
        self.idioma.textChanged.connect(self._atualizar_pacote)
        corpo.addWidget(rotulo_idioma)
        corpo.addWidget(self.idioma)
        self.status = label()
        self.status.setProperty("papel", "dados")
        self.status.hide()
        corpo.addWidget(self.status)
        self.registrar_botao = button("Registrar no servidor", "primario")
        self.registrar_botao.clicked.connect(self.registrar)
        corpo.addWidget(self.registrar_botao)
        self.pacote = label()
        self.pacote.setProperty("papel", "dados")
        corpo.addWidget(self.pacote)
        self.hide()

    # --- ciclo de vida -----------------------------------------------------
    def abrir(self, sessao) -> None:
        """Chamado quando a sessão é autorizada pelo site: busca associações e glossário e retoma o estado local da conta."""
        def preparar():
            return preparar_importacao(sessao), obter_glossario(sessao)

        def pronto(resultado):
            self._sessao = sessao
            self.importacao, self.termos = resultado
            self._mensagens.clear()
            self._rascunhos.clear()
            self._pendente_parecido = None
            self._status("")
            self.show()
            self.renderizar()
        self._executar(preparar, pronto)

    def fechar(self) -> None:
        self._sessao = None
        self.importacao = None
        self.hide()

    # --- seleção de arquivos ---------------------------------------------
    def escolher(self) -> None:
        self.receber(self._selecionar(self))

    def receber(self, caminhos: list[Path]) -> None:
        """Seleção do diálogo ou arrasto: só `.wav` entra; o conteúdo é verificado depois, arquivo a arquivo."""
        if self.importacao is None:
            return
        wavs = [Path(c) for c in caminhos if Path(c).suffix.lower() == ".wav"]
        ignorados = len(caminhos) - len(wavs)
        if not wavs:
            self._status("Escolha arquivos com a extensão .wav." if caminhos else "")
            return
        importacao = self.importacao

        def pronto(_):
            novas = importacao.faixas[-len(wavs):]
            com_erro = sum(1 for f in novas if f.info is None)
            partes = [f"{len(wavs)} arquivo(s) adicionado(s)"]
            if com_erro:
                partes.append(f"{com_erro} com erro (veja a faixa)")
            if ignorados:
                partes.append(f"{ignorados} ignorado(s): só .wav")
            self._status("; ".join(partes) + ".")
            self._salvar()
            self.renderizar()
        self._executar(lambda: importacao.adicionar(wavs), pronto)

    # --- ações por faixa -----------------------------------------------------
    def _confirmar(self, indice: int, participante: str, deslocamento: str) -> None:
        importacao = self.importacao
        self._rascunhos[indice] = (participante, deslocamento)
        try:
            milissegundos = int(deslocamento.strip() or "0")
        except ValueError:
            self._mensagens[indice] = "O deslocamento precisa ser um número inteiro de milissegundos (pode ser negativo)."
            self.renderizar()
            return
        confirmado = self._pendente_parecido == (indice, normalizar_rotulo(participante))
        try:
            importacao.ajustar_offset(indice, milissegundos)
            importacao.confirmar(indice, participante, confirmar_parecido=confirmado)
        except ParecidoError as aviso:
            self._pendente_parecido = (indice, normalizar_rotulo(participante))
            self._mensagens[indice] = str(aviso)
        except ValueError as erro:
            self._mensagens[indice] = str(erro)
        else:
            self._mensagens.pop(indice, None)
            self._rascunhos.pop(indice, None)
            self._pendente_parecido = None
            self._salvar()
        self.renderizar()

    def _limpar(self, indice: int) -> None:
        self.importacao.rejeitar_sugestao(indice)
        self._rascunhos.pop(indice, None)
        self._mensagens.pop(indice, None)
        self._pendente_parecido = None
        self._salvar()
        self.renderizar()

    def _remover(self, indice: int) -> None:
        self.importacao.remover(indice)
        self._rascunhos.clear()
        self._mensagens.clear()
        self._pendente_parecido = None
        self._salvar()
        self.renderizar()

    # --- registro --------------------------------------------------------
    def registrar(self) -> None:
        importacao, sessao = self.importacao, self._sessao
        if importacao is None or sessao is None:
            return

        def operacao():
            try:
                return importacao.registrar(sessao.api, sessao.credencial())
            finally:
                self._salvar()  # mesmo sem rede, o que já foi criado no servidor fica guardado

        def pronto(resumo):
            self._mensagens.clear()
            for item in resumo:
                if not item["ok"]:
                    self._mensagens[item["indice"]] = item["erro"]
            certas = sum(1 for item in resumo if item["ok"])
            falhas = len(resumo) - certas
            self._status(f"{certas} faixa(s) registrada(s)." + (f" {falhas} com problema (veja a faixa)." if falhas else "")
                                + " Associações novas ficam lembradas para as próximas sessões.")
            self.renderizar()
        self._executar(operacao, pronto)

    def _salvar(self) -> None:
        try:
            self.importacao.salvar(self._sessao.pasta_da_conta())
        except Exception:
            pass  # o estado local é conveniência; falhar ao gravar não pode derrubar a janela

    def _status(self, texto: str) -> None:
        self.status.setText(texto)
        self.status.setVisible(bool(texto))

    # --- desenho ---------------------------------------------------------
    def renderizar(self) -> None:
        while self.lista.count():
            item = self.lista.takeAt(0)
            if item.widget():
                item.widget().deleteLater()
        for indice, faixa in enumerate(self.importacao.faixas):
            self.lista.addWidget(self._desenhar_faixa(indice, faixa))
        linhas = linhas_de_alerta(self.importacao)
        self.alertas.setText("\n".join("• " + linha for linha in linhas))
        self.alertas.setVisible(bool(linhas))
        self.registrar_botao.setEnabled(any(f.info is not None and f.confirmada and not f.sincronizada for f in self.importacao.faixas))
        self._atualizar_pacote()

    def _atualizar_pacote(self) -> None:
        if self.importacao is not None:
            self.pacote.setText(situacao_do_pacote(self.importacao, self.termos, self.idioma.text()))

    def _desenhar_faixa(self, indice: int, faixa) -> QFrame:
        estado = estado_da_faixa(faixa)
        quadro = QFrame()
        quadro.setProperty("papel", "faixa")
        quadro.setProperty("estado", estado)
        layout = QVBoxLayout(quadro)
        layout.setContentsMargins(16, 14, 16, 16)
        layout.setSpacing(10)
        topo = QHBoxLayout()
        topo.setSpacing(10)
        nome = RotuloElidido(faixa.nome_arquivo)
        nome.setProperty("papel", "nome")
        chip = QLabel(ESTADOS[estado])
        chip.setProperty("papel", "estado")
        chip.setProperty("estado", estado)
        rotular(chip, 108)
        topo.addWidget(nome, 1)
        topo.addWidget(chip, 0, Qt.AlignmentFlag.AlignVCenter)
        layout.addLayout(topo)
        if faixa.info is None:
            erro = label(faixa.erro.removeprefix(faixa.nome_arquivo + ": "))
            erro.setProperty("papel", "aviso")
            erro.setProperty("nivel", "erro")
            layout.addWidget(erro)
            remover = button("Remover da lista", "compacto")
            remover.clicked.connect(lambda _=False, i=indice: self._remover(i))
            layout.addWidget(remover, 0, Qt.AlignmentFlag.AlignLeft)
            return quadro
        dados = label(descrever_faixa(faixa.info))
        dados.setProperty("papel", "dados")
        layout.addWidget(dados)
        if faixa.sugestao["origem"] == "AMBIGUA" and not faixa.confirmada:
            ambigua = label("Mais de uma pessoa associada a este nome: " + ", ".join(faixa.sugestao["candidatos"]) + ". Escolha ou digite.")
            ambigua.setProperty("papel", "dados")
            layout.addWidget(ambigua)
        digitado_pessoa, digitado_offset = self._rascunhos.get(indice, (faixa.participante or "", str(faixa.deslocamento_ms)))
        pessoa = QLineEdit(digitado_pessoa)
        pessoa.setPlaceholderText("Nome da pessoa desta faixa")
        pessoa.setMinimumHeight(44)
        pessoa.setMaxLength(255)
        pessoa.setAccessibleName(f"Participante da faixa {faixa.nome_arquivo}")
        offset = QLineEdit(digitado_offset)
        offset.setMinimumHeight(44)
        offset.setMaxLength(16)
        offset.setAccessibleName(f"Deslocamento em milissegundos da faixa {faixa.nome_arquivo}")
        campos = QHBoxLayout()
        campos.setSpacing(12)
        for titulo, campo, peso in (("Participante", pessoa, 3), ("Deslocamento (ms)", offset, 1)):
            coluna = QVBoxLayout()
            coluna.setSpacing(6)
            rotulo = label(titulo)
            rotulo.setProperty("papel", "rotulo")
            rotular(rotulo, 111)
            rotulo.setBuddy(campo)
            coluna.addWidget(rotulo)
            coluna.addWidget(campo)
            campos.addLayout(coluna, peso)
        layout.addLayout(campos)
        aviso = self._mensagens.get(indice)
        if aviso:
            mensagem = label(aviso)
            mensagem.setProperty("papel", "aviso")
            layout.addWidget(mensagem)
        pendente = self._pendente_parecido is not None and self._pendente_parecido[0] == indice
        acoes = QHBoxLayout()
        acoes.setSpacing(8)
        confirmar = button("Confirmar mesmo assim" if pendente else ("Confirmar de novo" if faixa.confirmada else "Confirmar"),
                           "compacto")
        confirmar.clicked.connect(lambda _=False, i=indice, p=pessoa, o=offset: self._confirmar(i, p.text(), o.text()))
        pessoa.returnPressed.connect(confirmar.click)
        offset.returnPressed.connect(confirmar.click)
        limpar = button("Limpar nome", "compacto")
        limpar.clicked.connect(lambda _=False, i=indice: self._limpar(i))
        remover = button("Remover", "compacto")
        remover.clicked.connect(lambda _=False, i=indice: self._remover(i))
        for item in (confirmar, limpar, remover):
            acoes.addWidget(item)
        acoes.addStretch(1)
        layout.addLayout(acoes)
        return quadro
