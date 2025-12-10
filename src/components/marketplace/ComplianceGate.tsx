import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabaseClient } from '@/lib/supabaseClient';
import { Shield, AlertTriangle, CheckCircle, FileText, Upload } from 'lucide-react';

interface ComplianceGateProps {
  children: React.ReactNode;
  requireCompliance?: boolean;
}

export const ComplianceGate = ({ children, requireCompliance = true }: ComplianceGateProps) => {
  const [isCompliant, setIsCompliant] = useState(false);
  const [loading, setLoading] = useState(true);
  interface Document {
    document_type: string;
    verification_status: string;
  }
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    checkCompliance();
  }, []);

  const checkCompliance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('due_diligence_documents')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const requiredTypes = [
        'business_registration',
        'tax_clearance', 
        'bank_statement',
        'identity_document',
        'address_proof'
      ];

      const verifiedDocs = data?.filter(doc => 
        doc.verification_status === 'verified' || doc.verification_status === 'pending'
      ) || [];

      const hasAllRequired = requiredTypes.every(type => 
        verifiedDocs.some(doc => doc.document_type === type)
      );

      setIsCompliant(hasAllRequired);
      setDocuments(data || []);
    } catch (error) {
      console.error('Error checking compliance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Checking compliance status...</span>
      </div>
    );
  }

  if (!requireCompliance || isCompliant) {
    return <>{children}</>;
  }

  const requiredDocs = [
    { type: 'business_registration', label: 'Business Registration' },
    { type: 'tax_clearance', label: 'ZRA Tax Clearance' },
    { type: 'bank_statement', label: 'Bank Statement' },
    { type: 'identity_document', label: 'Identity Document' },
    { type: 'address_proof', label: 'Proof of Address' }
  ];

  const getDocumentStatus = (type: string) => {
    const doc = documents.find((d) => d.document_type === type);
    if (!doc) return 'missing';
    return doc.verification_status;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-600">
            <Shield className="w-6 h-6" />
            Due Diligence Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              You must complete due diligence verification before offering products or services. 
              This ensures marketplace integrity and compliance with Zambian regulations.
            </AlertDescription>
          </Alert>

          <div className="space-y-4 mb-6">
            <h4 className="font-semibold">Required Documents:</h4>
            <div className="grid gap-3">
              {requiredDocs.map(doc => {
                const status = getDocumentStatus(doc.type);
                return (
                  <div key={doc.type} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span>{doc.label}</span>
                    </div>
                    <Badge 
                      className={
                        status === 'verified' ? 'bg-green-100 text-green-800' :
                        status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }
                    >
                      {status === 'missing' ? 'Not Uploaded' : status}
                      {status === 'verified' && <CheckCircle className="w-3 h-3 ml-1" />}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-center">
            <Button 
              onClick={() => window.location.href = '/profile-setup?tab=documents'}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Required Documents
            </Button>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h5 className="font-semibold text-blue-900 mb-2">Why Due Diligence?</h5>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Ensures all service providers are legitimate businesses</li>
              <li>• Maintains compliance with ZRA tax requirements</li>
              <li>• Protects buyers and builds marketplace trust</li>
              <li>• Enables secure payment processing through Lenco</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};