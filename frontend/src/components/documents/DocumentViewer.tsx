import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Eye,
  Download,
  Share2,
  FileText,
  AlertTriangle,
  Shield,
  Calendar,
  User,
  Tag,
  Clock,
  Maximize2,
  ChevronLeft,
  ExternalLink
} from 'lucide-react';
import { Document } from '@/types';
import { formatDate } from '@/lib/api';

interface DocumentViewerProps {
  document: Document;
  onClose?: () => void;
  onAttachToChat?: (documentId: string, chatType: 'ai' | 'lawyer') => void;
}

export function DocumentViewer({ document, onClose, onAttachToChat }: DocumentViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'analyzed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'processing': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'pending_analysis': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'error': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-slate-900' : ''} h-full flex flex-col`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
            )}
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {document.originalName}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`text-xs ${getStatusColor(document.status)}`}>
                  {document.status === 'pending_analysis' ? 'Analyzing...' : 
                   document.status === 'analyzed' ? 'Analyzed' : document.status}
                </Badge>
                <span className="text-sm text-slate-500">{formatFileSize(document.size)}</span>
                <span className="text-sm text-slate-500">•</span>
                <span className="text-sm text-slate-500">{formatDate(document.uploadedAt)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Eye className="w-4 h-4 mr-2" />
              View
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Document Preview */}
        <div className="flex-1 bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
          <div className="text-center p-8">
            <FileText className="w-24 h-24 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
              Document Preview
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              Preview functionality would be implemented here
            </p>
            <Button variant="outline" size="sm">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in External Viewer
            </Button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              {/* Document Info */}
              <Card className="p-4">
                <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-3">Document Information</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Type:</span>
                    <span className="text-slate-900 dark:text-slate-100 capitalize">
                      {document.type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Size:</span>
                    <span className="text-slate-900 dark:text-slate-100">
                      {formatFileSize(document.size)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Uploaded:</span>
                    <span className="text-slate-900 dark:text-slate-100">
                      {formatDate(document.uploadedAt)}
                    </span>
                  </div>
                  {document.analyzedAt && (
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Analyzed:</span>
                      <span className="text-slate-900 dark:text-slate-100">
                        {formatDate(document.analyzedAt)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">Integrity:</span>
                    <div className="flex items-center gap-1">
                      <Shield className="w-3 h-3 text-green-500" />
                      <span className="text-green-600 dark:text-green-400 text-xs">Verified</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Tags */}
              {document.tags && document.tags.length > 0 && (
                <Card className="p-4">
                  <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {document.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </Card>
              )}

              {/* AI Analysis */}
              {document.analysis && document.status === 'analyzed' && (
                <Card className="p-4">
                  <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-3">AI Analysis</h3>
                  <div className="space-y-4">
                    {/* Summary */}
                    <div>
                      <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Summary</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        {document.analysis.summary}
                      </p>
                    </div>

                    {/* Key Points */}
                    <div>
                      <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Key Points</h4>
                      <ul className="space-y-1">
                        {document.analysis.keyPoints.map((point, index) => (
                          <li key={index} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                            <span className="text-green-500 mt-1 text-xs">•</span>
                            <span className="flex-1">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Risk Flags */}
                    {document.analysis.riskFlags.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Risk Flags
                        </h4>
                        <ul className="space-y-1">
                          {document.analysis.riskFlags.map((risk, index) => (
                            <li key={index} className="text-sm text-orange-600 dark:text-orange-400 flex items-start gap-2">
                              <span className="text-orange-500 mt-1 text-xs">⚠</span>
                              <span className="flex-1">{risk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Suggested Actions */}
                    <div>
                      <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Suggested Actions</h4>
                      <ul className="space-y-1">
                        {document.analysis.suggestedActions.map((action, index) => (
                          <li key={index} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                            <span className="text-blue-500 mt-1 text-xs">→</span>
                            <span className="flex-1">{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Confidence Score */}
                    <div>
                      <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Confidence</h4>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all"
                            style={{ width: `${(document.analysis.confidence || 0) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {Math.round((document.analysis.confidence || 0) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Chat Actions */}
              {onAttachToChat && (
                <Card className="p-4">
                  <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-3">Discuss this Document</h3>
                  <div className="space-y-2">
                    <Button 
                      className="w-full justify-start" 
                      variant="outline"
                      onClick={() => onAttachToChat(document._id, 'ai')}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Chat with AI about this document
                    </Button>
                    <Button 
                      className="w-full justify-start" 
                      variant="outline"
                      onClick={() => onAttachToChat(document._id, 'lawyer')}
                    >
                      <User className="w-4 h-4 mr-2" />
                      Discuss with Lawyer
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}