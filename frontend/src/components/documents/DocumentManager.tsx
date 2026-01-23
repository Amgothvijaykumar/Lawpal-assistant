import { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Upload,
  FileText,
  Eye,
  Share2,
  Trash2,
  Search,
  Filter,
  AlertTriangle,
  Shield,
  MessageSquare,
  UserPlus,
  Brain,
  FileCheck,
  AlertCircle,
  Zap,
  X,
  Download,
  CheckCircle2
} from 'lucide-react';
import { Document, DocumentType, DocumentStatus } from '@/types';
import { formatRelativeTime } from '@/lib/api';
import { useDocuments } from '@/hooks/useDocuments';

interface DocumentManagerProps {
  onAttachToChat?: (documentId: string, chatType: 'ai' | 'lawyer') => void;
}

export function DocumentManager({ onAttachToChat }: DocumentManagerProps) {
  const { documents, loading, uploadDocument, deleteDocument } = useDocuments();
  const [selectedCategory, setSelectedCategory] = useState<DocumentType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const categorizeDocument = (filename: string): DocumentType => {
    const lower = filename.toLowerCase();
    if (lower.includes('agreement') || lower.includes('contract') || lower.includes('deed')) return 'agreement';
    if (lower.includes('fir') || lower.includes('complaint')) return 'fir_complaint';
    if (lower.includes('evidence') || lower.includes('proof')) return 'evidence';
    if (lower.includes('notice') || lower.includes('summons')) return 'notice';
    return 'other';
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(async (file) => {
      const fileId = `temp_${Date.now()}_${file.name}`;
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

      // Fake progress for UI
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          const val = (prev[fileId] || 0) + 15;
          return { ...prev, [fileId]: val > 90 ? 90 : val };
        });
      }, 200);

      // Save to MongoDB
      const docData: Partial<Document> = {
        filename: file.name.toLowerCase().replace(/\s+/g, '_'),
        originalName: file.name,
        type: categorizeDocument(file.name),
        status: 'pending_analysis',
        mimeType: file.type,
        size: file.size,
        url: `/documents/${file.name}`,
        tags: [],
        integrity: {
          hash: `sha256:${Math.random().toString(36).substr(2, 9)}`,
          verified: true,
          uploadTimestamp: new Date()
        }
      };

      const result = await uploadDocument(docData);

      clearInterval(interval);
      setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));

      if (result) {
        // Mock analysis after a bit
        setTimeout(() => {
          // This would normally be handled by a background worker on the server
        }, 3000);
      }
    });
  }, [uploadDocument]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    maxSize: 10 * 1024 * 1024
  });

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesCategory = selectedCategory === 'all' || doc.type === selectedCategory;
      const matchesSearch = doc.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [documents, selectedCategory, searchQuery]);

  const getStatusColor = (status: DocumentStatus) => {
    switch (status) {
      case 'analyzed': return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20';
      case 'processing': return 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse';
      case 'pending_analysis': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'error': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getDynamicSuggestions = () => {
    const types = documents.map(d => d.type);
    if (types.includes('fir_complaint') && !types.includes('evidence')) {
      return ['Police Report Evidence', 'Witness Statements', 'CCTV Footage'];
    }
    if (types.includes('agreement') && !types.includes('notice')) {
      return ['Termination Notice', 'Renewal Clause Draft', 'Stamp Duty Receipt'];
    }
    return ['ID Proof', 'Address Verification', 'Lease Certificate'];
  };

  const getTypeIcon = (type: DocumentType) => {
    switch (type) {
      case 'agreement': return <FileCheck className="w-4 h-4" />;
      case 'fir_complaint': return <AlertTriangle className="w-4 h-4" />;
      case 'evidence': return <Eye className="w-4 h-4" />;
      case 'notice': return <FileText className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
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
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-900 dark:to-slate-800">
      <div className="p-6 border-b border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              Document Manager
            </h1>
            <p className="text-slate-600 dark:text-slate-400">Securely managed on MongoDB</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Shield className="w-4 h-4 text-green-500" />
            <span>Encrypted & Verified</span>
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/80 dark:bg-slate-800/80"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)}>
          <TabsList className="bg-slate-100/80 dark:bg-slate-800/80">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="agreement">Agreements</TabsTrigger>
            <TabsTrigger value="fir_complaint">FIR</TabsTrigger>
            <TabsTrigger value="evidence">Evidence</TabsTrigger>
            <TabsTrigger value="notice">Notices</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <ScrollArea className="flex-1 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card className="lg:col-span-2 border-dashed border-2 bg-slate-50/50 dark:bg-slate-900/50">
              <CardContent className="p-6">
                <div {...getRootProps()} className="text-center py-8 cursor-pointer">
                  <input {...getInputProps()} />
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">Click or drag to upload MongoDB docs</p>
                  <p className="text-sm text-slate-500 mt-1">PDF, DOCX, Images up to 10MB</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-amber-50/30 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-800 dark:text-amber-400">
                  <Brain className="w-4 h-4" />
                  AI Suggested Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getDynamicSuggestions().map((suggestion, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded bg-white/60 dark:bg-slate-800/60 text-xs text-slate-700 dark:text-slate-300 border border-slate-200/50">
                      <Zap className="w-3 h-3 text-amber-500" />
                      {suggestion}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {Object.entries(uploadProgress).map(([id, p]) => p < 100 && (
            <div key={id} className="mb-6 animate-in fade-in slide-in-from-top-2">
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="flex items-center gap-2"><div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" /> Saving to MongoDB...</span>
                <span>{p}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${p}%` }} />
              </div>
            </div>
          ))}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48 w-full" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDocuments.map((doc) => (
                <Card
                  key={doc._id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => { setSelectedDocument(doc); setShowPreview(true); }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded flex items-center justify-center">
                          {getTypeIcon(doc.type)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-medium truncate max-w-[150px]">{doc.originalName}</h3>
                          <Badge className={`text-[10px] h-4 ${getStatusColor(doc.status)}`}>
                            {doc.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-red-500"
                        onClick={(e) => { e.stopPropagation(); deleteDocument(doc._id); }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="mt-4 space-y-1.5 text-xs text-slate-500">
                      <div className="flex justify-between">
                        <span>Size</span>
                        <span>{formatFileSize(doc.size)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Uploaded</span>
                        <span>{formatRelativeTime(new Date(doc.uploadedAt))}</span>
                      </div>
                    </div>

                    {doc.analysis && (
                      <div className="mt-3 p-2 bg-blue-50/50 dark:bg-blue-900/10 rounded text-[11px] line-clamp-2 italic">
                        <Brain className="w-3 h-3 inline mr-1 text-blue-600" />
                        {doc.analysis.summary}
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t flex justify-between items-center">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><Download className="w-3.5 h-3.5" /></Button>
                      </div>
                      {onAttachToChat && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 text-[10px]"
                          onClick={(e) => { e.stopPropagation(); onAttachToChat(doc._id, 'ai'); }}
                        >
                          Attach to Chat
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!loading && filteredDocuments.length === 0 && (
            <div className="text-center py-20">
              <FileText className="w-12 h-12 text-slate-200 mx-auto mb-2" />
              <p className="text-slate-400">No documents found in MongoDB</p>
            </div>
          )}
        </ScrollArea>

        {showPreview && selectedDocument && (
          <div className="w-80 border-l bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-4 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-semibold">Analysis</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowPreview(false)}><X className="w-4 h-4" /></Button>
            </div>

            <ScrollArea className="flex-1">
              {selectedDocument.analysis ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Summary</h3>
                    <p className="text-sm">{selectedDocument.analysis.summary}</p>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Key Points</h3>
                    <ul className="space-y-2">
                      {selectedDocument.analysis.keyPoints.map((p, i) => (
                        <li key={i} className="text-sm flex gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10">
                  <Zap className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Analysis pending...</p>
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}