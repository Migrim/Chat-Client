# Server Code
import socket
import threading
from PyQt5.QtWidgets import QApplication, QWidget, QVBoxLayout, QPushButton, QTextEdit

# Dummy user database
users = {"admin": "1234", "user2": "password2"}

def handle_client(client_socket):
    try:
        # Authenticate
        credentials = client_socket.recv(1024).decode('utf-8')
        username, password = credentials.split(':')
        if users.get(username) == password:
            client_socket.sendall("AUTH_SUCCESS".encode('utf-8'))
            while True:
                msg = client_socket.recv(1024)
                if msg:
                    print(f"Received: {msg.decode('utf-8')}")
                    client_socket.send(msg)  # Echo back the received message
                else:
                    break
        else:
            client_socket.sendall("AUTH_FAILED".encode('utf-8'))
    except:
        print("Error with client connection.")
    finally:
        client_socket.close()

def server_program(gui):
    host = 'localhost'
    port = 7440

    server_socket = socket.socket()  
    server_socket.bind((host, port))

    server_socket.listen(2)
    gui.append_to_log(f"Server listening on {host}:{port}...")

    while True:
        conn, address = server_socket.accept()
        gui.append_to_log(f"Connection from {address} has been established!")
        client_thread = threading.Thread(target=handle_client, args=(conn,))
        client_thread.start()

class ServerGUI(QWidget):
    def __init__(self):
        super().__init__()
        self.initUI()
        self.server_thread = threading.Thread(target=server_program, args=(self,))
        self.server_thread.start()

    def initUI(self):
        self.setWindowTitle('Server Control')
        self.layout = QVBoxLayout()
        self.log = QTextEdit()
        self.log.setReadOnly(True)
        self.layout.addWidget(self.log)
        self.startButton = QPushButton('Start Server')
        self.stopButton = QPushButton('Stop Server')
        self.layout.addWidget(self.startButton)
        self.layout.addWidget(self.stopButton)
        self.setLayout(self.layout)

    def append_to_log(self, text):
        self.log.append(text)

app = QApplication([])
server_gui = ServerGUI()
server_gui.show()
app.exec_()
