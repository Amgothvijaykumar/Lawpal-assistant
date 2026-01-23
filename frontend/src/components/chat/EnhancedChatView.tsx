import { useState } from 'react';
import { 
  MessageSquare, 
  Bot, 
  User, 
  Gavel, 
  Video, 
  Phone, 
  FileText, 
  Send,
  Paperclip,
  Smile,
  MoreVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type ChatType = 'ai' | 'lawyer';

interface EnhancedChatViewProps {
  onClose?: () => void;
}

export function EnhancedChatView({ onClose }: EnhancedChatViewProps) {
  const [chatType, setChatType] = useState<ChatType>('ai');
  const [message, setMessage] = useState('');
  const [lawyerStatus, setLawyerStatus] = useState<'online' | 'offline' | 'busy'>('online');

  const mockMessages = [
    {
      id: 1,
      type: 'user' as const,
      content: 'I need help with a property dispute with my neighbors.',
      timestamp: new Date('2024-01-23T10:30:00'),
    },
    {
      id: 2,
      type: chatType === 'ai' ? 'ai' as const : 'lawyer' as const,
      content: chatType === 'ai' 
        ? 'I can help you understand property dispute laws. Can you provide more details about the specific issue you\'re facing?'
        : 'I\'ve reviewed your case. Property disputes can be complex. Let me ask you a few questions to better understand your situation.',
      timestamp: new Date('2024-01-23T10:32:00'),
    },
    {
      id: 3,
      type: 'user' as const,
      content: 'They are claiming that our fence is on their property, but we have documents showing it\'s been there for 15 years.',
      timestamp: new Date('2024-01-23T10:35:00'),
    }
  ];

  const handleSendMessage = () => {
    if (message.trim()) {
      // Handle message sending
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {chatType === 'ai' ? (
              <>
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">ACTRIGHT AI</h3>
                  <p className="text-sm text-slate-500">AI Legal Assistant</p>
                </div>
              </>
            ) : (
              <>
                <div className="relative">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src="/lawyer-avatar.jpg" alt="Lawyer" />
                    <AvatarFallback className="bg-green-100 text-green-700">AS</AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                    lawyerStatus === 'online' ? 'bg-green-500' : 
                    lawyerStatus === 'busy' ? 'bg-yellow-500' : 'bg-gray-500'
                  }`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">Adv. Priya Sharma</h3>
                    <Badge variant="outline" className="text-xs border-green-200 text-green-700">
                      Verified Lawyer
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`flex items-center gap-1 ${
                      lawyerStatus === 'online' ? 'text-green-600' : 'text-slate-500'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        lawyerStatus === 'online' ? 'bg-green-500' : 
                        lawyerStatus === 'busy' ? 'bg-yellow-500' : 'bg-gray-500'
                      }`} />
                      {lawyerStatus === 'online' ? 'Online' : lawyerStatus === 'busy' ? 'Busy' : 'Offline'}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {chatType === 'lawyer' && (
              <>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Video className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Phone className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <FileText className="w-4 h-4" />
                </Button>
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>View Profile</DropdownMenuItem>
                <DropdownMenuItem>Export Chat</DropdownMenuItem>
                <DropdownMenuItem>Clear History</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Chat Type Switcher */}
        <div className="flex gap-2">
          <Button
            variant={chatType === 'ai' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setChatType('ai')}
            className="flex-1"
          >
            <Bot className="w-4 h-4 mr-2" />
            AI Assistant
          </Button>
          <Button
            variant={chatType === 'lawyer' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setChatType('lawyer')}
            className="flex-1"
          >
            <Gavel className="w-4 h-4 mr-2" />
            Human Lawyer
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {mockMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                msg.type === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              <Avatar className="w-8 h-8 shrink-0">
                {msg.type === 'user' ? (
                  <AvatarFallback className="bg-blue-100 text-blue-700">
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                ) : msg.type === 'ai' ? (
                  <AvatarFallback className="bg-purple-100 text-purple-700">
                    <Bot className="w-4 h-4" />
                  </AvatarFallback>
                ) : (
                  <AvatarImage src="/lawyer-avatar.jpg" alt="Lawyer" />
                )}
              </Avatar>
              
              <div className={`flex-1 ${msg.type === 'user' ? 'text-right' : ''}`}>
                <div
                  className={`inline-block p-3 rounded-lg max-w-[80%] ${
                    msg.type === 'user'
                      ? 'bg-blue-600 text-white ml-auto'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {msg.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="border-t border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your legal question..."
              className="min-h-[60px] resize-none"
              rows={2}
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Smile className="w-4 h-4" />
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim()}
              className="h-8 w-8 p-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}