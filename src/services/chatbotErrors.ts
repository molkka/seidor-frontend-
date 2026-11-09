export type ChatbotLanguage = 'fr' | 'en' | 'ar'

export function chatbotLanguage(question: string, selected: 'fr' | 'en' | 'ar'): ChatbotLanguage {
  return /[\u0600-\u06ff]/.test(question) ? 'ar' : selected
}

// Stable public codes only: never display raw SDK/provider messages.
const errors: Record<string, [string, string, string]> = {
  "ai_not_configured": [
    "Le service IA n'est pas configuré. Contactez l'administrateur.",
    "The AI service is not configured. Contact the administrator.",
    "خدمة الذكاء الاصطناعي غير مهيأة. يرجى التواصل مع المسؤول."
  ],
  "ai_authentication": [
    "L'accès au service IA a été refusé. Contactez l'administrateur.",
    "Access to the AI service was refused. Contact the administrator.",
    "تم رفض الوصول إلى خدمة الذكاء الاصطناعي. يرجى التواصل مع المسؤول."
  ],
  "ai_model_unavailable": [
    "Le modèle IA configuré est indisponible pour ce compte. Contactez l'administrateur.",
    "The configured AI model is unavailable to this account. Contact the administrator.",
    "نموذج الذكاء الاصطناعي المحدد غير متاح لهذا الحساب. يرجى التواصل مع المسؤول."
  ],
  "ai_timeout": [
    "Le service IA a mis trop de temps à répondre. Réessayez.",
    "The AI service took too long to respond. Please try again.",
    "استغرقت خدمة الذكاء الاصطناعي وقتًا طويلاً للرد. يرجى المحاولة مجددًا."
  ],
  "ai_connection": [
    "Le serveur ne peut pas joindre le service IA. Réessayez dans un instant.",
    "The server cannot reach the AI service. Please try again shortly.",
    "يتعذر على الخادم الاتصال بخدمة الذكاء الاصطناعي. يرجى المحاولة بعد قليل."
  ],
  "ai_rate_limited": [
    "La limite du service IA est atteinte. Réessayez dans un instant.",
    "The AI service limit has been reached. Please try again shortly.",
    "تم بلوغ حد استخدام خدمة الذكاء الاصطناعي. يرجى المحاولة بعد قليل."
  ],
  "ai_provider_error": [
    "Le service IA a rejeté la demande. Réessayez ou contactez l'administrateur.",
    "The AI service rejected the request. Retry or contact the administrator.",
    "رفضت خدمة الذكاء الاصطناعي الطلب. أعد المحاولة أو تواصل مع المسؤول."
  ],
  "ai_invalid_response": [
    "Le service IA a renvoyé une réponse invalide. Réessayez.",
    "The AI service returned an invalid response. Please try again.",
    "أعادت خدمة الذكاء الاصطناعي استجابة غير صالحة. يرجى المحاولة مجددًا."
  ],
  "backend_connection": [
    "Impossible de joindre le serveur de planification. Vérifiez votre connexion et réessayez.",
    "Cannot reach the planning server. Check your connection and retry.",
    "يتعذر الاتصال بخادم التخطيط. تحقق من اتصالك وأعد المحاولة."
  ],
  "backend_timeout": [
    "Le serveur de planification met trop de temps à répondre. Réessayez.",
    "The planning server took too long to respond. Please try again.",
    "استغرق خادم التخطيط وقتًا طويلاً للرد. يرجى المحاولة مجددًا."
  ],
  "backend_error": [
    "Le serveur de planification a rencontré une erreur. Réessayez ou contactez l’administrateur.",
    "The planning server encountered an error. Retry or contact the administrator.",
    "واجه خادم التخطيط خطأ. أعد المحاولة أو تواصل مع المسؤول."
  ],
  "forbidden": [
    "Vous n’avez pas accès au chatbot avec ce compte.",
    "This account does not have access to the chatbot.",
    "لا يملك هذا الحساب صلاحية الوصول إلى المحادثة."
  ]
}

export function chatbotErrorMessage(error: unknown, language: ChatbotLanguage): string {
  const e = error as { code?: string; response?: { status?: number; data?: { detail?: { code?: string } } } }
  const code = e?.response?.data?.detail?.code
  const fallback = e?.response?.status === 403 ? 'forbidden'
    : e?.code === 'ECONNABORTED' ? 'backend_timeout'
    : !e?.response ? 'backend_connection' : 'backend_error'
  const message = code && Object.prototype.hasOwnProperty.call(errors, code) ? errors[code] : errors[fallback]
  return message[{ fr: 0, en: 1, ar: 2 }[language]]
}
