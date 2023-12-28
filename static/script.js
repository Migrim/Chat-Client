var socket = io.connect('http://' + document.domain + ':' + location.port);

socket.on('connect', function() {
    socket.send('');
});

socket.on('system_message', function(message) {
    const messagesContainer = document.getElementById('messages');
    
    let messageElement = document.createElement('div');
    messageElement.className = 'system-message';
    
    let userTimeDiv = document.createElement('div');
    userTimeDiv.innerHTML = `<strong>${message.user} - ${message.timestamp}</strong>`;
    
    let messageTextDiv = document.createElement('div');
    messageTextDiv.textContent = message.text;
    
    messageElement.appendChild(userTimeDiv);
    messageElement.appendChild(messageTextDiv);
    
    messagesContainer.appendChild(messageElement);
});



function sendMessage() {
    let messageText = document.getElementById('myMessage').value;
    if (messageText.trim().length > 0) {  
        socket.emit('chat message', messageText);  
        document.getElementById('myMessage').value = '';
    }
}


document.getElementById('myMessage').addEventListener('keypress', function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
    }
});

socket.on('active_users', function(usernames) {
    console.log("Active Users: ", usernames);
    var userList = document.getElementById('user-list');
    userList.innerHTML = '';
    usernames.forEach(function(username) {
        var li = document.createElement('li');
        li.className = 'user-active';

        li.innerHTML = `<span class="online-dot" style="background-color: #00FF00;"></span>${username}`;
        userList.appendChild(li);
    });
});

socket.on('chat message', function(message) {
    const messagesContainer = document.getElementById('messages');
    
    let messageElement = document.createElement('div');
    
    if (message.user === currentUsername) {
        messageElement.className = 'my-message';
    } else {
        messageElement.className = message.user === "System" ? 'system-message' : 'user-message';
    }
    
    let userTimeDiv = document.createElement('div');
    userTimeDiv.innerHTML = `<strong>${message.user}</strong> - <span class="timestamp">${message.timestamp}</span>`;
    
    let messageTextDiv = document.createElement('div');
    messageTextDiv.textContent = message.text;
    
    messageElement.appendChild(userTimeDiv);
    messageElement.appendChild(messageTextDiv);
    
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
});
