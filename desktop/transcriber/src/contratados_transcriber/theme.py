"""Tema do aplicativo: equivalente Qt do "Terminal de Contenção" (dark base).

Mapeamento explícito de `docs/design/tema/_tokens.scss` e dos padrões de `_componentes.scss`
(cartão com índice `//`, rótulo mono em caixa alta, botão primário/secundário/perigo, campo).
Qt não consome CSS do site nem componentes Angular: estes são os equivalentes próprios do app.
Só a base escura existe aqui (a base clara e o accent por usuário são do site).
"""
from PySide6.QtGui import QFont

TOKENS = {
    "bg": "#0a0c0f", "surface": "#13161b", "surface_2": "#1a1e24",
    "border": "rgba(255, 255, 255, 0.07)", "border_strong": "rgba(255, 255, 255, 0.12)",
    "text": "#e6e8eb", "text_dim": "#969ba3", "text_mute": "#656a72",
    "accent": "#d53030", "accent_text": "#ffffff", "accent_hover": "#c42c2c", "accent_press": "#b32828",
    "accent_border": "rgba(213, 48, 48, 0.4)", "accent_dim": "rgba(213, 48, 48, 0.12)",
    "erro": "#d62222", "erro_border": "rgba(214, 34, 34, 0.4)",
    "radius_card": "6px", "radius_control": "4px", "radius_compact": "3px",
}
# IBM Plex é a identidade; o app não embute as fontes (decisão pendente do autor) e cai nas do Windows.
MONO = "'IBM Plex Mono', 'Cascadia Mono', Consolas, monospace"
SANS = "'IBM Plex Sans', 'Segoe UI', sans-serif"

_QSS = """
QWidget { background: @bg; color: @text; font-family: @sans; font-size: 14px; }
QLabel { background: transparent; }
QScrollArea { border: none; }
QFrame[papel="cartao"] { background: @surface; border: 1px solid @border; border-radius: @radius_card; }
QFrame[papel="regua"] { background: @border; border: none; }
QLabel[papel="indice"] { font-family: @mono; font-size: 12px; font-weight: 700; color: @accent;
  border: 1px solid @accent; border-radius: @radius_compact; min-width: 22px; max-width: 22px;
  min-height: 22px; max-height: 22px; qproperty-alignment: AlignCenter; }
QLabel[papel="titulo"] { font-family: @mono; font-size: 13px; font-weight: 600; color: @text; }
QLabel[papel="rotulo"] { font-family: @mono; font-size: 10px; font-weight: 600; color: @text_mute; }
QLabel[papel="dados"] { font-family: @mono; font-size: 12px; color: @text_dim; }
QLabel[papel="aviso"] { background: @accent_dim; border: 1px solid @accent_border;
  border-radius: @radius_control; padding: 10px 12px; }
QLineEdit { background: @surface_2; border: 1px solid @border_strong; border-radius: @radius_control;
  padding: 10px 12px; font-family: @mono; font-size: 14px; selection-background-color: @accent; }
QLineEdit:focus { border: 1px solid @accent; }
QLineEdit:disabled { color: @text_mute; }
QPushButton { background: transparent; border: 1px solid @border_strong; border-radius: @radius_control;
  padding: 12px 16px; font-family: @mono; font-size: 12px; font-weight: 700; color: @text; }
QPushButton:hover { background: @surface_2; }
QPushButton:focus { border: 1px solid @accent; }
QPushButton:disabled { color: @text_mute; border-color: @border; background: transparent; }
QPushButton[variante="primario"] { background: @accent; border-color: @accent; color: @accent_text; }
QPushButton[variante="primario"]:hover { background: @accent_hover; border-color: @accent_hover; }
QPushButton[variante="primario"]:pressed { background: @accent_press; border-color: @accent_press; }
QPushButton[variante="primario"]:focus { border: 1px solid @text; }
QPushButton[variante="primario"]:disabled { background: rgba(213, 48, 48, 0.35); color: rgba(255, 255, 255, 0.55);
  border-color: transparent; }
QPushButton[variante="perigo"] { color: @erro; border-color: @erro_border; }
QPushButton[variante="perigo"]:hover { background: rgba(214, 34, 34, 0.08); }
QPushButton[variante="perigo"]:disabled { color: @text_mute; border-color: @border; }
QScrollBar:vertical { background: transparent; width: 10px; margin: 0; }
QScrollBar::handle:vertical { background: @border_strong; border-radius: 5px; min-height: 24px; }
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical { height: 0; }
"""

def _montar() -> str:
    texto = _QSS.replace("@mono", MONO).replace("@sans", SANS)
    # Troca do mais longo para o mais curto: `@surface_2` antes de `@surface`, etc.
    for nome in sorted(TOKENS, key=len, reverse=True):
        texto = texto.replace("@" + nome, TOKENS[nome])
    return texto

STYLE = _montar()

def rotular(widget, espacamento: int = 112, caixa_alta: bool = True) -> None:
    """Caixa alta e espaçamento entre letras: o QSS não tem esses recursos, a fonte do widget tem."""
    fonte = widget.font()
    if caixa_alta: fonte.setCapitalization(QFont.Capitalization.AllUppercase)
    fonte.setLetterSpacing(QFont.SpacingType.PercentageSpacing, espacamento)
    widget.setFont(fonte)
