import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import { 
  MessageSquare, Plus, Settings, Send, 
  Trash2, Sun, Moon, User, 
  LogOut, Loader2, Zap, Brain, Sparkles,
  Shield, AlertCircle, RefreshCw
} from 'lucide-react';

/**
 * 🛠️ CONFIGURATION
 */
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Not: Bu anahtar sadece bu önizleme ortamı içindir.
const GROQ_API_KEY = "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";

const App = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [darkMode, setDarkMode] = useState(true);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [appSettings, setAppSettings] = useState({
    personality: 'funny', 
    creativity: 'high', 
    language: 'tr', 
    showTime: true,
  });

  // Otomatik Anonim Giriş (Domain hatasını engellemek için en güvenli yol)
  useEffect(() => {
    const initSession = async () => {
        try {
            await signInAnonymously(auth);
        } catch (err) {
            console.error("Auth Error:", err);
            setError("Oturum başlatılamadı. Lütfen sayfayı yenileyin.");
        }
    };

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser({
          name: "Burak Pro Kullanıcısı",
          uid: currentUser.uid,
          isAnonymous: currentUser.isAnonymous
        });
      } else {
        initSession();
      }
    });
    return () => unsubscribe();
  }, []);

  // Yerel Kayıtlar
  useEffect(() => {
    const saved = localStorage.getItem('burak_ai_v5_data');
    if (saved) {
        const { chats: savedChats, settings: savedSettings } = JSON.parse(saved);
        setChats(savedChats || []);
        setAppSettings(savedSettings || appSettings);
        if (savedChats?.length > 0) setActiveChatId(savedChats[0].id);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('burak_ai_v5_data', JSON.stringify({ chats, settings: appSettings }));
  }, [chats, appSettings]);

  /**
   * 🤖 GROQ API ENGINE
   */
  const handleSendMessage = async (text) => {
    if (!text.trim() || loading) return;

    const currentChatId = activeChatId || `chat_${Date.now()}`;
    if (!activeChatId) {
        const newChat = { id: currentChatId, title: text.substring(0, 30), messages: [] };
        setChats([newChat, ...chats]);
        setActiveChatId(currentChatId);
    }

    const userMsg = { role: 'user', content: text, time: new Date().toLocaleTimeString() };
    setChats(prev => prev.map(c => c.id === currentChatId ? { ...c, messages: [...c.messages, userMsg] } : c));
    setLoading(true);
    setError(null);

    try {
      // Her isteğe rastgelelik katmak için 'seed' ve 'timestamp' ekliyoruz
      const systemPrompts = {
        normal: "Sen BurakAI Pro'sun. Bilgilendirici ve yardımsever ol.",
        funny: "Sen çok esprili, zeki ve asla klişe cevaplar vermeyen bir asistansın. Her cevabın özgün olsun.",
        formal: "Resmi ve kurumsal bir dille konuşan bir uzmansın."
      };

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { 
              role: "system", 
              content: `${systemPrompts[appSettings.personality]} Bugün: ${new Date().toString()}. Kullanıcıyla yeni bir bağ kur, asla önceki şablonlarını kullanma.` 
            },
            { role: "user", content: text }
          ],
          temperature: appSettings.creativity === 'high' ? 1.2 : 0.7,
          top_p: 0.9,
          stream: false
        })
      });

      if (!response.ok) throw new Error("API Limitine takılmış olabilir veya anahtar geçersiz.");

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      const aiMsg = { role: 'ai', content: aiResponse, time: new Date().toLocaleTimeString() };

      setChats(prev => prev.map(c => c.id === currentChatId ? { ...c, messages: [...c.messages, aiMsg] } : c));
    } catch (err) {
      setError("Bağlantı Hatası: Groq sunucuları şu an yoğun olabilir.");
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    setChats([]);
    setActiveChatId(null);
  };

  if (!user && !error) {
    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0a0a0c] text-white">
            <Loader2 className="animate-spin text-indigo-500 mb-4" size={48} />
            <p className="font-black tracking-widest animate-pulse">SİSTEM BAŞLATILIYOR...</p>
        </div>
    );
  }

  return (
    <div className={`flex h-screen w-full font-sans transition-colors duration-500 ${darkMode ? 'bg-[#0a0a0c] text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* SIDEBAR */}
      <aside className={`w-80 border-r ${darkMode ? 'bg-[#0d0d0f] border-white/5' : 'bg-white border-slate-200'} flex flex-col p-6 hidden md:flex`}>
        <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                <Zap size={20} className="text-white" fill="white" />
            </div>
            <h1 className="text-xl font-black tracking-tighter italic">BURAK<span className="text-indigo-600">AI</span> PRO</h1>
        </div>

        <button 
            onClick={() => { setActiveChatId(null); setActiveTab('chat'); }}
            className="w-full bg-indigo-600 hover:bg-indigo-500 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 mb-8 transition-all active:scale-95 shadow-xl shadow-indigo-600/10"
        >
            <Plus size={18}/> Yeni Proje
        </button>

        <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
            <p className="text-[10px] font-black text-slate-500 mb-4 uppercase tracking-[0.2em] px-2">Geçmiş Konuşmalar</p>
            {chats.map(c => (
                <div 
                    key={c.id}
                    onClick={() => { setActiveChatId(c.id); setActiveTab('chat'); }}
                    className={`group flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all ${activeChatId === c.id ? 'bg-indigo-600/10 text-indigo-500 border border-indigo-500/20' : 'hover:bg-white/5 text-slate-500'}`}
                >
                    <MessageSquare size={16} />
                    <span className="flex-1 truncate font-bold text-sm">{c.title}</span>
                    <Trash2 
                        size={14} 
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:scale-125" 
                        onClick={(e) => { e.stopPropagation(); setChats(chats.filter(h => h.id !== c.id)); }} 
                    />
                </div>
            ))}
        </div>

        <div className={`mt-auto p-4 rounded-2xl border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center text-indigo-500 font-black">B</div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-black truncate">{user?.name}</p>
                    <p className="text-[9px] text-green-500 font-black uppercase tracking-widest">Çevrimiçi</p>
                </div>
                <button onClick={() => setActiveTab('settings')} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><Settings size={18}/></button>
            </div>
        </div>
      </aside>

      {/* CONTENT AREA */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className={`px-8 py-5 border-b flex justify-between items-center z-20 ${darkMode ? 'bg-[#0a0a0c]/80 border-white/5' : 'bg-white/80 border-slate-200'} backdrop-blur-xl`}>
            <div className="flex items-center gap-4">
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest border ${darkMode ? 'border-indigo-500/30 text-indigo-400 bg-indigo-500/5' : 'border-indigo-200 text-indigo-600 bg-indigo-50'}`}>
                    LLAMA 3.3 70B ENGINE
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                <button onClick={() => setDarkMode(!darkMode)} className={`p-2.5 rounded-xl border transition-all ${darkMode ? 'bg-white/5 border-white/10 text-yellow-500' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                    {darkMode ? <Sun size={20}/> : <Moon size={20}/>}
                </button>
            </div>
        </header>

        <div className="flex-1 overflow-hidden">
            {activeTab === 'chat' ? (
                <div className="h-full flex flex-col max-w-5xl mx-auto w-full px-6 md:px-12 pt-8">
                    <div className="flex-1 overflow-y-auto space-y-8 pb-32 custom-scrollbar">
                        {!activeChatId ? (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in-95 duration-700">
                                <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-indigo-600/40 border-4 border-white/10">
                                    <Sparkles size={40} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black italic mb-2">Merhaba Burak, neyi keşfedelim?</h2>
                                    <p className="text-slate-500 font-medium">Groq Llama 3.3 motoruyla en hızlı yanıtları alıyorsun.</p>
                                </div>
                            </div>
                        ) : (
                            chats.find(c => c.id === activeChatId)?.messages.map((m, i) => (
                                <div key={i} className={`flex gap-5 ${m.role === 'user' ? 'flex-row-reverse' : ''} animate-in slide-in-from-bottom-2 duration-300`}>
                                    <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center font-black ${m.role === 'ai' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-white shadow-xl'}`}>
                                        {m.role === 'ai' ? <Zap size={20}/> : 'B'}
                                    </div>
                                    <div className={`max-w-[85%] ${m.role === 'user' ? 'text-right' : ''}`}>
                                        <div className={`p-6 rounded-3xl text-[16px] leading-relaxed ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : (darkMode ? 'bg-white/5 border border-white/5' : 'bg-white shadow-sm border border-slate-100')}`}>
                                            {m.content}
                                        </div>
                                        {appSettings.showTime && <span className="text-[10px] font-black text-slate-500 mt-3 block uppercase tracking-widest">{m.time}</span>}
                                    </div>
                                </div>
                            ))
                        )}
                        {loading && (
                            <div className="flex gap-5 items-center animate-pulse">
                                <div className="w-12 h-12 bg-indigo-600/20 rounded-2xl flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={20}/></div>
                                <span className="text-xs font-black text-indigo-500 tracking-widest uppercase">Groq Motoru Yanıtlıyor...</span>
                            </div>
                        )}
                    </div>

                    {/* INPUT BOX */}
                    <div className="fixed bottom-10 left-0 md:left-80 right-0 px-6 md:px-20 pointer-events-none">
                        <div className="max-w-4xl mx-auto w-full pointer-events-auto">
                            <div className={`relative flex items-center p-2 rounded-[2.5rem] border shadow-2xl transition-all ${darkMode ? 'bg-[#121215]/90 border-white/10' : 'bg-white border-slate-200'}`}>
                                <textarea 
                                    className="flex-1 bg-transparent px-6 py-4 outline-none resize-none font-medium text-[16px] max-h-40"
                                    placeholder="Buraya bir mesaj bırak..."
                                    rows={1}
                                    onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e.target.value); e.target.value = ""; } }}
                                />
                                <button className="w-14 h-14 bg-indigo-600 hover:bg-indigo-500 rounded-3xl flex items-center justify-center text-white transition-all shadow-lg active:scale-90">
                                    <Send size={22} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-10 max-w-4xl mx-auto space-y-10">
                    <div>
                        <h2 className="text-4xl font-black mb-2">Ayarlar</h2>
                        <p className="text-slate-500 font-medium">Sistem tercihlerinizi yapılandırın.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={`p-8 rounded-[2rem] border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
                            <h3 className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-6">AI Karakteri</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {['normal', 'funny', 'formal'].map(p => (
                                    <button 
                                        key={p} 
                                        onClick={() => setAppSettings({...appSettings, personality: p})}
                                        className={`py-4 rounded-2xl font-black text-xs uppercase tracking-tighter transition-all ${appSettings.personality === p ? 'bg-indigo-600 text-white' : 'bg-white/5 hover:bg-white/10 text-slate-500'}`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className={`p-8 rounded-[2rem] border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
                            <h3 className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-6">Tehlikeli İşlemler</h3>
                            <button onClick={clearHistory} className="w-full flex items-center justify-center gap-2 py-4 bg-red-500/10 text-red-500 rounded-2xl font-black text-xs hover:bg-red-500 hover:text-white transition-all">
                                <Trash2 size={16}/> Tüm Geçmişi Sil
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </main>
    </div>
  );
};

export default App;
