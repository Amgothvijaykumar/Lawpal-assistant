import { Scale, FileText, Users, Shield, Gavel, Building, ArrowRight } from 'lucide-react';

interface EmptyChatProps {
  onStartChat: (prompt: string) => void;
}

const suggestions = [
  {
    icon: FileText,
    title: 'Agreement Review',
    prompt: 'Check this rental agreement for any unfair clauses or hidden legal risks.',
  },
  {
    icon: Shield,
    title: 'Cyber Fraud Help',
    prompt: 'I have been a victim of online banking fraud. What are my first legal steps?',
  },
  {
    icon: Gavel,
    title: 'Filing an FIR',
    prompt: 'How do I file an FIR correctly if the police station is refusing to register it?',
  },
  {
    icon: Building,
    title: 'Property Check',
    prompt: 'What major documents should I verify before buying a flat in an under-construction project?',
  },
  {
    icon: FileText,
    title: 'RTI Application',
    prompt: 'Draft an RTI application to get the status of my pending government scheme benefits.',
  },
  {
    icon: Users,
    title: 'Family & Marriage',
    prompt: 'What are the legal requirements for a mutual consent divorce and how long does it take?',
  },
];

export function EmptyChat({ onStartChat }: EmptyChatProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="max-w-2xl w-full text-center space-y-10">
        {/* Logo & Title */}
        <div className="flex flex-col items-center gap-5">
          <div className="p-5 bg-primary rounded-2xl shadow-lg">
            <Scale className="w-12 h-12 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-4xl font-serif font-bold text-foreground">
              Welcome to ACTRIGHT
            </h1>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto text-lg leading-relaxed">
              Your trusted AI legal assistant for Indian law. Ask any legal question and get structured, helpful guidance.
            </p>
          </div>
        </div>

        {/* Suggestion Cards */}
        <div className="grid sm:grid-cols-2 gap-3 max-w-xl mx-auto">
          {suggestions.map((item) => (
            <button
              key={item.title}
              onClick={() => onStartChat(item.prompt)}
              className="group flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted/30 hover:border-primary/20 hover:shadow-md transition-all text-left"
            >
              <div className="p-2.5 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors shrink-0">
                <item.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {item.prompt}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          ))}
        </div>

        {/* Info */}
        <div className="flex items-center justify-center gap-5 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            AI Powered
          </span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
          <span>24/7 Available</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
          <span>100% Confidential</span>
        </div>
      </div>
    </div>
  );
}