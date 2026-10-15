"""Windows shell. Network work runs off the UI thread; no terminal required."""
import hashlib
import os
import socket
import sys
import webbrowser
from PySide6.QtCore import QObject, QRunnable, QThreadPool, Signal, Qt
from PySide6.QtNetwork import QLocalServer, QLocalSocket
from PySide6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton, QLineEdit,
                               QMessageBox, QFrame, QScrollArea)
from .api import Api
from .core import Session, parse_uri, validate_origin, CredentialError, OfflineError
from .windows import store_for, resources
from .theme import STYLE, rotular

API_ORIGIN = "https://contratados-rpg-api-35du2tp43q-rj.a.run.app"
SITE_ORIGIN = "https://contratados-rpg.pages.dev"

class Signals(QObject):
    success = Signal(object)
    failure = Signal(object)
class Job(QRunnable):
    def __init__(self, operation):
        super().__init__(); self.operation = operation; self.signals = Signals()
    def run(self):
        try: self.signals.success.emit(self.operation())
        except Exception as error: self.signals.failure.emit(error)

def label(text=""):
    item = QLabel(text); item.setWordWrap(True); item.setTextFormat(Qt.TextFormat.PlainText)
    item.setTextInteractionFlags(Qt.TextInteractionFlag.TextSelectableByMouse)
    return item

def card(index, title):
    """Cartão do site: índice `//`/`01`, título mono em caixa alta e régua hairline."""
    frame = QFrame(); frame.setProperty("papel", "cartao")
    layout = QVBoxLayout(frame); layout.setContentsMargins(20, 16, 20, 20); layout.setSpacing(12)
    head = QHBoxLayout(); head.setSpacing(12)
    chip = QLabel(index); chip.setProperty("papel", "indice")
    heading = QLabel(title); heading.setProperty("papel", "titulo"); rotular(heading, 112)
    rule = QFrame(); rule.setProperty("papel", "regua"); rule.setFixedHeight(1)
    head.addWidget(chip); head.addWidget(heading); head.addWidget(rule, 1, Qt.AlignmentFlag.AlignVCenter)
    layout.addLayout(head)
    return frame, layout

def button(text, variant=None):
    item = QPushButton(text); rotular(item, 108)
    if variant: item.setProperty("variante", variant)
    item.setMinimumHeight(44)
    return item

class Window(QMainWindow):
    def __init__(self):
        super().__init__(); self.setWindowTitle("Contratados Transcriber"); self.resize(640, 760); self.setMinimumWidth(560)  # cabe o maior rótulo de botão (QPushButton não quebra linha)
        area = QScrollArea(); area.setWidgetResizable(True); self.setCentralWidget(area)
        area.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        widget = QWidget(); area.setWidget(widget); layout = QVBoxLayout(widget); layout.setSpacing(16); layout.setContentsMargins(24, 24, 24, 24)
        self.api_origin = QLineEdit(API_ORIGIN); self.site_origin = QLineEdit(SITE_ORIGIN)
        self.name = QLineEdit(socket.gethostname()[:120]); self.name.setMaxLength(120)
        for edit in (self.api_origin, self.site_origin, self.name): edit.setMinimumHeight(44)
        self.status = label("Escolha Vincular conta. Nenhum áudio é enviado ao site."); self.context = label("Nenhuma sessão aberta.")
        home, home_layout = card("//", "Contratados Transcriber"); home_layout.addWidget(self.status); home_layout.addWidget(self.context); layout.addWidget(home)
        connection, connection_layout = card("01", "Conexão")
        for title, edit in [("Servidor HTTPS", self.api_origin), ("Site de confirmação HTTPS", self.site_origin), ("Nome do computador", self.name)]:
            title_label = label(title); title_label.setProperty("papel", "rotulo"); rotular(title_label, 111)
            title_label.setBuddy(edit); connection_layout.addWidget(title_label); connection_layout.addWidget(edit)
        self.link = button("Vincular conta", "primario"); self.link.clicked.connect(self.start_link); connection_layout.addWidget(self.link)
        self.refresh_button = button("Verificar vínculo / tentar revogação pendente"); self.refresh_button.clicked.connect(self.refresh); connection_layout.addWidget(self.refresh_button)
        self.disconnect_button = button("Desconectar e preservar resultados locais", "perigo"); self.disconnect_button.clicked.connect(self.disconnect); connection_layout.addWidget(self.disconnect_button)
        layout.addWidget(connection)
        resources_card, resources_layout = card("02", "Recursos locais")
        self.local_resources = label(); self.local_resources.setProperty("papel", "dados"); resources_layout.addWidget(self.local_resources); layout.addWidget(resources_card)
        layout.addStretch(); self.session = None; self.busy = False
        self.refresh_resources()
    def refresh_resources(self):
        try: self.local_resources.setText("\n".join(f"{k}: {v}" for k, v in resources().items()))
        except Exception: self.local_resources.setText("Não foi possível inspecionar todos os recursos locais.")
    def configure(self):
        origin = validate_origin(self.api_origin.text().strip())
        if self.session and self.session.api.origin != origin:
            self.session.context = None; self.context.setText("Nenhuma sessão aberta.")
        if not self.session or self.session.api.origin != origin:
            self.session = Session(Api(origin), store_for(origin))
        return self.session
    def work(self, operation, success):
        if self.busy:
            self.status.setText("Aplicativo ocupado. Aguarde e tente abrir novamente pelo site."); return
        self.busy = True
        for item in [self.link, self.refresh_button, self.disconnect_button, self.api_origin, self.site_origin, self.name]: item.setEnabled(False)
        def finish():
            self.busy = False
            for item in [self.link, self.refresh_button, self.disconnect_button, self.api_origin, self.site_origin, self.name]: item.setEnabled(True)
        def ok(result): finish(); success(result)
        def fail(error):
            finish()
            if isinstance(error, CredentialError):
                if self.session: self.session.context = None
                self.context.setText("Nenhuma sessão aberta.")
            self.status.setText(str(error) if isinstance(error, (ValueError, CredentialError, OfflineError)) else "Falha local. Verifique o vínculo e a proteção Windows; nenhum resultado foi apagado.")
        job = Job(operation); self.current_job = job
        job.signals.success.connect(ok); job.signals.failure.connect(fail)
        QThreadPool.globalInstance().start(job)
    def start_link(self):
        try: session = self.configure(); site = validate_origin(self.site_origin.text().strip())
        except Exception as error: self.status.setText(str(error)); return
        name = self.name.text().strip()
        if not name: self.status.setText("Informe o nome do computador."); return
        def linked(p):
            self.status.setText("Confira o código " + p["codigo"] + " no site. Após confirmar, clique em Verificar vínculo. O pedido expira em dez minutos.")
            url = site + "/transcricoes/vinculo/" + p["identificador"]
            if not webbrowser.open(url): self.status.setText(self.status.text() + " Abra manualmente: " + url)
        self.work(lambda: session.start_link(name), linked)
    def refresh(self):
        try: session = self.configure()
        except Exception as error: self.status.setText(str(error)); return
        def done(s):
            if s.get("vinculado"): self.status.setText("Vinculado à conta " + str(s.get("login")) + ". Abra uma sessão pelo site.")
            else:
                self.context.setText("Nenhuma sessão aberta.")
                if session.store.load().get("revocation_pending"): self.status.setText("Desconectado localmente. Revogação no servidor pendente de internet; resultados preservados.")
                else: self.status.setText("Vínculo expirado/revogado. Desconecte e vincule novamente." if s.get("expirado") else "Sem vínculo confirmado. Inicie ou confirme no site.")
        self.work(session.refresh, done)
    def disconnect(self):
        try: session = self.configure()
        except Exception as error: self.status.setText(str(error)); return
        self.context.setText("Nenhuma sessão aberta.")
        def done(_):
            pending = session.store.load().get("revocation_pending")
            self.status.setText("Desconectado localmente. Revogação no servidor pendente de internet." if pending else "Dispositivo desconectado. Resultados locais preservados.")
        self.work(session.disconnect, done)
    def open_uri(self, uri):
        self.showNormal(); self.raise_(); self.activateWindow()
        try: intent = parse_uri(uri); session = self.configure()
        except Exception: self.status.setText("Abertura inválida; nenhuma ação executada."); return
        def operation(): session.refresh(); return session.resolve(intent)
        self.work(operation, lambda c: (self.context.setText(f"Sessão: {c['titulo']}\nCampanha: {c['campanhaId']}"), self.status.setText("Contexto autorizado. Importação e transcrição serão disponibilizadas nas próximas etapas.")))

class InstanceServer:
    """User-only local IPC, carrying only opaque URI, never credentials/audio/context."""
    def __init__(self, window, name):
        self.server = QLocalServer(window); self.server.setSocketOptions(QLocalServer.SocketOption.UserAccessOption)
        self.server.newConnection.connect(lambda: self.accept(window))
        if not self.server.listen(name): raise OSError("Não foi possível iniciar o aplicativo. Feche a instância anterior e tente novamente.")
    def accept(self, window):
        from PySide6.QtCore import QTimer
        connection = self.server.nextPendingConnection(); connection.setReadBufferSize(256)
        buffer = bytearray()
        def read():
            buffer.extend(bytes(connection.readAll()))
            if len(buffer) > 128: connection.disconnectFromServer(); return
            if b"\n" not in buffer: return
            try:
                text = bytes(buffer).decode("utf-8").rstrip("\n")
                if text == "ativar": window.showNormal(); window.raise_(); window.activateWindow()
                else: window.open_uri(text)
            except Exception: window.status.setText("Abertura inválida.")
            connection.disconnectFromServer()
        connection.readyRead.connect(read); connection.disconnected.connect(connection.deleteLater)
        QTimer.singleShot(3000, connection.disconnectFromServer)
        read()

def main():
    app = QApplication(sys.argv[:1]); app.setStyleSheet(STYLE)
    if os.name != "nt": QMessageBox.critical(None, "Windows necessário", "Este aplicativo requer Windows de 64 bits."); return 1
    uri = sys.argv[1] if len(sys.argv) == 2 else None
    if len(sys.argv) > 2: QMessageBox.warning(None, "Abertura inválida", "Nenhuma ação executada."); return 1
    if uri:
        try: parse_uri(uri)
        except ValueError: QMessageBox.warning(None, "Abertura inválida", "Nenhuma ação executada."); return 1
    name = "contratados-transcriber-" + hashlib.sha256(os.environ["LOCALAPPDATA"].encode()).hexdigest()
    probe = QLocalSocket(); probe.connectToServer(name)
    if probe.waitForConnected(500):
        probe.write(((uri or "ativar") + "\n").encode()); probe.waitForBytesWritten(1000); probe.disconnectFromServer(); return 0
    QLocalServer.removeServer(name)  # Stale endpoint after crash, scoped to this Windows profile.
    window = Window(); server = InstanceServer(window, name); window.show()
    from PySide6.QtCore import QTimer
    QTimer.singleShot(0, (lambda: window.open_uri(uri)) if uri else window.refresh)
    return app.exec()

if __name__ == "__main__": sys.exit(main())
