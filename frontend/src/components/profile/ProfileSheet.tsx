import { useState } from 'react';
import { User, Mail, Phone, MapPin, Globe, Briefcase, Award, Clock, FileCheck } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileSheet({ open, onOpenChange }: ProfileSheetProps) {
  const { profile, loading } = useAuth();
  const [location, setLocation] = useState('');
  const [language, setLanguage] = useState('English');

  const isLawyer = profile?.role === 'lawyer';

  const handleSave = () => {
    toast.success('Profile updated successfully');
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="font-serif text-xl">Profile</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton className="w-20 h-20 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            {/* Profile Header */}
            <div className="flex items-center gap-4 pb-6 border-b border-border">
              <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center text-2xl font-medium text-accent-foreground">
                {profile?.display_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  {profile?.display_name || 'User'}
                </h2>
                <Badge variant="secondary" className="mt-1 capitalize">
                  {profile?.role || 'user'}
                </Badge>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="personal" className="mt-6">
              <TabsList className="w-full grid grid-cols-2 lg:grid-cols-4">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
                {isLawyer && <TabsTrigger value="professional">Professional</TabsTrigger>}
              </TabsList>

              {/* Personal Info */}
              <TabsContent value="personal" className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Full Name
                  </Label>
                  <Input 
                    id="name" 
                    defaultValue={profile?.display_name || ''} 
                    placeholder="Enter your name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </Label>
                  <Input 
                    id="email" 
                    value={profile?.email || ''} 
                    disabled 
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Mobile Number
                  </Label>
                  <Input 
                    id="phone" 
                    value={profile?.phone || ''} 
                    disabled 
                    className="bg-muted"
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location
                  </Label>
                  <Input 
                    id="location" 
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., Mumbai, Maharashtra"
                  />
                </div>
              </TabsContent>

              {/* Account Settings */}
              <TabsContent value="account" className="mt-6 space-y-4">
                <div className="p-4 rounded-lg border border-border bg-muted/30">
                  <h3 className="font-medium text-foreground mb-2">Account Security</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Manage your account security settings
                  </p>
                  <Button variant="outline" size="sm">
                    Change Password
                  </Button>
                </div>

                <div className="p-4 rounded-lg border border-border bg-muted/30">
                  <h3 className="font-medium text-foreground mb-2">Two-Factor Authentication</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add an extra layer of security to your account
                  </p>
                  <Button variant="outline" size="sm">
                    Enable 2FA
                  </Button>
                </div>

                <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                  <h3 className="font-medium text-destructive mb-2">Danger Zone</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Permanently delete your account and all data
                  </p>
                  <Button variant="destructive" size="sm">
                    Delete Account
                  </Button>
                </div>
              </TabsContent>

              {/* Preferences */}
              <TabsContent value="preferences" className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="language" className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Language Preference
                  </Label>
                  <select
                    id="language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Marathi">Marathi</option>
                    <option value="Tamil">Tamil</option>
                    <option value="Telugu">Telugu</option>
                  </select>
                </div>

                <div className="p-4 rounded-lg border border-border bg-muted/30">
                  <h3 className="font-medium text-foreground mb-2">Notifications</h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Email notifications</span>
                      <input type="checkbox" defaultChecked className="h-4 w-4" />
                    </label>
                    <label className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Push notifications</span>
                      <input type="checkbox" className="h-4 w-4" />
                    </label>
                    <label className="flex items-center justify-between">
                      <span className="text-sm text-foreground">SMS notifications</span>
                      <input type="checkbox" className="h-4 w-4" />
                    </label>
                  </div>
                </div>
              </TabsContent>

              {/* Professional (Lawyers only) */}
              {isLawyer && (
                <TabsContent value="professional" className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bar_id" className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      Bar Council ID
                    </Label>
                    <Input id="bar_id" placeholder="e.g., MH/1234/2020" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialization" className="flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      Specialization
                    </Label>
                    <Input id="specialization" placeholder="e.g., Family Law, Property Law" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="experience" className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Years of Experience
                    </Label>
                    <Input id="experience" type="number" placeholder="e.g., 10" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio" className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4" />
                      Professional Bio
                    </Label>
                    <Textarea 
                      id="bio" 
                      placeholder="Describe your expertise and experience..."
                      rows={4}
                    />
                  </div>

                  <div className="p-4 rounded-lg border border-success/30 bg-success/5">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-5 h-5 text-success" />
                      <span className="font-medium text-success">Verification Status</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your profile is pending verification
                    </p>
                  </div>
                </TabsContent>
              )}
            </Tabs>

            {/* Save Button */}
            <div className="mt-6 pt-4 border-t border-border">
              <Button onClick={handleSave} className="w-full">
                Save Changes
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
