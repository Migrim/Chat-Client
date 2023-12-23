import sys
from PyQt5.QtWidgets import QApplication, QWidget, QTextEdit, QVBoxLayout, QPushButton, QLineEdit
import socket

class ClientWidget(QWidget):
    def __init__(self):
        super().__init__()
        self.initUI()
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.connect(('localhost', 7440))

    def initUI(self):
        self.setWindowTitle('Chat Client')

        self.layout = QVBoxLayout()

        self.textEdit = QTextEdit()
        self.textEdit.setReadOnly(True)
        self.layout.addWidget(self.textEdit)

        self.textLine = QLineEdit()
        self.layout.addWidget(self.textLine)

        self.sendButton = QPushButton('Send')
        self.sendButton.clicked.connect(self.send_message)
        self.layout.addWidget(self.sendButton)

        self.setLayout(self.layout)

    def send_message(self):
        msg = self.textLine.text()
        self.sock.sendall(msg.encode('utf-8'))
        received = self.sock.recv(1024).decode('utf-8')
        self.textEdit.append(f"Sent: {msg}")
        self.textEdit.append(f"Received: {received}")
        self.textLine.clear()

app = QApplication(sys.argv)
client = ClientWidget()
client.show()
sys.exit(app.exec_())
