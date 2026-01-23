import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Star, MapPin, Clock, ChevronRight, CheckCircle2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_BASE_URL;

interface Lawyer {
  _id: string;
  name: string;
  specialization: string;
  rating: number;
  reviews: number;
  distance: string;
  available: boolean;
  experience: number;
  avatar: string;
  bio: string;
  expertise: string[];
  hourlyRate: number;
}

interface LawyerPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LawyerPanel({ isOpen, onClose }: LawyerPanelProps) {
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [filteredLawyers, setFilteredLawyers] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLawyer, setSelectedLawyer] = useState<Lawyer | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { token } = useAuth();

  useEffect(() => {
    if (isOpen && token) {
      setLoading(true);
      axios.get(`${API_URL}/lawyers`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => setLawyers(res.data))
        .catch(err => console.error('Error fetching lawyers:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, token]);

  const handleRequestConsultation = () => {
    setShowConfirmation(true);
  };

  const handleConfirmConsultation = async () => {
    if (!selectedLawyer || !token) return;

    try {
      await axios.post(`${API_URL}/consultations`,
        { lawyerId: selectedLawyer._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`Consultation request sent to ${selectedLawyer.name}`, {
        description: 'You will receive a response within 24 hours.',
      });
      setShowConfirmation(false);
      setSelectedLawyer(null);
      onClose();
    } catch (error) {
      toast.error('Failed to send request');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={cn(
        'h-full w-full bg-background flex flex-col',
        !isOpen && 'hidden'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="font-serif font-semibold text-xl text-slate-900 dark:text-slate-100">Recommended Lawyers</h2>
            <p className="text-sm text-slate-500 mt-1">Based on your legal query</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-500 hover:text-slate-900">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Search & Filter */}
        <div className="p-4 pb-0">
          <input
            type="text"
            placeholder="Search by name or specialization..."
            className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700 transition-all"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* List */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : filteredLawyers.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-muted-foreground">No lawyers found matching "{searchTerm}".</p>
              </div>
            ) : filteredLawyers.map((lawyer) => (
              <div key={lawyer._id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 text-lg">
                      {lawyer.avatar}
                    </div>
                    <div>
                      <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100">{lawyer.name}</h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{lawyer.specialization}</p>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px] font-medium px-2 py-0.5 rounded-full",
                      lawyer.available
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-amber-100 text-amber-700"
                    )}
                  >
                    {lawyer.available ? 'Available' : 'Busy'}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-sm text-slate-500 mb-4 px-1">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">{lawyer.rating}</span>
                  </div>
                  <div className="flex items-center gap-1.5 border-l pl-4 border-slate-200">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{lawyer.experience} yrs</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full h-9 text-xs font-medium border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => setSelectedLawyer(lawyer)}
                >
                  View Profile <ChevronRight className="w-3 h-3 ml-1 opacity-50" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <Dialog open={!!selectedLawyer && !showConfirmation} onOpenChange={() => setSelectedLawyer(null)}>
        <DialogContent className="max-w-[425px] p-0 overflow-hidden gap-0">
          <DialogHeader className="p-6 pb-2">
            <div className="flex gap-4 items-start">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl font-bold text-slate-700 dark:text-slate-300 shrink-0">
                {selectedLawyer?.avatar}
              </div>
              <div className="flex-1">
                <DialogTitle className="text-xl font-serif text-slate-900 dark:text-slate-100">
                  {selectedLawyer?.name}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-slate-500 font-medium">{selectedLawyer?.specialization}</p>
                  <div className="w-1 h-1 rounded-full bg-slate-300" />
                  <div className="flex items-center gap-1 text-xs text-amber-500 font-medium bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded">
                    <Star className="w-3 h-3 fill-amber-500" />
                    {selectedLawyer?.rating} <span className="text-slate-400 font-normal">({selectedLawyer?.reviews} reviews)</span>
                  </div>
                </div>
                <Badge variant="outline" className="mt-3 text-green-700 bg-green-50 border-green-200">
                  {selectedLawyer?.available ? 'Available Now' : 'Busy'}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 pt-2 space-y-6">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">About</h4>
              <p className="text-sm text-slate-500 leading-relaxed">
                {selectedLawyer?.bio || "Senior advocate specializing in family law with extensive experience in divorce, custody, and matrimonial disputes. Former additional advocate general with a track record of successful case resolutions."}
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Areas of Expertise</h4>
              <div className="flex flex-wrap gap-2">
                {(selectedLawyer?.expertise || ['Divorce', 'Child Custody', 'Alimony', 'Domestic Violence']).map((tag) => (
                  <Badge key={tag} variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200 border-transparent font-normal">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl text-center border border-slate-100 dark:border-slate-800">
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedLawyer?.experience}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mt-0.5">Years Exp.</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl text-center border border-slate-100 dark:border-slate-800">
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedLawyer?.reviews}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mt-0.5">Reviews</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl text-center border border-slate-100 dark:border-slate-800">
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">₹{selectedLawyer?.hourlyRate}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mt-0.5">Per Hour</p>
              </div>
            </div>

            <Button className="w-full h-11 text-base bg-slate-900 hover:bg-slate-800" onClick={handleRequestConsultation}>
              Request Consultation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="max-w-xs text-center p-6 rounded-2xl">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-green-100">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <DialogTitle className="mb-2 text-lg font-serif">Confirm Consultation Request</DialogTitle>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            You are about to request a consultation with <span className="font-semibold text-slate-900">{selectedLawyer?.name}</span>. They will review your query and respond within 24 hours.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowConfirmation(false)}>Cancel</Button>
            <Button className="flex-1 bg-slate-900 text-white hover:bg-slate-800" onClick={handleConfirmConsultation}>Confirm</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}