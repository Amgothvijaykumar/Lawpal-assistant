import { useState } from 'react';
import { Scale, MessageSquare, Shield, Clock, ArrowRight, Briefcase, Users, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthModal } from '@/components/auth/AuthModal';

export function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);

  const features = [
    {
      icon: MessageSquare,
      title: 'AI Legal Assistant',
      description: 'Get instant answers to your legal questions powered by advanced AI technology.',
    },
    {
      icon: Shield,
      title: 'Confidential & Secure',
      description: 'Your conversations are encrypted and protected with enterprise-grade security.',
    },
    {
      icon: Clock,
      title: '24/7 Availability',
      description: 'Access legal guidance anytime, anywhere, without waiting for appointments.',
    },
    {
      icon: Briefcase,
      title: 'Expert Lawyers',
      description: 'Connect with verified lawyers when you need professional legal representation.',
    },
  ];

  const stats = [
    { value: '10K+', label: 'Users Helped' },
    { value: '50+', label: 'Legal Categories' },
    { value: '500+', label: 'Partner Lawyers' },
    { value: '4.9', label: 'User Rating' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary rounded-lg">
              <Scale className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-serif font-bold text-xl">ACTRIGHT</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => setAuthOpen(true)}>
              Sign In
            </Button>
            <Button onClick={() => setAuthOpen(true)} className="gap-2">
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 bg-muted px-4 py-2 rounded-full text-sm mb-6">
            <CheckCircle className="w-4 h-4 text-success" />
            <span className="text-muted-foreground">Trusted by 10,000+ Indians</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-foreground mb-6 leading-tight">
            Legal Guidance Made
            <span className="text-primary block">Simple & Accessible</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Get instant AI-powered legal information, understand your rights, and connect with verified lawyers—all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => setAuthOpen(true)} className="gap-2 h-12 px-8">
              Start Free Consultation
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => setAuthOpen(true)} className="h-12 px-8">
              I'm a Lawyer
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y border-border bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary font-serif">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold text-foreground mb-4">
              Everything You Need for Legal Peace of Mind
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From quick legal questions to finding the right lawyer, we've got you covered.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl border border-border bg-card hover:shadow-elevated transition-shadow"
              >
                <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary">
        <div className="container mx-auto text-center">
          <Users className="w-12 h-12 text-primary-foreground mx-auto mb-6 opacity-80" />
          <h2 className="text-3xl font-serif font-bold text-primary-foreground mb-4">
            Ready to Get Legal Clarity?
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Join thousands of Indians who trust ACTRIGHT for their legal needs. Start your free consultation today.
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => setAuthOpen(true)}
            className="gap-2 h-12 px-8 bg-white text-primary hover:bg-white/90"
          >
            Get Started for Free
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            <span className="font-serif font-semibold">ACTRIGHT</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 ACTRIGHT. Legal information, not legal advice.
          </p>
        </div>
      </footer>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
