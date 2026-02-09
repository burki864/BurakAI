import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged, 
  signInWithCustomToken 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  MessageSquare, Plus, Settings, Send, 
  Sun, Moon, Loader2, Zap, Brain, Sparkles,
  Menu, AlertTriangle
} from 'lucide-react';

/**
 * 🛠️ GÜVENLİ ORTAM DEĞİŞKENLERİ ERİŞİMİ
 */
const getEnvValue = (key) => {
  try {
    // Vercel/Vite ortamı
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
    // process.env kontrolü
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {}
  return "";
};

const firebaseConfig = {
  apiKey: getEnvValue('VITE_FIREBASE_API_KEY'),
  authDomain: getEnvValue('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvValue('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvValue('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvValue('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvValue('VITE_FIREBASE_APP_ID')
};

// Global App ID
const appId = typeof __app_id !== 'undefined' ? __app_id : 'burak-ai-pro-v5';

// Firebase Başlatma Kontrolü (Hata Önleyici)
let app, auth, db;
let isFirebaseValid = false;

if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "") {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    isFirebaseValid = true;
  } catch (e) {
    console.error("Firebase başlatma hatası:", e);
  }
}

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(isFirebaseValid);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const messagesEndRef = useRef(null);

  /**
   * 🔐 KİMLİK DOĞRULAMA (Rule 3)
   */
  useEffect(() => {
    if (!isFirebaseValid) {
      setLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };

    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /**
   * 📁 VERİ SENKRONİZASYONU (Rule 1 & 2)
   */
  useEffect(() => {
    if (!user || !isFirebaseValid) return;

    const messagesCollection = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
    
    const unsubscribe = onSnapshot(messagesCollection, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sortedMsgs = msgs.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      setMessages(sortedMsgs);
    }, (error) => {
      console.error("Firestore sync error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !user || !isFirebaseValid) return;

    const newMessage = {
      text: input,
      userId: user.uid,
      userName: user.isAnonymous ? `Kullanıcı-${user.uid.slice(0, 4)}` : user.displayName,
      createdAt: serverTimestamp(),
    };

    try {
      setInput('');
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'messages'), newMessage);
    } catch (err) {
      console.error("Gönderim hatası:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0f172a] text-white">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      </div>
    );
  }

  // Firebase Anahtarı Eksikse Uyarı Göster
  if (!isFirebaseValid) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#0f172a] text-white p-6 text-center">
        <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="h-10 w-10 text-yellow-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Yapılandırma Eksik</h2>
        <p className="text-slate-400 max-w-md mb-8">
          Vercel panelinden <b>VITE_FIREBASE_API_KEY</b> ve diğer değişkenleri eklemeniz gerekiyor. Şu an uygulama önizleme modunda çalışıyor.
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-6 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 transition"
        >
          Değişkenleri Ekledim, Yeniden Başlat
        </button>
      </div>
    );
  }

  return (
    <div className={`flex h-screen w-full ${darkMode ? 'bg-[#0f172a] text-white' : 'bg-slate-50 text-slate-900'} transition-colors duration-300`}>
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-72' : 'w-0'} overflow-hidden transition-all duration-300 bg-[#020617] flex flex-col border-r border-white/5`}>
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3 font-black text-2xl tracking-tighter text-blue-500 italic">
            <Zap className="h-7 w-7 fill-blue-500" />
            <span>BURAKAI</span>
          </div>
        </div>
        <div className="flex-1 p-4">
          <button className="w-full flex items-center justify-center gap-2 p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition shadow-lg shadow-blue-600/20">
            <Plus className="h-5 w-5" /> Yeni Sohbet
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className={`h-16 flex items-center justify-between px-6 border-b ${darkMode ? 'border-white/5 bg-[#0f172a]/80' : 'border-slate-200 bg-white/80'} backdrop-blur-xl`}>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/10 rounded-xl transition">
            <Menu className="h-5 w-5" />
          </button>
          <button onClick={() => setDarkMode(!darkMode)} className="p-2.5 rounded-xl border border-white/10">
            {darkMode ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-slate-600" />}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.userId === user?.uid ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] p-4 rounded-3xl ${msg.userId === user?.uid ? 'bg-blue-600 text-white' : 'bg-white/10 text-slate-100'}`}>
                <p className="text-[10px] font-bold opacity-40 mb-1 uppercase tracking-tighter">{msg.userName}</p>
                <p className="text-sm font-medium">{msg.text}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 border-t border-white/5">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Mesajınızı yazın..."
              className="w-full bg-white/5 border border-white/10 rounded-[2rem] py-5 pl-8 pr-16 focus:outline-none focus:ring-4 focus:ring-blue-500/20 text-white"
            />
            <button type="submit" className="absolute right-3 top-3 bottom-3 px-6 bg-blue-600 rounded-2xl text-white">
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default App;
