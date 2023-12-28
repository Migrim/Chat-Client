from flask import Flask, render_template, request, redirect, url_for
from flask_socketio import SocketIO, send, emit
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = 'LKDNJZFGVBQWOIDH'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
db = SQLAlchemy(app)
socketio = SocketIO(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'
online_users = {}

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(20), unique=True, nullable=False)
    password = db.Column(db.String(60), nullable=False)
    online = db.Column(db.Boolean, default=False)

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id)) 

@app.route('/')
@login_required
def index():
    return render_template('chat.html', username=current_user.username) 

@app.route("/login", methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.filter_by(username=username).first()
        if user and user.password == password:  
            login_user(user)
            return redirect(url_for('index'))
        else:
            return 'Login Unsuccessful. Please check username and password'
    return render_template('login.html')  

@app.route("/logout")
def logout():
    logout_user()
    return redirect(url_for('login'))

@socketio.on('connect')
def handle_connect():
    if current_user.is_authenticated:
        online_users[current_user.username] = True
        emit_active_users()
        msg = f"{current_user.username} connected!"
    else:

        msg = "Guest connected!"

    system_message = {
        "user": "System",
        "text": msg,
        "timestamp": datetime.now().strftime("%H:%M")  
    }

    socketio.emit('system_message', system_message)

@socketio.on('disconnect')
def handle_disconnect():
    if current_user.is_authenticated:
        online_users.pop(current_user.username, None)
        emit_active_users()

@socketio.on('chat message') 
@login_required
def handleMessage(msg):
    print(f'Message: {msg}')
    message_data = {
        'user': current_user.username,
        'text': msg,
        'timestamp': datetime.now().strftime("%H:%M")
    }
    emit('chat message', message_data, broadcast=True)

@socketio.on('user_active')
def handle_user_active(data):
    user = User.query.get(data['user_id'])
    if user:
        user.online = True
        db.session.commit()
        emit_active_users()

def emit_active_users():
    active_users = User.query.all()
    active_usernames = [{
        'username': user.username,
        'id': user.id,
        'online': user.online
    } for user in active_users]
    print("Emitting Active Users: ", active_usernames)  
    socketio.emit('active_users', list(online_users.keys()))

if __name__ == '__main__':
    with app.app_context():
        db.create_all() 
    socketio.run(app)