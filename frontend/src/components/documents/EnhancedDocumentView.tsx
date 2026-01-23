import { useState, useCallback } from 'react';
import { 
  Upload, 
  FileText, 
  Image, 
  File, 
  Trash2, 
  Eye, 
  Download, 
  Share2,
  Search,
  Filter,
  Plus,
  FolderPlus,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'document';
  size: number;
  uploadedAt: Date;
  category: 'legal' | 'evidence' | 'contract' | 'other';
  status: 'processing' | 'analyzed' | 'failed';
  tags: string[];
}

interface EnhancedDocumentViewProps {
  onClose?: () => void;
}

export function EnhancedDocumentView({ onClose }: EnhancedDocumentViewProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  const mockDocuments: Document[] = [
    {
      id: '1',
      name: 'Property_Deed.pdf',
      type: 'pdf',
      size: 2400000,
      uploadedAt: new Date('2024-01-20'),
      category: 'legal',
      status: 'analyzed',
      tags: ['property', 'ownership', 'deed']
    },
    {
      id: '2',
      name: 'Contract_Agreement.pdf',
      type: 'pdf',
      size: 1800000,
      uploadedAt: new Date('2024-01-22'),
      category: 'contract',
      status: 'analyzed',
      tags: ['contract', 'agreement', 'business']
    },
    {
      id: '3',
      name: 'Evidence_Photo.jpg',
      type: 'image',
      size: 800000,
      uploadedAt: new Date('2024-01-23'),
      category: 'evidence',
      status: 'processing',
      tags: ['photo', 'evidence', 'damage']
    }
  ];

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFiles = (files: File[]) => {
    files.forEach(file => {
      console.log('Uploading file:', file.name);
      // Handle file upload logic here
    });
  };

  const filteredDocuments = mockDocuments.filter(doc => {
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-8 h-8 text-red-500" />;
      case 'image': return <Image className="w-8 h-8 text-blue-500" />;
      default: return <File className="w-8 h-8 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'analyzed': return <Badge className="bg-green-100 text-green-700">Analyzed</Badge>;
      case 'processing': return <Badge className="bg-yellow-100 text-yellow-700">Processing</Badge>;
      case 'failed': return <Badge className="bg-red-100 text-red-700">Failed</Badge>;
      default: return <Badge>Unknown</Badge>;
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString());
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Document Manager</h3>
            <p className="text-sm text-slate-500">Upload and manage your legal documents</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <FolderPlus className="w-4 h-4 mr-2" />
              New Folder
            </Button>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="pl-10"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSelectedCategory('all')}>
                All Documents
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedCategory('legal')}>
                Legal Documents
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedCategory('contract')}>
                Contracts
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedCategory('evidence')}>
                Evidence
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedCategory('other')}>
                Other
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Document List */}
        <div className="flex-1">
          <Tabs defaultValue="grid" className="h-full flex flex-col">
            <TabsList className="grid w-fit grid-cols-2 mx-4 mt-4">
              <TabsTrigger value="grid">Grid</TabsTrigger>
              <TabsTrigger value="list">List</TabsTrigger>
            </TabsList>

            <TabsContent value="grid" className="flex-1 m-0">
              <ScrollArea className="h-full p-4">
                {/* Upload Area */}
                <div
                  className={`border-2 border-dashed rounded-lg p-8 mb-6 text-center transition-colors ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    Upload Documents
                  </h3>
                  <p className="text-slate-500 mb-4">
                    Drag and drop files here, or click to select files
                  </p>
                  <Button>
                    Choose Files
                  </Button>
                </div>

                {/* Document Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredDocuments.map((doc) => (
                    <Card 
                      key={doc.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedDocument(doc)}
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col items-center text-center">
                          {getFileIcon(doc.type)}
                          <h4 className="font-medium text-sm mt-2 mb-1 truncate w-full">
                            {doc.name}
                          </h4>
                          <p className="text-xs text-slate-500 mb-2">
                            {formatFileSize(doc.size)}
                          </p>
                          {getStatusBadge(doc.status)}
                          
                          <div className="flex gap-1 mt-3">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <Download className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <Share2 className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="list" className="flex-1 m-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-2">
                  {filteredDocuments.map((doc) => (
                    <Card 
                      key={doc.id} 
                      className="cursor-pointer hover:shadow-sm transition-shadow"
                      onClick={() => setSelectedDocument(doc)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {getFileIcon(doc.type)}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                              {doc.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm text-slate-500">
                                {formatFileSize(doc.size)}
                              </span>
                              <span className="text-sm text-slate-500">•</span>
                              <span className="text-sm text-slate-500">
                                {doc.uploadedAt.toLocaleDateString()}
                              </span>
                              <Badge variant="outline" className="text-xs ml-2">
                                {doc.category}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {getStatusBadge(doc.status)}
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <Eye className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <Download className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <Share2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Document Preview Panel */}
        {selectedDocument && (
          <div className="w-80 border-l border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Document Details</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedDocument(null)}
                  className="h-7 w-7 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-center p-6 bg-white dark:bg-slate-900 rounded-lg">
                  {getFileIcon(selectedDocument.type)}
                </div>

                <div>
                  <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                    {selectedDocument.name}
                  </h4>
                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex justify-between">
                      <span>Size:</span>
                      <span>{formatFileSize(selectedDocument.size)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <span className="capitalize">{selectedDocument.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Category:</span>
                      <span className="capitalize">{selectedDocument.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Uploaded:</span>
                      <span>{selectedDocument.uploadedAt.toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      {getStatusBadge(selectedDocument.status)}
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Tags</h5>
                  <div className="flex flex-wrap gap-1">
                    {selectedDocument.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-4">
                  <Button size="sm" className="w-full">
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                  <Button size="sm" variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button size="sm" variant="outline" className="w-full">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}