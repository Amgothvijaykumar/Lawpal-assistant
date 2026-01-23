// Core Types for ACTRIGHT LegalTech Platform

export type UserRole = 'client' | 'lawyer' | 'admin';

export type ChatType = 'ai' | 'lawyer';

export type ConsultationStatus = 'request_sent' | 'accepted' | 'ongoing' | 'closed';

export type LawyerAvailability = 'online' | 'away' | 'offline';

export type MessageType = 'text' | 'document' | 'image' | 'voice' | 'system';

export type DocumentType = 'agreement' | 'fir_complaint' | 'evidence' | 'notice' | 'other';

export type DocumentStatus = 'pending_analysis' | 'analyzed' | 'processing' | 'error';

// User Interface
export interface User {
  _id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  avatar?: string;
  isVerified: boolean;
  createdAt: Date;
  lastActiveAt: Date;
}

// Lawyer Interface
export interface Lawyer extends User {
  role: 'lawyer';
  specializations: string[];
  experience: number;
  rating: number;
  totalCases: number;
  availability: LawyerAvailability;
  consultationFee: number;
  barCouncilNumber: string;
  certifications: string[];
  languages: string[];
  bio: string;
}

// Message Interface
export interface Message {
  _id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  type: MessageType;
  content: string;
  attachments?: Attachment[];
  timestamp: Date;
  isRead: boolean;
  isEdited: boolean;
  editedAt?: Date;
  replyTo?: string;
}

// Attachment Interface
export interface Attachment {
  _id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: Date;
}

// Chat Interface
export interface Chat {
  _id: string;
  type: ChatType;
  participants: string[]; // User IDs
  clientId: string;
  lawyerId?: string;
  status: ConsultationStatus;
  title: string;
  description?: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  lastMessage?: Message;
  lastActivityAt: Date;
  createdAt: Date;
  closedAt?: Date;
  rating?: number;
  feedback?: string;
  isArchived: boolean;
  metadata: {
    caseType?: string;
    urgency?: string;
    estimatedValue?: number;
    documents?: string[];
  };
}

// Document Interface
export interface Document {
  _id: string;
  userId: string;
  filename: string;
  originalName: string;
  type: DocumentType;
  status: DocumentStatus;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: Date;
  analyzedAt?: Date;
  analysis?: DocumentAnalysis;
  tags: string[];
  isShared: boolean;
  sharedWith: string[]; // User IDs
  integrity: {
    hash: string;
    verified: boolean;
    uploadTimestamp: Date;
  };
}

// Document Analysis Interface
export interface DocumentAnalysis {
  summary: string;
  keyPoints: string[];
  riskFlags: string[];
  suggestedActions: string[];
  missingDocuments: string[];
  confidence: number;
  extractedText?: string;
  entities: {
    dates: string[];
    amounts: string[];
    parties: string[];
    locations: string[];
  };
}

// Consultation Interface
export interface Consultation {
  _id: string;
  clientId: string;
  lawyerId?: string;
  chatId: string;
  type: 'chat' | 'call' | 'video' | 'in_person';
  status: ConsultationStatus;
  scheduledAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
  duration?: number;
  fee: number;
  isPaid: boolean;
  paymentId?: string;
  notes: ConsultationNote[];
  documents: string[]; // Document IDs
  outcome?: string;
  followUpRequired: boolean;
  followUpDate?: Date;
}

// Consultation Note Interface
export interface ConsultationNote {
  _id: string;
  authorId: string;
  content: string;
  isPrivate: boolean; // Only visible to lawyer
  createdAt: Date;
  tags: string[];
}

// Case Interface
export interface Case {
  _id: string;
  clientId: string;
  lawyerId?: string;
  title: string;
  description: string;
  category: string;
  status: 'draft' | 'active' | 'under_review' | 'settled' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  updatedAt: Date;
  documents: string[]; // Document IDs
  consultations: string[]; // Consultation IDs
  timeline: CaseTimelineEvent[];
  estimatedValue?: number;
  actualValue?: number;
  courtDetails?: {
    courtName: string;
    caseNumber: string;
    judge: string;
    nextHearing: Date;
  };
}

// Case Timeline Event Interface
export interface CaseTimelineEvent {
  _id: string;
  type: 'created' | 'document_uploaded' | 'consultation' | 'status_change' | 'court_hearing' | 'settlement';
  title: string;
  description: string;
  date: Date;
  authorId: string;
  metadata?: any;
}

// Notification Interface
export interface Notification {
  _id: string;
  userId: string;
  type: 'message' | 'consultation' | 'document' | 'payment' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string;
  createdAt: Date;
  expiresAt?: Date;
  metadata?: any;
}

// Real-time Event Interface
export interface SocketEvent {
  type: 'message' | 'typing' | 'status_change' | 'user_online' | 'user_offline';
  data: any;
  timestamp: Date;
  chatId?: string;
  userId?: string;
}

// API Response Interface
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  error?: string;
  errors?: any;
}

// Pagination Interface
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Search Interface
export interface SearchFilters {
  type?: ChatType;
  status?: ConsultationStatus;
  category?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
  lawyerId?: string;
  documentType?: DocumentType;
}

// Activity Interface
export interface Activity {
  _id: string;
  userId: string;
  type: string;
  description: string;
  metadata: any;
  createdAt: Date;
}