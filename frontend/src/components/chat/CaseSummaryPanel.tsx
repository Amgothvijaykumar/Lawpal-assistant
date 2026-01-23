import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  X, 
  FileText, 
  Calendar, 
  AlertTriangle, 
  Clock,
  User,
  Gavel,
  MapPin,
  IndianRupee,
  Download,
  Share,
  Eye
} from 'lucide-react';

interface CaseSummaryPanelProps {
  chatId: string;
  onClose: () => void;
}

interface CaseSummary {
  issueType: string;
  caseCategory: string;
  description: string;
  estimatedValue?: number;
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  location: string;
  keyDates: {
    filed: Date;
    nextHearing?: Date;
    deadline?: Date;
  };
  documents: {
    id: string;
    name: string;
    type: string;
    uploadedAt: Date;
    status: 'analyzed' | 'pending' | 'processing';
  }[];
  keyQuestions: string[];
  riskFactors: string[];
  recommendations: string[];
  timeline: {
    date: Date;
    event: string;
    description: string;
  }[];
}

export function CaseSummaryPanel({ chatId, onClose }: CaseSummaryPanelProps) {
  const [summary, setSummary] = useState<CaseSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data - replace with actual API call
    setTimeout(() => {
      setSummary({
        issueType: 'Property Dispute',
        caseCategory: 'Civil Law',
        description: 'Dispute over property ownership between siblings regarding inherited family property in Mumbai.',
        estimatedValue: 2500000,
        urgency: 'medium',
        location: 'Mumbai, Maharashtra',
        keyDates: {
          filed: new Date('2024-01-15'),
          nextHearing: new Date('2024-02-15'),
          deadline: new Date('2024-03-01')
        },
        documents: [
          {
            id: '1',
            name: 'Property_Deed.pdf',
            type: 'Legal Document',
            uploadedAt: new Date('2024-01-10'),
            status: 'analyzed'
          },
          {
            id: '2',
            name: 'Will_Testament.pdf',
            type: 'Will',
            uploadedAt: new Date('2024-01-12'),
            status: 'analyzed'
          },
          {
            id: '3',
            name: 'Property_Valuation.pdf',
            type: 'Evidence',
            uploadedAt: new Date('2024-01-14'),
            status: 'pending'
          }
        ],
        keyQuestions: [
          'Who has the original property deed?',
          'Were all heirs mentioned in the will?',
          'Has the property been registered?',
          'Are there any outstanding dues on the property?'
        ],
        riskFactors: [
          'Missing original documents',
          'Potential counter-claims from other parties',
          'Property valuation disputes'
        ],
        recommendations: [
          'Gather all original property documents',
          'Get current market valuation',
          'Consider mediation before court proceedings',
          'Verify property registration status'
        ],
        timeline: [
          {
            date: new Date('2024-01-10'),
            event: 'Case Filed',
            description: 'Initial consultation and case documentation started'
          },
          {
            date: new Date('2024-01-12'),
            event: 'Documents Uploaded',
            description: 'Property deed and will uploaded for analysis'
          },
          {
            date: new Date('2024-01-15'),
            event: 'Lawyer Assigned',
            description: 'Adv. Priya Sharma assigned to the case'
          }
        ]
      });
      setLoading(false);
    }, 1000);
  }, [chatId]);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      case 'high': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'low': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'analyzed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'processing': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="h-full p-6 flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="h-full p-6 flex items-center justify-center text-slate-500">
        <p>No case summary available</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-200/60 dark:border-slate-700/60">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Gavel className="w-5 h-5 text-blue-600" />
            Case Summary
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-sm text-slate-500 mt-1">AI-Generated Overview</p>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {/* Basic Info */}
          <Card className="border-slate-200/60 dark:border-slate-700/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Case Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-slate-500 mb-1">Issue Type</p>
                <Badge variant="outline" className="text-xs">
                  {summary.issueType}
                </Badge>
              </div>
              
              <div>
                <p className="text-xs text-slate-500 mb-1">Category</p>
                <Badge className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  {summary.caseCategory}
                </Badge>
              </div>
              
              <div>
                <p className="text-xs text-slate-500 mb-1">Urgency</p>
                <Badge className={`text-xs capitalize ${getUrgencyColor(summary.urgency)}`}>
                  {summary.urgency}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <MapPin className="w-4 h-4" />
                <span>{summary.location}</span>
              </div>
              
              {summary.estimatedValue && (
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <IndianRupee className="w-4 h-4" />
                  <span>₹{summary.estimatedValue.toLocaleString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description */}
          <Card className="border-slate-200/60 dark:border-slate-700/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {summary.description}
              </p>
            </CardContent>
          </Card>

          {/* Important Dates */}
          <Card className="border-slate-200/60 dark:border-slate-700/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Important Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Filed:</span>
                <span className="text-slate-900 dark:text-slate-100">
                  {summary.keyDates.filed.toLocaleDateString()}
                </span>
              </div>
              {summary.keyDates.nextHearing && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Next Hearing:</span>
                  <span className="text-orange-600 dark:text-orange-400 font-medium">
                    {summary.keyDates.nextHearing.toLocaleDateString()}
                  </span>
                </div>
              )}
              {summary.keyDates.deadline && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Deadline:</span>
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    {summary.keyDates.deadline.toLocaleDateString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card className="border-slate-200/60 dark:border-slate-700/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Uploaded Documents ({summary.documents.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {summary.documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {doc.name}
                    </p>
                    <p className="text-xs text-slate-500">{doc.type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${getStatusColor(doc.status)}`}>
                      {doc.status}
                    </Badge>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Key Questions */}
          <Card className="border-slate-200/60 dark:border-slate-700/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Key Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {summary.keyQuestions.map((question, index) => (
                  <li key={index} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    {question}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Risk Factors */}
          <Card className="border-slate-200/60 dark:border-slate-700/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                Risk Factors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {summary.riskFactors.map((risk, index) => (
                  <li key={index} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                    <span className="text-orange-500 mt-1">⚠</span>
                    {risk}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card className="border-slate-200/60 dark:border-slate-700/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {summary.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="border-slate-200/60 dark:border-slate-700/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {summary.timeline.map((event, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {event.event}
                      </p>
                      <p className="text-xs text-slate-500">
                        {event.date.toLocaleDateString()}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {event.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-200/60 dark:border-slate-700/60">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1">
            <Share className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button size="sm" className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
    </div>
  );
}