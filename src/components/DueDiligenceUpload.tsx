import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { Upload, FileText, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface Document {
  id: string;
  document_type: string;
  document_name: string;
  file_url: string;
  verification_status: string;
  expiry_date?: string;
  created_at: string;
}

const REQUIRED_DOCUMENTS = [
  { type: 'business_registration', label: 'Business Registration Certificate', required: true },
  { type: 'tax_clearance', label: 'ZRA Tax Clearance Certificate', required: true },
  { type: 'professional_license', label: 'Professional License/Certification', required: false },
  { type: 'insurance_certificate', label: 'Professional Indemnity Insurance', required: false },
  { type: 'bank_statement', label: 'Bank Statement (Last 3 months)', required: true },
  { type: 'identity_document', label: 'National ID/Passport', required: true },
  { type: 'address_proof', label: 'Proof of Address', required: true }
];

export const DueDiligenceUpload = ({ onComplianceChange }: { onComplianceChange?: (isCompliant: boolean) => void }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [expiryDate, setExpiryDate] = useState('');

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    checkCompliance();
  }, [documents, checkCompliance]);

  const loadDocuments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('due_diligence_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const checkCompliance = useCallback(() => {
    const requiredDocs = REQUIRED_DOCUMENTS.filter(doc => doc.required);
    const uploadedRequiredDocs = requiredDocs.filter(reqDoc => 
      documents.some(doc => 
        doc.document_type === reqDoc.type && 
        doc.verification_status !== 'rejected'
      )
    );
    
    const isCompliant = uploadedRequiredDocs.length === requiredDocs.length;
    onComplianceChange?.(isCompliant);
  }, [documents, onComplianceChange]);

  const handleFileUpload = async () => {
    if (!selectedFile || !selectedType) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload file to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${selectedType}_${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      // Save document record
      const { error: insertError } = await supabase
        .from('due_diligence_documents')
        .insert({
          user_id: user.id,
          document_type: selectedType,
          document_name: selectedFile.name,
          file_url: publicUrl,
          expiry_date: expiryDate || null
        });

      if (insertError) throw insertError;

      // Reset form
      setSelectedFile(null);
      setSelectedType('');
      setExpiryDate('');
      
      // Reload documents
      await loadDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
    } finally {
      setUploading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-600" />;
      default: return <AlertTriangle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      verified: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };
    return variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800';
  };

  const requiredDocsCount = REQUIRED_DOCUMENTS.filter(doc => doc.required).length;
  const uploadedRequiredCount = REQUIRED_DOCUMENTS.filter(doc => 
    doc.required && documents.some(uploaded => uploaded.document_type === doc.type)
  ).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Due Diligence Documentation
          </CardTitle>
          <div className="text-sm text-gray-600">
            Upload required documents to verify your business and enable marketplace access
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Compliance Progress</span>
              <span className="text-sm text-gray-600">
                {uploadedRequiredCount}/{requiredDocsCount} Required Documents
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(uploadedRequiredCount / requiredDocsCount) * 100}%` }}
              />
            </div>
          </div>

          {uploadedRequiredCount < requiredDocsCount && (
            <Alert className="mb-6">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                You must upload all required documents before you can offer products or services on the marketplace.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-4">Upload New Document</h4>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="document-type">Document Type</Label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      {REQUIRED_DOCUMENTS.map(doc => (
                        <SelectItem key={doc.type} value={doc.type}>
                          {doc.label} {doc.required && '*'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="file-upload">Document File</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                </div>

                <div>
                  <Label htmlFor="expiry-date">Expiry Date (if applicable)</Label>
                  <Input
                    id="expiry-date"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />
                </div>

                <Button 
                  onClick={handleFileUpload}
                  disabled={!selectedFile || !selectedType || uploading}
                  className="w-full"
                >
                  {uploading ? (
                    <>
                      <Upload className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Document
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Uploaded Documents</h4>
              <div className="space-y-3">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(doc.verification_status)}
                      <div>
                        <div className="font-medium text-sm">{doc.document_name}</div>
                        <div className="text-xs text-gray-500">
                          {REQUIRED_DOCUMENTS.find(rd => rd.type === doc.document_type)?.label}
                        </div>
                      </div>
                    </div>
                    <Badge className={getStatusBadge(doc.verification_status)}>
                      {doc.verification_status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};