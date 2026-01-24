import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MiniCourtProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TrialResult {
  petitioner_argument: string;
  respondent_argument: string;
  judge_verdict: string;
  win_probability: number;
  critical_warning: string;
}

export function MiniCourt({ open, onOpenChange }: MiniCourtProps) {
  const [caseDescription, setCaseDescription] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [trialResult, setTrialResult] = useState<TrialResult | null>(null);
  const [loadingText, setLoadingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadingMessages = [
    "Reviewing submitted evidence...",
    "Opposition is preparing arguments...",
    "Judge is writing the verdict...",
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
    
    // Create abort controller
    abortControllerRef.current = new AbortController();

    // Rotate loading messages
    let messageIndex = 0;
    setLoadingText(loadingMessages[0]);
    const loadingInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % loadingMessages.length;
      setLoadingText(loadingMessages[messageIndex]);
    }, 2000);

    try {
      console.log('🔨 Starting trial simulation...');
      
      // ✅ FIX: Corrected URL to match your Python Backend (Port 7860)
      const response = await fetch('http://127.0.0.1:7860/simulate_trial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: caseDescription,
          evidence_files: evidenceFiles.map(f => f.name),
        }),
        signal: abortControllerRef.current.signal,
      });

      console.log('Response Status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Trial simulation failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Trial result received:', data);
      
      // Validate response has required fields
      if (!data.petitioner_argument || !data.respondent_argument || !data.judge_verdict) {
        throw new Error('Invalid response format from server');
      }

      setTrialResult(data);
      setError(null);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Trial simulation aborted by user');
        setError('Trial simulation was stopped');
      } else {
        console.error('❌ Error simulating trial:', error);
        setError('Failed to connect to the AI Judge. Ensure backend is running on port 7860.');
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
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setCaseDescription('');
    setEvidenceFiles([]);
    setTrialResult(null);
    setIsLoading(false);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
            <Scale className="w-7 h-7 text-amber-600" />
            ⚖️ The Digital Courtroom
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            Simulate your case instantly. See how the opposition will attack you.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="p-6 space-y-6">
            {!trialResult && !isLoading && (
              <>
                {/* Input Zone */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Case Description
                    </label>
                    <Textarea
                      value={caseDescription}
                      onChange={(e) => setCaseDescription(e.target.value)}
                      placeholder="Describe your legal issue in detail... (e.g., I lent 5 Lakhs cash to a friend without a contract, and now he won't pay me back.)"
                      className="min-h-[150px] resize-none"
                      disabled={isLoading}
                    />
                  </div>

                  {/* Evidence Upload */}
                  <div>
                    <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      📎 Attach Evidence (Optional)
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full"
                      disabled={isLoading}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Files (Images, PDFs)
                    </Button>

                    {/* File Badges */}
                    {evidenceFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {evidenceFiles.map((file, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="pl-3 pr-1 py-1.5 gap-2"
                          >
                            <FileText className="w-3 h-3" />
                            {file.name}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 p-0 hover:bg-transparent"
                              onClick={() => removeFile(index)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={handleConveneCourt}
                      disabled={!caseDescription.trim() || isLoading}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-6 text-lg"
                    >
                      <Gavel className="w-5 h-5 mr-2" />
                      🔨 Convene Court
                    </Button>
                  </div>

                  {/* Show error if exists */}
                  {error && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <Alert variant="destructive" className="my-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Error:</strong> {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-16 space-y-6">
                <div className="relative">
                  <Gavel className="w-16 h-16 text-amber-600 animate-pulse" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-semibold">Trial in Progress</h3>
                  <p className="text-muted-foreground animate-pulse">
                    {loadingText}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    This may take 10-30 seconds...
                  </p>
                </div>
                <Button
                  onClick={handleStopProceedings}
                  variant="destructive"
                  className="mt-4"
                >
                  <StopCircle className="w-4 h-4 mr-2" />
                  🛑 Stop Proceedings
                </Button>
              </div>
            )}

            {/* Result Display - The Courtroom View */}
            {trialResult && (
              <div className="space-y-6">
                <div className="text-center">
                  <Badge variant="secondary" className="mb-4 text-lg px-4 py-2">
                    ⚖️ Trial Complete
                  </Badge>
                </div>

                {/* 3-Card Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card 1: Petitioner (Defense) */}
                  <Card className="border-2 border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                        <Shield className="w-5 h-5" />
                        🛡️ Your Defense Counsel
                      </CardTitle>
                      <CardDescription className="text-green-600 dark:text-green-500">
                        Arguments in your favor
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="max-h-64">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {trialResult.petitioner_argument}
                        </p>
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  {/* Card 2: Opposition */}
                  <Card className="border-2 border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-800">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                        <Swords className="w-5 h-5" />
                        ⚔️ Respondent's Argument
                      </CardTitle>
                      <CardDescription className="text-red-600 dark:text-red-500">
                        Opposition's counter-attack
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="max-h-64">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {trialResult.respondent_argument}
                        </p>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>

                {/* Card 3: The Verdict (Center/Highlighted) */}
                <Card className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 dark:border-amber-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xl">
                      <Scale className="w-6 h-6" />
                      ⚖️ Preliminary Judgment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Win Probability Meter */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Win Probability</span>
                        <span className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                          {trialResult.win_probability}%
                        </span>
                      </div>
                      <Progress 
                        value={trialResult.win_probability} 
                        className="h-3"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Weak Case</span>
                        <span>Strong Case</span>
                      </div>
                    </div>

                    {/* Verdict Text */}
                    <div className="pt-2">
                      <h4 className="font-semibold mb-2 text-sm">Judge's Analysis:</h4>
                      <ScrollArea className="max-h-48">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {trialResult.judge_verdict}
                        </p>
                      </ScrollArea>
                    </div>

                    {/* Critical Warning */}
                    {trialResult.critical_warning && (
                      <Alert variant="destructive" className="mt-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          <strong>Critical Warning:</strong> {trialResult.critical_warning}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex justify-center gap-3 pt-2">
                  <Button onClick={handleReset} variant="outline" size="lg">
                    <Gavel className="w-4 h-4 mr-2" />
                    Start New Trial
                  </Button>
                </div>

                {/* Disclaimer Footer */}
                <div className="pt-4 border-t">
                  <p className="text-xs text-center text-muted-foreground leading-relaxed">
                    <strong>DISCLAIMER:</strong> This is an AI simulation for educational strategy only. 
                    It is not a substitute for real legal advice. Please consult a human advocate for official proceedings.
                  </p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}