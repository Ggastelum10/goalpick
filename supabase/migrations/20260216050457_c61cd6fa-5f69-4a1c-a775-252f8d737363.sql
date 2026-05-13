
-- Add language column
ALTER TABLE public.legal_documents 
  ADD COLUMN language TEXT NOT NULL DEFAULT 'en';

-- Update get_current_legal_documents to accept language param
CREATE OR REPLACE FUNCTION public.get_current_legal_documents(p_language TEXT DEFAULT 'en')
  RETURNS SETOF legal_documents
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT DISTINCT ON (document_type) *
  FROM public.legal_documents
  WHERE published_at IS NOT NULL
    AND language = p_language
  ORDER BY document_type, version DESC;
$$;

-- Update get_pending_legal_documents to accept language param
CREATE OR REPLACE FUNCTION public.get_pending_legal_documents(p_language TEXT DEFAULT 'en')
  RETURNS SETOF legal_documents
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT d.*
  FROM (
    SELECT DISTINCT ON (document_type) *
    FROM public.legal_documents
    WHERE published_at IS NOT NULL
      AND language = p_language
    ORDER BY document_type, version DESC
  ) d
  WHERE NOT EXISTS (
    SELECT 1 FROM public.legal_acceptances a
    WHERE a.document_id = d.id AND a.user_id = auth.uid()
  );
$$;
