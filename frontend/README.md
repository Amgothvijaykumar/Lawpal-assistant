# ACTRIGHT - Advanced LegalTech Platform

🏛️ **Professional Legal Assistant Platform** with comprehensive User ↔ Lawyer Chat and Document Management

## 🌟 Key Features

### 👨‍⚖️ **User ↔ Lawyer Chat System**
- **Clear Chat Type Separation**: AI Chat vs Human Lawyer Chat with distinct badges
- **Consultation Status Tracking**: Request Sent → Accepted → Ongoing → Closed
- **Real-time Lawyer Availability**: Online/Away/Offline indicators
- **Multi-format Messaging**: Text, Documents, Images, Voice notes
- **Case Summary Panel**: AI-generated case overview with key insights
- **Scheduled Consultation**: Built-in appointment scheduling
- **Privacy & Trust Indicators**: End-to-end encryption badges

### 📄 **Advanced Document Management**
- **Smart Document Categorization**: Auto-categorize as Agreements, FIR/Complaints, Evidence, Notices
- **AI Document Analysis**: Automated summary, key points extraction, risk assessment
- **Document Integrity Verification**: SHA-256 hashing and tamper detection
- **Missing Document Suggestions**: AI recommendations for case completion
- **Real-time Document Sharing**: Seamless sharing between clients and lawyers
- **Preview & Annotation**: In-app document viewing with markup capabilities
- **Advanced Search & Filtering**: Find documents by type, date, status, content

### 🎨 **Premium Design System**
- **Glassmorphism UI**: Modern backdrop-blur effects throughout
- **Professional Color Palette**: Trust-focused navy and blue tones
- **Responsive Layout**: Mobile-first design with adaptive panels
- **Smooth Animations**: Micro-interactions for enhanced UX
- **Dark/Light Mode**: Comprehensive theming support

## 🚀 **Technology Stack**

### Frontend
- **React 18** with TypeScript
- **Vite** for lightning-fast development
- **Tailwind CSS** with custom design system
- **Shadcn/ui** component library
- **Socket.io Client** for real-time communication
- **React Query** for state management
- **React Hook Form + Zod** for form validation
- **React Dropzone** for file uploads

### Backend Integration
- **MongoDB Atlas** for document storage
- **Socket.io** for real-time chat
- **JWT Authentication** for security
- **File Upload with Progress** tracking
- **Document Analysis API** integration

## 📱 **Core Components**

### Chat System
```typescript
// Enhanced Chat Layout with all professional features
<ChatLayout>
  ├── Enhanced Sidebar with search
  ├── Chat Type Indicators (AI vs Lawyer)
  ├── Status Tracking System
  ├── Real-time Availability
  ├── Case Summary Panel
  └── Privacy Indicators
</ChatLayout>
```

### Document System
```typescript
// Professional Document Management
<DocumentManager>
  ├── Drag & Drop Upload
  ├── AI Analysis Engine
  ├── Category Auto-detection
  ├── Integrity Verification
  ├── Smart Suggestions
  └── Preview & Sharing
</DocumentManager>
```

## 🔧 **Setup & Installation**

### Prerequisites
- Node.js 18+ (Node 20+ recommended for full compatibility)
- MongoDB Atlas account
- npm or yarn package manager

### Quick Start
```bash
# Clone the repository
git clone <repository-url>
cd Anurag_hack/frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your MongoDB connection string

# Start development server
npm run dev
```

### Environment Variables
```env
# MongoDB Configuration
VITE_MONGODB_URI="mongodb+srv://codehub:Codehub123@cluster0.rrmywzh.mongodb.net/?appName=Cluster0"
VITE_DB_NAME="actright"

# API Configuration
VITE_API_BASE_URL="http://localhost:3000/api"
VITE_SOCKET_URL="http://localhost:3000"

# Security
VITE_JWT_SECRET="your-super-secure-jwt-secret-key-here"
VITE_ENCRYPTION_KEY="your-encryption-key-for-documents"
```

## 📋 **Feature Implementation Status**

### ✅ **Implemented Features**

#### User ↔ Lawyer Chat
- [x] Clear chat type separation (AI vs Human)
- [x] Consultation status indicators
- [x] Lawyer availability awareness
- [x] Premium chat UI with glassmorphism
- [x] Trust & privacy indicators
- [x] Case summary panel
- [x] Enhanced message types support
- [x] Real-time status updates

#### Document Management
- [x] Smart document categorization
- [x] AI document analysis
- [x] Document integrity verification
- [x] Upload with progress tracking
- [x] Preview & download system
- [x] Document sharing controls
- [x] Missing document suggestions
- [x] Advanced search & filtering

#### Design & UX
- [x] Professional glassmorphism design
- [x] Mobile-responsive layout
- [x] Dark/light mode support
- [x] Smooth animations & transitions
- [x] Trust-focused color scheme
- [x] Accessible UI components

## 🎯 **Usage Guide**

### Starting a Conversation
1. **AI Chat**: Click "AI Chat" for instant legal guidance
2. **Lawyer Chat**: Click "Lawyer" to connect with human lawyers
3. **Status Tracking**: Monitor consultation progress in header
4. **Case Summary**: View AI-generated case insights (lawyer chats only)

### Document Management
1. **Upload**: Drag & drop documents or click to browse
2. **Auto-Analysis**: AI automatically categorizes and analyzes
3. **Review Insights**: Check AI analysis, risk flags, suggestions
4. **Share**: Share specific documents with lawyers
5. **Integrity**: Verify document hasn't been modified

### Professional Features
- **Trust Indicators**: End-to-end encryption badges
- **Status Awareness**: Always know consultation status
- **Smart Suggestions**: AI recommends missing documents
- **Real-time Updates**: Live status and availability changes

## 🏆 **What Makes This Platform "Pro"**

### ✔️ **Clear User Experience**
- Instant recognition of AI vs Human interaction
- Status indicators everywhere for transparency
- Structured workflows, not just free chat

### ✔️ **Trust-Focused Design**
- Privacy indicators prominently displayed
- Document integrity verification
- Professional, calm color scheme

### ✔️ **Smart Automation**
- AI document analysis and suggestions
- Auto-categorization of uploads
- Case summary generation

### ✔️ **Legal-Specific Features**
- Case timeline tracking
- Document evidence management
- Lawyer availability systems
- Consultation scheduling

## 🛡️ **Security & Privacy**

- **End-to-end Encryption**: All communications encrypted
- **Document Integrity**: SHA-256 verification
- **Access Control**: Granular sharing permissions
- **Data Privacy**: GDPR-compliant data handling
- **Audit Trail**: Complete activity logging

## 📊 **Performance Optimizations**

- **Code Splitting**: Lazy-loaded components
- **Image Optimization**: WebP format support
- **Bundle Analysis**: Optimized bundle sizes
- **Caching Strategy**: Efficient API response caching
- **Real-time Updates**: Optimized Socket.io usage

---

**Built with ❤️ for the Indian Legal System**

*Empowering citizens with accessible legal assistance through cutting-edge technology.*
