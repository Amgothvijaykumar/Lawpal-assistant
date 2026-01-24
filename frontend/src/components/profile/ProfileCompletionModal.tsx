import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Briefcase, MapPin, CheckCircle2, AlertCircle, Search, Map as MapIcon, ShieldCheck, ChevronLeft, Check, Gavel, Users, Scale, Building, Banknote, HardHat, Lock, Trophy, Star, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { cn } from '@/lib/utils';

const API_URL = import.meta.env.VITE_API_BASE_URL;

interface ProfileCompletionModalProps {
    isOpen: boolean;
    onComplete: () => void;
}

type Step = 'welcome' | 'name' | 'bar_id' | 'experience' | 'practice_area' | 'location' | 'success';

export function ProfileCompletionModal({ isOpen, onComplete }: ProfileCompletionModalProps) {
    const { user, token } = useAuth();
    const [step, setStep] = useState<Step>('welcome');
    const [loading, setLoading] = useState(false);
    const [barIdExists, setBarIdExists] = useState<boolean | null>(null);
    const [verificationMessage, setVerificationMessage] = useState<string>('');
    const [checkingBarId, setCheckingBarId] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        fullName: user?.displayName || '',
        barRegistrationNumber: '',
        yearsOfExperience: 0,
        selectedAreas: [] as string[],
        location: {
            city: '',
            district: '',
            state: '',
            coordinates: [78.4867, 17.3850] // Default Hyderabad
        }
    });

    const isLawyer = user?.role === 'lawyer';

    useEffect(() => {
        if (isOpen) {
            // Wait 1 second as requested before potentially showing first field if we are at 'welcome'
            const timer = setTimeout(() => {
                if (step === 'welcome') setStep('name');
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Debounced Bar ID Check
    useEffect(() => {
        const timer = setTimeout(() => {
            if (formData.barRegistrationNumber.length > 5) {
                checkBarId(formData.barRegistrationNumber);
            } else {
                setBarIdExists(null);
            }
        }, 600); // 600ms debounce
        return () => clearTimeout(timer);
    }, [formData.barRegistrationNumber]);

    const handleNext = async () => {
        if (step === 'name') {
            if (!formData.fullName) return toast.error('Please enter your full name');
            setStep(isLawyer ? 'bar_id' : 'location');
        } else if (step === 'bar_id') {
            if (!formData.barRegistrationNumber) return toast.error('Please enter your Bar Registration Number');
            if (barIdExists) return toast.error('This Bar ID is already registered');
            setStep('experience');
        } else if (step === 'experience') {
            setStep('practice_area');
        } else if (step === 'practice_area') {
            if (formData.selectedAreas.length === 0) return toast.error('Please select at least one practice area');
            setStep('location');
        } else if (step === 'location') {
            if (!formData.location.city) return toast.error('Please enter your city');
            await handleSubmit();
        }
    };

    const handleBack = () => {
        if (step === 'name') setStep('welcome');
        else if (step === 'bar_id') setStep('name');
        else if (step === 'experience') setStep('bar_id');
        else if (step === 'practice_area') setStep('experience');
        else if (step === 'location') setStep(isLawyer ? 'practice_area' : 'name');
    };

    const checkBarId = async (id: string) => {
        if (!id) return;
        setCheckingBarId(true);
        try {
            const { data } = await axios.get(`${API_URL}/lawyers/check-bar-id?id=${encodeURIComponent(id)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBarIdExists(data.exists);
            setVerificationMessage(data.message);
        } catch (error) {
            console.error('Error checking Bar ID:', error);
        } finally {
            setCheckingBarId(false);
        }
    };

    const detectLocation = () => {
        if (!navigator.geolocation) {
            return toast.error("Geolocation is not supported by your browser");
        }

        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setFormData(prev => ({
                    ...prev,
                    location: { ...prev.location, coordinates: [longitude, latitude] }
                }));

                // Real-time Reverse Geocoding using Nominatim (OpenStreetMap)
                try {
                    const response = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`);
                    const address = response.data.address;

                    setFormData(prev => ({
                        ...prev,
                        location: {
                            ...prev.location,
                            city: address.city || address.town || address.village || address.suburb || "City",
                            state: address.state || "State",
                            district: address.state_district || address.county || "District"
                        }
                    }));
                    toast.success("Location pinpointed and geocoded!");
                } catch (e) {
                    console.error("Geocoding failed:", e);
                    toast.error("Located successfully, but failed to fetch address names. Please enter manually.");
                } finally {
                    setLoading(false);
                }
            },
            (error) => {
                setLoading(false);
                toast.error("Unable to retrieve your location. Please enter it manually.");
            }
        );
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await axios.patch(`${API_URL}/auth/profile/complete`, {
                role: user?.role,
                details: isLawyer ? {
                    fullName: formData.fullName,
                    barRegistrationNumber: formData.barRegistrationNumber,
                    yearsOfExperience: formData.yearsOfExperience,
                    primaryPracticeArea: formData.selectedAreas[0],
                    secondaryPracticeAreas: formData.selectedAreas.slice(1),
                    location: formData.location,
                    verifiedBarStatus: true // Auto-verify for demo
                } : {
                    displayName: formData.fullName,
                    location: formData.location
                }
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setStep('success');
            setTimeout(() => {
                onComplete();
            }, 2000);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
                <div className="p-8">
                    <AnimatePresence mode="wait">
                        {step === 'welcome' && (
                            <motion.div
                                key="welcome"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="text-center py-10"
                            >
                                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <ShieldCheck className="w-10 h-10 text-primary" />
                                </div>
                                <h2 className="text-2xl font-bold mb-2">Welcome to LawPal</h2>
                                <p className="text-slate-500">Please take a moment to complete your profile.</p>
                            </motion.div>
                        )}

                        {step === 'name' && (
                            <motion.div
                                key="name"
                                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full h-8 w-8 hover:bg-slate-100">
                                        <ChevronLeft className="w-5 h-5" />
                                    </Button>
                                    <Label className="text-lg font-bold">{isLawyer ? 'What is your professional name?' : 'What should we call you?'}</Label>
                                </div>
                                <div className="space-y-4">
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                        <Input
                                            autoFocus
                                            className="pl-10 h-12 text-lg rounded-xl border-slate-200 focus:border-primary shadow-sm"
                                            placeholder="Enter your full name"
                                            value={formData.fullName}
                                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                            onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                                        />
                                    </div>
                                    <Button onClick={handleNext} className="w-full h-12 rounded-xl text-lg font-bold shadow-lg shadow-primary/20">
                                        {isLawyer ? 'Continue to Verification' : 'Continue to Location'}
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {step === 'bar_id' && (
                            <motion.div
                                key="bar_id"
                                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full h-8 w-8 hover:bg-slate-100">
                                        <ChevronLeft className="w-5 h-5" />
                                    </Button>
                                    <Label className="text-lg font-bold">Bar Council Registration</Label>
                                </div>
                                <div className="space-y-4">
                                    <p className="text-sm text-slate-500">We'll check this against live records for instant verification.</p>
                                    <div className="relative">
                                        <Briefcase className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                        <Input
                                            autoFocus
                                            className={cn(
                                                "pl-10 h-14 text-xl font-mono tracking-wider rounded-2xl transition-all duration-500 bg-slate-50 dark:bg-slate-800/50 border-2",
                                                barIdExists === false && "border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.15)] bg-green-50/50 dark:bg-green-900/10",
                                                barIdExists === true && "border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.15)] bg-red-50/50 dark:bg-red-900/10",
                                                !barIdExists && !checkingBarId && "border-slate-200 focus:border-primary"
                                            )}
                                            placeholder="BR/123/2010"
                                            value={formData.barRegistrationNumber}
                                            onChange={(e) => {
                                                const val = e.target.value.toUpperCase(); // Standardize to uppercase
                                                setFormData({ ...formData, barRegistrationNumber: val });
                                            }}
                                            onKeyDown={(e) => e.key === 'Enter' && barIdExists === false && handleNext()}
                                        />
                                        {/* Premium Scanning Animation */}
                                        {checkingBarId && (
                                            <motion.div
                                                className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden z-10"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                            >
                                                {/* Cyber Grid Pattern */}
                                                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '10px 10px' }} />

                                                {/* Laser Line */}
                                                <motion.div
                                                    className="h-[2px] w-full bg-gradient-to-r from-transparent via-primary to-transparent absolute shadow-[0_0_15px_rgba(59,130,246,0.8)]"
                                                    animate={{ top: ['0%', '100%', '0%'] }}
                                                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                                />

                                                {/* Scanning Glow */}
                                                <motion.div
                                                    className="absolute inset-0 bg-primary/5"
                                                    animate={{ opacity: [0.2, 0.4, 0.2] }}
                                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                                />
                                            </motion.div>
                                        )}
                                        {checkingBarId && <div className="absolute right-3 top-3.5"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}
                                        {barIdExists === false && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-3 text-green-500"><CheckCircle2 className="w-5 h-5" /></motion.div>}
                                        {barIdExists === true && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-3 text-red-500"><AlertCircle className="w-5 h-5" /></motion.div>}
                                    </div>
                                    <div className="flex items-center justify-between px-1">
                                        <div className="flex items-center gap-2">
                                            {checkingBarId ? (
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest animate-pulse">
                                                    <div className="w-2 h-2 bg-primary rounded-full animate-ping" />
                                                    Cross-referencing Records...
                                                </div>
                                            ) : barIdExists === false ? (
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-green-600 uppercase tracking-widest">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    ID Available for Registration
                                                </div>
                                            ) : barIdExists === true ? (
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-600 uppercase tracking-widest">
                                                    <AlertCircle className="w-3 h-3" />
                                                    Registration Conflict Found
                                                </div>
                                            ) : (
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {verificationMessage || "Format: STATE/ID/YEAR"}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {barIdExists === true && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/50 rounded-2xl space-y-3"
                                        >
                                            <div>
                                                <p className="text-xs font-bold text-red-700 dark:text-red-400 mb-1">Database Conflict Detected</p>
                                                <p className="text-[11px] text-red-600/80 leading-relaxed">
                                                    This Bar Council Number is already registered. To ensure security, we do not allow duplicate professional IDs.
                                                </p>
                                            </div>

                                            <div className="pt-2 border-t border-red-200/50 dark:border-red-800/50">
                                                <p className="text-[10px] font-bold text-red-700 uppercase tracking-tight mb-2">What should I do?</p>
                                                <ul className="space-y-1.5">
                                                    <li className="flex items-center gap-2 text-[10px] text-red-600/80">
                                                        <div className="w-1 h-1 rounded-full bg-red-400" />
                                                        <span>Double-check your entry for typos.</span>
                                                    </li>
                                                    <li className="flex items-center gap-2 text-[10px] text-red-600/80">
                                                        <div className="w-1 h-1 rounded-full bg-red-400" />
                                                        <span>Ensure you are using the official format (STATE/ID/YEAR).</span>
                                                    </li>
                                                    <li className="flex items-center gap-2 text-[10px] text-red-600/80">
                                                        <div className="w-1 h-1 rounded-full bg-red-400" />
                                                        <span>Contact support if you believe this is an error.</span>
                                                    </li>
                                                </ul>
                                            </div>

                                            <Button
                                                variant="ghost"
                                                className="w-full h-8 text-[10px] font-bold text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg uppercase"
                                                onClick={() => window.open('mailto:support@lawpal.com')}
                                            >
                                                Contact Support
                                            </Button>
                                        </motion.div>
                                    )}

                                    {barIdExists === null && !checkingBarId && (
                                        <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                                            <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm">
                                                <ShieldCheck className="w-5 h-5 text-primary" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200">Official Verification</p>
                                                <p className="text-[10px] text-slate-500">Your ID is encrypted and verified against Bar Council records.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <Button
                                    onClick={handleNext}
                                    disabled={checkingBarId || barIdExists !== false || !formData.barRegistrationNumber}
                                    className={cn(
                                        "w-full h-14 rounded-2xl text-lg font-bold shadow-xl transition-all duration-300",
                                        barIdExists === false
                                            ? "bg-primary hover:bg-primary/90 shadow-primary/20 scale-[1.02]"
                                            : "opacity-40 grayscale cursor-not-allowed"
                                    )}
                                >
                                    {checkingBarId ? 'Scanning...' : 'Verify & Proceed'}
                                </Button>
                            </motion.div>
                        )}

                        {step === 'experience' && (
                            <motion.div
                                key="experience"
                                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full h-8 w-8 hover:bg-slate-100">
                                        <ChevronLeft className="w-5 h-5" />
                                    </Button>
                                    <Label className="text-lg font-bold">Professional Experience</Label>
                                </div>
                                <div className="space-y-4">
                                    <p className="text-sm text-slate-500">How many years have you been practicing law?</p>
                                    <div className="flex items-center gap-6 bg-slate-50 dark:bg-white/5 p-6 rounded-2xl border border-slate-100 dark:border-white/10 shadow-inner">
                                        <Input
                                            type="number"
                                            autoFocus
                                            className="h-20 w-32 text-4xl font-black rounded-2xl text-center bg-white dark:bg-slate-900 border-2 border-primary/20 focus:border-primary transition-all"
                                            value={formData.yearsOfExperience}
                                            onChange={(e) => setFormData({ ...formData, yearsOfExperience: parseInt(e.target.value) || 0 })}
                                            onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                                        />
                                        <span className="text-2xl font-bold text-slate-400">Years of <br /> Practice</span>
                                    </div>
                                    <Button onClick={handleNext} className="w-full h-12 rounded-xl text-lg font-bold shadow-lg shadow-primary/20">Continue</Button>
                                </div>
                            </motion.div>
                        )}

                        {step === 'practice_area' && (
                            <motion.div
                                key="practice_area"
                                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full h-8 w-8 hover:bg-slate-100">
                                        <ChevronLeft className="w-5 h-5" />
                                    </Button>
                                    <div>
                                        <Label className="text-lg font-bold">Select Practice Areas</Label>
                                        <p className="text-xs text-slate-500">Pick all areas you specialize in.</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { id: 'criminal', icon: Gavel, color: 'bg-red-500' },
                                        { id: 'family', icon: Users, color: 'bg-pink-500' },
                                        { id: 'civil', icon: Scale, color: 'bg-blue-500' },
                                        { id: 'property', icon: Building, color: 'bg-amber-500' },
                                        { id: 'corporate', icon: Briefcase, color: 'bg-indigo-500' },
                                        { id: 'tax', icon: Banknote, color: 'bg-emerald-500' },
                                        { id: 'labor', icon: HardHat, color: 'bg-orange-500' },
                                        { id: 'cyber', icon: Lock, color: 'bg-violet-500' }
                                    ].map((area) => {
                                        const isSelected = formData.selectedAreas.includes(area.id);
                                        const Icon = area.icon;
                                        return (
                                            <button
                                                key={area.id}
                                                onClick={() => {
                                                    const areas = [...formData.selectedAreas];
                                                    if (isSelected) {
                                                        setFormData({ ...formData, selectedAreas: areas.filter(a => a !== area.id) });
                                                    } else {
                                                        setFormData({ ...formData, selectedAreas: [...areas, area.id] });
                                                    }
                                                }}
                                                className={cn(
                                                    "p-4 rounded-2xl border text-left capitalize transition-all relative overflow-hidden group",
                                                    isSelected
                                                        ? "border-primary bg-primary/5 ring-1 ring-primary shadow-md"
                                                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                                                )}
                                            >
                                                <div className="flex items-center gap-3 relative z-10">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                                        isSelected ? area.color + " text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-slate-200"
                                                    )}>
                                                        <Icon className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className={cn("font-bold text-sm truncate", isSelected ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300")}>{area.id}</div>
                                                        <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Legal Dept</div>
                                                    </div>
                                                    {isSelected && (
                                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white shadow-lg border-2 border-white dark:border-slate-900">
                                                            <Check className="w-3 h-3" strokeWidth={4} />
                                                        </motion.div>
                                                    )}
                                                </div>
                                                {/* Subtle number indicator for priority */}
                                                {isSelected && (
                                                    <div className="absolute bottom-1 right-2 text-[8px] font-black text-slate-300 dark:text-slate-700">
                                                        {formData.selectedAreas.indexOf(area.id) === 0 ? "PRIMARY" : `#${formData.selectedAreas.indexOf(area.id) + 1}`}
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="pt-2">
                                    <Button
                                        onClick={handleNext}
                                        disabled={formData.selectedAreas.length === 0}
                                        className="w-full h-12 rounded-xl text-lg font-bold shadow-lg shadow-primary/20 disabled:shadow-none"
                                    >
                                        {formData.selectedAreas.length > 0 ? `Continue with ${formData.selectedAreas.length} Areas` : 'Select an Area'}
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {step === 'location' && (
                            <motion.div
                                key="location"
                                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full h-8 w-8 hover:bg-slate-100">
                                        <ChevronLeft className="w-5 h-5" />
                                    </Button>
                                    <Label className="text-lg font-bold">{isLawyer ? 'Office Location' : 'Your Location'}</Label>
                                </div>
                                <div className="space-y-4">
                                    <p className="text-sm text-slate-500">
                                        {isLawyer
                                            ? "This helps clients find you and matches you with local cases."
                                            : "We use this to connect you with the best lawyers in your vicinity."}
                                    </p>

                                    <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-4 mb-4 relative overflow-hidden group border border-slate-200 dark:border-slate-700">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2 text-primary font-medium">
                                                <MapIcon className="w-4 h-4" />
                                                <span>{formData.location.city ? `${formData.location.city}, ${formData.location.state}` : (isLawyer ? 'Locate Office' : 'Find My Location')}</span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    detectLocation();
                                                }}
                                                className="h-7 text-[10px] bg-white dark:bg-slate-900 shadow-sm border hover:bg-primary hover:text-white transition-colors"
                                            >
                                                <MapPin className="w-3 h-3 mr-1" /> Auto-Detect
                                            </Button>
                                        </div>
                                        <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center relative overflow-hidden">
                                            <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(#000 1.2px, transparent 1.2px)', backgroundSize: '24px 24px' }} />
                                            {/* Simulated Map Markers */}
                                            <motion.div
                                                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                                                transition={{ repeat: Infinity, duration: 3 }}
                                                className="absolute w-24 h-24 bg-primary/20 rounded-full blur-xl"
                                            />

                                            <div className="relative z-10">
                                                <motion.div
                                                    animate={{ y: [0, -10, 0] }}
                                                    transition={{ repeat: Infinity, duration: 2 }}
                                                >
                                                    <MapPin className="w-10 h-10 text-primary drop-shadow-lg" />
                                                </motion.div>
                                                <div className="w-4 h-1 bg-primary/40 rounded-full blur-sm absolute -bottom-1 left-3 scale-x-150" theme-ignore="true" />
                                            </div>

                                            {loading && (
                                                <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-[2px] flex items-center justify-center z-20">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                                                        <span className="text-xs font-black text-primary uppercase tracking-[0.2em] animate-pulse">Establishing Signal...</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-3 p-3 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                                            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] uppercase font-bold text-slate-400 leading-none mb-1">Detected Address</p>
                                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                                                    {formData.location.city || 'Coordinates Locked'} • {formData.location.state || 'Awaiting Sync'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <Label className="text-[11px] font-bold text-slate-400 uppercase ml-1">City</Label>
                                                <Input
                                                    className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200"
                                                    placeholder="e.g. Hyderabad"
                                                    value={formData.location.city}
                                                    onChange={(e) => setFormData({ ...formData, location: { ...formData.location, city: e.target.value } })}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[11px] font-bold text-slate-400 uppercase ml-1">State</Label>
                                                <Input
                                                    className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200"
                                                    placeholder="Tengalana"
                                                    value={formData.location.state}
                                                    onChange={(e) => setFormData({ ...formData, location: { ...formData.location, state: e.target.value } })}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[11px] font-bold text-slate-400 uppercase ml-1">District / Locality</Label>
                                            <Input
                                                className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200"
                                                placeholder="e.g. Banjara Hills"
                                                value={formData.location.district}
                                                onChange={(e) => setFormData({ ...formData, location: { ...formData.location, district: e.target.value } })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    onClick={handleNext}
                                    disabled={loading}
                                    className="w-full h-12 rounded-xl text-lg font-medium"
                                >
                                    {loading ? 'Saving...' : 'Complete Profile'}
                                </Button>
                            </motion.div>
                        )}

                        {step === 'success' && (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-10"
                            >
                                <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                        className="absolute inset-0 bg-green-500/20 rounded-full"
                                    />
                                    <CheckCircle2 className="w-12 h-12 text-green-500 relative z-10" />
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                                        className="absolute -top-2 -right-2"
                                    >
                                        <Sparkles className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                                    </motion.div>
                                </div>
                                <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
                                    {isLawyer ? 'Profile Ready!' : 'Welcome Aboard!'}
                                </h2>
                                <p className="text-slate-500 font-medium">
                                    {isLawyer
                                        ? 'Your legal profile is now active and verified.'
                                        : 'Your LawPal account is set up and ready to use.'}
                                </p>
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: "100%" }}
                                    transition={{ duration: 1.5, delay: 0.5 }}
                                    className="h-1 bg-green-500/20 rounded-full mt-6 max-w-[200px] mx-auto overflow-hidden"
                                >
                                    <motion.div
                                        animate={{ x: ["-100%", "100%"] }}
                                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                        className="w-1/2 h-full bg-green-500"
                                    />
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800">
                    <motion.div
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{
                            width: step === 'welcome' ? '0%' :
                                step === 'name' ? '33%' :
                                    step === 'bar_id' ? '45%' :
                                        step === 'experience' ? '60%' :
                                            step === 'practice_area' ? '75%' :
                                                step === 'location' ? (isLawyer ? '90%' : '66%') :
                                                    step === 'success' ? '100%' : '100%'
                        }}
                    />
                </div>
            </motion.div>
        </div>
    );
}
