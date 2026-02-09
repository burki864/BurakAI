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
          top
