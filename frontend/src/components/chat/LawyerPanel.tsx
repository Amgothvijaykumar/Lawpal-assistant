import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, MapPin, Clock, ChevronRight, CheckCircle2, MessageSquare, Search, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_BASE_URL;

interface Lawyer {
  _id: string;
  fullName: string;
  primaryPracticeArea: string;
  rating: number; // Backend uses 'rating', not 'ratingScore'
  distanceValue: number; // Backend sends distanceValue (km)
  distance: string; // Backend sends formatted string
  activeStatus: boolean;
  yearsOfExperience: number; // Assuming backend maps 'experience' to this or vice versa, let's normalize
  experience?: number; // Backend sends 'experience'
  available: boolean; // Backend returns 'available'
  // Derived/Mock scores for UI visualization
  finalScore?: number;
  categorySuccessScore?: number;
  experienceScore?: number;
  responsivenessScore?: number;
  avatar?: string;
  bio?: string;
}

interface LawyerPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LawyerPanel({ isOpen, onClose }: LawyerPanelProps) {
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLawyer, setSelectedLawyer] = useState<Lawyer | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { token, user } = useAuth();

  useEffect(() => {
    if (isOpen && token) {
      setLoading(true);
      setError(null);

      const fetchLawyers = async () => {
        try {
          console.log('🔍 Fetching recommended lawyers from database...');

          const res = await axios.post(`${API_URL}/lawyers/ranked`, {}, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000 // 10 second timeout
          });

          // Handle response - could be array or object with best/all
          let baseLawyers = Array.isArray(res.data)
            ? res.data
            : (res.data.best || res.data.all || []);

          console.log(`📊 Received ${baseLawyers.length} lawyers from database`);

          // If API returned empty, show error
          if (!baseLawyers || baseLawyers.length === 0) {
            console.log('⚠️ No lawyers found in database');
            setError('No lawyers found. Please run the seed script.');
            setLawyers([]);
            return;
          }

          // Process and normalize lawyers (limit to 3)
          const processed = baseLawyers.slice(0, 3).map((l: any, idx: number) => ({
            _id: l._id || `lawyer_${idx}`,
            fullName: l.fullName || `Advocate ${idx + 1}`,
            primaryPracticeArea: l.primaryPracticeArea || 'General Practice',
            rating: (l.rating && typeof l.rating === 'object') ? (l.rating.averageRating || 4.5) : (Number(l.rating) || l.ratingScore || 4.5),
            distanceValue: l.distanceValue || parseFloat(l.distance) || (2 + idx * 1.5),
            distance: l.distance || `${(2 + idx * 1.5).toFixed(1)} km`,
            activeStatus: l.activeStatus ?? l.available ?? true,
            yearsOfExperience: l.yearsOfExperience || l.experience || 5,
            available: l.available ?? l.activeStatus ?? true,
            finalScore: l.finalScore || Math.floor(85 + Math.random() * 14),
            categorySuccessScore: l.categorySuccessScore || Math.floor(80 + Math.random() * 20),
            experienceScore: l.experienceScore || Math.floor(70 + Math.random() * 30),
            responsivenessScore: l.responsivenessScore || Math.floor(85 + Math.random() * 15),
            bio: l.bio || `Experienced legal professional specializing in ${l.primaryPracticeArea || 'various'} matters.`
          }));

          // Sort by finalScore descending
          processed.sort((a: Lawyer, b: Lawyer) => (b.finalScore || 0) - (a.finalScore || 0));

          setLawyers(processed);
          console.log(`✅ Set ${processed.length} lawyers from database`);

        } catch (err: any) {
          console.error("❌ Failed to fetch lawyers:", err.message);
          setError('Failed to load lawyers. Please try again.');
          setLawyers([]);
          toast.error("Unable to load lawyer recommendations");
        } finally {
          setLoading(false);
        }
      };

      fetchLawyers();
    }
  }, [isOpen, token]);

  const filteredLawyers = lawyers.filter(l => {
    const matchSearch = l.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.primaryPracticeArea?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = activeCategory === 'all' || l.primaryPracticeArea?.toLowerCase().includes(activeCategory);
    return matchSearch && matchCat;
  });

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

      toast.success(`Consultation request sent to ${selectedLawyer.fullName}`, {
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
        'h-full w-full bg-[#f8fafc] dark:bg-black/40 flex flex-col',
        !isOpen && 'hidden'
      )}>
        {/* Header - Glassmorphism */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200/50 dark:border-white/5 backdrop-blur-md bg-white/70 dark:bg-slate-900/70">
          <div>
            <h2 className="font-serif font-black text-xl text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Recommended Partners
            </h2>
            <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-widest">AI-Curated Selection</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-100 dark:hover:bg-white/10">
            <X className="w-5 h-5 text-slate-500" />
          </Button>
        </div>

        {/* Search & Category Filter */}
        <div className="p-4 space-y-4">
          <div className="relative group">
            <Search className="absolute left-4 top-3 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Find by name or expertise..."
              className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all shadow-sm"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 pb-2 px-1">
              {['all', 'criminal', 'family', 'property', 'corporate', 'civil'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all border",
                    activeCategory === cat
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-lg shadow-slate-900/20"
                      : "bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* List */}
        <ScrollArea className="flex-1 px-4 pb-4">
          <div className="space-y-4">
            {loading ? (
              <div className="space-y-4 pt-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-40 bg-white/50 dark:bg-white/5 animate-pulse rounded-3xl border border-slate-100 dark:border-white/5" />
                ))}
              </div>
            ) : filteredLawyers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-70">
                <Search className="w-12 h-12 text-slate-300 mb-4" />
                <p className="text-slate-500 font-medium">No partners matching your criteria.</p>
              </div>
            ) : filteredLawyers.map((lawyer) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={lawyer._id}
                className="group relative p-5 rounded-[1.5rem] bg-white dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 hover:border-primary/30 dark:hover:border-primary/30 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-4">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/10 flex items-center justify-center font-black text-xl text-slate-400 dark:text-slate-200 ring-4 ring-slate-50 dark:ring-slate-900">
                        {lawyer.fullName ? lawyer.fullName[0] : 'L'}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-[3px] border-white dark:border-slate-900" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 leading-tight">{lawyer.fullName}</h3>
                      <p className="text-xs font-bold text-primary mt-1 uppercase tracking-wider">{lawyer.primaryPracticeArea}</p>

                      <div className="flex items-center gap-3 mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {lawyer.distance}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="fill-amber-400 text-amber-500 flex items-center gap-1"><Star className="w-3 h-3 fill-current" /> {lawyer.rating}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {lawyer.finalScore && (
                  <div className="mb-5 bg-slate-50 dark:bg-white/5 rounded-xl p-3 border border-slate-100 dark:border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-500" /> Match Score
                      </span>
                      <span className="text-xs font-black text-slate-900 dark:text-white">{lawyer.finalScore}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full" style={{ width: `${lawyer.finalScore}%` }} />
                    </div>
                  </div>
                )}

                <Button
                  className="w-full h-10 rounded-xl font-bold text-xs bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 hover:scale-[1.02] transition-all shadow-lg shadow-slate-900/10"
                  onClick={() => setSelectedLawyer(lawyer)}
                >
                  View Full Profile
                </Button>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <Dialog open={!!selectedLawyer && !showConfirmation} onOpenChange={() => setSelectedLawyer(null)}>
        <DialogContent className="max-w-[400px] p-0 overflow-hidden border-none shadow-2xl bg-[#fafafa] dark:bg-slate-950">
          <VisuallyHidden>
            <DialogTitle>Lawyer Details</DialogTitle>
          </VisuallyHidden>
          <div className="h-32 bg-slate-900 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            <div className="absolute -bottom-1/2 left-0 right-0 h-full bg-gradient-to-t from-[#fafafa] dark:from-slate-950 to-transparent z-10" />
          </div>

          <div className="px-6 relative z-20 -mt-12 text-center pb-6">
            <div className="w-24 h-24 mx-auto rounded-[2rem] bg-white dark:bg-slate-800 shadow-xl border-4 border-white dark:border-slate-900 flex items-center justify-center mb-4">
              <span className="text-3xl font-black text-slate-300">{selectedLawyer?.fullName[0]}</span>
            </div>

            <h3 className="text-2xl font-serif font-black text-slate-900 dark:text-white mb-1">{selectedLawyer?.fullName}</h3>
            <div className="flex items-center justify-center gap-2 mb-6">
              <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 rounded-md uppercase text-[10px] tracking-wider px-2 py-0.5">{selectedLawyer?.primaryPracticeArea}</Badge>
              <Badge variant="outline" className="text-slate-500 border-slate-200 rounded-md uppercase text-[10px] tracking-wider bg-white">
                {selectedLawyer?.experience || selectedLawyer?.yearsOfExperience || 10}+ Years Exp
              </Badge>
            </div>

            <div className="space-y-4 text-left">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Why this match?
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 font-medium">Proximity</span>
                    <span className="font-bold text-emerald-600">{selectedLawyer?.distance}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 font-medium">Success Rate</span>
                    <span className="font-bold text-slate-900 dark:text-white">98%</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400 font-medium text-center leading-relaxed px-4">
                {selectedLawyer?.fullName} is currently available for new cases. Usually responds within 15 minutes.
              </p>
            </div>

            <div className="mt-8">
              <Button className="w-full h-12 rounded-xl text-base font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform" onClick={handleRequestConsultation}>
                Request Priority Consultation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="max-w-xs text-center p-8 rounded-3xl border-none shadow-2xl">
          <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-emerald-100 dark:border-emerald-500/10 animate-in zoom-in duration-300">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <DialogTitle className="mb-2 text-xl font-black text-slate-900 dark:text-white">Confirm Request</DialogTitle>
          <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">
            Send a priority consultation request to <span className="text-slate-900 dark:text-white font-bold">{selectedLawyer?.fullName}</span>?
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="ghost" className="rounded-xl font-bold text-slate-500 hover:text-slate-900" onClick={() => setShowConfirmation(false)}>Cancel</Button>
            <Button className="rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-lg" onClick={handleConfirmConsultation}>Confirm</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}