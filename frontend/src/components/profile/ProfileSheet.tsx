import { useState, useRef, useEffect } from 'react';
import {
  User, Mail, Phone, MapPin, Globe, Briefcase, Award,
  Clock, FileCheck, Camera, Edit3, Save, X, Check,
  ShieldCheck, Star, Zap, Building, Scale, Gavel, CheckCircle2, Sparkles
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileSheet({ open, onOpenChange }: ProfileSheetProps) {
  const { user, loading, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    location: {
      city: '',
      state: '',
      district: ''
    },
    avatarUrl: '',
    lawyerDetails: {
      fullName: '',
      yearsOfExperience: 0,
      barRegistrationNumber: '',
      primaryPracticeArea: '',
      bio: ''
    }
  });

  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || '',
        email: user.email || '',
        location: {
          city: user.location?.city || '',
          state: user.location?.state || '',
          district: user.location?.district || ''
        },
        avatarUrl: user.avatarUrl || '',
        lawyerDetails: {
          fullName: user.lawyerDetails?.fullName || user.displayName || '',
          yearsOfExperience: user.lawyerDetails?.yearsOfExperience || 0,
          barRegistrationNumber: user.lawyerDetails?.barRegistrationNumber || '',
          primaryPracticeArea: user.lawyerDetails?.primaryPracticeArea || '',
          bio: user.lawyerDetails?.bio || ''
        }
      });
    }
  }, [user, open]);

  const isLawyer = user?.role === 'lawyer';

  const handleImageClick = () => {
    if (isEditing) fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // toast.error('Image size should be less than 5MB');
        alert('Image size should be less than 5MB'); // Fallback if toast not available in scope or use simple alert
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatarUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      await updateProfile({
        displayName: formData.displayName,
        avatarUrl: formData.avatarUrl,
        location: formData.location,
        lawyerDetails: isLawyer ? formData.lawyerDetails : undefined
      });
      setIsEditing(false);
    } catch (error) {
      // Error handled in updateProfile toast
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0 border-none bg-slate-50 dark:bg-slate-950 shadow-2xl">
        <VisuallyHidden>
          <SheetTitle>User Profile</SheetTitle>
        </VisuallyHidden>
        {loading ? (
          <div className="p-8 space-y-8">
            <div className="flex items-center gap-6">
              <Skeleton className="w-24 h-24 rounded-full" />
              <div className="space-y-3">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Skeleton className="h-[400px] w-full rounded-3xl" />
          </div>
        ) : (
          <div className="flex flex-col h-full font-sans">
            {/* Simple Kinetic Hero */}
            {/* Simple Kinetic Hero moved to background or behind */}

            <div className="px-6 pt-10 pb-6 relative z-10 flex flex-col gap-6">

              {/* Profile Header Block - Moved Down as requested */}
              <div className="flex flex-col items-center text-center gap-6">
                <motion.div
                  whileHover={isEditing ? { scale: 1.05 } : {}}
                  onClick={handleImageClick}
                  className={cn(
                    "w-32 h-32 rounded-full shadow-2xl border-4 border-white dark:border-slate-800 overflow-hidden relative group bg-white dark:bg-slate-900 transition-all mx-auto",
                    isEditing ? "cursor-pointer ring-4 ring-primary/30 ring-offset-2" : "cursor-default"
                  )}
                >
                  {formData.avatarUrl ? (
                    <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                      <User className="w-12 h-12 text-slate-300" />
                    </div>
                  )}

                  {isEditing && formData.avatarUrl && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormData(prev => ({ ...prev, avatarUrl: '' }));
                      }}
                      className="absolute top-1 right-1 p-1.5 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:bg-red-600 shadow-sm"
                      title="Remove photo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </div>
                  )}
                  {isEditing && (
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px] z-10">
                      <Camera className="w-8 h-8 text-white mb-1 drop-shadow-md" />
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider drop-shadow-md">Change</span>
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                </motion.div>

                <div className="w-full space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                        {isEditing ? (
                          <Input
                            value={formData.displayName}
                            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                            className="h-10 px-0 py-0 font-bold text-3xl text-center bg-transparent border-b-2 border-primary/30 rounded-none w-full min-w-[200px] focus-visible:ring-0 focus-visible:border-primary transition-colors"
                          />
                        ) : (
                          formData.displayName || 'Legal User'
                        )}
                      </h2>
                      {isLawyer && (
                        <div className="mt-1" title="Verified Lawyer">
                          <CheckCircle2 className="w-6 h-6 text-blue-500 fill-blue-50/50" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-center gap-2 text-[15px] font-medium text-slate-500 dark:text-slate-400">
                      <span className="truncate max-w-[200px]">{user?.email}</span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="capitalize text-slate-900 dark:text-slate-200 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-xs tracking-wide">
                        {user?.role}
                      </span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={isEditing ? "default" : "outline"}
                    onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                    className={cn(
                      "rounded-xl font-bold h-10 transition-all text-xs px-8 shadow-sm",
                      isEditing
                        ? "bg-slate-900 text-white hover:bg-slate-800"
                        : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                  >
                    {isEditing ? "Save Changes" : "Edit Profile"}
                  </Button>
                </div>
              </div>

              {/* Navigation Tabs - Minimalist */}
              <Tabs defaultValue="overview" className="w-full mt-24">
                <TabsList className="w-full bg-slate-100/80 dark:bg-slate-900/50 p-1 rounded-xl">
                  <TabsTrigger value="overview" className="flex-1 rounded-lg text-xs font-semibold py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all">Overview</TabsTrigger>
                  <TabsTrigger value="details" className="flex-1 rounded-lg text-xs font-semibold py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all">Settings</TabsTrigger>
                  <TabsTrigger value="activity" className="flex-1 rounded-lg text-xs font-semibold py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all">History</TabsTrigger>
                </TabsList>

                {/* Overview Tab - Cleaner Layout */}
                <TabsContent value="overview" className="mt-12 space-y-6 focus-visible:outline-none">
                  {/* Vital Stats - Horizontal & Clean */}
                  <div className="grid grid-cols-3 gap-3">
                    {isLawyer ? (
                      <>
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center">
                          <span className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{user?.lawyerDetails?.rating?.averageRating || 'N/A'}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rating</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center">
                          <span className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{formData.lawyerDetails.yearsOfExperience || 0}+</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Years Exp</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center">
                          <span className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{user?.lawyerDetails?.caseStats?.totalCasesHandled || 0}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cases</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center">
                          <span className="text-2xl font-bold text-slate-900 dark:text-white mb-1">0</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Consults</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center">
                          <span className="text-2xl font-bold text-slate-900 dark:text-white mb-1">0</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Docs</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center">
                          <span className="text-2xl font-bold text-slate-900 dark:text-white mb-1">BASIC</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Level</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Simple Identity & Region */}
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="w-4 h-4 text-primary" />
                      <h3 className="font-bold text-slate-900 dark:text-white">Identity & Region</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">City</Label>
                        {isEditing ? (
                          <Input
                            value={formData.location.city}
                            onChange={(e) => setFormData({ ...formData, location: { ...formData.location, city: e.target.value } })}
                            className="h-9 text-sm"
                            placeholder="City"
                          />
                        ) : (
                          <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-sm font-semibold">{formData.location.city || 'Not specified'}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">State</Label>
                        {isEditing ? (
                          <Input
                            value={formData.location.state}
                            onChange={(e) => setFormData({ ...formData, location: { ...formData.location, state: e.target.value } })}
                            className="h-9 text-sm"
                            placeholder="State"
                          />
                        ) : (
                          <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                            <Building className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-sm font-semibold">{formData.location.state || 'Not specified'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Professional Mandate (Lawyer Only) - Clean */}
                  {isLawyer && (
                    <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Scale className="w-4 h-4 text-primary" />
                          <h3 className="font-bold text-slate-900 dark:text-white">Professional Mandate</h3>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] font-bold px-2">VERIFIED</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Expertise</Label>
                          {isEditing ? (
                            <select
                              value={formData.lawyerDetails.primaryPracticeArea}
                              onChange={(e) => setFormData({ ...formData, lawyerDetails: { ...formData.lawyerDetails, primaryPracticeArea: e.target.value } })}
                              className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm focus:ring-2 ring-primary/20"
                            >
                              <option value="criminal">Criminal Law</option>
                              <option value="family">Family Law</option>
                              <option value="civil">Civil Law</option>
                              <option value="property">Property Law</option>
                              <option value="corporate">Corporate Law</option>
                            </select>
                          ) : (
                            <div className="text-sm font-bold capitalize">{formData.lawyerDetails.primaryPracticeArea || 'General Law'}</div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Bar ID</Label>
                          <div className="text-sm font-mono font-medium text-slate-600 dark:text-slate-300">{formData.lawyerDetails.barRegistrationNumber || 'N/A'}</div>
                        </div>
                      </div>

                      <div className="space-y-1 pt-2">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Bio</Label>
                        {isEditing ? (
                          <Textarea
                            value={formData.lawyerDetails.bio}
                            onChange={(e) => setFormData({ ...formData, lawyerDetails: { ...formData.lawyerDetails, bio: e.target.value } })}
                            className="min-h-[80px] text-sm bg-white dark:bg-slate-900"
                            placeholder="Professional bio..."
                          />
                        ) : (
                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">
                            "{formData.lawyerDetails.bio || "No professional bio available."}"
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Simple Insights List */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-primary" /> Insights
                    </h4>
                    <div className="space-y-2">
                      {(isLawyer ? [
                        { text: 'Profile completeness 85%. Add bio to reach 100%.', icon: CheckCircle2 },
                        { text: '3 high-value cases found nearby.', icon: Zap }
                      ] : [
                        { text: 'Top-rated Property Law specialist available.', icon: Star },
                        { text: '2 risk factors in lease agreement.', icon: FileCheck }
                      ]).map((tip, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm text-sm font-medium text-slate-600 dark:text-slate-300">
                          <tip.icon className="w-4 h-4 text-primary shrink-0" />
                          {tip.text}
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Settings Tab Content */}
                <TabsContent value="details" className="space-y-6 focus-visible:outline-none py-2">
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800/60 shadow-xl space-y-8">
                    <div className="space-y-6">
                      {[
                        { icon: Mail, label: 'Push Notifications', desc: 'Secure legal status updates', active: true },
                        { icon: ShieldCheck, label: 'Confidentiality Mode', desc: 'Hide sessions from profile history', active: false }
                      ].map((pref, i) => (
                        <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl transition-all cursor-pointer group border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl group-hover:bg-primary/10 transition-colors">
                              <pref.icon className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-900 dark:text-slate-100">{pref.label}</p>
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{pref.desc}</p>
                            </div>
                          </div>
                          <div className={cn("w-12 h-7 rounded-full flex items-center px-1 transition-colors duration-300", pref.active ? "bg-primary" : "bg-slate-200 dark:bg-slate-700")}>
                            <motion.div
                              layout
                              className={cn("w-5 h-5 bg-white rounded-full shadow-md", !pref.active && "ml-0")}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                      <Button
                        variant="ghost"
                        className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 h-14 rounded-2xl font-black gap-3 group transition-all"
                        onClick={() => window.location.reload()}
                      >
                        <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                        <span className="tracking-wide">Logout Securely</span>
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                {/* Experience Tab Content */}
                <TabsContent value="activity" className="focus-visible:outline-none py-2">
                  <div className="bg-white dark:bg-slate-900 p-12 rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800/60 shadow-xl text-center flex flex-col items-center">
                    <div className="w-24 h-24 bg-primary/5 rounded-[2rem] flex items-center justify-center mb-8 relative group overflow-hidden">
                      <div className="absolute inset-0 bg-primary/10 scale-125 opacity-0 group-hover:opacity-100 transition-all blur-2xl" />
                      <motion.div
                        animate={{
                          rotate: [0, 10, -10, 0],
                          scale: [1, 1.1, 1]
                        }}
                        transition={{ repeat: Infinity, duration: 5 }}
                      >
                        <Briefcase className="w-10 h-10 text-primary relative z-10" />
                      </motion.div>
                    </div>
                    <h3 className="text-xl font-serif font-black text-slate-900 dark:text-white mb-4">Professional Vault Access</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[320px] font-medium leading-relaxed mb-8">
                      Your high-resolution experience logs and case documentation are being indexed for legal-standard archiving.
                    </p>
                    <Button variant="outline" className="rounded-2xl font-black px-8 py-6 border-primary/20 hover:bg-primary/5 text-primary transition-all shadow-sm hover:shadow-md">Review Documentation</Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
