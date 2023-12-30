from flask import Flask, render_template, request, redirect, url_for
from flask_socketio import SocketIO, send, emit
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from datetime import datetime
from werkzeug.utils import secure_filename
import os
from flask import jsonify

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

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    username = db.Column(db.String(20), nullable=False)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"Message('{self.username}', '{self.timestamp}')"
    
class Image(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    username = db.Column(db.String(20), nullable=False)
    image_url = db.Column(db.String(300), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"Image('{self.id}', '{self.username}', '{self.image_url}')"

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id)) 

def emit_recent_messages(username):
    recent_messages = Message.query.order_by(Message.timestamp.desc()).limit(50).all()  
    messages_json = [{
        'id': message.id,
        'user': message.username,
        'user_id': message.user_id,
        'text': message.content,
        'timestamp': message.timestamp.strftime("%H:%M")
    } for message in recent_messages]
    
    emit('recent_messages', messages_json[::-1], room=request.sid)

@app.route('/')
@login_required
def index():
    recent_messages = get_recent_messages() 
    return render_template('chat.html', username=current_user.username, recent_messages=recent_messages)

def get_recent_messages():
    recent_messages = Message.query.order_by(Message.timestamp.desc()).limit(50).all()  
    return [{
        'id': message.id,
        'user': message.username,
        'user_id': message.user_id,
        'text': message.content,
        'timestamp': message.timestamp.strftime("%H:%M")
    } for message in recent_messages][::-1]  

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
        emit_recent_messages(current_user.username)
        msg = f"{current_user.username} connected!"
    else:
        msg = "Guest connected!"

    system_message = {
        "user": "System",
        "text": msg,
        "timestamp": datetime.now().strftime("%H:%M")  
    }

    emit('system_message', system_message, broadcast=True)

@socketio.on('request_recent_messages')
@login_required
def handle_request_recent_messages(username):
    emit_recent_messages(username)

@socketio.on('disconnect')
def handle_disconnect():
    if current_user.is_authenticated:
        online_users.pop(current_user.username, None)
        emit_active_users()

@socketio.on('chat message') 
@login_required
def handleMessage(msg):
    print(f'Message: {msg}')
    message = Message(user_id=current_user.id, username=current_user.username, content=msg)
    db.session.add(message)
    db.session.commit()
    
    message_data = {
        'id': message.id,
        'user': current_user.username,
        'text': msg,
        'timestamp': message.timestamp.strftime("%H:%M")
    }
    emit('new_chat_message', message_data, broadcast=True)

@app.route('/upload_image', methods=['POST'])
@login_required
def upload_image():
    if 'image' in request.files:
        image = request.files['image']
        if image.filename != '':
            filename = secure_filename(image.filename)
            image_path = os.path.join('static', 'user_upload', filename)
            image.save(image_path)
            
            web_image_path = url_for('static', filename=f'user_upload/{filename}')

            new_image = Image(user_id=current_user.id, username=current_user.username, image_url=web_image_path)
            db.session.add(new_image)
            db.session.commit()

            socketio.emit('new_image', {'image_id': new_image.id, 'image_url': web_image_path}, broadcast=True)

    return redirect(url_for('index'))

@socketio.on('typing') 
def on_typing(username):
    emit('user_typing', {'username': username}, broadcast=True, include_self=False)

@socketio.on('stop_typing')
def on_stop_typing(username):
    emit('user_stop_typing', {'username': username}, broadcast=True, include_self=False)

@socketio.on('user_active')
def handle_user_active(data):
    user = User.query.get(data['user_id'])
    if user:
        user.online = True
        db.session.commit()
        emit_active_users()

@app.route("/delete_message/<int:message_id>", methods=['POST'])
@login_required
def delete_message(message_id):
    message = Message.query.get_or_404(message_id)
    if message and message.user_id == current_user.id:
        message.content = "Deleted by user"
        db.session.commit()
        emit('message_deleted', {'message_id': message.id, 'new_content': "Deleted by user"}, broadcast=True)
    return redirect(url_for('index'))

@socketio.on('delete_message')
@login_required
def handle_delete_message(json):
    message_id = json.get('message_id')
    message = Message.query.get(message_id)
    if message and message.user_id == current_user.id:
        message.content = "Deleted by user"
        db.session.commit()

        emit('refresh_messages', broadcast=True)

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
    socketio.run(app, host='0.0.0.0', port=5000)