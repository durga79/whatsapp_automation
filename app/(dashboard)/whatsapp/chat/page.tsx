"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { getWexaClient } from '@/lib/wexa';
import { 
  Send, 
  Loader2, 
  Phone,
  MoreVertical,
  Search,
  Smile,
  Paperclip,
  Mic,
  Check,
  CheckCheck,
  ChevronLeft,
  User,
  RefreshCw
} from 'lucide-react';
import clsx from 'clsx';

type Project = {
  _id: string;
  projectName: string;
};

type Connector = {
  _id: string;
  name: string;
  category: string;
  status?: string;
};

type Message = {
  id: string;
  text: string;
  sender: 'me' | 'them';
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read';
};

type Chat = {
  phoneNumber: string;
  name: string;
  chatId?: string; // Unipile chat ID for fetching messages
  messages: Message[];
  lastMessage?: string;
  lastMessageTime?: Date;
  unread: number;
};

export default function ChatPage() {
  const { apiKey, user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [selectedConnector, setSelectedConnector] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chats, activeChat]);

  useEffect(() => {
    if (apiKey && user) {
      fetchData();
    }
  }, [apiKey, user]);

  // Poll for chat list every 10 seconds
  useEffect(() => {
    if (!selectedConnector || !apiKey) return;
    
    const interval = setInterval(() => {
      fetchMessages();
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedConnector, apiKey]);

  // Poll for active chat messages every 3 seconds
  useEffect(() => {
    if (!activeChat || !selectedConnector || !apiKey) return;
    
    const currentChat = chats.find(c => c.phoneNumber === activeChat);
    if (!currentChat?.chatId) return;

    const interval = setInterval(() => {
      fetchChatMessages(currentChat);
    }, 3000);

    return () => clearInterval(interval);
  }, [activeChat, selectedConnector, apiKey, chats]);

  const fetchData = async () => {
    setDataLoading(true);
    try {
      const client = getWexaClient(apiKey!);
      
      const projectsRes = await client.projects.getAll({ 
        userId: user!._id,
        orgId: user!.orgId,
        status: 'published'
      });
      
      if (projectsRes.projectList && Array.isArray(projectsRes.projectList)) {
        setProjects(projectsRes.projectList);
        if (projectsRes.projectList.length > 0) {
          const firstProjectId = projectsRes.projectList[0]._id;
          setSelectedProject(firstProjectId);
          await fetchConnectors(firstProjectId);
        }
      }
    } catch (err: any) {
      console.error('Failed to load data:', err);
    } finally {
      setDataLoading(false);
    }
  };

  const fetchConnectors = async (projectId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://testing.api.wexa.ai'}/connectors/${projectId}`, {
        headers: { 'x-api-key': apiKey! }
      });
      
      if (response.ok) {
        const data = await response.json();
        const connectorsList = Array.isArray(data) ? data : (data.data || []);
        const whatsappCategory = connectorsList.find((c: any) => c.category === 'whatsapp');
        
        if (whatsappCategory?.accountDetails?.length > 0) {
          const whatsappConnectors = whatsappCategory.accountDetails.map((account: any) => ({
            _id: account.connectorID,
            name: account.sourceName,
            category: 'whatsapp',
            status: account.status
          }));
          
          setConnectors(whatsappConnectors);
          if (whatsappConnectors.length > 0) {
            const readyConnector = whatsappConnectors.find((c: any) => c.status === 'ready');
            const connectorId = readyConnector ? readyConnector._id : whatsappConnectors[0]._id;
            setSelectedConnector(connectorId);
            await fetchMessages(connectorId);
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch connectors:', err);
    }
  };

  // We don't auto-fetch all chats anymore - user starts new chats manually
  const fetchMessages = async (connectorId?: string) => {
    // This function now only refreshes existing chats' metadata, not fetching all chats
    setRefreshing(false);
  };

  // Fetch messages for a specific chat when opened
  const fetchChatMessages = async (chat: Chat) => {
    if (!chat.chatId || !selectedConnector || !apiKey) return;

    try {
      // Use the local API route which uses the SDK
      const response = await fetch(`/api/whatsapp/messages?connectorID=${selectedConnector}&chatId=${chat.chatId}`, {
        headers: { 'x-api-key': apiKey }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Fetched messages for chat:', data);
        const messages = (data.messages || []).map((msg: any) => ({
          id: msg.id || msg._id || `msg_${Date.now()}_${Math.random()}`,
          text: msg.text || msg.body || msg.content || '',
          sender: msg.sender === 'me' ? 'me' as const : 'them' as const,
          timestamp: new Date(msg.timestamp || Date.now()),
          status: 'sent' as const,
        }));

        // Update chat with fetched messages
        setChats(prev => prev.map(c => 
          c.phoneNumber === chat.phoneNumber 
            ? { ...c, messages: messages.sort((a: Message, b: Message) => a.timestamp.getTime() - b.timestamp.getTime()) }
            : c
        ));
      }
    } catch (err) {
      console.error('Failed to fetch chat messages:', err);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChat || !selectedConnector) return;

    const messageId = `msg_${Date.now()}`;
    const messageText = newMessage;
    setNewMessage('');

    // Optimistically add message
    setChats(prev => prev.map(chat => {
      if (chat.phoneNumber === activeChat) {
        return {
          ...chat,
          messages: [...chat.messages, {
            id: messageId,
            text: messageText,
            sender: 'me' as const,
            timestamp: new Date(),
            status: 'sending' as const
          }],
          lastMessage: messageText,
          lastMessageTime: new Date()
        };
      }
      return chat;
    }));

    try {
      setLoading(true);
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectID: selectedProject,
          connectorID: selectedConnector,
          recipient: activeChat,
          message: messageText,
          apiKey,
        }),
      });

      const data = await response.json();
      
      // Update message status
      setChats(prev => prev.map(chat => {
        if (chat.phoneNumber === activeChat) {
          return {
            ...chat,
            // If we got a chatId back from the API, save it
            chatId: data.chat_id || chat.chatId,
            messages: chat.messages.map(m => 
              m.id === messageId ? { ...m, status: response.ok ? 'sent' as const : 'sending' as const } : m
            )
          };
        }
        return chat;
      }));

      // After sending, try to get the chatId if we don't have it
      const currentChat = chats.find(c => c.phoneNumber === activeChat);
      if (!currentChat?.chatId && response.ok) {
        // Fetch chats to get the chatId
        setTimeout(async () => {
          try {
            const chatsResponse = await fetch(`/api/whatsapp/messages?connectorID=${selectedConnector}`, {
              headers: { 'x-api-key': apiKey! }
            });
            
            if (chatsResponse.ok) {
              const chatsData = await chatsResponse.json();
              const matchingChat = (chatsData.chats || []).find((c: any) => 
                c.phoneNumber === activeChat || 
                c.phoneNumber.includes(activeChat) ||
                activeChat.includes(c.phoneNumber)
              );
              
              if (matchingChat?.chatId) {
                setChats(prev => prev.map(c => 
                  c.phoneNumber === activeChat 
                    ? { ...c, chatId: matchingChat.chatId }
                    : c
                ));
              }
            }
          } catch (err) {
            console.error('Failed to get chatId:', err);
          }
        }, 2000); // Wait 2 seconds for Unipile to process
      }

    } catch (err) {
      console.error('Failed to send:', err);
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = async () => {
    if (!newPhoneNumber.trim() || !selectedConnector || !apiKey) return;
    
    const phoneNumber = newPhoneNumber.replace(/\D/g, '');
    
    // Check if chat already exists locally
    const existingChat = chats.find(c => c.phoneNumber === phoneNumber);
    
    if (!existingChat) {
      // Create a local chat entry first
      setChats(prev => [...prev, {
        phoneNumber,
        name: `+${phoneNumber}`,
        messages: [],
        unread: 0
      }]);
    }
    
    setActiveChat(phoneNumber);
    setShowNewChat(false);
    setNewPhoneNumber('');
    
    // Try to find the chatId from Unipile (in case we've chatted with this person before)
    try {
      const response = await fetch(`/api/whatsapp/messages?connectorID=${selectedConnector}`, {
        headers: { 'x-api-key': apiKey }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Find chat that matches this phone number
        const matchingChat = (data.chats || []).find((c: any) => 
          c.phoneNumber === phoneNumber || 
          c.phoneNumber.includes(phoneNumber) ||
          phoneNumber.includes(c.phoneNumber)
        );
        
        if (matchingChat?.chatId) {
          // Update our local chat with the chatId
          setChats(prev => prev.map(c => 
            c.phoneNumber === phoneNumber 
              ? { ...c, chatId: matchingChat.chatId, name: matchingChat.name || c.name }
              : c
          ));
          
          // Now fetch messages for this chat
          const msgResponse = await fetch(`/api/whatsapp/messages?connectorID=${selectedConnector}&chatId=${matchingChat.chatId}`, {
            headers: { 'x-api-key': apiKey }
          });
          
          if (msgResponse.ok) {
            const msgData = await msgResponse.json();
            const messages = (msgData.messages || []).map((msg: any) => ({
              id: msg.id,
              text: msg.text,
              sender: msg.sender,
              timestamp: new Date(msg.timestamp),
              status: 'sent' as const,
            }));
            
            setChats(prev => prev.map(c => 
              c.phoneNumber === phoneNumber 
                ? { ...c, messages: messages.sort((a: Message, b: Message) => a.timestamp.getTime() - b.timestamp.getTime()) }
                : c
            ));
          }
        }
      }
    } catch (err) {
      console.error('Failed to lookup chat:', err);
    }
  };

  const getCurrentChat = () => chats.find(c => c.phoneNumber === activeChat);

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString();
  };

  if (dataLoading) {
    return (
      <div className="h-[calc(100vh-120px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex rounded-2xl overflow-hidden glass-card">
      {/* Sidebar - Chat List */}
      <div className={clsx(
        "w-80 border-r border-white/10 flex flex-col bg-black/20",
        activeChat && "hidden md:flex"
      )}>
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Chats</h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => fetchMessages()}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                disabled={refreshing}
              >
                <RefreshCw className={clsx("w-4 h-4", refreshing && "animate-spin")} />
              </button>
              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Project/Connector selector */}
          <select
            value={selectedConnector}
            onChange={(e) => {
              setSelectedConnector(e.target.value);
              fetchMessages(e.target.value);
            }}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
          >
            {connectors.map(c => (
              <option key={c._id} value={c._id} className="bg-gray-900">
                {c.name} {c.status === 'ready' ? '✓' : '(Pending)'}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-white/10">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search or start new chat"
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
              onFocus={() => setShowNewChat(true)}
            />
          </div>
        </div>

        {/* New Chat Input */}
        {showNewChat && (
          <div className="p-3 border-b border-white/10 bg-indigo-500/10 animate-fade-in">
            <p className="text-xs text-muted mb-2">Start new conversation</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Phone number (e.g., 919999999999)"
                value={newPhoneNumber}
                onChange={(e) => setNewPhoneNumber(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                onKeyDown={(e) => e.key === 'Enter' && startNewChat()}
              />
              <button
                onClick={startNewChat}
                className="px-3 py-2 bg-indigo-500 rounded-lg hover:bg-indigo-600 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="p-8 text-center text-muted">
              <Phone className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Start a new chat above</p>
            </div>
          ) : (
            chats.map((chat) => (
              <button
                key={chat.phoneNumber}
                onClick={() => {
                  setActiveChat(chat.phoneNumber);
                  // Fetch messages for this chat if it has a chatId
                  if (chat.chatId) {
                    fetchChatMessages(chat);
                  }
                }}
                className={clsx(
                  "w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors border-b border-white/5",
                  activeChat === chat.phoneNumber && "bg-white/10"
                )}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{chat.name}</span>
                    {chat.lastMessageTime && (
                      <span className="text-xs text-muted">{formatTime(chat.lastMessageTime)}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted truncate">{chat.lastMessage || 'No messages'}</p>
                    {chat.unread > 0 && (
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-xs flex items-center justify-center">
                        {chat.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={clsx(
        "flex-1 flex flex-col",
        !activeChat && "hidden md:flex"
      )}>
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-black/20">
              <button 
                onClick={() => setActiveChat(null)}
                className="md:hidden p-2 hover:bg-white/10 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{getCurrentChat()?.name}</h3>
                <p className="text-xs text-muted">+{activeChat}</p>
              </div>
              <button className="p-2 hover:bg-white/10 rounded-lg">
                <Search className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-white/10 rounded-lg">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div 
              className="flex-1 overflow-y-auto p-4 space-y-2"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundColor: '#0a0f1a'
              }}
            >
              {getCurrentChat()?.messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center p-8 bg-white/5 rounded-xl">
                    <Smile className="w-12 h-12 mx-auto mb-4 text-muted" />
                    <p className="text-muted">Send a message to start the conversation</p>
                  </div>
                </div>
              ) : (
                getCurrentChat()?.messages.map((msg, idx) => {
                  const showDate = idx === 0 || 
                    formatDate(msg.timestamp) !== formatDate(getCurrentChat()!.messages[idx - 1].timestamp);
                  
                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="flex justify-center my-4">
                          <span className="px-3 py-1 bg-white/10 rounded-lg text-xs text-muted">
                            {formatDate(msg.timestamp)}
                          </span>
                        </div>
                      )}
                      <div className={clsx(
                        "flex",
                        msg.sender === 'me' ? 'justify-end' : 'justify-start'
                      )}>
                        <div className={clsx(
                          "max-w-[70%] rounded-2xl px-4 py-2 relative",
                          msg.sender === 'me' 
                            ? 'bg-emerald-600 rounded-br-sm' 
                            : 'bg-white/10 rounded-bl-sm'
                        )}>
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                          <div className={clsx(
                            "flex items-center gap-1 mt-1",
                            msg.sender === 'me' ? 'justify-end' : 'justify-start'
                          )}>
                            <span className="text-[10px] opacity-70">{formatTime(msg.timestamp)}</span>
                            {msg.sender === 'me' && (
                              msg.status === 'sending' ? (
                                <Loader2 className="w-3 h-3 animate-spin opacity-70" />
                              ) : msg.status === 'read' ? (
                                <CheckCheck className="w-3 h-3 text-blue-400" />
                              ) : (
                                <Check className="w-3 h-3 opacity-70" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-white/10 bg-black/20">
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <Smile className="w-6 h-6 text-muted" />
                </button>
                <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <Paperclip className="w-6 h-6 text-muted" />
                </button>
                <input
                  type="text"
                  placeholder="Type a message"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  className="flex-1 bg-white/5 border border-white/10 rounded-full px-5 py-3 focus:outline-none focus:border-indigo-500"
                />
                {newMessage.trim() ? (
                  <button 
                    onClick={sendMessage}
                    disabled={loading}
                    className="p-3 bg-emerald-500 hover:bg-emerald-600 rounded-full transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                ) : (
                  <button className="p-3 hover:bg-white/10 rounded-full transition-colors">
                    <Mic className="w-5 h-5 text-muted" />
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
            <div className="text-center">
              <div className="w-64 h-64 mx-auto mb-8 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-full blur-3xl" />
                <div className="relative w-full h-full flex items-center justify-center">
                  <Phone className="w-24 h-24 text-emerald-500/50" />
                </div>
              </div>
              <h2 className="text-2xl font-light mb-2">WhatsApp Chat</h2>
              <p className="text-muted max-w-sm mx-auto">
                Send and receive messages in real-time. Select a conversation from the sidebar or start a new one.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

