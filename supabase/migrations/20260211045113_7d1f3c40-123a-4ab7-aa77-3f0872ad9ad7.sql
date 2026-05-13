
-- Create legal_documents table
CREATE TABLE public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL CHECK (document_type IN ('terms_and_conditions', 'privacy_policy')),
  version integer NOT NULL,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  file_url text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  UNIQUE (document_type, version)
);

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view legal documents"
  ON public.legal_documents FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert legal documents"
  ON public.legal_documents FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update legal documents"
  ON public.legal_documents FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Create legal_acceptances table
CREATE TABLE public.legal_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  document_id uuid NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  UNIQUE (user_id, document_id)
);

ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own acceptances"
  ON public.legal_acceptances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own acceptances"
  ON public.legal_acceptances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all acceptances"
  ON public.legal_acceptances FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Function: get current (latest published) legal documents per type
CREATE OR REPLACE FUNCTION public.get_current_legal_documents()
RETURNS SETOF public.legal_documents
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (document_type) *
  FROM public.legal_documents
  WHERE published_at IS NOT NULL
  ORDER BY document_type, version DESC;
$$;

-- Function: get pending legal documents for the current user
CREATE OR REPLACE FUNCTION public.get_pending_legal_documents()
RETURNS SETOF public.legal_documents
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.*
  FROM (
    SELECT DISTINCT ON (document_type) *
    FROM public.legal_documents
    WHERE published_at IS NOT NULL
    ORDER BY document_type, version DESC
  ) d
  WHERE NOT EXISTS (
    SELECT 1 FROM public.legal_acceptances a
    WHERE a.document_id = d.id AND a.user_id = auth.uid()
  );
$$;

-- Storage bucket for legal document PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('legal-documents', 'legal-documents', true);

CREATE POLICY "Anyone can view legal documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'legal-documents');

CREATE POLICY "Admins can upload legal documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'legal-documents' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update legal documents storage"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'legal-documents' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete legal documents storage"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'legal-documents' AND has_role(auth.uid(), 'admin'));
