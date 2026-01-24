import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast'; // or wherever toast is
import { useAuth } from '@/contexts/AuthContext';

interface ConsultationRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    lawyerId?: string;
    lawyerName?: string;
}

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3007/api';

export function ConsultationRequestModal({
    isOpen,
    onClose,
    lawyerId,
    lawyerName,
}: ConsultationRequestModalProps) {
    const { user, token } = useAuth();
    const { toast } = useToast();
    const [message, setMessage] = useState('');
    const [priority, setPriority] = useState('normal'); // normal, high, urgent
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!message.trim()) {
            toast({
                title: "Message required",
                description: "Please explain your situation briefly.",
                variant: "destructive"
            });
            return;
        }

        if (!lawyerId) {
            toast({ title: "Error", description: "No lawyer selected", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_URL}/consultations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    lawyerId,
                    initialMessage: message,
                    priority
                })
            });

            if (!response.ok) throw new Error('Failed to send request');

            toast({
                title: "Request Sent",
                description: "The lawyer has been notified. You will be alerted when they accept.",
            });
            onClose();
        } catch (error) {
            toast({
                title: "Error",
                description: "Could not send consultation request. Try again.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Request Priority Consultation</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {lawyerName && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-semibold text-foreground">To:</span> {lawyerName}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Priority Level</Label>
                        <div className="flex gap-2">
                            {['normal', 'high', 'urgent'].map((p) => (
                                <div
                                    key={p}
                                    onClick={() => setPriority(p)}
                                    className={`cursor-pointer px-3 py-1.5 rounded-md border text-xs font-medium capitalize transition-all ${priority === p
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-background hover:bg-muted'
                                        }`}
                                >
                                    {p}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="message">Brief Message</Label>
                        <Textarea
                            id="message"
                            placeholder="Describe your legal issue..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="resize-none h-32"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Request
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
