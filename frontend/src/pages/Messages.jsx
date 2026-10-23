import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import socket from '../socket';

import '../styles/Messages.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const SERVER_URL = (
  import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'
).replace(/\/$/, '');

function readToken() {
  return (
    localStorage.getItem('token') || localStorage.getItem('authToken') || ''
  );
}

function readUserId(token) {
  try {
    const savedUser = JSON.parse(localStorage.getItem('user') || '{}');

    const savedId = Number(
      savedUser.userId ?? savedUser.id ?? savedUser.user_id,
    );

    if (savedId > 0) return savedId;

    const payload = token.split('.')[1];

    if (!payload) return null;

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');

    const decoded = JSON.parse(
      atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')),
    );

    const id = Number(decoded.userId ?? decoded.id ?? decoded.user_id);

    return id > 0 ? id : null;
  } catch {
    return null;
  }
}

async function request(path, token, options = {}) {
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),

    ...(options.body instanceof FormData
      ? {}
      : options.body
        ? { 'Content-Type': 'application/json' }
        : {}),

    ...options.headers,
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...options,

    headers,

    cache: 'no-store',
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || `Request failed (${response.status})`);
  }

  return result;
}

function getRows(result) {
  if (Array.isArray(result)) return result;

  if (Array.isArray(result?.data)) return result.data;

  if (Array.isArray(result?.skills)) return result.skills;

  if (Array.isArray(result?.messages)) return result.messages;

  if (Array.isArray(result?.conversations)) return result.conversations;

  return [];
}

function initials(name = 'Skill Partner') {
  return name

    .trim()

    .split(/\s+/)

    .slice(0, 2)

    .map((part) => part[0] || '')

    .join('')

    .toUpperCase();
}

function timeLabel(value) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function normalizeMessage(message) {
  return {
    ...message,

    id: message.id ?? message.message_id,

    sender_id: Number(message.sender_id),

    receiver_id: Number(message.receiver_id),

    message_text: message.message_text ?? '',
  };
}

function attachmentUrl(path) {
  if (!path) return '';

  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;

  return `${SERVER_URL}/${path.replace(/^\/+/, '')}`;
}

function profileImageUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;
  return `${SERVER_URL}/${String(path).replace(/^\/+/, '')}`;
}

function ContactAvatar({ name, image }) {
  const [imageFailed, setImageFailed] = useState(false);
  const src = profileImageUrl(image);

  if (src && !imageFailed) {
    return (
      <img
        className="conversation-avatar conversation-avatar-image"
        src={src}
        alt={`${name || 'Skill partner'} profile`}
        onError={() => setImageFailed(true)}
        loading="lazy"
      />
    );
  }

  return <span className="conversation-avatar">{initials(name)}</span>;
}

export default function Messages() {
  const [token] = useState(readToken);

  const [userId] = useState(() => readUserId(readToken()));

  const [contacts, setContacts] = useState([]);

  const [conversations, setConversations] = useState([]);

  const [activeId, setActiveId] = useState(null);

  const [messages, setMessages] = useState([]);

  const [search, setSearch] = useState('');

  const [messageText, setMessageText] = useState('');

  const [selectedFile, setSelectedFile] = useState(null);

  const [fileInputKey, setFileInputKey] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [sending, setSending] = useState(false);

  const [socketConnected, setSocketConnected] = useState(false);

  const [error, setError] = useState('');
  const activeIdRef = useRef(activeId);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const loadContacts = useCallback(async () => {
    const result = await request('/skills/discover', token);

    const rows = getRows(result);

    const map = new Map();

    rows.forEach((skill) => {
      const id = Number(skill.user_id ?? skill.owner_id ?? skill.userId);

      if (!id || id === Number(userId)) return;

      if (!map.has(id)) {
        map.set(id, {
          id,

          name:
            skill.user_name || skill.full_name || skill.name || 'Skill Partner',
          profile_image:
            skill.profile_image ||
            skill.profileImage ||
            skill.profile_picture ||
            skill.avatar_url ||
            skill.avatar ||
            '',
          skills: [],

          last_message: '',

          last_message_at: null,

          unread_count: 0,

          hasConversation: false,
        });
      }

      if (skill.skill_name) {
        const partner = map.get(id);

        if (!partner.skills.includes(skill.skill_name)) {
          partner.skills.push(skill.skill_name);
        }
      }
    });

    setContacts(Array.from(map.values()));
  }, [token, userId]);

  const loadConversations = useCallback(async () => {
    const result = await request('/messages', token);

    const rows = getRows(result)
      .map((row) => {
        const id = Number(
          row.partner_id ??
            row.other_user_id ??
            row.contact_id ??
            row.user_id ??
            row.id,
        );

        return {
          ...row,

          id,

          name:
            row.partner_name ||
            row.other_user_name ||
            row.contact_name ||
            row.user_name ||
            row.full_name ||
            row.name ||
            'Skill Partner',

          skills: Array.isArray(row.skills) ? row.skills : [],

          last_message:
            row.last_message ||
            row.message_text ||
            row.last_message_text ||
            row.last_attachment_name ||
            '',

          last_message_at: row.last_message_at || row.created_at || null,

          unread_count: Number(row.unread_count || 0),
          profile_image:
            row.partner_profile_image ||
            row.profile_image ||
            row.profileImage ||
            row.profile_picture ||
            row.avatar_url ||
            row.avatar ||
            '',
          hasConversation: true,
        };
      })

      .filter((row) => row.id > 0 && row.id !== Number(userId));

    setConversations(rows);
  }, [token, userId]);

  const refreshLists = useCallback(async () => {
    if (!token) {
      setLoading(false);

      setError('Please log in to use Messages.');

      return;
    }

    setError('');

    try {
      await Promise.all([loadContacts(), loadConversations()]);
    } catch (err) {
      console.error('Could not load partners:', err);

      setError(err.message || 'Could not load skill partners.');
    } finally {
      setLoading(false);
    }
  }, [token, loadContacts, loadConversations]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      await refreshLists();
      const selectedId = activeIdRef.current;
      if (token && selectedId) {
        const result = await request(`/messages/${selectedId}`, token);
        setMessages(getRows(result).map(normalizeMessage));

        await request(`/messages/${selectedId}/read`, token, {
          method: 'PATCH',
        });

        setConversations((previous) =>
          previous.map((item) =>
            Number(item.id) === Number(selectedId)
              ? { ...item, unread_count: 0 }
              : item,
          ),
        );

        window.dispatchEvent(new Event('notificationCountUpdated'));
      }
    } catch (err) {
      setError(err.message || 'Could not refresh messages.');
    } finally {
      setRefreshing(false);
    }
  }, [token, refreshLists]);

  useEffect(() => {
    refreshLists();
  }, [refreshLists]);

  const allContacts = useMemo(() => {
    const map = new Map();

    contacts.forEach((contact) => map.set(Number(contact.id), contact));

    conversations.forEach((conversation) => {
      const old = map.get(Number(conversation.id));

      map.set(Number(conversation.id), {
        ...old,

        ...conversation,

        name:
          conversation.name !== 'Skill Partner'
            ? conversation.name
            : old?.name || 'Skill Partner',

        skills: conversation.skills?.length
          ? conversation.skills
          : old?.skills || [],
        profile_image: conversation.profile_image || old?.profile_image || '',
        hasConversation: true,
      });
    });

    return Array.from(map.values()).sort((a, b) => {
      const aTime = a.last_message_at
        ? new Date(a.last_message_at).getTime()
        : 0;

      const bTime = b.last_message_at
        ? new Date(b.last_message_at).getTime()
        : 0;

      return bTime - aTime;
    });
  }, [contacts, conversations]);

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return allContacts;

    return allContacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(query) ||
        contact.skills.some((skill) => skill.toLowerCase().includes(query)),
    );
  }, [allContacts, search]);

  const activeContact = allContacts.find(
    (contact) => Number(contact.id) === Number(activeId),
  );

  useEffect(() => {
    if (!token || !activeId) {
      setMessages([]);

      return undefined;
    }

    let cancelled = false;

    async function loadHistory() {
      setHistoryLoading(true);

      try {
        const result = await request(`/messages/${activeId}`, token);

        if (cancelled) return;

        setMessages(getRows(result).map(normalizeMessage));

        try {
          await request(`/messages/${activeId}/read`, token, {
            method: 'PATCH',
          });

          window.dispatchEvent(new Event('notificationCountUpdated'));
        } catch (error) {
          console.error('Could not mark messages as read:', error);
        }

        setConversations((previous) =>
          previous.map((item) =>
            Number(item.id) === Number(activeId)
              ? { ...item, unread_count: 0 }
              : item,
          ),
        );
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load messages.');
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [token, activeId]);

  useEffect(() => {
    if (!token) return undefined;

    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => setSocketConnected(false);
    const handleConnectError = (err) => {
      setSocketConnected(false);
      console.error('Message socket error:', err.message);
    };

    const handleNewMessage = (raw) => {
      const incoming = normalizeMessage(raw);
      const sender = Number(incoming.sender_id);
      const receiver = Number(incoming.receiver_id);
      const currentUserId = Number(userId);
      const partnerId = sender === currentUserId ? receiver : sender;

      if (
        !partnerId ||
        (sender !== currentUserId && receiver !== currentUserId)
      )
        return;

      if (Number(activeIdRef.current) === partnerId) {
        setMessages((previous) => {
          if (
            previous.some((item) => String(item.id) === String(incoming.id))
          ) {
            return previous;
          }
          return [...previous, incoming];
        });

        if (receiver === currentUserId) {
          request(`/messages/${partnerId}/read`, token, {
            method: 'PATCH',
          })
            .then(() => {
              window.dispatchEvent(new Event('notificationCountUpdated'));
            })
            .catch((error) => {
              console.error('Could not mark incoming messages as read:', error);
            });
        }
      }

      loadConversations().catch(console.error);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('message:new', handleNewMessage);

    if (socket.connected) {
      setSocketConnected(true);
    } else {
      socket.connect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('message:new', handleNewMessage);
      // Do not disconnect the shared socket: Navbar and live sessions use it too.
    };
  }, [token, userId, loadConversations]);

  async function handleSend(event) {
    event.preventDefault();

    const text = messageText.trim();

    if (!activeId || sending || (!text && !selectedFile)) return;

    setSending(true);

    setError('');

    try {
      const formData = new FormData();

      formData.append('receiver_id', String(activeId));

      if (text) formData.append('message_text', text);

      if (selectedFile) formData.append('attachment', selectedFile);

      const result = await request('/messages', token, {
        method: 'POST',

        body: formData,
      });

      const saved = result.data?.message || result.data;

      if (saved?.id != null) {
        const message = normalizeMessage(saved);

        setMessages((previous) => {
          if (previous.some((item) => String(item.id) === String(message.id))) {
            return previous;
          }

          return [...previous, message];
        });
      } else {
        const history = await request(`/messages/${activeId}`, token);

        setMessages(getRows(history).map(normalizeMessage));
      }

      setMessageText('');

      setSelectedFile(null);

      setFileInputKey((key) => key + 1);

      await loadConversations();
    } catch (err) {
      setError(err.message || 'Could not send your message or attachment.');
    } finally {
      setSending(false);
    }
  }

  if (!token) {
    return (
      <main className="messages-page">
        <div className="conversation-empty">
          Please log in to access Messages.
        </div>
      </main>
    );
  }

  return (
    <main
      className={`messages-page ${activeContact ? 'has-active-conversation' : ''}`}
    >
      <header className="messages-heading">
        <div>
          <p className="messages-eyebrow">CONNECT AND LEARN</p>

          <h1>Messages</h1>

          <p>Talk with your skill partners and arrange skill swaps.</p>
        </div>

        <span className="connection-status">
          <span
            className={socketConnected ? 'status-dot online' : 'status-dot'}
          />

          {socketConnected ? 'Live connection' : 'Connecting...'}
        </span>
      </header>

      {error && (
        <div className="messages-error" role="alert">
          {error}

          <button type="button" onClick={() => setError('')}>
            Dismiss
          </button>
        </div>
      )}

      <div className="messages-layout">
        <aside className="conversation-panel">
          <div className="conversation-panel-heading">
            <h2>Skill partners</h2>

            <button
              type="button"
              onClick={handleRefresh}
              aria-label="Refresh partners and messages"
              disabled={refreshing}
              title={refreshing ? 'Refreshing...' : 'Refresh'}
            >
              {refreshing ? '…' : '↻'}
            </button>
          </div>

          <input
            className="conversation-search"
            type="search"
            placeholder="Search people or skills..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div className="conversation-list">
            {loading ? (
              <p className="conversation-empty">Loading partners...</p>
            ) : filteredContacts.length === 0 ? (
              <p className="conversation-empty">
                {search
                  ? 'No matching partners found.'
                  : 'No other skill partners found.'}
              </p>
            ) : (
              filteredContacts.map((contact) => (
                <button
                  type="button"
                  key={contact.id}
                  className={`conversation-item ${Number(activeId) === Number(contact.id) ? 'active' : ''}`}
                  onClick={() => {
                    setActiveId(Number(contact.id));

                    setError('');
                  }}
                >
                  <ContactAvatar
                    name={contact.name}
                    image={contact.profile_image}
                  />

                  <span className="conversation-details">
                    <span className="conversation-topline">
                      <strong>{contact.name}</strong>

                      <small>{timeLabel(contact.last_message_at)}</small>
                    </span>

                    <span className="conversation-skill">
                      {contact.skills.length
                        ? contact.skills.slice(0, 3).join(', ')
                        : 'Skill partner'}
                    </span>

                    <span className="conversation-last-message">
                      {contact.last_message || 'Start a conversation'}
                    </span>
                  </span>

                  {contact.unread_count > 0 && (
                    <span className="conversation-unread">
                      {contact.unread_count}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="chat-panel">
          {!activeContact ? (
            <div className="chat-no-selection">
              <div className="empty-chat-icon">↔</div>

              <h2>Choose a skill partner</h2>

              <p>
                Select a person to read messages or start a new conversation.
              </p>
            </div>
          ) : (
            <>
              <header className="chat-header">
                <button
                  type="button"
                  className="chat-back-button"
                  onClick={() => setActiveId(null)}
                  aria-label="Back to skill partners"
                >
                  ‹
                </button>
                <ContactAvatar
                  name={activeContact.name}
                  image={activeContact.profile_image}
                />

                <div className="chat-person">
                  <h2>{activeContact.name}</h2>

                  <p>
                    {activeContact.skills.join(' · ') ||
                      'EthioSwapSkill member'}
                  </p>
                </div>
              </header>

              <div className="chat-messages">
                {historyLoading ? (
                  <p className="conversation-empty">Loading conversation...</p>
                ) : messages.length === 0 ? (
                  <div className="conversation-empty">
                    <h3>Start your conversation</h3>

                    <p>Say hello and discuss which skills you can exchange.</p>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const mine = Number(message.sender_id) === Number(userId);

                    const fileUrl = attachmentUrl(message.attachment_url);

                    const isImage =
                      message.attachment_type?.startsWith('image/');

                    return (
                      <div
                        key={message.id ?? `message-${index}`}
                        className={`chat-message-row ${mine ? 'sent' : 'received'}`}
                      >
                        <div className="chat-message">
                          {message.message_text && (
                            <p>{message.message_text}</p>
                          )}

                          {fileUrl && isImage && (
                            <a href={fileUrl} target="_blank" rel="noreferrer">
                              <img
                                className="chat-image-attachment"
                                src={fileUrl}
                                alt={
                                  message.attachment_name || 'Image attachment'
                                }
                                loading="lazy"
                              />
                            </a>
                          )}

                          {fileUrl && !isImage && (
                            <a
                              className="chat-file-attachment"
                              href={fileUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <span className="file-icon">PDF</span>

                              <span>
                                <strong>
                                  {message.attachment_name || 'Document'}
                                </strong>

                                <small>Open or download document</small>
                              </span>
                            </a>
                          )}

                          <small className="chat-message-time">
                            {timeLabel(message.created_at)}
                          </small>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form className="chat-compose" onSubmit={handleSend}>
                <label
                  className="chat-attach-button"
                  title="Attach an image or PDF"
                >
                  <input
                    key={fileInputKey}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,.pdf"
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0];

                      if (!file) return;

                      const ext = file.name.split('.').pop().toLowerCase();

                      const valid = [
                        'jpg',

                        'jpeg',

                        'png',

                        'gif',

                        'webp',

                        'pdf',
                      ].includes(ext);

                      if (!valid) {
                        setError('Choose a JPG, PNG, GIF, WebP image, or PDF.');

                        event.target.value = '';

                        return;
                      }

                      if (file.size > 10 * 1024 * 1024) {
                        setError('The attachment must be 10 MB or smaller.');

                        event.target.value = '';

                        return;
                      }

                      setError('');

                      setSelectedFile(file);
                    }}
                  />

                  <span aria-hidden="true">＋</span>
                </label>

                <div className="chat-input-area">
                  {selectedFile && (
                    <div className="chat-selected-file">
                      <span>{selectedFile.name}</span>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);

                          setFileInputKey((key) => key + 1);
                        }}
                        aria-label="Remove attachment"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  <textarea
                    className="chat-message-input"
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    placeholder="Write a message..."
                    aria-label="Write a message"
                    rows={1}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();

                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                  />
                </div>

                <button
                  className="chat-send-button"
                  type="submit"
                  disabled={sending || (!messageText.trim() && !selectedFile)}
                >
                  {sending ? '...' : 'Send'}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
