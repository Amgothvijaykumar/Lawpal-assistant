import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scale,
  Shield,
  Swords,
  Upload,
  Gavel,
  StopCircle,
  AlertTriangle,
  FileText,
  X,
  ChevronLeft,
  Sparkles,
  History,
  Info,
  CheckCircle2,
  LayoutList,
  Target,
  FileBadge
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_BASE_URL;

interface MiniCourtProps {
  onClose: () => void;
}

interface TrialResult {
  petitioner_argument: string;
  respondent_argument: string;
  judge_verdict: string;
  win_probability: number;
  critical_warning: string;
}

export function MiniCourt({ onClose }: MiniCourtProps) {
  const { token } = useAuth();
  const [caseDescription, setCaseDescription] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [trialResult, setTrialResult] = useState<TrialResult | null>(null);
  const [loadingText, setLoadingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadingMessages = [
    "Analyzing historical precedents...",
    "Reviewing submitted evidence...",
    "Opposition counsel is preparing arguments...",
    "Deliberating case merits...",
    "AI Judge is drafting the final verdict...",
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setEvidenceFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setEvidenceFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConveneCourt = async () => {
    if (!caseDescription.trim()) return;

    setIsLoading(true);
    setTrialResult(null);
    setError(null);

    abortControllerRef.current = new AbortController();

    let messageIndex = 0;
    setLoadingText(loadingMessages[0]);
    const loadingInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % loadingMessages.length;
      setLoadingText(loadingMessages[messageIndex]);
    }, 3000);

    try {
      const response = await fetch(`${API_URL}/simulate-trial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          description: caseDescription,
          evidence_files: evidenceFiles.map(f => f.name),
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
        throw new Error(errorData.error || `Trial simulation failed: ${response.status}`);
      }

      const data = await response.json();
      setTrialResult(data);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setError('Proceedings adjourned');
      } else {
        setError('Connection failed. Please check your backend.');
      }
    } finally {
      clearInterval(loadingInterval);
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopProceedings = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleReset = () => {
    setCaseDescription('');
    setEvidenceFiles([]);
    setTrialResult(null);
    setIsLoading(false);
    setError(null);
  };

  // Helper to "bulletize" text for clearer representation
  const getPowerPoints = (text: any) => {
    if (!text) return [];
    if (Array.isArray(text)) return text.map(t => typeof t === 'string' ? t.trim() : JSON.stringify(t)).filter(t => t.length > 5);
    if (typeof text === 'string') {
      return text.split(/\.|\n/).filter(line => line.trim().length > 10).map(line => line.trim());
    }
    return [String(text)];
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-950 font-sans">
      {/* minimalist Header */}
      <header className="shrink-0 px-8 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between z-20">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="space-y-0.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Scale className="w-5 h-5 text-indigo-600" />
              Trial Insights
            </h1>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">Case Simulation Engine</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {trialResult && (
            <Button variant="outline" size="sm" onClick={handleReset} className="rounded-full h-9 text-xs font-semibold px-4 border-slate-200">
              <History className="w-3.5 h-3.5 mr-2" />
              Reset Case
            </Button>
          )}
          <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-none px-4 py-1.5 rounded-full text-[10px] font-bold tracking-wider">
            AI JUDGE 1.0
          </Badge>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto p-8 lg:p-12 mb-20">
          <AnimatePresence mode="wait">
            {!trialResult && !isLoading && (
              <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-10">
                <div className="space-y-4">
                  <h2 className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                    Strategic <span className="text-indigo-600">Representation.</span><br />
                    Clear Evidence.
                  </h2>
                  <p className="text-lg text-slate-500 font-medium max-w-2xl">
                    Input your case details below to generate a clear, point-by-point legal summary and outcome prediction.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
                  <div className="lg:col-span-3 space-y-4">
                    <label className="text-xs font-bold uppercase text-slate-400 tracking-widest">Case Description</label>
                    <div className="relative group">
                      <Textarea
                        value={caseDescription}
                        onChange={(e) => setCaseDescription(e.target.value)}
                        placeholder="Describe the incident, dates, and key parties involved..."
                        className="min-h-[300px] border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-base shadow-sm focus:shadow-md transition-all resize-none leading-relaxed"
                      />
                      <div className="absolute bottom-4 right-4 text-[10px] text-slate-400 font-bold bg-white/80 px-2 py-1 rounded-md backdrop-blur-sm">
                        {caseDescription.length} characters
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2 space-y-8">
                    <div className="space-y-4">
                      <label className="text-xs font-bold uppercase text-slate-400 tracking-widest">Evidence Files</label>
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center hover:bg-slate-50 transition-all cursor-pointer flex flex-col items-center gap-3"
                      >
                        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <Upload className="w-5 h-5 text-slate-500" />
                        </div>
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Attach Documentation</span>
                      </div>

                      {evidenceFiles.length > 0 && (
                        <div className="space-y-2">
                          {evidenceFiles.map((file, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-xs font-semibold">
                              <span className="truncate max-w-[150px]">{file.name}</span>
                              <X className="w-4 h-4 cursor-pointer text-slate-400 hover:text-red-500" onClick={() => removeFile(i)} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={handleConveneCourt}
                      disabled={!caseDescription.trim() || isLoading}
                      className="w-full h-16 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-base shadow-xl transition-all"
                    >
                      <Gavel className="w-5 h-5 mr-3" />
                      Generate Analysis
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {isLoading && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-40 space-y-8">
                <div className="relative">
                  <Gavel className="w-16 h-16 text-indigo-600 animate-bounce" />
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-8 h-1 bg-slate-100 rounded-full blur-[2px] animate-pulse" />
                </div>
                <div className="text-center space-y-4">
                  <h3 className="text-2xl font-bold tracking-tight">{loadingText}</h3>
                  <p className="text-sm text-slate-400 font-medium max-w-xs mx-auto">Cross-referencing legal documents and predicting court behavior...</p>
                  <Button variant="ghost" className="text-red-500 font-bold text-xs uppercase tracking-widest" onClick={handleStopProceedings}>
                    Stop Simulation
                  </Button>
                </div>
              </motion.div>
            )}

            {trialResult && (
              <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
                {/* 1. Verdict Executive Summary */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-[32px] p-10 flex flex-col md:flex-row items-center gap-12 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Scale className="w-48 h-48" />
                  </div>

                  <div className="w-full md:w-64 flex flex-col items-center text-center space-y-4 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 pb-8 md:pb-0 md:pr-12">
                    <div className="text-xs font-black text-indigo-600 uppercase tracking-widest">Probability of Success</div>
                    <div className="text-7xl font-extrabold tracking-tighter text-slate-900 dark:text-slate-100">{trialResult.win_probability}%</div>
                    <div className="w-full space-y-1.5">
                      <Progress value={trialResult.win_probability} className="h-2 rounded-full" />
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>Low Merit</span>
                        <span>High Merit</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                      <h3 className="text-lg font-bold uppercase tracking-tight">Judicial Determination</h3>
                    </div>
                    <p className="text-xl font-medium leading-relaxed text-slate-700 dark:text-slate-300">
                      {trialResult.judge_verdict}
                    </p>
                  </div>
                </div>

                {/* 2. Strategic Power Points (Representation Section) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* Your Strength Points */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center">
                        <Target className="w-5 h-5 text-emerald-600" />
                      </div>
                      <h4 className="font-extrabold text-sm uppercase tracking-widest text-emerald-700">Strategic Power Points</h4>
                    </div>
                    <div className="space-y-4">
                      {getPowerPoints(trialResult.petitioner_argument).map((point, i) => (
                        <div key={i} className="flex gap-4 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-hover hover:border-emerald-200">
                          <div className="shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-[10px] font-black text-emerald-600">0{i + 1}</div>
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">{point}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Opposition Risk Points */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center">
                        <Swords className="w-5 h-5 text-amber-600" />
                      </div>
                      <h4 className="font-extrabold text-sm uppercase tracking-widest text-amber-700">Oppositional Risks</h4>
                    </div>
                    <div className="space-y-4">
                      {getPowerPoints(trialResult.respondent_argument).map((point, i) => (
                        <div key={i} className="flex gap-4 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-hover hover:border-amber-200">
                          <div className="shrink-0 w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-[10px] font-black text-amber-600">0{i + 1}</div>
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 leading-relaxed italic">{point}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. Critical Liability (Clear Representation) */}
                {trialResult.critical_warning && (
                  <Alert className="rounded-3xl border-rose-100 bg-rose-50/30 dark:bg-rose-950/20 p-8">
                    <div className="flex gap-6">
                      <div className="w-12 h-12 rounded-2xl bg-rose-500 flex items-center justify-center shrink-0 shadow-lg shadow-rose-200">
                        <AlertTriangle className="w-6 h-6 text-white" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-black uppercase tracking-widest text-rose-600">High-Risk Liability Detected</h4>
                        <p className="text-base text-rose-900 dark:text-rose-200 leading-relaxed font-bold">
                          {trialResult.critical_warning}
                        </p>
                      </div>
                    </div>
                  </Alert>
                )}

                {/* 4. Action Steps / Next Representation */}
                <div className="pt-10 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-3">
                    <FileBadge className="w-5 h-5 text-slate-400" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Authorized Simulation Result</span>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="rounded-full px-8 h-12 text-xs font-bold border-slate-200">Report Export</Button>
                    <Button onClick={handleReset} className="rounded-full px-8 h-12 text-xs font-bold bg-indigo-600">New Simulation</Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}