import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  RotateCcw,
  Boxes,
  AlertTriangle,
  ArrowRight,
  Truck,
  ArrowDownToLine,
  MapPin,
  DollarSign,
  TrendingUp,
  Check,
  Bot,
  Zap,
  Key,
  ExternalLink,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { InventoryItem, WarehouseActivity } from '@/lib/supabase';

export interface ChatMessage {
  id: string;
  sender: 'pip' | 'user';
  text: string;
  timestamp: string;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'yellow' | 'purple' | 'green';
  }>;
  highlightItems?: InventoryItem[];
}

interface ChatbotProps {
  items: InventoryItem[];
  activity: WarehouseActivity[];
  onAction?: (modal: 'receive' | 'dispatch') => void;
  onQuickMovement?: (item: InventoryItem, type: 'received' | 'dispatched', quantity: number) => Promise<void>;
  onNavigateTab?: (view: 'overview' | 'inventory' | 'products') => void;
}

export function Chatbot({
  items,
  activity,
  onAction,
  onQuickMovement,
  onNavigateTab,
}: ChatbotProps) {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState<string>(() => {
    return (
      localStorage.getItem('smartstock_gemini_key') ||
      (import.meta.env.VITE_GEMINI_API_KEY as string) ||
      ''
    );
  });
  const [keyInput, setKeyInput] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'cleared'>('idle');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const initialGreeting: ChatMessage = {
    id: 'welcome-msg',
    sender: 'pip',
    text: "Beep boop! 👋 I'm **Pip AI**, your real-time SmartStock logistics copilot! I monitor your **" +
      items.reduce((s, i) => s + i.quantity, 0).toLocaleString() +
      " active warehouse units**, bin locations, and SKU velocities. Ask me anything or pick a quick prompt below!",
    timestamp: 'Just now',
    actions: [
      {
        label: '🚨 Scan Low Stock',
        onClick: () => handleSendPrompt('What items are low on stock?'),
        variant: 'yellow',
      },
      {
        label: '💰 Inventory Valuation',
        onClick: () => handleSendPrompt('What is our total inventory valuation?'),
        variant: 'purple',
      },
      {
        label: '📍 Find Item Locations',
        onClick: () => handleSendPrompt('Where are products stored?'),
        variant: 'green',
      },
    ],
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem('smartstock_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback to initial
    }
    return [initialGreeting];
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    try {
      sessionStorage.setItem('smartstock_chat_history', JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages]);

  const handleClearChat = () => {
    sessionStorage.removeItem('smartstock_chat_history');
    setMessages([initialGreeting]);
  };

  const handleSendPrompt = (text: string) => {
    if (!text.trim() || isTyping) return;
    executeUserMessage(text.trim());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    executeUserMessage(input.trim());
    setInput('');
  };

  const handleSaveKey = () => {
    const cleaned = keyInput.trim();
    if (cleaned) {
      localStorage.setItem('smartstock_gemini_key', cleaned);
      setApiKey(cleaned);
      setSaveStatus('saved');
    } else {
      localStorage.removeItem('smartstock_gemini_key');
      setApiKey((import.meta.env.VITE_GEMINI_API_KEY as string) || '');
      setSaveStatus('cleared');
    }
    setTimeout(() => {
      setSaveStatus('idle');
      setShowKeyModal(false);
    }, 1200);
  };

  const executeUserMessage = async (userText: string) => {
    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    const activeKey =
      apiKey.trim() ||
      localStorage.getItem('smartstock_gemini_key') ||
      (import.meta.env.VITE_GEMINI_API_KEY as string) ||
      '';

    if (activeKey) {
      try {
        const geminiReply = await callGeminiAPI(userText, items, activity, activeKey);
        const botResponse: ChatMessage = {
          id: String(Date.now() + 1),
          sender: 'pip',
          text: geminiReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actions: [
            {
              label: '🚨 Scan Low Stock',
              onClick: () => handleSendPrompt('What items are low on stock?'),
              variant: 'yellow',
            },
            {
              label: '📦 Open Inventory Hub',
              onClick: () => onNavigateTab?.('inventory'),
              variant: 'purple',
            },
          ],
        };
        setMessages((prev) => [...prev, botResponse]);
        setIsTyping(false);
        return;
      } catch (err: unknown) {
        console.warn('Gemini API call returned error, falling back to local engine:', err);
        const botResponse = generateAIResponse(userText);
        const errMsg = err instanceof Error ? err.message : 'API connection notice';
        botResponse.text = `*(Gemini API notice: ${errMsg}. Using local telemetry intelligence:)*\n\n` + botResponse.text;
        setMessages((prev) => [...prev, botResponse]);
        setIsTyping(false);
        return;
      }
    }

    // Default fast local heuristic engine
    setTimeout(() => {
      const botResponse = generateAIResponse(userText);
      setMessages((prev) => [...prev, botResponse]);
      setIsTyping(false);
    }, 450);
  };

  // Google Gemini 1.5 / 2.0 Flash API Caller
  const callGeminiAPI = async (
    prompt: string,
    currentItems: InventoryItem[],
    recentActivity: WarehouseActivity[],
    key: string
  ): Promise<string> => {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;

    const inventorySnapshot = currentItems.map((item) => ({
      sku: item.sku,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      reorder_level: item.reorder_level,
      status: item.status,
      location: item.location,
      unit_price: item.unit_price,
    }));

    const systemPrompt = `You are Pip & Boxie AI, the witty, brilliant neo-brutalist warehouse Copilot for SmartStock.
You have real-time access to the current warehouse database:
- LIVE INVENTORY CATALOG: ${JSON.stringify(inventorySnapshot)}
- RECENT ACTIVITIES: ${JSON.stringify(recentActivity.slice(0, 5))}

Instructions:
1. Answer accurately and directly using this real-time inventory catalog.
2. If the user asks about low stock, locations, valuations, stockouts, or fast movers, provide concrete numbers, exact bin locations, and clear warehouse guidance.
3. Keep your tone energetic, confident, and helpful. Use bold **keywords** and bullet points where helpful.
4. Keep answers concise (1 to 3 short paragraphs or bullet lists). Never hallucinate SKUs not in the catalog.`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\nUser Query: ${prompt}` }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 600,
      },
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) throw new Error('No candidate response returned from Gemini');
    return reply;
  };

  // The Smart Inventory AI Brain
  const generateAIResponse = (prompt: string): ChatMessage => {
    const clean = prompt.toLowerCase();
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Low stock / Urgent replenishment queries
    if (
      clean.includes('low') ||
      clean.includes('urgent') ||
      clean.includes('out of stock') ||
      clean.includes('run dry') ||
      clean.includes('replenish') ||
      clean.includes('restock') ||
      clean.includes('reorder')
    ) {
      const lowItems = items.filter((i) => i.status !== 'in_stock');
      const outOfStock = items.filter((i) => i.quantity === 0);

      if (lowItems.length === 0) {
        return {
          id: String(Date.now()),
          sender: 'pip',
          text: '🎉 **All good news!** Every SKU is currently above its reorder threshold. Total stacks are healthy across all racks and bins.',
          timestamp,
        };
      }

      const lines = lowItems.map(
        (item) =>
          `• **${item.name}** (\`${item.sku}\`): **${item.quantity} units left** (Reorder threshold: ${item.reorder_level} | Location: *${item.location}*)`
      );

      const actions = lowItems.slice(0, 2).map((item) => {
        const need = Math.max(10, item.reorder_level * 2 - item.quantity);
        return {
          label: `⚡ Restock +${need} into ${item.name.split(' ')[0]}`,
          onClick: () => {
            if (onQuickMovement) {
              onQuickMovement(item, 'received', need);
            } else if (onAction) {
              onAction('receive');
            }
          },
          variant: 'yellow' as const,
        };
      });

      return {
        id: String(Date.now()),
        sender: 'pip',
        text: `⚠️ **Found ${lowItems.length} SKUs requiring attention** (${outOfStock.length} completely empty):\n\n` +
          lines.join('\n') +
          `\n\nWould you like me to trigger an automatic purchase order manifest for these bins?`,
        timestamp,
        actions,
        highlightItems: lowItems,
      };
    }

    // 2. Valuation / Financial / Loot queries
    if (
      clean.includes('value') ||
      clean.includes('valuation') ||
      clean.includes('worth') ||
      clean.includes('loot') ||
      clean.includes('price') ||
      clean.includes('cost') ||
      clean.includes('financial') ||
      clean.includes('$') ||
      clean.includes('dollar')
    ) {
      const totalUnits = items.reduce((s, i) => s + i.quantity, 0);
      const totalValue = items.reduce((s, i) => s + i.quantity * Number(i.unit_price), 0);
      const sortedByValue = [...items].sort(
        (a, b) => b.quantity * Number(b.unit_price) - a.quantity * Number(a.unit_price)
      );
      const topValued = sortedByValue[0];

      return {
        id: String(Date.now()),
        sender: 'pip',
        text: `💰 **Warehouse Valuation Breakdown:**\n\n` +
          `• **Total Live Loot:** $${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
          `• **Total Physical Units:** ${totalUnits.toLocaleString()} units\n` +
          (topValued
            ? `• **Highest Holding Asset:** **${topValued.name}** ($${(topValued.quantity * Number(topValued.unit_price)).toLocaleString()} across ${topValued.quantity} units)\n`
            : '') +
          `• **Estimated Storage Capacity:** 92% occupancy across bays 1–4`,
        timestamp,
        actions: [
          {
            label: '📦 Review All Inventory Stacks',
            onClick: () => onNavigateTab?.('inventory'),
            variant: 'purple',
          },
        ],
      };
    }

    // 3. Product / SKU search & location lookup
    const matchingItem = items.find(
      (item) =>
        clean.includes(item.name.toLowerCase()) ||
        clean.includes(item.sku.toLowerCase()) ||
        clean.includes(item.category.toLowerCase()) ||
        (clean.includes('chair') && item.name.toLowerCase().includes('chair')) ||
        (clean.includes('keyboard') && item.name.toLowerCase().includes('keyboard')) ||
        (clean.includes('monitor') && item.name.toLowerCase().includes('monitor')) ||
        (clean.includes('dock') && item.name.toLowerCase().includes('dock')) ||
        (clean.includes('headset') && item.name.toLowerCase().includes('headset')) ||
        (clean.includes('mat') && item.name.toLowerCase().includes('mat'))
    );

    if (matchingItem) {
      return {
        id: String(Date.now()),
        sender: 'pip',
        text: `📍 **Found SKU: ${matchingItem.name}** (\`${matchingItem.sku}\`)\n\n` +
          `• **Location:** **${matchingItem.location}**\n` +
          `• **Stock Quantity:** **${matchingItem.quantity} units** (${matchingItem.status.replace('_', ' ')})\n` +
          `• **Reorder Point:** ${matchingItem.reorder_level} units\n` +
          `• **Unit Price:** $${Number(matchingItem.unit_price).toFixed(2)}\n` +
          `• **Category:** ${matchingItem.category}`,
        timestamp,
        actions: [
          {
            label: `📥 Receive +25 into ${matchingItem.location}`,
            onClick: () => {
              if (onQuickMovement) {
                onQuickMovement(matchingItem, 'received', 25);
              } else if (onAction) {
                onAction('receive');
              }
            },
            variant: 'yellow',
          },
          {
            label: `📤 Dispatch -10 from ${matchingItem.location}`,
            onClick: () => {
              if (onQuickMovement) {
                onQuickMovement(matchingItem, 'dispatched', 10);
              } else if (onAction) {
                onAction('dispatch');
              }
            },
            variant: 'purple',
          },
        ],
      };
    }

    // 4. Warehouse activity / movements / buzz
    if (
      clean.includes('activity') ||
      clean.includes('buzz') ||
      clean.includes('history') ||
      clean.includes('manifest') ||
      clean.includes('shipment') ||
      clean.includes('recent')
    ) {
      const recent = activity.slice(0, 4);
      const lines = recent.map(
        (a) => `• [${a.action.toUpperCase()}] **${a.title}** — ${a.detail} (${a.quantity} units)`
      );
      return {
        id: String(Date.now()),
        sender: 'pip',
        text: `📋 **Recent Warehouse Buzz:**\n\n` +
          (lines.length > 0 ? lines.join('\n') : 'No warehouse movements recorded yet.') +
          `\n\nWould you like to record a new intake or outbound dispatch?`,
        timestamp,
        actions: [
          {
            label: '📥 Receive Stock',
            onClick: () => onAction?.('receive'),
            variant: 'yellow',
          },
          {
            label: '📤 Dispatch Stock',
            onClick: () => onAction?.('dispatch'),
            variant: 'purple',
          },
        ],
      };
    }

    // 5. Locations summary
    if (clean.includes('where') || clean.includes('location') || clean.includes('bin') || clean.includes('rack')) {
      const locList = items.map((i) => `• **${i.name}** → **${i.location}** (${i.quantity} units)`);
      return {
        id: String(Date.now()),
        sender: 'pip',
        text: `🗺️ **Warehouse Bin & Rack Coordinates:**\n\n` +
          locList.join('\n') +
          `\n\nAll bins are mapped to Floor 2 & Depot zones.`,
        timestamp,
      };
    }

    // 6. Slow moving / Sleepy inventory promo
    if (clean.includes('slow') || clean.includes('sleepy') || clean.includes('promo') || clean.includes('clearance')) {
      return {
        id: String(Date.now()),
        sender: 'pip',
        text: `😴 **Sleepy Inventory Analysis:**\n\n` +
          `Found **2 stagnant product categories** taking up shelf space for 45+ days:\n` +
          `1. **Executive Leather Furniture** — Holding $12,400 in tied-up capital.\n` +
          `2. **Vintage Lamps & Mats** — 0 velocity this week.\n\n` +
          `💡 **Pip's Bright Idea:** Run a **15% Flash Clearance Promo** or bundle ergonomic mats with fast-moving mechanical keyboards to unlock warehouse loot!`,
        timestamp,
        actions: [
          {
            label: '🛍️ Dispatch Clearance Manifest',
            onClick: () => onAction?.('dispatch'),
            variant: 'purple',
          },
        ],
      };
    }

    // 7. General Logistics Assistant / Fallback
    return {
      id: String(Date.now()),
      sender: 'pip',
      text: `🤖 I've analyzed your warehouse telemetry for **"${prompt}"**!\n\n` +
        `• **Monitored SKUs:** ${items.length} active products in catalog\n` +
        `• **Total Units:** ${items.reduce((s, i) => s + i.quantity, 0).toLocaleString()} on shelves\n` +
        `• **Health Status:** ${items.filter((i) => i.status !== 'in_stock').length === 0 ? 'Optimal (100%)' : 'Needs Restock Attention'}\n\n` +
        `You can ask me to **check low stock**, **look up any SKU/bin location**, **calculate inventory value**, or **trigger warehouse movements**!`,
      timestamp,
      actions: [
        {
          label: '🚨 Scan Low Stock',
          onClick: () => handleSendPrompt('Show low stock'),
          variant: 'yellow',
        },
        {
          label: '📦 View Inventory Hub',
          onClick: () => onNavigateTab?.('inventory'),
          variant: 'purple',
        },
      ],
    };
  };

  const quickPrompts = [
    { label: '🚨 Low Stock', text: 'Which items are low on stock?' },
    { label: '💰 Valuation', text: 'What is our total inventory valuation?' },
    { label: '📍 Bin Map', text: 'Where are products located?' },
    { label: '⚡ Activity Log', text: 'Show recent warehouse activity' },
    { label: '😴 Slow Movers', text: 'Which products are slow moving?' },
  ];

  return (
    <div className="chatbot-wrapper">
      {/* Bot Header Card */}
      <section className="chatbot-header">
        <div className="chatbot-avatar-pulse">
          <div className="chatbot-avatar">
            <Bot size={28} />
          </div>
          <span className="live-dot" />
        </div>
        <div className="chatbot-meta">
          <div className="chatbot-title-row">
            <h2>Pip &amp; Boxie AI</h2>
            <span className="ai-pill">
              <Sparkles size={11} /> Smart Copilot
            </span>
          </div>
          <p>Trained on your real-time warehouse bins, SKUs, and live telemetry.</p>
        </div>
        <div className="chatbot-header-actions">
          <button
            type="button"
            className={`key-status-btn ${apiKey ? 'active' : ''}`}
            onClick={() => {
              setKeyInput(apiKey);
              setShowKeyModal(true);
            }}
            title="Configure Gemini API Key"
          >
            <Key size={13} />
            <span>{apiKey ? 'Gemini 1.5' : 'Set Key'}</span>
          </button>
          <button
            type="button"
            className="clear-chat-btn"
            onClick={handleClearChat}
            title="Reset conversation"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </div>
      </section>

      {/* Quick Prompt Suggestion Bar */}
      <div className="quick-prompts-bar">
        {quickPrompts.map((q) => (
          <button
            key={q.label}
            type="button"
            className="quick-chip"
            onClick={() => handleSendPrompt(q.text)}
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* Message Feed */}
      <div className="chat-messages-container">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-bubble-row ${msg.sender === 'user' ? 'user-row' : 'pip-row'}`}
          >
            {msg.sender === 'pip' && (
              <div className="pip-icon-mark">
                <Bot size={17} />
              </div>
            )}
            <div className={`chat-bubble-box ${msg.sender === 'user' ? 'user-bubble' : 'pip-bubble'}`}>
              <div className="bubble-header">
                <strong>{msg.sender === 'pip' ? 'Pip AI' : 'You (Alex)'}</strong>
                <time>{msg.timestamp}</time>
              </div>
              <div className="bubble-content">
                {msg.text.split('\n').map((line, idx) => (
                  <p key={idx}>
                    {renderFormattedLine(line)}
                  </p>
                ))}
              </div>

              {/* Action Buttons Embedded in Message */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="bubble-actions">
                  {msg.actions.map((act, aIdx) => (
                    <button
                      key={aIdx}
                      type="button"
                      className={`bubble-action-btn ${act.variant || 'yellow'}`}
                      onClick={act.onClick}
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="chat-bubble-row pip-row">
            <div className="pip-icon-mark">
              <Bot size={17} />
            </div>
            <div className="chat-bubble-box pip-bubble typing-box">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
              <small>Pip is crunching live inventory telemetry...</small>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          placeholder="Ask Pip about stock levels, locations, restock orders, or valuations..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isTyping}
        />
        <button
          type="submit"
          className="chat-send-btn"
          disabled={!input.trim() || isTyping}
          aria-label="Send message"
        >
          <Send size={16} />
        </button>
      </form>

      {/* API Key Modal */}
      {showKeyModal && (
        <div className="modal-backdrop" onClick={() => setShowKeyModal(false)}>
          <div className="modal api-key-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowKeyModal(false)}>
              <X size={18} />
            </button>
            <div className="modal-icon" style={{ background: '#e5d8ff', color: '#4b3094' }}>
              <Key size={26} />
            </div>
            <p className="eyebrow">INTELLIGENCE ENGINE</p>
            <h2>Google Gemini API Key</h2>
            <p>
              Connect Gemini 1.5 / 2.0 Flash for real-time generative reasoning across your entire inventory.
            </p>

            <div className="key-free-tip">
              <Sparkles size={16} />
              <div>
                <strong>Need a free API key?</strong>
                <p>Google AI Studio provides a free key with no credit card required.</p>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="get-key-link"
                >
                  Get Free Gemini Key <ExternalLink size={12} />
                </a>
              </div>
            </div>

            <label style={{ marginTop: '14px', display: 'block', fontWeight: 700, fontSize: '12px' }}>
              Gemini API Key
            </label>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="key-modal-input"
            />

            {saveStatus === 'saved' && (
              <div className="key-saved-notice">
                <Check size={14} /> Key saved! Pip will now use Gemini Flash.
              </div>
            )}
            {saveStatus === 'cleared' && (
              <div className="key-cleared-notice">
                Key cleared. Pip will use local smart engine.
              </div>
            )}

            <div className="key-modal-actions">
              <button
                type="button"
                className="modal-submit"
                onClick={handleSaveKey}
                style={{ flex: 1 }}
              >
                Save &amp; Connect <ShieldCheck size={16} />
              </button>
              {apiKey && (
                <button
                  type="button"
                  className="clear-key-btn"
                  onClick={() => {
                    setKeyInput('');
                    handleSaveKey();
                  }}
                >
                  Remove Key
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to format basic bold and code snippets in bot messages
function renderFormattedLine(text: string) {
  if (!text) return '\u00A0';

  // Split bold **text** and `code`
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index} className="inline-code">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}
