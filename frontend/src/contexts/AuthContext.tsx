import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

type UserRole = 'user' | 'lawyer';

interface Profile {
  id: string;
  role: UserRole;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  profileCompleted: boolean;
  location?: {
    city?: string;
    state?: string;
    district?: string;
    coordinates?: [number, number];
  };
  lawyerDetails?: any; // To store lawyer specific data
}

interface AuthContextType {
  user: Profile | null;
  token: string | null;
  loading: boolean;
  signUp: (email: string, password: string, role: UserRole, displayName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_BASE_URL;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (authToken: string) => {
    try {
      const { data } = await axios.get(`${API_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setUser({
        id: data._id,
        role: data.role,
        displayName: data.displayName,
        email: data.email,
        avatarUrl: data.avatarUrl,
        profileCompleted: data.profileCompleted,
        location: data.location,
        lawyerDetails: data.lawyerDetails
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      signOut();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  const signUp = async (email: string, password: string, role: UserRole, displayName?: string) => {
    try {
      const { data } = await axios.post(`${API_URL}/auth/register`, {
        email,
        password,
        role,
        displayName: displayName || email.split('@')[0]
      });
      setToken(data.token);
      localStorage.setItem('auth_token', data.token);
      setUser({
        id: data.user.id,
        role: data.user.role,
        displayName: data.user.displayName,
        email: data.user.email,
        avatarUrl: null,
        profileCompleted: false
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data } = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });
      setToken(data.token);
      localStorage.setItem('auth_token', data.token);
      setUser({
        id: data.user.id,
        role: data.user.role,
        displayName: data.user.displayName,
        email: data.user.email,
        avatarUrl: data.user.avatarUrl,
        profileCompleted: data.user.profileCompleted || false
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  };

  const signOut = async () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
  };

  const refreshProfile = async () => {
    if (token) await fetchProfile(token);
  };

  const updateProfile = async (updateData: Partial<Profile>) => {
    if (!token) return;
    try {
      const { data } = await axios.patch(`${API_URL}/auth/profile`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser({
        id: data.user._id,
        role: data.user.role,
        displayName: data.user.displayName,
        email: data.user.email,
        avatarUrl: data.user.avatarUrl,
        profileCompleted: data.user.profileCompleted,
        location: data.user.location,
        lawyerDetails: data.user.lawyerDetails
      });
      toast.success('Profile updated successfully');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.error || 'Update failed');
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, signUp, signIn, signOut, refreshProfile, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
