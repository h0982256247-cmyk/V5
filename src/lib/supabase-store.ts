import { supabase } from '@/integrations/supabase/client';
import { Template, Doc, ShareLink, Asset, TemplateSchema } from '@/types/schema';

// 產生隨機 token
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper to convert DB row to Template
function dbToTemplate(row: any): Template {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    status: row.status as 'draft' | 'published',
    version: row.version,
    templateText: row.template_text,
    schema: row.schema as TemplateSchema,
    sampleData: row.sample_data as Record<string, unknown> | undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// Helper to convert DB row to Doc
function dbToDoc(row: any, template?: Template): Doc {
  return {
    id: row.id,
    title: row.title,
    templateId: row.template_id,
    data: row.data as Record<string, unknown>,
    mode: row.mode as 'single' | 'carousel',
    status: row.status as 'draft' | 'published',
    previewJson: (row.preview_json as any) || undefined,
    isValid: row.is_valid ?? undefined,
    validationErrors: (row.validation_errors as any) || undefined,
    lastValidatedAt: row.last_validated_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    template
  };
}

// Helper to convert DB row to ShareLink
function dbToShareLink(row: any): ShareLink {
  return {
    token: row.token,
    docId: row.doc_id,
    expiresAt: row.expires_at || undefined,
    createdAt: row.created_at,
    lastAccessedAt: row.last_accessed_at || undefined,
    accessCount: row.access_count
  };
}

// Templates API
export const templatesStore = {
  getAll: async (): Promise<Template[]> => {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching templates:', error);
      return [];
    }

    return (data || []).map(dbToTemplate);
  },

  getById: async (id: string): Promise<Template | null> => {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      console.error('Error fetching template:', error);
      return null;
    }

    return dbToTemplate(data);
  },

  create: async (template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>): Promise<Template | null> => {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('templates')
      .insert([{
        name: template.name,
        description: template.description,
        status: template.status,
        version: template.version,
        template_text: template.templateText,
        schema: template.schema as any,
        sample_data: template.sampleData as any,
        created_by: user?.id
      }])
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating template:', error);
      return null;
    }

    return dbToTemplate(data);
  },

  update: async (id: string, updates: Partial<Template>): Promise<Template | null> => {
    const updateData: Record<string, any> = {};
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.version !== undefined) updateData.version = updates.version;
    if (updates.templateText !== undefined) updateData.template_text = updates.templateText;
    if (updates.schema !== undefined) updateData.schema = updates.schema;
    if (updates.sampleData !== undefined) updateData.sample_data = updates.sampleData;

    const { data, error } = await supabase
      .from('templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('Error updating template:', error);
      return null;
    }

    return dbToTemplate(data);
  },

  delete: async (id: string): Promise<boolean> => {
    // Check if any docs use this template
    const { data: docs } = await supabase
      .from('docs')
      .select('id')
      .eq('template_id', id)
      .limit(1);

    if (docs && docs.length > 0) {
      return false;
    }

    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting template:', error);
      return false;
    }

    return true;
  },

  publish: async (id: string): Promise<Template | null> => {
    const template = await templatesStore.getById(id);
    if (!template) return null;

    return templatesStore.update(id, {
      status: 'published',
      version: template.version + 1
    });
  }
};

// Docs API
export const docsStore = {
  getAll: async (): Promise<Doc[]> => {
    const { data, error } = await supabase
      .from('docs')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching docs:', error);
      return [];
    }

    return (data || []).map((row) => dbToDoc(row));
  },

  getById: async (id: string): Promise<Doc | null> => {
    const { data, error } = await supabase
      .from('docs')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      console.error('Error fetching doc:', error);
      return null;
    }

    return dbToDoc(data);
  },

  getWithTemplate: async (id: string): Promise<(Doc & { template: Template }) | null> => {
    const { data, error } = await supabase
      .from('docs')
      .select(`
        *,
        templates (*)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      console.error('Error fetching doc with template:', error);
      return null;
    }

    const template = dbToTemplate(data.templates);
    return { ...dbToDoc(data), template };
  },

  create: async (doc: Omit<Doc, 'id' | 'createdAt' | 'updatedAt'>): Promise<Doc | null> => {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('docs')
      .insert([{
        title: doc.title,
        template_id: doc.templateId,
        data: doc.data as any,
        mode: doc.mode,
        status: doc.status,
        created_by: user?.id
      }])
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating doc:', error);
      return null;
    }

    return dbToDoc(data);
  },

  update: async (id: string, updates: Partial<Doc>): Promise<Doc | null> => {
    const updateData: Record<string, any> = {};
    
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.data !== undefined) updateData.data = updates.data;
    if (updates.mode !== undefined) updateData.mode = updates.mode;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.previewJson !== undefined) updateData.preview_json = updates.previewJson as any;
    if (updates.validationErrors !== undefined) updateData.validation_errors = updates.validationErrors as any;
    if (updates.isValid !== undefined) updateData.is_valid = updates.isValid;
    if (updates.lastValidatedAt !== undefined) updateData.last_validated_at = updates.lastValidatedAt;

    const { data, error } = await supabase
      .from('docs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('Error updating doc:', error);
      return null;
    }

    return dbToDoc(data);
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('docs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting doc:', error);
      return false;
    }

    return true;
  },

  publish: async (id: string): Promise<{ doc: Doc; shareLink: ShareLink } | null> => {
    const doc = await docsStore.getById(id);
    if (!doc) return null;

    const updatedDoc = await docsStore.update(id, { status: 'published' });
    if (!updatedDoc) return null;

    // Get or create ShareLink
    let shareLink = await shareLinksStore.getByDocId(id);
    if (!shareLink) {
      shareLink = await shareLinksStore.create(id);
    }

    if (!shareLink) return null;

    return { doc: updatedDoc, shareLink };
  },

  /**
   * Publish with precomputed preview json + validation results.
   * Used to guarantee /share uses safe compiled JSON.
   */
  publishValidated: async (
    id: string,
    payload: { previewJson: any; validationErrors: any[] }
  ): Promise<{ doc: Doc; shareLink: ShareLink } | null> => {
    const updatedDoc = await docsStore.update(id, {
      status: 'published',
      previewJson: payload.previewJson,
      validationErrors: payload.validationErrors,
      isValid: payload.validationErrors.length === 0,
      lastValidatedAt: new Date().toISOString()
    });
    if (!updatedDoc) return null;

    // Get or create ShareLink
    let shareLink = await shareLinksStore.getByDocId(id);
    if (!shareLink) {
      shareLink = await shareLinksStore.create(id);
    }
    if (!shareLink) return null;

    return { doc: updatedDoc, shareLink };
  }
};

// ShareLinks API
export const shareLinksStore = {
  getByToken: async (token: string): Promise<ShareLink | null> => {
    const { data, error } = await supabase
      .from('share_links')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    // Check expiration
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return null;
    }

    return dbToShareLink(data);
  },

  getByDocId: async (docId: string): Promise<ShareLink | null> => {
    const { data, error } = await supabase
      .from('share_links')
      .select('*')
      .eq('doc_id', docId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return dbToShareLink(data);
  },

  create: async (docId: string, expiresAt?: string): Promise<ShareLink | null> => {
    const { data, error } = await supabase
      .from('share_links')
      .insert([{
        token: generateToken(),
        doc_id: docId,
        expires_at: expiresAt || null
      }])
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating share link:', error);
      return null;
    }

    return dbToShareLink(data);
  },

  recordAccess: async (token: string): Promise<void> => {
    // Use the security definer function
    await supabase.rpc('record_share_link_access', { p_token: token });
  }
};

// Assets API
export const assetsStore = {
  getAll: async (): Promise<Asset[]> => {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching assets:', error);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      type: row.type as 'image',
      url: row.url,
      width: row.width || undefined,
      height: row.height || undefined,
      createdAt: row.created_at
    }));
  },

  create: async (asset: Omit<Asset, 'id' | 'createdAt'>): Promise<Asset | null> => {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('assets')
      .insert([{
        type: asset.type,
        url: asset.url,
        width: asset.width,
        height: asset.height,
        created_by: user?.id
      }])
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating asset:', error);
      return null;
    }

    return {
      id: data.id,
      type: data.type as 'image',
      url: data.url,
      width: data.width || undefined,
      height: data.height || undefined,
      createdAt: data.created_at
    };
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting asset:', error);
      return false;
    }

    return true;
  }
};

// Upload helpers (Supabase Storage -> public URL -> assets table)
// Requires Storage bucket 'assets' (public) and RLS allowing admin write.
export const storageStore = {
  uploadImageToAssetsBucket: async (
    file: File,
    opts?: { folder?: string; upsert?: boolean }
  ): Promise<{ url: string; width?: number; height?: number; assetId?: string } | null> => {
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;

      const userId = userData.user?.id;
      if (!userId) {
        throw new Error('Not authenticated');
      }
      const folder = opts?.folder || userId;
      const upsert = opts?.upsert ?? false;

      // Best-effort read of image dimensions
      let width: number | undefined;
      let height: number | undefined;
      try {
        // createImageBitmap is supported in modern browsers
        const bmp = await createImageBitmap(file);
        width = bmp.width;
        height = bmp.height;
        bmp.close?.();
      } catch {
        // ignore
      }

      const ext = (() => {
        const byName = file.name.split('.').pop()?.toLowerCase();
        if (byName && byName.length <= 6) return byName;
        const byType = file.type.split('/').pop()?.toLowerCase();
        return byType || 'png';
      })();

      const filename = `${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}.${ext}`;
      const path = `${folder}/${Date.now()}-${filename}`;

      const { error: uploadErr } = await supabase
        .storage
        .from('assets')
        .upload(path, file, {
          upsert,
          contentType: file.type || undefined,
          cacheControl: '3600'
        });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase
        .storage
        .from('assets')
        .getPublicUrl(path);

      const url = urlData.publicUrl;

      // Record in assets table (best-effort; don't fail the whole upload if insert fails)
      const created = await assetsStore.create({
        type: 'image',
        url,
        width,
        height
      });

      return { url, width, height, assetId: created?.id };
    } catch (e) {
      console.error('uploadImageToAssetsBucket failed:', e);
      return null;
    }
  }
};

// Public API for share page (no auth required)
export const publicStore = {
  getDocByToken: async (token: string): Promise<{ doc: Doc; template: Template; shareLink: ShareLink } | null> => {
    // Use a Security Definer RPC so the share page can work without any public table SELECT policies.
    const { data, error } = await supabase.rpc('get_public_doc_by_token', { p_token: token });

    if (error || !data) {
      return null;
    }

    const payload = data as any;
    const linkData = payload.share_link;
    const docData = payload.doc;
    const tplData = payload.template;

    // Check expiration (defense-in-depth, even though RPC already checks)
    if (linkData?.expires_at && new Date(linkData.expires_at) < new Date()) {
      return null;
    }

    const template = dbToTemplate(tplData);
    const doc = dbToDoc(docData, template);
    const shareLink = dbToShareLink(linkData);

    return { doc, template, shareLink };
  },

  recordAccess: async (token: string): Promise<void> => {
    await supabase.rpc('record_share_link_access', { p_token: token });
  }
};
