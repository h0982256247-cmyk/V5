import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { docsStore } from '@/lib/supabase-store';
import { Doc } from '@/types/schema';
import { DocWizard } from '@/components/admin/DocWizard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  LogOut,
  FileText,
  Clock,
  Share2,
  Trash2,
  Edit3,
  MoreVertical,
  Search,
  Loader2,
  ShieldAlert
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

type ViewMode = 'list' | 'wizard';

export default function Admin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAdmin, signOut } = useAuth();
  
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [docs, setDocs] = useState<Doc[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [search, setSearch] = useState('');
  const [editingDoc, setEditingDoc] = useState<Doc | null>(null);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);

  // 檢查登入狀態
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // 載入文件列表
  const loadDocs = async () => {
    setIsLoadingDocs(true);
    const data = await docsStore.getAll();
    setDocs(data);
    setIsLoadingDocs(false);
  };

  useEffect(() => {
    if (user && isAdmin) {
      loadDocs();
    }
  }, [user, isAdmin, viewMode]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleDeleteDoc = async () => {
    if (!deleteDocId) return;
    
    const success = await docsStore.delete(deleteDocId);
    if (success) {
      await loadDocs();
      toast({
        title: '已刪除',
        description: '文件已成功刪除'
      });
    } else {
      toast({
        title: '刪除失敗',
        description: '無法刪除文件，請稍後再試',
        variant: 'destructive'
      });
    }
    setDeleteDocId(null);
  };

  const handleEditDoc = async (doc: Doc) => {
    const docWithTemplate = await docsStore.getWithTemplate(doc.id);
    if (docWithTemplate) {
      setEditingDoc(docWithTemplate);
      setViewMode('wizard');
    }
  };

  const filteredDocs = docs.filter((doc) =>
    doc.title.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-TW', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Check if user is not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">權限不足</h1>
          <p className="text-muted-foreground mb-6">
            您沒有管理員權限，無法存取此頁面。請聯繫管理員授予權限。
          </p>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            登出
          </Button>
        </div>
      </div>
    );
  }

  if (viewMode === 'wizard') {
    return (
      <DocWizard
        existingDoc={editingDoc || undefined}
        onComplete={() => {
          setViewMode('list');
          setEditingDoc(null);
        }}
        onCancel={() => {
          setViewMode('list');
          setEditingDoc(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="container max-w-lg mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <h1 className="text-lg font-bold text-foreground">Flex Message CMS</h1>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-lg mx-auto px-4 py-6">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="搜尋文件..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 h-12 rounded-xl bg-muted/50 border-0 text-base"
          />
        </div>

        {/* Doc List */}
        <div className="space-y-3">
          {isLoadingDocs ? (
            <div className="text-center py-16">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
              <p className="text-muted-foreground">載入中...</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <h2 className="text-lg font-semibold text-foreground mb-2">
                {search ? '找不到符合的文件' : '尚無文件'}
              </h2>
              <p className="text-muted-foreground mb-6">
                {search ? '嘗試其他搜尋關鍵字' : '點擊下方按鈕建立第一個文件'}
              </p>
            </div>
          ) : (
            filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="card-elevated p-4"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>

                  {/* Content */}
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground truncate">
                        {doc.title}
                      </h3>
                      <Badge
                        variant={doc.status === 'published' ? 'default' : 'secondary'}
                        className="shrink-0"
                      >
                        {doc.status === 'published' ? '已發布' : '草稿'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(doc.updatedAt)}
                      </span>
                      {doc.mode === 'carousel' && (
                        <span className="flex items-center gap-1">
                          <Share2 className="w-3.5 h-3.5" />
                          Carousel
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0">
                        <MoreVertical className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditDoc(doc)}>
                        <Edit3 className="w-4 h-4 mr-2" />
                        編輯
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteDocId(doc.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        刪除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* FAB */}
      <div className="fixed bottom-6 right-6 safe-bottom">
        <Button
          onClick={() => setViewMode('wizard')}
          size="lg"
          className="h-14 w-14 rounded-full shadow-button p-0"
          style={{ background: 'var(--gradient-primary)' }}
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDocId} onOpenChange={() => setDeleteDocId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作無法復原，文件及其分享連結將被永久刪除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDoc}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
