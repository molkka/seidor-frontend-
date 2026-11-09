import { useState, useRef, useEffect } from 'react'
import { Send, Trash2 } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
  LineChart, Line, CartesianGrid,
} from 'recharts'
import { api } from '@/services/api'
import { useT } from '@/hooks/useT'
import { useI18nStore } from '@/store/i18nStore'
import { chatbotErrorMessage, chatbotLanguage } from '@/services/chatbotErrors'

interface ChartData {
  title: string
  data: Array<{ name: string; value: number }>
  valueKey: string
  nameKey: string
  unit: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  type?: 'text' | 'bar' | 'pie' | 'line'
  chart?: ChartData
}

const PIE_COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#65a30d']


// ── Composant graphique ────────────────────────────────────────────────────────
function ChartMessage({ chart, type }: { chart: ChartData; type: string }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>
        {chart.title}
      </div>
      <ResponsiveContainer width="100%" height={240}>
        {type === 'bar' ? (
          <BarChart data={chart.data} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
            <XAxis dataKey={chart.nameKey} tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
            <YAxis tick={{ fontSize: 11 }} unit={chart.unit} />
            <Tooltip formatter={(v) => [`${v}${chart.unit}`, '']} />
            <Bar dataKey={chart.valueKey} radius={[4, 4, 0, 0]}>
              {chart.data.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        ) : type === 'pie' ? (
          <PieChart>
            <Pie
              data={chart.data}
              dataKey={chart.valueKey}
              nameKey={chart.nameKey}
              cx="50%"
              cy="45%"
              outerRadius={85}
              label={({ name, percent }) =>
                `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
              }
              labelLine={false}
            >
              {chart.data.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [`${v}`, '']} />
          </PieChart>
        ) : (
          <LineChart data={chart.data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey={chart.nameKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} unit={chart.unit} />
            <Tooltip formatter={(v) => [`${v}${chart.unit}`, '']} />
            <Line
              type="monotone"
              dataKey={chart.valueKey}
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 3, fill: '#2563eb' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

const WELCOME: Message = {
  role: 'assistant',
  content:
    'Bonjour ! Je suis votre assistant de planification SAP.\nPosez vos questions en français, anglais ou arabe 🌍\n\nExemples : top consultants, répartition projets, disponibles semaine 15, recommandations...',
}

// ── Page principale ────────────────────────────────────────────────────────────
export default function ChatbotPage({ embedded = false }: { embedded?: boolean }) {
  const t = useT().chatbot
  const lang = useI18nStore(s => s.lang)
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Charger l'historique au démarrage
  useEffect(() => {
    api.get('/chatbot/history?limit=100').then(res => {
      if (res.data.length > 0) {
        setMessages(res.data.map((m: any) => ({
          role: m.role,
          content: m.content,
          type: m.type ?? 'text',
          chart: m.chart ?? undefined,
        })))
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      }
    }).catch(() => {})
  }, [])

  async function clearHistory() {
    await api.delete('/chatbot/history').catch(() => {})
    setMessages([WELCOME])
  }

  async function sendMessage(text?: string) {
    const question = text ?? input
    if (!question.trim() || loading) return
    const language = chatbotLanguage(question, lang)
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: question }])
    setLoading(true)
    try {
      const res = await api.post('/chatbot/ask', { question, language })
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: res.data.answer,
          type: res.data.type ?? 'text',
          chart: res.data.chart ?? undefined,
        },
      ])
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: chatbotErrorMessage(error, language),
        },
      ])
    } finally {
      setLoading(false)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }

  return (
    <div className={embedded ? 'flex h-full min-h-0 flex-col' : 'flex flex-col h-[calc(100vh-6rem)] max-w-3xl mx-auto'}>
      <div className="mb-2 flex shrink-0 flex-wrap items-start justify-between gap-2">
        <div>
          {!embedded && <h2 className="text-xl font-semibold text-foreground">{t.title}</h2>}
          <p className="text-sm text-muted-foreground mt-0.5">
            FR / EN / <strong>عربي</strong>
          </p>
        </div>
        <button
          onClick={clearHistory}
          title={t.clear}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground border border-border rounded-lg hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
        >
          <Trash2 size={13} />
          {t.clear}
        </button>
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto space-y-3 mb-4 pr-1" role="log" aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`min-w-0 break-words px-4 py-2.5 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-primary text-primary-foreground max-w-sm'
                  : 'bg-card border border-border text-foreground w-full max-w-lg'
              }`}
            >
              {m.content}
              {m.chart && m.type && m.type !== 'text' && (
                <ChartMessage chart={m.chart} type={m.type} />
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-card border border-border px-4 py-2.5 rounded-xl text-sm text-muted-foreground flex items-center gap-2">
              <span className="inline-flex gap-1">
                {[0, 150, 300].map(delay => (
                  <span
                    key={delay}
                    className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </span>
              {t.thinking}
            </div>
          </div>
        )}
      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {t.suggestions.map(s => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="px-3 py-1.5 bg-muted hover:bg-muted/80 border border-border rounded-full text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex shrink-0 gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && sendMessage()}
          aria-label={t.placeholder}
          placeholder={t.placeholder}
          className="min-w-0 flex-1 px-3 py-2.5 bg-background border border-input rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"
        />
        <button
          onClick={() => sendMessage()}
          aria-label={lang === 'fr' ? 'Envoyer' : 'Send'}
          disabled={!input.trim() || loading}
          className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}
