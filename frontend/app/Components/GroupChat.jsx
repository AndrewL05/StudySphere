import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import supabase from '../Services/supabaseClient';
import UserName from './Username';

const DefaultAvatar = ({ name = 'U', size = 32 }) => (
    <div style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        backgroundColor: 'var(--gray-300)',
        color: 'var(--text-dark)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${size * 0.5}px`,
        fontWeight: 'bold',
        overflow: 'hidden',
    }}>
        {name.charAt(0).toUpperCase()}
    </div>
);

const CloseChatIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

const GroupChat = ({ groupId, currentUser, groupName = "Group Chat", onClose }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [chatError, setChatError] = useState(null);
    const [loadingMessages, setLoadingMessages] = useState(true);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    useEffect(() => {
        if (!groupId) return;
        const fetchMessages = async () => {
            setLoadingMessages(true);
            setChatError(null);
            try {
                const { data, error } = await supabase
                    .from('chat_messages') 
                    .select(`
                        id,
                        content,
                        created_at,
                        user_id,
                        client_temp_id, 
                        profiles (id, display_name, full_name, avatar_url)
                    `)
                    .eq('group_id', groupId)
                    .order('created_at', { ascending: true });
                if (error) throw error;
                setMessages(data || []);
            } catch (error) {
                console.error("Error fetching chat messages:", error);
                setChatError("Couldn't load messages.");
            } finally {
                setLoadingMessages(false);
            }
        };
        fetchMessages();
    }, [groupId]);

    useEffect(() => {
        if (!groupId) return;

        const channel = supabase.channel(`group-chat-${groupId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `group_id=eq.${groupId}` },
                async (payload) => {
                    let newDbMessage = payload.new;
                    
                    if (newDbMessage.user_id && !newDbMessage.profiles) {
                        const { data: profileData, error: profileError } = await supabase
                            .from('profiles')
                            .select('id, display_name, full_name, avatar_url')
                            .eq('id', newDbMessage.user_id)
                            .single();
                        if (!profileError && profileData) {
                            newDbMessage.profiles = profileData;
                        }
                    }

                    setMessages(prevMessages => {
                        if (newDbMessage.client_temp_id) {
                            const optimisticMessageExists = prevMessages.some(msg => msg.id === newDbMessage.client_temp_id);
                            if (optimisticMessageExists) {
                                return prevMessages.map(msg =>
                                    msg.id === newDbMessage.client_temp_id ? newDbMessage : msg
                                );
                            }
                        }
                        if (!prevMessages.some(msg => msg.id === newDbMessage.id)) {
                            return [...prevMessages, newDbMessage];
                        }
                        return prevMessages;
                    });
                }
            )
            .subscribe((status, err) => {
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.error(`Subscription error for group chat ${groupId}:`, err || status);
                    setChatError("Chat connection issue. Please refresh.");
                }
            });
        return () => supabase.removeChannel(channel);
    }, [groupId]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !groupId) return;
        
        if (!currentUser) {
            setChatError("Please sign in to send messages to this group.");
            return;
        }

        setSending(true); 
        setChatError(null);

        const clientTempId = `temp_${Date.now()}`; 
        const optimisticMessage = {
            id: clientTempId,
            client_temp_id: clientTempId, 
            group_id: groupId,
            user_id: currentUser.id,
            content: newMessage.trim(),
            created_at: new Date().toISOString(),
            profiles: { 
                id: currentUser.id,
                display_name: currentUser.user_metadata?.displayName || currentUser.user_metadata?.name || currentUser.email,
                full_name: currentUser.user_metadata?.full_name,
                avatar_url: currentUser.user_metadata?.avatar_url
            }
        };

        setMessages(prevMessages => [...prevMessages, optimisticMessage]);
        const messageToSend = newMessage.trim(); 
        setNewMessage(''); 

        try {
            const { error } = await supabase
                .from('chat_messages')
                .insert([{
                    group_id: groupId,
                    user_id: currentUser.id,
                    content: messageToSend,
                    client_temp_id: clientTempId 
                }]);

            if (error) {
                setMessages(prevMessages => prevMessages.filter(msg => msg.id !== clientTempId));
                setNewMessage(messageToSend); 
                throw error;
            }
        } catch (error) {
            console.error("Error sending message:", error);
            setChatError("Failed to send message. Please try again.");
            setMessages(prevMessages => prevMessages.filter(msg => msg.id !== clientTempId && msg.client_temp_id !== clientTempId));
            if (newMessage === '') setNewMessage(messageToSend); 
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="mini-chat-window">
            <div className="mini-chat-header">
                <h4>{groupName}</h4>
                <button onClick={onClose} className="mini-chat-close-btn" title="Close Chat">
                    <CloseChatIcon />
                </button>
            </div>
            <div className="chat-messages-area">
                {loadingMessages ? (
                    <p className="chat-system-message">Loading messages...</p>
                ) : chatError && messages.length === 0 ? (
                    <p className="chat-system-message error">{chatError}</p>
                ) : messages.length === 0 ? (
                    <p className="chat-system-message">
                        {currentUser ? "No messages yet. Start the conversation!" : "No messages yet. This group hasn't started chatting!"}
                    </p>
                ) : (
                    messages.map(msg => {
                        const profile = msg.profiles;
                        const isCurrentUserMsg = msg.user_id === currentUser?.id;
                        const displayName = profile?.display_name || profile?.full_name;

                        return (
                            <div key={msg.id} className={`chat-message-item ${isCurrentUserMsg ? 'sent' : 'received'}`}>
                                {!isCurrentUserMsg && (
                                    <div className="chat-avatar-container">
                                        {profile?.avatar_url ? (
                                            <img src={profile.avatar_url} alt={displayName || 'avatar'} className="chat-avatar" />
                                        ) : (
                                            <DefaultAvatar name={displayName || '?'} size={32} />
                                        )}
                                    </div>
                                )}
                                <div className={`chat-message-bubble ${isCurrentUserMsg ? 'sent' : 'received'}`}>
                                    {!isCurrentUserMsg && (
                                        <div className="chat-message-author">
                                            {displayName || <UserName userId={msg.user_id} />}
                                        </div>
                                    )}
                                    <div className="chat-message-content">{msg.content}</div>
                                    <div className="chat-message-time">
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                                {isCurrentUserMsg && (
                                     <div className="chat-avatar-container">
                                        {profile?.avatar_url || currentUser?.user_metadata?.avatar_url ? (
                                            <img src={profile?.avatar_url || currentUser?.user_metadata?.avatar_url} alt="My Avatar" className="chat-avatar" />
                                        ) : (
                                            <DefaultAvatar name={profile?.display_name || currentUser?.user_metadata?.displayName || currentUser?.email || 'Me'} size={32} />
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>
            {chatError && messages.length > 0 && <p className="chat-error-inline">{chatError}</p>}
            
            <form onSubmit={handleSendMessage} className="chat-input-form">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={currentUser ? "Type your message..." : "Sign in to send messages"}
                    disabled={sending || !groupId || !currentUser}
                />
                <button type="submit" disabled={sending || !newMessage.trim() || !groupId || !currentUser}>
                    {sending ? '...' : 'Send'}
                </button>
            </form>
            
            {!currentUser && (
                <div className="chat-signin-prompt">
                    <p>👁️ You're viewing this group's chat. <Link to="/signin">Sign in</Link> to join the group and conversation!</p>
                </div>
            )}
        </div>
    );
};

export default GroupChat;