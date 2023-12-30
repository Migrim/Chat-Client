let knownMessageIds = new Set(); // Set to track known message IDs
var socket = io.connect('http://' + document.domain + ':' + location.port);

socket.on('connect', function() {
    socket.emit('request_recent_messages', currentUsername);
});

socket.on('system_message', function(message) {
    const messagesContainer = document.getElementById('messages');
    let messageElement = createMessageElement(message, 'system-message');
    messagesContainer.appendChild(messageElement);
});

function sendMessage() {
    let messageText = document.getElementById('myMessage').value;
    if (messageText.trim().length > 0) {
        socket.emit('chat message', messageText);
        document.getElementById('myMessage').value = '';
        socket.emit('stop_typing', currentUsername);
    }
}

document.getElementById('myMessage').addEventListener('keypress', function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
    } else {
        socket.emit('typing', currentUsername);
    }
});

socket.on('active_users', function(usernames) {
    var userList = document.getElementById('user-list');
    userList.innerHTML = '';
    usernames.forEach(function(username) {
        var li = document.createElement('li');
        li.className = 'user-active';
        li.setAttribute('data-username', username); 
        li.innerHTML = `<span class="online-dot" style="background-color: #00FF00;"></span>${username}`;
        userList.appendChild(li);
    });
});

let typingTimeout;
document.getElementById('myMessage').addEventListener('keydown', function() {
    clearTimeout(typingTimeout);
    socket.emit('typing', currentUsername);
    typingTimeout = setTimeout(function() {
        socket.emit('stop_typing', currentUsername);
    }, 3000);
});

socket.on('user_typing', function(data) {
    let userListItem = document.querySelector(`#user-list li[data-username="${data.username}"]`);
    if (userListItem) {
        userListItem.classList.add('typing');
        clearTimeout(typingTimeout); 
        typingTimeout = setTimeout(function() { 
            userListItem.classList.remove('typing');
        }, 3000);
    }
});

socket.on('user_stop_typing', function(data) {
    let userListItem = document.querySelector(`#user-list li[data-username="${data.username}"]`);
    if (userListItem) {
        userListItem.classList.remove('typing');
    }
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


socket.on('recent_messages', function(messages) {
    const messagesContainer = document.getElementById('messages');
    messagesContainer.innerHTML = '';  // Clear the messages container before appending new messages
    messages.forEach(function(message) {
        appendMessage(message, !knownMessageIds.has(message.id));
        knownMessageIds.add(message.id);  // Add message ID to the known set
    });
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
});

function createMessageElement(message, className) {
    let messageElement = document.createElement('div');
    messageElement.className = className;
    let userTimeDiv = document.createElement('div');
    userTimeDiv.innerHTML = `<strong>${message.user}</strong> - <span class="timestamp">${message.timestamp}</span>`;
    let messageTextDiv = document.createElement('div');
    messageTextDiv.textContent = message.text;
    messageElement.appendChild(userTimeDiv);
    messageElement.appendChild(messageTextDiv);
    return messageElement;
}

function appendMessage(message, isNew) {
    const messagesContainer = document.getElementById('messages');
    let messageElement = createMessageElement(message, message.user === currentUsername ? 'my-message' : 'user-message');
    
    // If the message is new, add the 'new' class
    if (isNew) {
        messageElement.classList.add('new');
    }

    if (message.user === currentUsername) {
        let deleteIcon = document.createElement('span');
        deleteIcon.classList.add('delete-icon');
        deleteIcon.textContent = '🗑️';
        deleteIcon.onclick = function() { deleteMessage(message.id); };
        messageElement.appendChild(deleteIcon);
    }

    if (message.text === "Deleted by user") {
        let messageTextDiv = messageElement.querySelector('div:last-child'); 
        messageTextDiv.classList.add('deleted');
    }

    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function deleteMessage(messageId) {
    socket.emit('delete_message', { 'message_id': messageId });
}

socket.on('message_deleted', function(data) {
    let messageElement = document.getElementById('message-' + data.message_id);
    if (messageElement) {
        let textDiv = messageElement.querySelector('div:last-child');
        textDiv.textContent = data.new_content;
        messageElement.classList.add('deleted-message');
    }
});

socket.on('refresh_messages', function() {
    socket.emit('request_recent_messages', currentUsername);
});

socket.on('new_chat_message', function(message) {
    appendMessage(message, !knownMessageIds.has(message.id));
    knownMessageIds.add(message.id); // Add message ID to the known set
});

function appendSystemMessage(message) {
    const messagesContainer = document.getElementById('messages');
    let messageElement = createMessageElement(message, 'system-message');
    messagesContainer.appendChild(messageElement);
}

function handleRecentMessages(messages) {
    const messagesContainer = document.getElementById('messages');
    messagesContainer.innerHTML = '';  // Clear the messages container
    messages.forEach(function(message) {
        // Only append if the message is new
        if (!knownMessageIds.has(message.id)) {
            appendMessage(message, true);
            knownMessageIds.add(message.id);  // Add message ID to the known set
        }
    });
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}