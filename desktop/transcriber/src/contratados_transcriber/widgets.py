"""Blocos visuais compartilhados da janela: cartão numerado, botão e rótulo (equivalentes Qt dos padrões do site)."""
from PySide6.QtCore import Qt
from PySide6.QtGui import QFontMetrics
from PySide6.QtWidgets import QFrame, QHBoxLayout, QLabel, QPushButton, QVBoxLayout

from .theme import rotular


def label(text=""):
    item = QLabel(text)
    item.setWordWrap(True)
    item.setTextFormat(Qt.TextFormat.PlainText)
    item.setTextInteractionFlags(Qt.TextInteractionFlag.TextSelectableByMouse)
    return item


def card(index, title):
    """Cartão do site: índice `//`/`01`, título mono em caixa alta e régua hairline."""
    frame = QFrame()
    frame.setProperty("papel", "cartao")
    layout = QVBoxLayout(frame)
    layout.setContentsMargins(20, 16, 20, 20)
    layout.setSpacing(12)
    head = QHBoxLayout()
    head.setSpacing(12)
    chip = QLabel(index)
    chip.setProperty("papel", "indice")
    heading = QLabel(title)
    heading.setProperty("papel", "titulo")
    rotular(heading, 112)
    rule = QFrame()
    rule.setProperty("papel", "regua")
    rule.setFixedHeight(1)
    head.addWidget(chip)
    head.addWidget(heading)
    head.addWidget(rule, 1, Qt.AlignmentFlag.AlignVCenter)
    layout.addLayout(head)
    return frame, layout


def button(text, variant=None):
    item = QPushButton(text)
    rotular(item, 108)
    if variant:
        item.setProperty("variante", variant)
    item.setMinimumHeight(44)
    return item


class RotuloElidido(QLabel):
    """Texto de uma linha que nunca estoura a largura: corta no meio e guarda o texto inteiro na dica."""

    def __init__(self, texto=""):
        super().__init__()
        self._texto = ""
        self.setTextFormat(Qt.TextFormat.PlainText)
        self.setMinimumWidth(0)
        self.definir_texto(texto)

    def definir_texto(self, texto: str) -> None:
        self._texto = texto
        self.setToolTip(texto)
        self.setAccessibleName(texto)
        self._ajustar()

    def resizeEvent(self, evento):
        super().resizeEvent(evento)
        self._ajustar()

    def _ajustar(self) -> None:
        largura = max(self.width() - 2, 0)
        super().setText(QFontMetrics(self.font()).elidedText(self._texto, Qt.TextElideMode.ElideMiddle, largura) if largura else self._texto)
