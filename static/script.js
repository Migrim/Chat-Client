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
    messagesContainer.innerHTML = '';
    knownMessageIds.clear();  // Clear the set to accept the new set of message IDs

    messages.forEach(function(message) {
        appendMessage(message, true); 
        knownMessageIds.add(message.id);
    });
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
});

let lastUser = null;

function appendMessage(message, isNew) {
    const messagesContainer = document.getElementById('messages');
    let lastMessage = messagesContainer.lastElementChild;
    let currentTime = new Date(message.timestamp);

    let messageElement = document.createElement('div');
    messageElement.className = message.user === currentUsername ? 'my-message' : 'user-message';
    messageElement.setAttribute('data-username', message.user);
    messageElement.setAttribute('data-timestamp', message.timestamp);

    // If the last user is different from the current, update the last message of the previous user
    if (lastUser && lastUser !== message.user) {
        if (lastMessage) {
            lastMessage.classList.add('non-consecutive-message');
        }
    }

    //if (lastUser === message.user) {
    //    messageElement.classList.add('consecutive-message');
    //} else {
    //    messageElement.classList.add('non-consecutive-message');
    //    lastUser = message.user;
    //}

    if (!lastMessage || lastMessage.getAttribute('data-username') !== message.user) {
        let userTimeDiv = document.createElement('div');
        userTimeDiv.innerHTML = `<strong>${message.user}</strong> - <span class="timestamp">${message.timestamp}</span>`;
        messageElement.appendChild(userTimeDiv);
    }

    let messageTextDiv = document.createElement('div');
    messageTextDiv.textContent = message.text;
    messageElement.appendChild(messageTextDiv);

    if (isNew) {
        messageElement.classList.add('new');
    }

    let deleteIcon = document.createElement('span');
    deleteIcon.classList.add('delete-icon');
    deleteIcon.textContent = '🗑️';
    deleteIcon.onclick = function() { deleteMessage(message.id); };

    if (message.text !== "Message deleted by user") {
        messageElement.appendChild(deleteIcon);
    }

    if (message.text === "Message deleted by user") {
        messageElement.classList.add('deleted-message');
        messageElement.classList.remove('my-message');
    } else {
        messageElement.classList.remove('deleted-message');
    }

    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}


function deleteMessage(messageId) {
    socket.emit('delete_message', { 'message_id': messageId });
}

socket.on('message_deleted', function(data) {
    let messageElement = document.querySelector(`[data-message-id="${data.message_id}"]`);
    if (messageElement) {

        let textDiv = messageElement.querySelector('div:last-child');
        textDiv.textContent = ''; // Clear the text
        textDiv.classList.add('hidden-message'); // Add this class to make any text the same color as the background if needed
    }
    socket.emit('request_recent_messages', currentUsername);
});

socket.on('refresh_messages', function() {
    socket.emit('request_recent_messages', currentUsername);
});

socket.on('new_chat_message', function(message) {
    appendMessage(message, !knownMessageIds.has(message.id));
    knownMessageIds.add(message.id); 
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

document.getElementById('image-upload-form').onsubmit = function(e) {
    e.preventDefault();
    var formData = new FormData(this);
    fetch('/upload_image', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if(data.image_url) {
            var imageGallery = document.getElementById('image-gallery');
            var img = document.createElement('img');
            img.src = data.image_url;
            imageGallery.appendChild(img);
        } else {
            // Handle error
            console.error("Error uploading image");
        }
    });
};

socket.on('new_image', function(data) {
    var imageGallery = document.getElementById('image-gallery');
    var img = document.createElement('img');
    img.src = data.image_url; 
    imageGallery.appendChild(img);
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

