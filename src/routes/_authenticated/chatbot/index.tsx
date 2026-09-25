import { createFileRoute } from '@tanstack/react-router'
import ChatbotPage from '@/pages/chatbot/ChatbotPage'

export const Route = createFileRoute('/_authenticated/chatbot/')({
  component: ChatbotPage,
})
