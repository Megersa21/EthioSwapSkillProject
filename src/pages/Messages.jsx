import { useState } from 'react';
import '../styles/Messages.css';

const initialConversations = [
  {
    id: 1,
    name: 'Dawit Alemu',
    initials: 'DA',
    skill: 'React Development',
    lastMessage: "Let's plan our next session!",
    time: '9:30 AM',
    unread: 2,
    messages: [
      {
        id: 1,
        sender: 'them',
        text: "Hi! I'm excited to exchange skills with you.",
        time: '9:15 AM',
      },
      {
        id: 2,
        sender: 'me',
        text: 'Me too! I can help you with React.',
        time: '9:20 AM',
      },
      {
        id: 3,
        sender: 'them',
        text: "Let's plan our next session!",
        time: '9:30 AM',
      },
    ],
  },
  {
    id: 2,
    name: 'Meron Bekele',
    initials: 'MB',
    skill: 'Flutter Development',
    lastMessage: 'Thank you for the explanation.',
    time: 'Yesterday',
    unread: 0,
    messages: [
      {
        id: 1,
        sender: 'them',
        text: 'Could you help me understand Flutter widgets?',
        time: 'Yesterday',
      },
      {
        id: 2,
        sender: 'me',
        text: 'Of course! We can practice with a small example.',
        time: 'Yesterday',
      },
      {
        id: 3,
        sender: 'them',
        text: 'Thank you for the explanation.',
        time: 'Yesterday',
      },
    ],
  },
  {
    id: 3,
    name: 'Yonas Tesfaye',
    initials: 'YT',
    skill: 'UI/UX Design',
    lastMessage: "I'll share my design ideas soon.",
    time: 'Monday',
    unread: 0,
    messages: [
      {
        id: 1,
        sender: 'them',
        text: "I'd like to learn more about responsive layouts.",
        time: 'Monday',
      },
      {
        id: 2,
        sender: 'me',
        text: "Let's discuss that in our next skill swap.",
        time: 'Monday',
      },
      {
        id: 3,
        sender: 'them',
        text: "I'll share my design ideas soon.",
        time: 'Monday',
      },
    ],
  },
];

function Messages() {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState(1);
  const [search, setSearch] = useState('');
  const [messageText, setMessageText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeId,
  );

  const filteredConversations = conversations.filter((conversation) =>
    `${conversation.name} ${conversation.skill}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  function sendMessage(event) {
    event.preventDefault();

    const text = messageText.trim();

    if (!text && !selectedFile) return;
    if (!activeConversation) return;

    let attachment = null;

    if (selectedFile) {
      attachment = {
        name: selectedFile.name,
        type: selectedFile.type,
        url: URL.createObjectURL(selectedFile),
      };
    }

    const newMessage = {
      id: Date.now(),
      sender: 'me',
      text,
      attachment,
      time: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === activeId
          ? {
              ...conversation,
              lastMessage: attachment ? `Attachment: ${attachment.name}` : text,
              time: 'Now',
              messages: [...conversation.messages, newMessage],
            }
          : conversation,
      ),
    );

    setMessageText('');
    setSelectedFile(null);
  }

  function formatFileSize(bytes) {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function handleFileSelect(event) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Please choose a file smaller than 10 MB.');
      return;
    }

    setSelectedFile(file);
  }

  return (
    <main className="messages-page">
      <header className="messages-heading">
        <div>
          <p className="messages-eyebrow">STAY CONNECTED</p>
          <h1>Messages</h1>
          <p>Connect with your learning partners and exchange ideas.</p>
        </div>
      </header>

      <section className="messages-layout">
        <aside className="conversation-panel">
          <div className="conversation-panel-heading">
            <h2>Conversations</h2>
            <span>{conversations.length}</span>
          </div>

          <div className="conversation-search">
            <span>⌕</span>
            <input
              type="search"
              placeholder="Search conversations..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search conversations"
            />
          </div>

          <div className="conversation-list">
            {filteredConversations.map((conversation) => (
              <button
                type="button"
                key={conversation.id}
                className={`conversation-item ${
                  activeId === conversation.id ? 'active' : ''
                }`}
                onClick={() => setActiveId(conversation.id)}
              >
                <span className="conversation-avatar">
                  {conversation.initials}
                </span>

                <span className="conversation-details">
                  <span className="conversation-topline">
                    <strong>{conversation.name}</strong>
                    <small>{conversation.time}</small>
                  </span>

                  <span className="conversation-skill">
                    {conversation.skill}
                  </span>

                  <span className="conversation-last-message">
                    {conversation.lastMessage}
                  </span>
                </span>

                {conversation.unread > 0 && (
                  <span className="conversation-unread">
                    {conversation.unread}
                  </span>
                )}
              </button>
            ))}

            {filteredConversations.length === 0 && (
              <p className="conversation-empty">
                No conversations match your search.
              </p>
            )}
          </div>
        </aside>

        <section className="chat-panel">
          {activeConversation ? (
            <>
              <header className="chat-header">
                <div className="chat-person">
                  <span className="conversation-avatar">
                    {activeConversation.initials}
                  </span>
                  <div>
                    <h2>{activeConversation.name}</h2>
                    <p>{activeConversation.skill}</p>
                  </div>
                </div>

                <span className="chat-demo-label">Skill Swap</span>
              </header>

              <div className="chat-messages">
                <div className="chat-date-divider">
                  <span>Conversation</span>
                </div>

                {activeConversation.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`chat-message-row ${
                      message.sender === 'me' ? 'mine' : 'theirs'
                    }`}
                  >
                    <div className="chat-message">
                      {message.text && <p>{message.text}</p>}

                      {message.attachment && (
                        <div className="chat-attachment">
                          {message.attachment.type.startsWith('image/') ? (
                            <a
                              href={message.attachment.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <img
                                src={message.attachment.url}
                                alt={message.attachment.name}
                                className="chat-attachment-image"
                              />
                              <span>{message.attachment.name}</span>
                            </a>
                          ) : (
                            <a
                              className="chat-attachment-file"
                              href={message.attachment.url}
                              target="_blank"
                              rel="noreferrer"
                              download={message.attachment.name}
                            >
                              <span className="chat-file-icon">📄</span>
                              <span>{message.attachment.name}</span>
                              <span>Open file</span>
                            </a>
                          )}
                        </div>
                      )}

                      <time>{message.time}</time>
                    </div>
                  </div>
                ))}
              </div>

              <form className="chat-compose" onSubmit={sendMessage}>
                {selectedFile && (
                  <div className="upload-preview">
                    <div className="upload-file-icon">
                      {selectedFile.type.startsWith('image/') ? (
                        <img src={URL.createObjectURL(selectedFile)} alt="" />
                      ) : (
                        <span>📄</span>
                      )}
                    </div>

                    <div className="upload-file-details">
                      <strong>{selectedFile.name}</strong>
                      <div className="upload-progress-track">
                        <div className="upload-progress-fill" />
                      </div>
                    </div>

                    <div className="upload-file-meta">
                      <span>{formatFileSize(selectedFile.size)}</span>
                      <small>Ready to send</small>
                    </div>

                    <button
                      type="button"
                      className="upload-remove-button"
                      onClick={() => setSelectedFile(null)}
                      aria-label="Remove selected file"
                    >
                      ×
                    </button>
                  </div>
                )}

                <p className="upload-help-text">
                  Share images, PDF, Word, PowerPoint or ZIP files. Up to 10 MB
                  each.
                </p>

                <div className="chat-compose-controls">
                  <label
                    className="chat-file-button"
                    title="Attach a document"
                    aria-label="Attach a document"
                  >
                    <span>📎</span>
                    <input
                      type="file"
                      hidden
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.txt,.xls,.xlsx"
                      onChange={handleFileSelect}
                    />
                  </label>

                  <label
                    className="chat-file-button"
                    title="Attach an image"
                    aria-label="Attach an image"
                  >
                    <span>▧</span>
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleFileSelect}
                    />
                  </label>

                  <input
                    className="chat-message-input"
                    type="text"
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    aria-label="Type a message"
                  />

                  <button
                    className="chat-send-button"
                    type="submit"
                    disabled={!messageText.trim() && !selectedFile}
                  >
                    Send
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="chat-no-selection">
              <span>💬</span>
              <h2>Select a conversation</h2>
              <p>Choose a partner to view your messages.</p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

export default Messages;
