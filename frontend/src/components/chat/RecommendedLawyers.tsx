import { useState, useEffect } from 'react';
import axios from 'axios';
import { Star, Scale, ChevronRight, MessageSquare, Briefcase, MapPin, Loader2, Gavel, Clock, Trash2, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card'; // Fixed missing import
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import { useToast } from '@/hooks/use-toast';
import { ConsultationRequestModal } from './ConsultationRequestModal';

const API_URL = import.meta.env.VITE_API_BASE_URL;

interface Lawyer {
  _id: string;
  fullName: string; // Changed from name
  primaryPracticeArea: string; // Changed from specialization
  rating: {
    averageRating: number;
    totalReviews: number;
  };
  yearsOfExperience: number; // Changed from experience
  distance?: string;
  available: boolean;
  hourlyRate: number;
  avatar?: string;
  bio?: string;
  expertise?: string[];
}

function LawyerSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50">
          <div className="flex items-start gap-4">
            <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface RecommendedLawyersProps {
  onOpenChat?: (sessionId: string) => void;
}

export function RecommendedLawyers({ onOpenChat }: RecommendedLawyersProps) {
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [selectedLawyer, setSelectedLawyer] = useState<Lawyer | null>(null);
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [consultations, setConsultations] = useState<any[]>([]);
  const { token, user } = useAuth();
  const { socket } = useSocket();
  const { toast: uiToast } = useToast();

  const isAuthenticated = !!token && !!user;

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchLawyers();
      fetchConsultations();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (socket) {
      const handleAccepted = (data: any) => {
        uiToast({
          title: "Notice: Accepted",
          description: `An expert has accepted your request. Access the secure channel now.`,
        });
        fetchConsultations();
      };

      const handleDeleted = (data: any) => {
        fetchConsultations();
      };

      socket.on('consultation:accepted', handleAccepted);
      socket.on('consultation:deleted', handleDeleted);
      return () => {
        socket.off('consultation:accepted', handleAccepted);
        socket.off('consultation:deleted', handleDeleted);
      };
    }
  }, [socket, uiToast]);

  const fetchConsultations = async () => {
    try {
      const res = await axios.get(`${API_URL}/consultations/user`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConsultations(res.data);
    } catch (err) {
      console.error('Failed to fetch consultations', err);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await axios.delete(`${API_URL}/consultations/${requestId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      uiToast({ title: "Request Cached", description: "The consultation withdrawal was successful." });
      fetchConsultations();
    } catch (err) {
      uiToast({ title: "Operation Failed", description: "Unable to process withdrawal request.", variant: "destructive" });
    }
  };

  const getLawyerStatus = (lawyerId: string) => {
    const consultation = consultations.find(c =>
      (c.lawyerId?._id === lawyerId || c.lawyerId === lawyerId) &&
      c.status !== 'rejected'
    );
    return consultation?.status || null;
  };

  const fetchLawyers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_URL}/lawyers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Sort or filter as needed, but here we just take the first 3
      const topLawyers = res.data.slice(0, 3);
      setLawyers(topLawyers);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Service temporarily decoupled');
    } finally {
      setLoading(false);
    }
  };

  const handleConsult = (lawyer: Lawyer) => {
    if (!isAuthenticated || !token) {
      toast.error('Authentication required');
      return;
    }
    setSelectedLawyer(lawyer);
    setIsConsultModalOpen(true);
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name.replace('Adv. ', '').split(' ').map(n => n[0]).join('').substring(0, 2);
  };

  if (!isAuthenticated) {
    return (
      <div className="h-full flex flex-col bg-[#F9FAFB] dark:bg-slate-900">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">Legal Experts</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Verified Network</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <p className="text-xs font-semibold text-slate-400 text-center max-w-[140px] leading-relaxed">
            Please log in to browse our verified expertise tier.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#F9FAFB] dark:bg-slate-900">
      {/* Premium Header */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800/60 bg-[#F9FAFB]/70 dark:bg-slate-900/70 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">Legal Experts</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Verified Network</p>
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <LawyerSkeleton />
        ) : error ? (
          <div className="p-8 text-center space-y-4">
            <p className="text-xs font-bold text-red-500 uppercase tracking-widest">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchLawyers} className="rounded-xl px-6 h-8 text-[10px] font-black uppercase tracking-widest">Retry Sync</Button>
          </div>
        ) : (
          <div className="p-6 space-y-8">
            {/* Active/Pending Tiers */}
            {consultations.filter(c => c.status === 'pending').length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <h2 className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-400">Incoming Dispatch</h2>
                </div>
                {consultations.filter(c => c.status === 'pending').map(req => (
                  <div key={req._id} className="group relative flex items-center justify-between p-4 bg-white dark:bg-slate-800/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 text-xs ring-4 ring-indigo-50/50 dark:ring-0">
                        {req.lawyerId.fullName?.[0] || 'L'}
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">{req.lawyerId.fullName || 'Verified Lawyer'}</h3>
                        <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-tighter animate-pulse">Establishing Link...</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelRequest(req._id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Gavel className="w-3.5 h-3.5 text-slate-400" />
                <h2 className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-400">Premium Counsel</h2>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {lawyers.map((lawyer) => (
                  <Card
                    key={lawyer._id}
                    className="group overflow-hidden rounded-[24px] border border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-800/40 shadow-sm hover:shadow-xl hover:border-indigo-100 dark:hover:border-indigo-900/40 hover:translate-y-[-2px] transition-all duration-300"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="relative shrink-0">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-black text-sm ring-4 ring-slate-50 dark:ring-0">
                            {lawyer.avatar || getInitials(lawyer.fullName)}
                          </div>
                          {lawyer.available && (
                            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white dark:border-slate-800" />
                          )}
                        </div>

                        <div className="flex-1 space-y-1 mt-0.5">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {lawyer.fullName}
                            </h4>
                            <div className="flex items-center gap-0.5 px-2 py-0.5 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800/50">
                              <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                              <span className="text-[10px] font-black">{lawyer.rating.averageRating}</span>
                            </div>
                          </div>
                          <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-tighter">
                            {lawyer.primaryPracticeArea} Tier
                          </p>

                          <div className="flex items-center gap-3 pt-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                              <Briefcase className="w-3 h-3" /> {lawyer.yearsOfExperience} Years
                            </span>
                            <span className="text-slate-200 dark:text-slate-700">|</span>
                            <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                              ₹{lawyer.hourlyRate}/HR
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6">
                        {getLawyerStatus(lawyer._id) === 'accepted' ? (
                          <Button
                            className="w-full h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-widest shadow-md shadow-indigo-100 dark:shadow-none transition-all"
                            onClick={() => {
                              const consultation = consultations.find(c => (c.lawyerId?._id === lawyer._id || c.lawyerId === lawyer._id) && c.status === 'accepted');
                              if (consultation?.sessionId && onOpenChat) {
                                onOpenChat(consultation.sessionId);
                              } else {
                                uiToast({ title: "Diverting...", description: "Initializing secure relay. Please hold." });
                                fetchConsultations();
                              }
                            }}
                          >
                            <MessageSquare className="w-4 h-4 mr-2 stroke-[2.5]" />
                            Resume Counsel
                          </Button>
                        ) : getLawyerStatus(lawyer._id) === 'pending' ? (
                          <div className="w-full h-11 rounded-2xl bg-slate-50 dark:bg-slate-900/60 flex items-center justify-center border border-slate-100 dark:border-slate-800/60">
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] animate-pulse">Request Transmitted</span>
                          </div>
                        ) : (
                          <Button
                            onClick={() => handleConsult(lawyer)}
                            disabled={requesting === lawyer._id || !lawyer.available}
                            className="w-full h-11 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs uppercase tracking-widest hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all duration-300"
                          >
                            Request Priority Counsel
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </ScrollArea>

      <ConsultationRequestModal
        isOpen={isConsultModalOpen}
        onClose={() => setIsConsultModalOpen(false)}
        lawyerId={selectedLawyer?._id}
        lawyerName={selectedLawyer?.fullName}
      />
    </div>
  );
}

