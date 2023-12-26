var socket = io.connect('http://' + document.domain + ':' + location.port);

socket.on('connect', function() {
    socket.send('User has connected!');
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
    socket.send(document.getElementById('myMessage').value);
    document.getElementById('myMessage').value = '';
}

document.getElementById('myMessage').addEventListener('keypress', function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
    }
});

socket.on('active_users', function(users) {
    console.log("Active Users: ", users);  
    var userList = document.getElementById('user-list');
    userList.innerHTML = '';  
    users.forEach(function(user) {
        var li = document.createElement('li');
        li.className = 'user-active';
        li.innerHTML = `<span class="online-dot"></span>${user.username}`;
        userList.appendChild(li);
    });
});