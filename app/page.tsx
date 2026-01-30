'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { callAIAgent } from '@/lib/aiAgent'
import {
  FileText,
  Upload,
  Search,
  Send,
  MessageSquare,
  Plus,
  Copy,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  CheckCircle,
  BookOpen,
  Database,
  Clock,
  Trash2,
} from 'lucide-react'

// Agent and RAG configuration
const AGENT_ID = '697d2c28d36f070193f5c85e'
const RAG_ID = '697d2c1647177de38546da1e'
const RAG_UPLOAD_URL = `https://rag-prod.studio.lyzr.ai/v2/rag/${RAG_ID}/upload`

// TypeScript interfaces based on actual_test_response
interface AgentResult {
  answer: string
  sources: any[]
  context_maintained: boolean
  follow_up_suggestions: string[]
  confidence: number
}

interface AgentMetadata {
  agent_name: string
  timestamp: string
  documents_searched: number
  retrieval_method: string
}

interface AgentResponse {
  status: 'success' | 'error'
  result: AgentResult
  metadata: AgentMetadata
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  response?: AgentResult
  metadata?: AgentMetadata
  timestamp: Date
}

interface UploadedDocument {
  name: string
  uploadDate: string
  size: number
}

// Inline components
function DocumentItem({ doc, onDelete }: { doc: UploadedDocument; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors group">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white truncate">{doc.name}</p>
          <p className="text-xs text-slate-400">{doc.uploadDate}</p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 hover:bg-red-500/10"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  )
}

function Sidebar({
  documents,
  onUploadClick,
  onNewChat,
  onDeleteDoc,
}: {
  documents: UploadedDocument[]
  onUploadClick: () => void
  onNewChat: () => void
  onDeleteDoc: (index: number) => void
}) {
  return (
    <div className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col h-screen">
      {/* Logo and Title */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">KnowledgeSearch</h1>
            <p className="text-xs text-slate-400">AI Research Tool</p>
          </div>
        </div>
      </div>

      {/* Upload Button */}
      <div className="p-4">
        <Button onClick={onUploadClick} className="w-full bg-blue-500 hover:bg-blue-600 text-white">
          <Upload className="w-4 h-4 mr-2" />
          Upload Documents
        </Button>
      </div>

      {/* Documents List */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-4 py-2">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Documents</h3>
        </div>
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-2 pb-4">
            {documents.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No documents uploaded</p>
              </div>
            ) : (
              documents.map((doc, index) => (
                <DocumentItem key={index} doc={doc} onDelete={() => onDeleteDoc(index)} />
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* KB Status */}
      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-semibold text-white">Knowledge Base</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Documents:</span>
              <span className="text-white font-medium">{documents.length}</span>
            </div>
            {documents.length > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Last updated:</span>
                <span className="text-white font-medium">
                  {new Date(documents[documents.length - 1].uploadDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-4 border-t border-slate-800">
        <Button onClick={onNewChat} variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800">
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>
    </div>
  )
}

function SourcePanel({ source, index }: { source: any; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden bg-slate-800/30">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-blue-400 border-blue-400">
            [{index + 1}]
          </Badge>
          <span className="text-sm text-white font-medium">
            {source.document_name || source.file_name || `Source ${index + 1}`}
          </span>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {isExpanded && (
        <div className="p-3 border-t border-slate-700 bg-slate-900/50">
          {source.page_number && (
            <p className="text-xs text-slate-400 mb-2">Page {source.page_number}</p>
          )}
          <p className="text-sm text-slate-300 leading-relaxed">
            {source.excerpt || source.content || source.text || JSON.stringify(source)}
          </p>
        </div>
      )}
    </div>
  )
}

function MessageBubble({ message, onCopy }: { message: Message; onCopy: (text: string) => void }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-3xl bg-blue-600 rounded-2xl rounded-tr-sm px-4 py-3">
          <p className="text-white">{message.content}</p>
        </div>
      </div>
    )
  }

  // Assistant message with full response details
  const response = message.response
  const metadata = message.metadata

  return (
    <div className="flex justify-start mb-6">
      <div className="max-w-4xl w-full">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-400" />
                <CardTitle className="text-white text-base">Answer</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {response && response.confidence !== undefined && (
                  <Badge
                    variant="outline"
                    className={
                      response.confidence > 0.7
                        ? 'text-green-400 border-green-400'
                        : response.confidence > 0.4
                        ? 'text-yellow-400 border-yellow-400'
                        : 'text-red-400 border-red-400'
                    }
                  >
                    {(response.confidence * 100).toFixed(0)}% confident
                  </Badge>
                )}
                {response && response.context_maintained && (
                  <Badge variant="outline" className="text-blue-400 border-blue-400">
                    Context maintained
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Answer text */}
            <div className="relative">
              <p className="text-slate-100 leading-relaxed whitespace-pre-wrap">{message.content}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCopy(message.content)}
                className="absolute top-0 right-0 text-slate-400 hover:text-white"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            {/* Sources */}
            {response && response.sources && response.sources.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Sources ({response.sources.length})
                </h4>
                <div className="space-y-2">
                  {response.sources.map((source: any, index: number) => (
                    <SourcePanel key={index} source={source} index={index} />
                  ))}
                </div>
              </div>
            )}

            {/* Follow-up suggestions */}
            {response && response.follow_up_suggestions && response.follow_up_suggestions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-300">Suggested questions</h4>
                <div className="space-y-1">
                  {response.follow_up_suggestions.map((suggestion: string, index: number) => (
                    <div
                      key={index}
                      className="text-sm text-blue-400 hover:text-blue-300 cursor-pointer p-2 rounded bg-slate-900/50 hover:bg-slate-900 transition-colors"
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            {metadata && (
              <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-700">
                {metadata.documents_searched !== undefined && (
                  <span>{metadata.documents_searched} documents searched</span>
                )}
                {metadata.retrieval_method && (
                  <span>Method: {metadata.retrieval_method}</span>
                )}
                {metadata.timestamp && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(metadata.timestamp).toLocaleTimeString()}
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function UploadModal({
  isOpen,
  onClose,
  onUpload,
}: {
  isOpen: boolean
  onClose: () => void
  onUpload: (files: File[]) => void
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'indexing' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files).filter((file) => file.type === 'application/pdf')
    if (files.length > 0) {
      setSelectedFiles(files)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter((file) => file.type === 'application/pdf')
      setSelectedFiles(files)
    }
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    setIsUploading(true)
    setUploadStatus('uploading')
    setUploadProgress(30)

    try {
      const formData = new FormData()
      selectedFiles.forEach((file) => {
        formData.append('files', file)
      })

      // Upload to RAG endpoint
      const response = await fetch(RAG_UPLOAD_URL, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      setUploadProgress(70)
      setUploadStatus('indexing')

      // Simulate indexing time
      await new Promise((resolve) => setTimeout(resolve, 2000))

      setUploadProgress(100)
      setUploadStatus('success')

      // Pass files to parent
      onUpload(selectedFiles)

      // Reset after success
      setTimeout(() => {
        setSelectedFiles([])
        setUploadProgress(0)
        setUploadStatus('idle')
        onClose()
      }, 1500)
    } catch (error) {
      setUploadStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const resetModal = () => {
    setSelectedFiles([])
    setUploadProgress(0)
    setUploadStatus('idle')
    setErrorMessage('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={resetModal}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl text-white">Upload Documents</DialogTitle>
          <DialogDescription className="text-slate-400">
            Add PDF documents to your knowledge base for AI-powered search
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
            }`}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
            <p className="text-white mb-2">Drag and drop PDF files here</p>
            <p className="text-sm text-slate-400 mb-4">or</p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="border-slate-700 text-white hover:bg-slate-800"
            >
              Browse Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <p className="text-xs text-slate-500 mt-4">PDF files supported • Max 50MB per file</p>
          </div>

          {/* Selected files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-white">Selected files ({selectedFiles.length})</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-slate-800 rounded">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-400" />
                      <span className="text-sm text-white">{file.name}</span>
                    </div>
                    <span className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload progress */}
          {uploadStatus !== 'idle' && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="h-2" />
              <div className="flex items-center justify-center gap-2">
                {uploadStatus === 'uploading' && (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                    <span className="text-sm text-slate-300">Uploading files...</span>
                  </>
                )}
                {uploadStatus === 'indexing' && (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                    <span className="text-sm text-slate-300">Indexing documents...</span>
                  </>
                )}
                {uploadStatus === 'success' && (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-green-400">Upload complete!</span>
                  </>
                )}
                {uploadStatus === 'error' && (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-red-400">{errorMessage}</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={resetModal} disabled={isUploading} className="border-slate-700">
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || isUploading}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Main component
export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [documents, setDocuments] = useState<UploadedDocument[]>([])
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const sessionId = useRef(`session-${Date.now()}`).current

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const handleSearch = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setStatusMessage('')

    try {
      const result = await callAIAgent(input, AGENT_ID, { session_id: sessionId })

      if (result.success && result.response.status === 'success') {
        const agentResponse = result.response as unknown as AgentResponse

        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: agentResponse.result.answer,
          response: agentResponse.result,
          metadata: agentResponse.metadata,
          timestamp: new Date(),
        }

        setMessages((prev) => [...prev, assistantMessage])
      } else {
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: result.response.message || 'Failed to get response from agent',
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMessage])
        setStatusMessage('Error: Failed to get response')
      }
    } catch (error) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Network error occurred. Please try again.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
      setStatusMessage('Error: Network error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  const handleUpload = (files: File[]) => {
    const newDocs: UploadedDocument[] = files.map((file) => ({
      name: file.name,
      uploadDate: new Date().toISOString(),
      size: file.size,
    }))
    setDocuments((prev) => [...prev, ...newDocs])
    setStatusMessage(`Successfully uploaded ${files.length} document(s)`)
    setTimeout(() => setStatusMessage(''), 3000)
  }

  const handleNewChat = () => {
    setMessages([])
    setStatusMessage('Started new conversation')
    setTimeout(() => setStatusMessage(''), 2000)
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {
      // Fallback for iframe context
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    })
    setStatusMessage('Copied to clipboard')
    setTimeout(() => setStatusMessage(''), 2000)
  }

  const handleDeleteDoc = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index))
    setStatusMessage('Document removed')
    setTimeout(() => setStatusMessage(''), 2000)
  }

  return (
    <div className="flex h-screen bg-slate-950">
      {/* Sidebar */}
      <Sidebar
        documents={documents}
        onUploadClick={() => setIsUploadModalOpen(true)}
        onNewChat={handleNewChat}
        onDeleteDoc={handleDeleteDoc}
      />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">KnowledgeSearch AI</h2>
            <Badge variant="outline" className="text-blue-400 border-blue-400">
              Research Assistant
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {statusMessage && (
              <div className="flex items-center gap-2 text-sm text-green-400">
                <CheckCircle className="w-4 h-4" />
                {statusMessage}
              </div>
            )}
          </div>
        </div>

        {/* Chat messages */}
        <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-2xl">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Start Your Research</h3>
                <p className="text-slate-400 mb-6">
                  Ask anything about your uploaded documents and get AI-powered answers with citations
                </p>
                <div className="grid grid-cols-1 gap-2 text-left">
                  <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                    <p className="text-sm text-slate-300">What are the key findings in the research?</p>
                  </div>
                  <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                    <p className="text-sm text-slate-300">Summarize the methodology used</p>
                  </div>
                  <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                    <p className="text-sm text-slate-300">What conclusions were drawn?</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} onCopy={handleCopy} />
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-slate-400 mb-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Searching knowledge base...</span>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input area */}
        <div className="border-t border-slate-800 p-4 bg-slate-900">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask anything about your documents..."
                  disabled={isLoading}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 pr-20 h-12"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                  <kbd className="px-2 py-1 bg-slate-700 rounded">Enter</kbd>
                </div>
              </div>
              <Button
                onClick={handleSearch}
                disabled={!input.trim() || isLoading}
                className="bg-blue-500 hover:bg-blue-600 text-white h-12 px-6"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <UploadModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} onUpload={handleUpload} />
    </div>
  )
}
