import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Document } from '@/types';

const API_URL = import.meta.env.VITE_API_BASE_URL;

export function useDocuments() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const { token } = useAuth();
    const { toast } = useToast();

    const fetchDocuments = useCallback(async () => {
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            const { data } = await axios.get(`${API_URL}/documents`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDocuments(data);
        } catch (error) {
            console.error('Error fetching documents:', error);
            toast({
                title: "Error",
                description: "Failed to load documents",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [token, toast]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const uploadDocument = async (docData: Partial<Document>) => {
        if (!token) return null;

        try {
            const { data } = await axios.post(`${API_URL}/documents`, docData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDocuments(prev => [data, ...prev]);
            return data;
        } catch (error) {
            console.error('Error uploading document:', error);
            toast({
                title: "Error",
                description: "Failed to save document",
                variant: "destructive",
            });
            return null;
        }
    };

    const deleteDocument = async (docId: string) => {
        if (!token) return false;

        try {
            await axios.delete(`${API_URL}/documents/${docId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDocuments(prev => prev.filter(d => d._id !== docId));
            return true;
        } catch (error) {
            console.error('Error deleting document:', error);
            toast({
                title: "Error",
                description: "Failed to delete document",
                variant: "destructive",
            });
            return false;
        }
    };

    return {
        documents,
        loading,
        uploadDocument,
        deleteDocument,
        refreshDocuments: fetchDocuments
    };
}
