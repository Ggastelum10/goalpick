import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  useLegalDocuments,
  useCreateLegalDocument,
  usePublishLegalDocument,
  useUploadLegalPdf,
  useLegalAcceptanceStatus,
  type LegalDocument,
} from '@/hooks/useLegalDocuments';
import { FileText, Upload, Eye, Send, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

export function AdminLegal() {
  const [documentType, setDocumentType] = useState<string>('terms_and_conditions');
  const { data: documents, isLoading } = useLegalDocuments(documentType);
  const createDocument = useCreateLegalDocument();
  const publishDocument = usePublishLegalDocument();
  const uploadPdf = useUploadLegalPdf();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadLanguage, setUploadLanguage] = useState('en');
  const [viewDoc, setViewDoc] = useState<LegalDocument | null>(null);

  // Find current (latest published) document
  const currentDoc = documents?.find(d => d.published_at !== null);

  const { data: acceptanceData } = useLegalAcceptanceStatus(currentDoc?.id);

  const signedCount = acceptanceData?.signedCount ?? 0;
  const totalCount = acceptanceData?.totalCount ?? 0;
  const acceptanceStatus = acceptanceData?.entries;

  const handleCreate = async (publish: boolean) => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    let fileUrl: string | null = null;
    if (pdfFile) {
      try {
        fileUrl = await uploadPdf.mutateAsync({ file: pdfFile, documentType });
      } catch {
        toast.error('Failed to upload PDF');
        return;
      }
    }

    try {
      await createDocument.mutateAsync({
        document_type: documentType,
        title: title.trim(),
        content: content.trim(),
        file_url: fileUrl,
        publish,
        language: uploadLanguage,
      });
      toast.success(publish ? 'Document published!' : 'Draft saved!');
      setTitle('');
      setContent('');
      setPdfFile(null);
    } catch {
      toast.error('Failed to save document');
    }
  };

  const handlePublish = async (docId: string) => {
    try {
      await publishDocument.mutateAsync(docId);
      toast.success('Document published!');
    } catch {
      toast.error('Failed to publish');
    }
  };

  const isBusy = createDocument.isPending || uploadPdf.isPending || publishDocument.isPending;

  const getLangInfo = (code: string) => LANGUAGE_OPTIONS.find(l => l.code === code) || LANGUAGE_OPTIONS[0];

  return (
    <div className="space-y-6">
      {/* Document Type Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Legal Document Management
          </CardTitle>
          <CardDescription>Upload and manage Terms & Conditions and Privacy Policy with version control</CardDescription>
        </CardHeader>
        <CardContent>
          <Label className="mb-2 block">Document Type</Label>
          <Select value={documentType} onValueChange={setDocumentType}>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="terms_and_conditions">Terms & Conditions</SelectItem>
              <SelectItem value="privacy_policy">Privacy Policy</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Version History */}
      <Card>
        <CardHeader>
          <CardTitle>Version History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : documents && documents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map(doc => {
                  const langInfo = getLangInfo((doc as any).language || 'en');
                  return (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">v{doc.version}</TableCell>
                      <TableCell>{doc.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <span>{langInfo.flag}</span> {langInfo.code.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {doc.published_at ? (
                          <Badge className="bg-green-600/20 text-green-600 border-green-600/30">
                            <CheckCircle className="h-3 w-3 mr-1" /> Published
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Clock className="h-3 w-3 mr-1" /> Draft
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(doc.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setViewDoc(doc)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>{doc.title} (v{doc.version})</DialogTitle>
                            </DialogHeader>
                            <div className="whitespace-pre-wrap text-sm text-muted-foreground mt-2">
                              {doc.content || '(No text content — PDF only)'}
                            </div>
                            {doc.file_url && (
                              <a
                                href={doc.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline text-sm mt-2 inline-block"
                              >
                                View PDF
                              </a>
                            )}
                          </DialogContent>
                        </Dialog>
                        {!doc.published_at && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePublish(doc.id)}
                            disabled={isBusy}
                          >
                            <Send className="h-4 w-4 mr-1" /> Publish
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm py-4 text-center">No documents yet. Upload the first version below.</p>
          )}
        </CardContent>
      </Card>

      {/* Upload New Version */}
      <Card>
        <CardHeader>
          <CardTitle>Upload New Version</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="doc-title">Title</Label>
              <Input
                id="doc-title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Terms & Conditions v3"
              />
            </div>
            <div>
              <Label>Language</Label>
              <div className="flex gap-2 mt-1">
                {LANGUAGE_OPTIONS.map(lang => (
                  <Button
                    key={lang.code}
                    type="button"
                    variant={uploadLanguage === lang.code ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setUploadLanguage(lang.code)}
                    className="gap-1.5"
                  >
                    <span>{lang.flag}</span> {lang.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <Label htmlFor="doc-content">Content</Label>
            <Textarea
              id="doc-content"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Paste the full legal text here..."
              rows={10}
            />
          </div>
          <div>
            <Label htmlFor="doc-pdf">Upload PDF (optional)</Label>
            <Input
              id="doc-pdf"
              type="file"
              accept=".pdf"
              onChange={e => setPdfFile(e.target.files?.[0] || null)}
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => handleCreate(false)} disabled={isBusy}>
              {isBusy && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Save Draft
            </Button>
            <Button onClick={() => handleCreate(true)} disabled={isBusy}>
              {isBusy && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              <Upload className="h-4 w-4 mr-1" /> Publish Now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Acceptance Status */}
      {currentDoc && (
        <Card>
          <CardHeader>
            <CardTitle>
              Acceptance Status — {currentDoc.title} (v{currentDoc.version})
            </CardTitle>
            <CardDescription>
              {signedCount} of {totalCount} users have signed
            </CardDescription>
          </CardHeader>
          <CardContent>
            {acceptanceStatus && acceptanceStatus.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {acceptanceStatus.map(user => (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback>{user.display_name?.charAt(0) || '?'}</AvatarFallback>
                          </Avatar>
                          <span>{user.display_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.accepted_at ? (
                          <Badge className="bg-green-600/20 text-green-600 border-green-600/30">Signed</Badge>
                        ) : (
                          <Badge variant="destructive">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {user.accepted_at ? format(new Date(user.accepted_at), 'MMM dd, yyyy') : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-sm py-4 text-center">No users found.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
