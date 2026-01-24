import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Check, X, MessageSquare, Clock, ArrowRight, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const API_URL = import.meta.env.VITE_API_BASE_URL;

interface ConsultationRequest {
    _id: string;
    userId: {
        _id: string;
        displayName: string;
        email: string;
        avatarUrl?: string;
    };
    initialMessage: string;
    priority: 'normal' | 'high' | 'urgent';
    status: 'pending' | 'accepted' | 'rejected' | 'completed';
    createdAt: string;
}

interface ActiveSession {
    id: string;
    title: string;
    updated_at: string;
}

interface LawyerDashboardProps {
    onOpenChat: (sessionId: string) => void;
    onRefreshSessions?: () => void;
}

export function LawyerDashboard({ onOpenChat, onRefreshSessions }: LawyerDashboardProps) {
    const { token, user } = useAuth();
    const { socket } = useSocket();
    const { toast } = useToast();
    const [requests, setRequests] = useState<ConsultationRequest[]>([]);
    const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        if (token && user?.role === 'lawyer') {
            loadDashboardData();
        }
    }, [token, user]);

    useEffect(() => {
        if (socket) {
            const handleNewRequest = (newRequest: ConsultationRequest) => {
                setRequests(prev => [newRequest, ...prev]);
                toast({
                    title: "New Request",
                    description: `${newRequest.userId.displayName} is seeking priority counsel.`
                });
            };

            socket.on('consultation:new_request', handleNewRequest);
            socket.on('consultation:deleted', () => loadDashboardData());

            return () => {
                socket.off('consultation:new_request', handleNewRequest);
                socket.off('consultation:deleted');
            };
        }
    }, [socket, toast]);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchRequests(),
                fetchActiveSessions()
            ]);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRequests = async () => {
        try {
            const { data } = await axios.get(`${API_URL}/consultations/requests`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRequests(data);
        } catch (error) {
            console.error('Error fetching requests:', error);
        }
    };

    const fetchActiveSessions = async () => {
        try {
            const { data } = await axios.get(`${API_URL}/chat/sessions`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const filtered = data
                .filter((s: any) => s.type === 'lawyer')
                .map((s: any) => ({
                    id: s._id,
                    title: s.title,
                    updated_at: s.updatedAt
                }));
            setActiveSessions(filtered);
        } catch (error) {
            console.error('Error fetching active sessions:', error);
        }
    };

    const handleAction = async (id: string, action: 'accept' | 'reject') => {
        setProcessingId(id);
        try {
            if (action === 'accept') {
                const { data } = await axios.patch(`${API_URL}/consultations/${id}/accept`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                toast({ title: "Session Accepted", description: "Secure chat channel has been established." });
                if (onRefreshSessions) onRefreshSessions();
                await loadDashboardData();
                if (data.sessionId) onOpenChat(data.sessionId);
            } else {
                await axios.delete(`${API_URL}/consultations/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast({ title: "Request Cached", description: "The consultation request was removed." });
                setRequests(prev => prev.filter(r => r._id !== id));
            }
        } catch (error: any) {
            const errorMsg = error.response?.data?.error || `Action failed`;
            toast({ title: "Error", description: errorMsg, variant: "destructive" });
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50/50 dark:bg-[#0B0F1A]">
            {/* Elegant Header */}
            <div className="px-8 py-10 bg-white dark:bg-[#0F172A] border-b border-slate-100 dark:border-slate-800/60 shadow-sm transition-all duration-300">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-indigo-600 dark:text-indigo-400">
                            <Activity className="w-5 h-5" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Operational Overview</span>
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Lawyer Console</h1>
                        <p className="text-slate-500 mt-1 font-medium italic text-sm">Managing your priority legal pipeline</p>
                    </div>
                    <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                        <Button
                            variant="ghost"
                            onClick={loadDashboardData}
                            disabled={loading}
                            className="rounded-xl h-9 hover:bg-white dark:hover:bg-slate-700 shadow-sm transition-all font-semibold text-xs text-slate-600 dark:text-slate-300"
                        >
                            Sync System
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex-1 max-w-6xl w-full mx-auto p-8 overflow-hidden min-h-0">
                <Tabs defaultValue="requests" className="h-full flex flex-col">
                    <TabsList className="w-fit bg-slate-200/60 dark:bg-slate-800/80 p-2 h-14 rounded-[20px] mb-8 border border-slate-100 dark:border-slate-800/50">
                        <TabsTrigger value="requests" className="rounded-[14px] px-6 h-10 data-[state=active]:bg-white dark:data-[state=active]:bg-indigo-600 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-white data-[state=active]:shadow-md transition-all font-bold text-xs uppercase tracking-wider gap-3">
                            Incoming Requests
                            {requests.length > 0 && (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-[10px] text-white">
                                    {requests.length}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="active" className="rounded-[14px] px-6 h-10 data-[state=active]:bg-white dark:data-[state=active]:bg-indigo-600 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-white data-[state=active]:shadow-md transition-all font-bold text-xs uppercase tracking-wider">
                            Active Engagements
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="requests" className="flex-1 min-h-0 focus-visible:ring-0">
                        <ScrollArea className="h-full pr-4">
                            {loading ? (
                                <div className="space-y-6">
                                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full rounded-[24px]" />)}
                                </div>
                            ) : requests.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-slate-400 space-y-6">
                                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center">
                                        <MessageSquare className="w-8 h-8 opacity-20" />
                                    </div>
                                    <p className="font-medium text-sm">Your consultation pipeline is currently empty.</p>
                                </div>
                            ) : (
                                <div className="grid gap-6">
                                    {requests.map(req => (
                                        <div key={req._id} className="group relative">
                                            <div className={cn(
                                                "absolute -inset-0.5 bg-gradient-to-r rounded-[26px] opacity-0 group-hover:opacity-10 transition duration-300",
                                                req.priority === 'urgent' ? 'from-red-500 to-orange-500' : 'from-indigo-500 to-emerald-500'
                                            )} />
                                            <Card className="relative bg-white dark:bg-slate-800/60 border-slate-200/50 dark:border-slate-700/50 rounded-[24px] shadow-sm overflow-hidden hover:shadow-xl hover:translate-y-[-2px] transition-all duration-300">
                                                <CardContent className="p-8">
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                                                        <div className="flex items-start gap-6 flex-1">
                                                            <div className="relative shrink-0">
                                                                <Avatar className="w-14 h-14 ring-4 ring-slate-100 dark:ring-slate-800 shadow-sm border border-white">
                                                                    <AvatarFallback className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold text-lg">
                                                                        {req.userId.displayName?.[0]?.toUpperCase() || 'U'}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <span className={cn(
                                                                    "absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white dark:border-slate-800 flex items-center justify-center",
                                                                    req.priority === 'urgent' ? 'bg-red-500' : req.priority === 'high' ? 'bg-orange-500' : 'bg-blue-500'
                                                                )}>
                                                                    <Clock className="w-2.5 h-2.5 text-white" />
                                                                </span>
                                                            </div>

                                                            <div className="space-y-4 flex-1 mt-1">
                                                                <div>
                                                                    <div className="flex items-center gap-3 mb-1">
                                                                        <h2 className="font-bold text-xl text-slate-900 dark:text-slate-100">{req.userId.displayName || 'Anonymous User'}</h2>
                                                                        <Badge variant="outline" className={cn(
                                                                            "capitalize text-[10px] font-black tracking-widest border-2",
                                                                            req.priority === 'urgent' ? 'border-red-100 text-red-600 bg-red-50 dark:bg-red-900/20' : 'border-indigo-100 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                                                                        )}>
                                                                            {req.priority} PRIORITY
                                                                        </Badge>
                                                                    </div>
                                                                    <p className="text-[11px] text-slate-400 font-medium tracking-wide flex items-center gap-1.5 capitalize">
                                                                        Received {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Prospective Case
                                                                    </p>
                                                                </div>

                                                                <div className="bg-slate-50 dark:bg-[#0F172A] p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-inner">
                                                                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 italic">
                                                                        "{req.initialMessage}"
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-row md:flex-col gap-3 min-w-[160px]">
                                                            <Button
                                                                onClick={() => handleAction(req._id, 'accept')}
                                                                disabled={!!processingId}
                                                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 font-bold shadow-md shadow-indigo-100 dark:shadow-none"
                                                            >
                                                                {processingId === req._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-5 h-5 mr-2 stroke-[3]" /> Accept</>}
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                onClick={() => handleAction(req._id, 'reject')}
                                                                disabled={!!processingId}
                                                                className="flex-1 rounded-xl h-11 font-bold border-slate-200 dark:border-slate-700 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
                                                            >
                                                                <X className="w-5 h-5 mr-2 stroke-[3]" /> Decline
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="active" className="flex-1 min-h-0 focus-visible:ring-0">
                        <ScrollArea className="h-full pr-4">
                            {activeSessions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-slate-400 space-y-6">
                                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center">
                                        <MessageSquare className="w-8 h-8 opacity-20" />
                                    </div>
                                    <p className="font-medium text-sm">No ongoing consultations at this time.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {activeSessions.map(session => (
                                        <div key={session.id} className="group cursor-pointer" onClick={() => onOpenChat(session.id)}>
                                            <Card className="bg-white dark:bg-slate-800/60 border-slate-200/50 dark:border-slate-700/50 rounded-[24px] shadow-sm overflow-hidden hover:shadow-lg hover:border-indigo-100 dark:hover:border-indigo-900/40 transition-all duration-300">
                                                <CardContent className="p-6 flex items-center justify-between">
                                                    <div className="flex items-center gap-5">
                                                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                                                            <MessageSquare className="w-6 h-6 stroke-[2.5]" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase text-[12px] tracking-wider">{session.title}</h3>
                                                            <p className="text-[11px] text-slate-400 font-medium tracking-tight">Active Engagement • Last sync {new Date(session.updated_at).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all">
                                                        <ArrowRight className="w-6 h-6" />
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
