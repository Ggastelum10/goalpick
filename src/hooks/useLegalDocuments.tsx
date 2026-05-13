import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useLanguage } from './useLanguage';

export interface LegalDocument {
  id: string;
  document_type: string;
  version: number;
  title: string;
  content: string;
  file_url: string | null;
  published_at: string | null;
  created_at: string;
  created_by: string;
  language: string;
}

// Fetch all documents for a given type (admin view)
export function useLegalDocuments(documentType: string) {
  return useQuery({
    queryKey: ['legal-documents', documentType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('legal_documents')
        .select('*')
        .eq('document_type', documentType)
        .order('version', { ascending: false });
      if (error) throw error;
      return data as LegalDocument[];
    },
  });
}

// Fetch current (latest published) documents per type for a given language
export function useCurrentLegalDocuments() {
  const { currentLanguage } = useLanguage();
  return useQuery({
    queryKey: ['legal-documents', 'current', currentLanguage],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_current_legal_documents', { p_language: currentLanguage });
      if (error) throw error;
      return data as LegalDocument[];
    },
  });
}

// Fetch pending (unsigned) legal documents for current user in their language
export function usePendingLegalDocuments() {
  const { session } = useAuth();
  const { currentLanguage } = useLanguage();
  return useQuery({
    queryKey: ['legal-documents', 'pending', session?.user?.id, currentLanguage],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_pending_legal_documents', { p_language: currentLanguage });
      if (error) throw error;
      return data as LegalDocument[];
    },
    enabled: !!session?.user?.id,
  });
}

// Create a new legal document version
export function useCreateLegalDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (doc: {
      document_type: string;
      title: string;
      content: string;
      file_url?: string | null;
      publish: boolean;
      language: string;
    }) => {
      const { data: existing } = await supabase
        .from('legal_documents')
        .select('version')
        .eq('document_type', doc.document_type)
        .eq('language', doc.language)
        .order('version', { ascending: false })
        .limit(1);

      const nextVersion = (existing && existing.length > 0 ? existing[0].version : 0) + 1;

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('legal_documents')
        .insert({
          document_type: doc.document_type,
          version: nextVersion,
          title: doc.title,
          content: doc.content,
          file_url: doc.file_url || null,
          published_at: doc.publish ? new Date().toISOString() : null,
          created_by: user.user.id,
          language: doc.language,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['legal-documents', variables.document_type] });
      queryClient.invalidateQueries({ queryKey: ['legal-documents', 'current'] });
      queryClient.invalidateQueries({ queryKey: ['legal-documents', 'pending'] });
    },
  });
}

// Publish a draft document
export function usePublishLegalDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from('legal_documents')
        .update({ published_at: new Date().toISOString() })
        .eq('id', documentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-documents'] });
    },
  });
}

// Accept a legal document
export function useAcceptLegalDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (documentId: string) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('legal_acceptances')
        .insert({
          user_id: user.user.id,
          document_id: documentId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-documents', 'pending'] });
    },
  });
}

// Upload a PDF to storage
export function useUploadLegalPdf() {
  return useMutation({
    mutationFn: async ({ file, documentType }: { file: File; documentType: string }) => {
      const fileName = `${documentType}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage
        .from('legal-documents')
        .upload(fileName, file, { upsert: false });
      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('legal-documents')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    },
  });
}

const ACCEPTANCE_PAGE_SIZE = 50;

// Paginated acceptance status for a document (admin view)
export function useLegalAcceptanceStatus(
  documentId: string | undefined,
  page: number = 0,
  filter: 'all' | 'signed' | 'pending' = 'all',
  search?: string
) {
  return useQuery({
    queryKey: ['legal-acceptances', documentId, page, filter, search],
    queryFn: async () => {
      if (!documentId) return { entries: [], totalCount: 0, signedCount: 0, pageSize: ACCEPTANCE_PAGE_SIZE };

      const { count: totalCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: signedCount } = await supabase
        .from('legal_acceptances')
        .select('*', { count: 'exact', head: true })
        .eq('document_id', documentId);

      const { data: acceptances, error: accError } = await supabase
        .from('legal_acceptances')
        .select('user_id, accepted_at')
        .eq('document_id', documentId);
      if (accError) throw accError;

      const acceptanceMap = new Map(
        (acceptances || []).map(a => [a.user_id, a.accepted_at])
      );

      let profileQuery = supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url');

      if (search) {
        profileQuery = profileQuery.ilike('display_name', `%${search}%`);
      }

      const from = page * ACCEPTANCE_PAGE_SIZE;
      const to = from + ACCEPTANCE_PAGE_SIZE - 1;

      const { data: profiles, error: profilesError } = await profileQuery
        .order('display_name', { ascending: true })
        .range(from, to);

      if (profilesError) throw profilesError;

      let entries = (profiles || []).map(p => ({
        user_id: p.user_id,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        accepted_at: acceptanceMap.get(p.user_id) || null,
      }));

      if (filter === 'signed') {
        entries = entries.filter(e => e.accepted_at !== null);
      } else if (filter === 'pending') {
        entries = entries.filter(e => e.accepted_at === null);
      }

      return {
        entries,
        totalCount: totalCount || 0,
        signedCount: signedCount || 0,
        pageSize: ACCEPTANCE_PAGE_SIZE,
      };
    },
    enabled: !!documentId,
  });
}
