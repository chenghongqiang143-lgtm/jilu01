
import React, { useState, useEffect, useRef } from 'react';
import { Icons } from './components/Icons';
import { Note, Widget, WidgetType, NotebookItem } from './types';
import { 
  WidgetPreview, ListFull, RatingFull, CountdownFull, 
  LastDoneFull, PlanFull, DataFull, MinimalHeader, CategoryTabStrip, NoteFull, ExpandableTagStrip
} from './components/WidgetRenderers';
import { format } from 'date-fns';

// --- Default Data ---
const DEFAULT_WIDGETS: Widget[] = [
  {
    id: 'w1', type: WidgetType.LIST, title: '阅读清单', dashboardCategory: '清单',
    data: { items: [
      { id: '1', title: '了不起的盖茨比', completed: false, category: '小说' },
      { id: '2', title: '原子习惯', completed: true, category: '成长' }
    ], categories: ['小说', '成长'] }
  },
  {
    id: 'w2', type: WidgetType.RATING, title: '书影音', dashboardCategory: '记录',
    data: { items: [
      { 
        id: '1', 
        title: '沙丘2', 
        rating: 4.5, 
        category: '电影',
        cover: 'https://m.media-amazon.com/images/M/MV5BN2QyZGU4ZDctOWMzMy00NTc5LThlOGQtODhmNDI1NmY5YzAwXkEyXkFqcGdeQXVyMDM2NDM2MQ@@._V1_.jpg'
      }
    ], categories: ['电影', '书籍', '美食'] }
  },
  {
    id: 'w3', type: WidgetType.COUNTDOWN, title: '倒数日', dashboardCategory: '时间',
    data: { targetDate: '2024-12-25', eventName: '日本旅行' },
    color: '#34d399' // Emerald 400
  },
  {
    id: 'w4', type: WidgetType.LAST_DONE, title: '浇花', dashboardCategory: '时间',
    data: { lastDate: Date.now() - 86400000 * 3, frequencyDays: 7 },
    color: '#fcd34d' // Amber 300
  },
  {
    id: 'w5', type: WidgetType.PLAN, title: '每日复盘', dashboardCategory: '计划',
    data: { 
        questions: [
            { id: 'q1', text: '今天最值得开心的一件事？' },
            { id: 'q2', text: '明日重要待办' }
        ],
        records: {}
    }
  },
  {
    id: 'w6', type: WidgetType.DATA, title: '体重记录', dashboardCategory: '记录',
    data: { label: '体重', unit: 'kg', points: [
      { date: '2023-01-01', value: 75 },
      { date: '2023-01-08', value: 74.5 },
      { date: '2023-01-15', value: 74.2 },
      { date: '2023-01-22', value: 73.8 },
      { date: '2023-01-29', value: 73.5 },
    ]}
  }
];

export default function App() {
  const [view, setView] = useState<'NOTES' | 'DASHBOARD'>('NOTES'); // Default to NOTES
  
  const [themeColor, setThemeColor] = useState<string>(() => {
      return localStorage.getItem('appTheme') || '#ef4444'; 
  });

  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('notes');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [widgets, setWidgets] = useState<Widget[]>(() => {
    const saved = localStorage.getItem('widgets');
    return saved ? JSON.parse(saved) : DEFAULT_WIDGETS;
  });

  const [dashboardCats, setDashboardCats] = useState<string[]>(() => {
      const saved = localStorage.getItem('dashboardCats');
      return saved ? JSON.parse(saved) : ['时间', '清单', '记录', '计划'];
  });

  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Modal State
  const [activeWidgetId, setActiveWidgetId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [targetCategory, setTargetCategory] = useState<string | null>(null); // For adding widget to specific category
  const [showSettings, setShowSettings] = useState(false);
  const [fullscreenImg, setFullscreenImg] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('widgets', JSON.stringify(widgets));
  }, [widgets]);

  useEffect(() => {
      localStorage.setItem('dashboardCats', JSON.stringify(dashboardCats));
  }, [dashboardCats]);

  useEffect(() => {
      localStorage.setItem('appTheme', themeColor);
  }, [themeColor]);

  // Reset selection mode when switching views
  useEffect(() => {
      setIsSelectionMode(false);
  }, [view]);

  // Main navigation swipe logic
  const touchStart = useRef(0);
  const handleNavTouchStart = (e: React.TouchEvent) => {
      touchStart.current = e.touches[0].clientX;
  };
  const handleNavTouchEnd = (e: React.TouchEvent) => {
      if (activeWidgetId || showAddModal || showSettings || fullscreenImg) return;
      
      const touchEnd = e.changedTouches[0].clientX;
      const diff = touchEnd - touchStart.current;
      
      // Threshold 50px
      if (Math.abs(diff) > 50) {
          if (diff < 0) { 
              // Swipe LEFT (Finger moves left) -> Go to Dashboard (if on Notes)
              if (view === 'NOTES') setView('DASHBOARD');
          } else { 
              // Swipe RIGHT (Finger moves right) -> Go to Notes (if on Dashboard)
              if (view === 'DASHBOARD') setView('NOTES');
          }
      }
  };

  // --- Handlers ---

  const handleClearData = () => {
      if(confirm('确定要清除所有数据吗？\n\n这将保留你的看板结构和模块，但会删除所有的笔记、清单内容、打卡记录等。此操作不可撤销！')) {
          setNotes([]);
          const resetWidgets = widgets.map(w => {
              let newData = { ...w.data };
              switch (w.type) {
                  case WidgetType.LIST: 
                      newData = { ...newData, items: [] }; break;
                  case WidgetType.RATING:
                      newData = { ...newData, items: [] }; break;
                  case WidgetType.NOTE:
                      newData = { ...newData, items: [] }; break;
                  case WidgetType.PLAN:
                      newData = { ...newData, records: {} }; break;
                  case WidgetType.LAST_DONE:
                      newData = { ...newData, history: [] }; break;
                  case WidgetType.DATA:
                      newData = { ...newData, points: [] }; break;
              }
              return { ...w, data: newData };
          });
          setWidgets(resetWidgets);
          alert('数据已清除。');
          setShowSettings(false);
      }
  };

  const getBackupData = () => {
      return JSON.stringify({ notes, widgets, dashboardCats, themeColor });
  };

  const handleImportData = (jsonStr: string) => {
      try {
          const data = JSON.parse(jsonStr) as any;
          if (data.notes) setNotes(data.notes);
          if (data.widgets) setWidgets(data.widgets);
          if (data.dashboardCats) setDashboardCats(data.dashboardCats);
          if (data.themeColor) setThemeColor(data.themeColor);
          alert('数据恢复成功！');
          setShowSettings(false);
      } catch (e: any) {
          alert('数据格式错误，恢复失败。');
      }
  };

  const handleUpdateWidget = (updated: Widget) => {
    setWidgets(widgets.map(w => w.id === updated.id ? updated : w));
  };

  const handleAddWidget = (type: WidgetType, category: string) => {
    const newWidget: Widget = {
      id: Date.now().toString(),
      type,
      title: type === WidgetType.NOTE ? '新笔记' : '新模块',
      dashboardCategory: category,
      data: getDefaultDataForType(type),
      color: type === WidgetType.COUNTDOWN ? '#34d399' : type === WidgetType.LAST_DONE ? '#fcd34d' : undefined
    };
    setWidgets([...widgets, newWidget]);
    setShowAddModal(false);
    setTargetCategory(null);
    setActiveWidgetId(newWidget.id);
  };

  const handleBatchDeleteWidgets = (ids: Set<string>) => {
      if(confirm(`确定删除选中的 ${ids.size} 个模块吗？`)) {
          setWidgets(widgets.filter(w => !ids.has(w.id)));
          setIsSelectionMode(false);
      }
  };

  const handleBatchMoveWidgets = (ids: Set<string>, category: string) => {
      setWidgets(widgets.map(w => ids.has(w.id) ? { ...w, dashboardCategory: category } : w));
      setIsSelectionMode(false);
  };

  const handleAddNote = (htmlContent: string) => {
    if (!htmlContent.trim()) return;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const textContent = tempDiv.textContent || '';
    const regex = /#[\w\u4e00-\u9fa5]+/g;
    const tags = textContent.match(regex)?.map(t => t.substring(1)) || [];
    
    const newNote: Note = {
      id: Date.now().toString(),
      content: htmlContent,
      tags: tags,
      createdAt: Date.now()
    };
    
    setNotes([newNote, ...notes]);
  };

  const handleUpdateNote = (id: string, newContent: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = newContent;
    const textContent = tempDiv.textContent || '';
    const regex = /#[\w\u4e00-\u9fa5]+/g;
    const tags = textContent.match(regex)?.map(t => t.substring(1)) || [];

    setNotes(notes.map(n => n.id === id ? { ...n, content: newContent, tags } : n));
  };

  return (
    <div 
        className="min-h-screen bg-[#f8fafc] pb-0 max-w-md mx-auto relative shadow-2xl overflow-hidden flex flex-col"
        style={{ '--primary-color': themeColor } as React.CSSProperties}
    >
      
      {/* Header */}
      <header className={`px-6 pt-10 pb-4 sticky top-0 z-10 shadow-sm flex justify-between items-center shrink-0 transition-all duration-500 ease-in-out ${view === 'NOTES' ? 'bg-gradient-to-b from-orange-50 to-[#f8fafc]' : 'bg-gradient-to-b from-blue-50 to-[#f8fafc]'}`}>
        <div>
          <h1 className="text-2xl font-bold text-[var(--primary-color)] tracking-tight">LifeTracks</h1>
          <p className="text-xs text-slate-500 font-medium">
            {view === 'DASHBOARD' ? '个人看板' : '灵感速记'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
            {view === 'DASHBOARD' && (
                <>
                <button 
                    onClick={() => setIsSelectionMode(!isSelectionMode)}
                    className={`px-3 py-1.5 rounded-full transition text-xs font-bold ${isSelectionMode ? 'bg-[var(--primary-color)] text-white shadow-md' : 'text-slate-400 bg-slate-100 hover:text-slate-600 hover:bg-slate-200'}`}
                >
                    {isSelectionMode ? '完成' : '编辑'}
                </button>
                <button 
                    onClick={() => setShowSettings(true)}
                    className="p-2 rounded-full text-slate-400 hover:text-[var(--primary-color)] hover:bg-slate-100 transition"
                >
                    <Icons.Settings size={20} />
                </button>
                </>
            )}

            {view === 'NOTES' && (
            <button 
                onClick={() => setIsSelectionMode(!isSelectionMode)}
                className={`p-2 rounded-full transition ${isSelectionMode ? 'bg-[var(--primary-color)] text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
            >
                {isSelectionMode ? <Icons.Close size={20} /> : <Icons.CheckSquare size={20} />}
            </button>
            )}
        </div>
      </header>

      {/* Content Area */}
      <main 
        className="flex-1 overflow-hidden relative"
        onTouchStart={handleNavTouchStart}
        onTouchEnd={handleNavTouchEnd}
      >
        {view === 'DASHBOARD' ? (
          <div className="h-full overflow-y-auto no-scrollbar pb-24">
             <DashboardView 
              widgets={widgets}
              categories={dashboardCats}
              setCategories={setDashboardCats} 
              onOpenWidget={setActiveWidgetId} 
              onAddWidget={(cat) => { setTargetCategory(cat || null); setShowAddModal(true); }}
              isSelectionMode={isSelectionMode}
              setIsSelectionMode={setIsSelectionMode}
              onDeleteWidgets={handleBatchDeleteWidgets}
              onMoveWidgets={handleBatchMoveWidgets}
            />
          </div>
        ) : (
          <NotesView 
            notes={notes} 
            onAddNote={handleAddNote} 
            onDeleteNote={(id) => setNotes(notes.filter(n => n.id !== id))}
            onUpdateNote={handleUpdateNote}
            onImageClick={setFullscreenImg}
            widgets={widgets}
            onUpdateWidget={handleUpdateWidget}
            setNotes={setNotes}
            isSelectionMode={isSelectionMode}
            setIsSelectionMode={setIsSelectionMode}
          />
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-md bg-white border-t border-slate-200 flex justify-around py-3 pb-6 z-20 shrink-0 h-[80px]">
        <button 
          onClick={() => setView('NOTES')} 
          className={`flex flex-col items-center gap-1 ${view === 'NOTES' ? 'text-[var(--primary-color)]' : 'text-slate-400'}`}
        >
          <Icons.Note size={24} />
          <span className="text-[10px] font-bold uppercase tracking-widest">速记</span>
        </button>
        <button 
          onClick={() => setView('DASHBOARD')} 
          className={`flex flex-col items-center gap-1 ${view === 'DASHBOARD' ? 'text-[var(--primary-color)]' : 'text-slate-400'}`}
        >
          <Icons.Dashboard size={24} />
          <span className="text-[10px] font-bold uppercase tracking-widest">看板</span>
        </button>
      </nav>

      {/* Widget Expand Modal */}
      {activeWidgetId && (
        <WidgetModal 
          widget={widgets.find(w => w.id === activeWidgetId)!} 
          widgets={widgets}
          onClose={() => setActiveWidgetId(null)}
          onUpdate={handleUpdateWidget}
        />
      )}

      {/* Add Widget Selection Modal */}
      {showAddModal && (
        <AddWidgetModal 
            categories={dashboardCats}
            initialCategory={targetCategory || undefined}
            onSelect={handleAddWidget} 
            onClose={() => setShowAddModal(false)} 
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
          <SettingsModal 
            onClose={() => setShowSettings(false)}
            themeColor={themeColor}
            setThemeColor={setThemeColor}
            onClearData={handleClearData}
            onExport={getBackupData}
            onImport={handleImportData}
          />
      )}

      {/* Image Lightbox */}
      {fullscreenImg && (
        <div 
            className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-200 cursor-zoom-out"
            onClick={() => setFullscreenImg(null)}
        >
            <img 
                src={fullscreenImg} 
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" 
                alt="Fullscreen" 
            />
        </div>
      )}
    </div>
  );
}

// --- Views & Components ---

const NotesView: React.FC<{
    notes: Note[];
    onAddNote: (html: string) => void;
    onDeleteNote: (id: string) => void;
    onUpdateNote: (id: string, content: string) => void;
    onImageClick: (src: string) => void;
    widgets: Widget[];
    onUpdateWidget: (w: Widget) => void;
    setNotes: (notes: Note[]) => void;
    isSelectionMode: boolean;
    setIsSelectionMode: (b: boolean) => void;
}> = ({ notes, onAddNote, onDeleteNote, onUpdateNote, onImageClick, setNotes, isSelectionMode, setIsSelectionMode, widgets, onUpdateWidget }) => {
    const [filterTag, setFilterTag] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    
    // Editor State
    const editorRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showTagMenu, setShowTagMenu] = useState(false);

    useEffect(() => {
        if (!isSelectionMode) setSelectedIds(new Set());
    }, [isSelectionMode]);

    const allTags = Array.from(new Set(notes.flatMap(n => n.tags)));
    const filteredNotes = filterTag ? notes.filter(n => n.tags.includes(filterTag)) : notes;
    const recentTags = allTags.slice(0, 8);

    const handleSend = () => {
        if (!editorRef.current) return;
        const content = editorRef.current.innerHTML;
        if (!editorRef.current.innerText.trim() && !content.includes('<img')) return;

        if (editingId) {
            onUpdateNote(editingId, content);
            setEditingId(null);
        } else {
            onAddNote(content);
        }
        editorRef.current.innerHTML = '';
    };

    const handleFormat = (command: string, value?: string) => {
        if (command === 'hiliteColor') {
             document.execCommand('hiliteColor', false, value || '#fef08a');
        } else {
            document.execCommand(command, false, value || '');
        }
        editorRef.current?.focus();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result;
            if (typeof result === 'string') {
                editorRef.current?.focus();
                document.execCommand('insertImage', false, result as string);
            }
          };
          reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    const handleTagInsert = (tag: string) => {
        handleFormat('insertText', `#${tag} `);
        setShowTagMenu(false);
    };
    
    const handleNoteClick = (note: Note) => {
        if (isSelectionMode) {
            const newSet = new Set(selectedIds);
            if (newSet.has(note.id)) newSet.delete(note.id);
            else newSet.add(note.id);
            setSelectedIds(newSet);
            return;
        }
        setEditingId(note.id);
        if (editorRef.current) {
            editorRef.current.innerHTML = note.content;
            setTimeout(() => {
                editorRef.current?.focus();
            }, 0);
        }
    };

    const deleteSelected = () => {
        if (confirm(`删除选中 ${selectedIds.size} 条笔记?`)) {
            const newNotes = notes.filter(n => !selectedIds.has(n.id));
            setNotes(newNotes);
            setIsSelectionMode(false);
        }
    };

    const moveSelectedToNotebook = () => {
        const targetWidget = widgets.find(w => w.type === WidgetType.NOTE);
        if (!targetWidget) {
            alert('请先在看板中添加一个"笔记"模块，以便接收这些内容。');
            return;
        }

        if(confirm(`移动选中 ${selectedIds.size} 条笔记到 "${targetWidget.title}" 模块?`)) {
            const notesToMove = notes.filter(n => selectedIds.has(n.id));
            const newItems: NotebookItem[] = notesToMove.map(n => ({
                id: n.id,
                content: n.content,
                tags: n.tags,
                createdAt: n.createdAt
            }));

            const widgetData = targetWidget.data as { items: NotebookItem[] };
            const updatedItems = [...newItems, ...(widgetData.items || [])];

            onUpdateWidget({
                ...targetWidget,
                data: { ...widgetData, items: updatedItems }
            });

            // Remove from here
            const remainingNotes = notes.filter(n => !selectedIds.has(n.id));
            setNotes(remainingNotes);
            setIsSelectionMode(false);
        }
    };

    return (
        <div className="flex flex-col h-full relative">
            <div className="px-6 pt-2 pb-0 bg-gradient-to-b from-orange-50 to-[#f8fafc] sticky top-0 z-10">
                <ExpandableTagStrip tags={allTags} selectedTag={filterTag} onSelect={setFilterTag} />
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pb-32 px-4 pt-2 no-scrollbar">
                {filteredNotes.map(note => (
                    <div 
                        key={note.id} 
                        onClick={() => handleNoteClick(note)}
                        className={`bg-white p-4 rounded-2xl border shadow-sm relative overflow-hidden active:scale-[0.99] transition-all 
                            ${isSelectionMode && selectedIds.has(note.id) ? 'ring-2 ring-[var(--primary-color)] bg-indigo-50/20 border-transparent' : 'border-slate-100'}
                            ${editingId === note.id ? 'ring-2 ring-[var(--primary-color)] border-transparent' : ''}
                        `}
                    >
                         {isSelectionMode && (
                            <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedIds.has(note.id) ? 'bg-[var(--primary-color)] border-[var(--primary-color)]' : 'border-slate-200 bg-white'}`}>
                                {selectedIds.has(note.id) && <Icons.Check size={12} className="text-white" strokeWidth={3} />}
                            </div>
                        )}

                        <div 
                             className="text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none 
                                        [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5
                                        [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2 cursor-auto"
                             dangerouslySetInnerHTML={{__html: note.content}} 
                             onClick={(e) => {
                                 const target = e.target as HTMLElement;
                                 if (target.tagName === 'IMG') {
                                     e.stopPropagation();
                                     onImageClick((target as HTMLImageElement).src);
                                 }
                             }}
                        />
                        <div className="mt-3 flex justify-between items-center">
                            <div className="flex gap-1.5 flex-wrap">
                                {note.tags.map(t => <span key={t} className="text-[10px] bg-slate-50 text-slate-400 px-2 py-0.5 rounded-md font-medium">#{t}</span>)}
                            </div>
                            <div className="text-[10px] text-slate-300 font-medium">
                                {format(note.createdAt, 'MM-dd HH:mm')}
                            </div>
                        </div>
                    </div>
                ))}
                {notes.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-300 gap-2">
                        <Icons.NoteWidget size={48} className="opacity-20" />
                        <span className="text-xs">记录你的第一个灵感...</span>
                    </div>
                )}
            </div>

            {/* Input Bar */}
            {!isSelectionMode && (
                <div className="fixed bottom-[80px] left-0 right-0 mx-auto w-full max-w-md z-30 pointer-events-none">
                     <div className="bg-white rounded-t-2xl shadow-[0_-8px_30px_rgb(0,0,0,0.04)] border-t border-slate-100 overflow-visible relative pointer-events-auto">
                        {showTagMenu && (
                            <div className="absolute bottom-[calc(100%+10px)] left-4 w-48 bg-white rounded-xl shadow-xl border border-slate-200 p-2 grid grid-cols-2 gap-1 animate-in slide-in-from-bottom-2 z-[70]">
                                {recentTags.length > 0 ? recentTags.map(tag => (
                                    <button 
                                        key={tag} 
                                        onMouseDown={(e) => { e.preventDefault(); handleTagInsert(tag); }}
                                        className="text-left text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-[var(--primary-color)] p-2 rounded-lg truncate"
                                    >
                                        #{tag}
                                    </button>
                                )) : (
                                    <div className="col-span-2 text-[10px] text-slate-400 text-center py-2">暂无标签</div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center gap-4 px-4 py-2.5 bg-[#f8fafc]/80 backdrop-blur-md border-b border-slate-50">
                            <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat('bold')} className="text-slate-400 hover:text-slate-700 transition"><Icons.Bold size={18} /></button>
                            <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat('hiliteColor', '#fef08a')} className="text-slate-400 hover:text-yellow-500 transition"><Icons.Highlight size={18} /></button>
                            <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat('insertUnorderedList')} className="text-slate-400 hover:text-slate-700 transition"><Icons.ListIcon size={18} /></button>
                            <div className="w-px h-4 bg-slate-200 mx-1"></div>
                            <button onMouseDown={(e) => e.preventDefault()} onClick={() => setShowTagMenu(!showTagMenu)} className={`text-slate-400 hover:text-slate-700 transition ${showTagMenu ? 'text-[var(--primary-color)]' : ''}`}><Icons.Hash size={18} /></button>
                            
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                            <button onMouseDown={(e) => { e.preventDefault(); fileInputRef.current?.click(); }} className="text-slate-400 hover:text-slate-700 transition"><Icons.Image size={18} /></button>
                        </div>
                        
                        <div className="p-4 bg-white">
                            <div 
                                ref={editorRef}
                                contentEditable
                                className="w-full text-slate-800 placeholder-slate-400 outline-none bg-transparent min-h-[80px] text-sm leading-relaxed empty:before:content-['写下现在的想法...'] empty:before:text-slate-300 
                                            [&>ul]:list-disc [&>ul]:pl-5 
                                            [&_img]:max-w-[40%] [&_img]:inline-block [&_img]:m-1 [&_img]:object-cover [&_img]:rounded-lg"
                            />
                            
                            <div className="flex justify-end mt-2 items-center gap-2">
                                {editingId && (
                                    <button 
                                        onClick={() => { setEditingId(null); if(editorRef.current) editorRef.current.innerHTML=''; }}
                                        className="text-slate-400 hover:text-slate-600 text-xs font-bold px-3 py-1.5"
                                    >
                                        取消编辑
                                    </button>
                                )}
                                <button 
                                    onClick={handleSend}
                                    className={`bg-slate-900 text-white px-5 py-2 rounded-full text-xs font-bold hover:bg-slate-800 transition flex items-center gap-1 shadow-md ${editingId ? 'bg-[var(--primary-color)]' : ''}`}
                                >
                                    {editingId ? '更新笔记' : '保存'} <Icons.ArrowRight size={12} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {isSelectionMode && (
                <div className="fixed bottom-[80px] left-0 right-0 mx-auto w-full max-w-md p-4 z-[60]">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-4 flex justify-between gap-4 items-center animate-in slide-in-from-bottom-5">
                        <button onClick={deleteSelected} disabled={selectedIds.size === 0} className="flex flex-col items-center gap-1 text-red-500 disabled:opacity-50 font-bold hover:bg-red-50 p-2 rounded-xl transition w-full">
                            <Icons.Delete size={20}/>
                            <span className="text-[10px]">删除选中 ({selectedIds.size})</span>
                        </button>
                         <button onClick={moveSelectedToNotebook} disabled={selectedIds.size === 0} className="flex flex-col items-center gap-1 text-[var(--primary-color)] disabled:opacity-50 font-bold hover:bg-indigo-50 p-2 rounded-xl transition w-full">
                            <Icons.NoteWidget size={20}/>
                            <span className="text-[10px]">发送到笔记</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Helpers ---
const getDefaultDataForType = (type: WidgetType): any => {
    switch (type) {
        case WidgetType.LIST: return { items: [], categories: ['默认'] };
        case WidgetType.RATING: return { items: [], categories: ['Book', 'Movie', 'Food'] };
        case WidgetType.COUNTDOWN: return { targetDate: format(new Date(), 'yyyy-MM-dd'), eventName: '新事件' };
        case WidgetType.LAST_DONE: return { lastDate: Date.now(), frequencyDays: 1 };
        case WidgetType.PLAN: return { questions: [{ id: 'q1', text: '今日任务' }], records: {} };
        case WidgetType.DATA: return { label: '数据', unit: '', points: [] };
        case WidgetType.NOTE: return { items: [] };
        default: return {};
    }
}

// --- Modals & Views ---

const AddWidgetModal: React.FC<{ 
    categories: string[], 
    initialCategory?: string, // NEW prop
    onSelect: (t: WidgetType, cat: string) => void, 
    onClose: () => void 
}> = ({ categories, initialCategory, onSelect, onClose }) => {
    const touchStart = useRef(0);
    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => { if (e.touches.length > 0) touchStart.current = e.touches[0].clientX; };
    const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
        if (e.changedTouches.length > 0) {
            const touchEnd = e.changedTouches[0].clientX;
            if (touchStart.current - touchEnd > 50) onClose(); 
        }
    };

    const defaultCat = initialCategory || (categories && categories.length > 0 ? categories[0] : 'Default');
    const [selectedCat, setSelectedCat] = useState<string>(defaultCat);

    const types: { type: WidgetType, label: string, desc: string, icon: React.ReactNode, style: string }[] = [
        { type: WidgetType.PLAN, label: '计划', desc: '每日复盘、打卡', icon: <Icons.Plan size={28} />, style: 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100 hover:border-emerald-200' },
        { type: WidgetType.NOTE, label: '笔记', desc: '便签、备忘录', icon: <Icons.NoteWidget size={28} />, style: 'bg-yellow-50 text-yellow-600 border-yellow-100 hover:bg-yellow-100 hover:border-yellow-200' },
        { type: WidgetType.LIST, label: '清单', desc: '待办事项、购物单', icon: <Icons.List size={28} />, style: 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100 hover:border-blue-200' },
        { type: WidgetType.RATING, label: '书影音', desc: '评分记录、收藏', icon: <Icons.Rating size={28} />, style: 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100 hover:border-amber-200' },
        { type: WidgetType.DATA, label: '数据', desc: '折线图、趋势', icon: <Icons.Data size={28} />, style: 'bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-100 hover:border-purple-200' },
        { type: WidgetType.COUNTDOWN, label: '倒数日', desc: '重要日子、纪念日', icon: <Icons.Countdown size={28} />, style: 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100 hover:border-rose-200' },
        { type: WidgetType.LAST_DONE, label: '上次', desc: '上次做某事的时间', icon: <Icons.LastDone size={28} />, style: 'bg-cyan-50 text-cyan-600 border-cyan-100 hover:bg-cyan-100 hover:border-cyan-200' },
    ];

    return (
        <div 
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl p-6 animate-in slide-in-from-bottom-10 border border-white/50">
                <div className="flex justify-between items-center mb-6 px-2">
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">添加新模块</h3>
                    <button onClick={onClose} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition"><Icons.Close size={20}/></button>
                </div>

                <div className="mb-6 px-1">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-3 block tracking-wider">选择分类</label>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {categories.map(c => (
                            <button 
                                key={c}
                                onClick={() => setSelectedCat(c)}
                                className={`flex-none px-4 py-2 rounded-full text-sm font-bold border transition-all ${selectedCat === c ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)] shadow-lg scale-105' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {types.map(t => (
                        <button 
                            key={t.type} 
                            onClick={() => onSelect(t.type, selectedCat)}
                            className={`flex flex-col items-start justify-between gap-3 p-5 rounded-2xl border transition-all duration-200 active:scale-95 ${t.style}`}
                        >
                            <div className="p-3 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm">{t.icon}</div>
                            <div className="text-left">
                                <div className="text-base font-bold mb-0.5">{t.label}</div>
                                <div className="text-xs opacity-70 font-medium">{t.desc}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const SettingsModal: React.FC<{
    onClose: () => void,
    themeColor: string,
    setThemeColor: (c: string) => void,
    onClearData: () => void,
    onExport: () => string,
    onImport: (s: string) => void
}> = ({ onClose, themeColor, setThemeColor, onClearData, onExport, onImport }) => {
    const [mode, setMode] = useState<'MAIN' | 'BACKUP' | 'RESTORE'>('MAIN');
    const [importText, setImportText] = useState('');
    const [backupText, setBackupText] = useState('');
    const colors = ['#0f172a', '#ea580c', '#4f46e5', '#059669', '#db2777', '#7c3aed', '#0891b2', '#b91c1c'];
    const handleBackup = () => { setBackupText(onExport()); setMode('BACKUP'); };
    const handleCopy = () => { navigator.clipboard.writeText(backupText); alert('已复制到剪贴板'); };
    const handleRestore = () => { if (!importText.trim()) return; if(confirm('确定要恢复数据吗？当前数据将被覆盖。')) { onImport(importText); } };

    return (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl p-6 animate-in slide-in-from-bottom-10 border border-white/50 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6 px-2"><div className="flex items-center gap-2">{mode !== 'MAIN' && (<button onClick={() => setMode('MAIN')} className="p-1 -ml-2 rounded-full hover:bg-slate-100 text-slate-500"><Icons.ArrowLeft size={20} /></button>)}<h3 className="text-xl font-black text-slate-800 tracking-tight">{mode === 'MAIN' ? '设置' : mode === 'BACKUP' ? '备份数据' : '恢复数据'}</h3></div><button onClick={onClose} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition"><Icons.Close size={20}/></button></div>
                {mode === 'MAIN' && (<div className="space-y-8"><div><h4 className="text-xs font-bold text-slate-400 uppercase mb-3 px-1 flex items-center gap-2"><Icons.Palette size={14} /> 主题色</h4><div className="flex gap-3 flex-wrap px-1">{colors.map(c => (<button key={c} onClick={() => setThemeColor(c)} className={`w-10 h-10 rounded-full transition-transform border-2 ${themeColor === c ? 'scale-110 border-slate-300 ring-2 ring-slate-100' : 'border-transparent hover:scale-105'}`} style={{ backgroundColor: c }} />))}</div></div><div><h4 className="text-xs font-bold text-slate-400 uppercase mb-3 px-1 flex items-center gap-2"><Icons.Data size={14} /> 数据管理</h4><div className="space-y-3"><button onClick={handleBackup} className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition"><div className="flex items-center gap-3"><div className="p-2 bg-white rounded-lg text-slate-600 shadow-sm"><Icons.Download size={18}/></div><span className="font-bold text-slate-700 text-sm">备份数据 (导出)</span></div><Icons.ArrowRight size={16} className="text-slate-300" /></button><button onClick={() => setMode('RESTORE')} className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition"><div className="flex items-center gap-3"><div className="p-2 bg-white rounded-lg text-slate-600 shadow-sm"><Icons.Upload size={18}/></div><span className="font-bold text-slate-700 text-sm">恢复数据 (导入)</span></div><Icons.ArrowRight size={16} className="text-slate-300" /></button><button onClick={onClearData} className="w-full flex items-center justify-between p-4 rounded-xl bg-red-50 hover:bg-red-100 border border-red-100 transition group"><div className="flex items-center gap-3"><div className="p-2 bg-white rounded-lg text-red-500 shadow-sm group-hover:text-red-600"><Icons.Delete size={18}/></div><span className="font-bold text-red-600 text-sm">清除所有数据 (保留模板)</span></div></button></div></div><div className="text-center pt-4 border-t border-slate-100"><p className="text-[10px] text-slate-300 font-medium">LifeTracks v1.0.0</p></div></div>)}
                {(mode === 'BACKUP' || mode === 'RESTORE') && (<div className="space-y-4"><textarea readOnly={mode === 'BACKUP'} className="w-full h-48 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono text-slate-600 outline-none resize-none no-scrollbar" value={mode === 'BACKUP' ? backupText : importText} onChange={e => setImportText(e.target.value)} placeholder={mode === 'RESTORE' ? '粘贴备份数据...' : ''} /><button onClick={mode === 'BACKUP' ? handleCopy : handleRestore} className="w-full py-3 bg-[var(--primary-color)] text-white rounded-xl font-bold hover:opacity-90 transition">{mode === 'BACKUP' ? '复制' : '确认恢复'}</button></div>)}
            </div>
        </div>
    );
};

const DashboardView: React.FC<{ 
    widgets: Widget[], 
    categories: string[],
    setCategories: (cats: string[]) => void,
    onOpenWidget: (id: string) => void,
    onAddWidget: (category?: string) => void,
    isSelectionMode: boolean,
    setIsSelectionMode: (b: boolean) => void,
    onDeleteWidgets: (ids: Set<string>) => void,
    onMoveWidgets: (ids: Set<string>, cat: string) => void
}> = ({ widgets, categories, setCategories, onOpenWidget, onAddWidget, isSelectionMode, setIsSelectionMode, onDeleteWidgets, onMoveWidgets }) => {
  
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if(!isSelectionMode) setSelectedIds(new Set());
  }, [isSelectionMode]);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if(newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleAddCat = () => {
      const name = prompt("输入新分类名称");
      if (name && !categories.includes(name)) {
          setCategories([...categories, name]);
          setActiveCat(name);
      }
  };

  const handleEditCat = (oldName: string, newName: string) => {
      setCategories(categories.map(c => c === oldName ? newName : c));
      if (activeCat === oldName) setActiveCat(newName);
  };

  const handleDeleteCat = (name: string) => {
      setCategories(categories.filter(c => c !== name));
      setActiveCat(null);
  };

  const handleMove = () => {
      const cat = prompt("移动到哪个分类？", categories[0]);
      if(cat) {
          if(categories.includes(cat)) {
              onMoveWidgets(selectedIds, cat);
          } else {
              alert('分类不存在');
          }
      }
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="px-6 pt-2 pb-0 bg-[#f8fafc] sticky top-0 z-10">
          <CategoryTabStrip 
            categories={categories}
            activeCategory={activeCat}
            onSelect={setActiveCat}
            onAdd={handleAddCat}
            onEdit={handleEditCat}
            onDelete={handleDeleteCat}
          />
      </div>

      <div className="flex-1 overflow-y-auto pb-32 no-scrollbar">
          {activeCat === null ? (
            <div className="flex flex-col gap-6 py-4">
               {categories.map(cat => {
                   const catWidgets = widgets.filter(w => w.dashboardCategory === cat);
                   return (
                     <div key={cat} className="flex flex-col gap-3">
                        <div className="px-6 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 text-lg tracking-wide">{cat}</h3>
                            <button onClick={() => setActiveCat(cat)} className="text-[10px] text-slate-400 font-bold bg-slate-100 px-3 py-1 rounded-full hover:text-[var(--primary-color)] transition flex items-center gap-1">
                                查看全部 <Icons.ArrowRight size={12} />
                            </button>
                        </div>
                        <div className="flex overflow-x-auto no-scrollbar snap-x px-6 gap-4 pb-2">
                            {catWidgets.length > 0 ? catWidgets.map(widget => (
                                <div 
                                    key={widget.id} 
                                    onClick={() => isSelectionMode ? toggleSelection(widget.id) : onOpenWidget(widget.id)}
                                    className={`flex-none w-[45%] snap-center bg-white rounded-xl shadow-sm border aspect-[4/5] flex flex-col relative overflow-hidden active:scale-95 transition-transform duration-100 cursor-pointer hover:shadow-md ${isSelectionMode && selectedIds.has(widget.id) ? 'border-[var(--primary-color)] ring-2 ring-[var(--primary-color)]' : 'border-slate-100'}`}
                                >
                                    {isSelectionMode && (
                                        <div className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center z-20 transition ${selectedIds.has(widget.id) ? 'bg-[var(--primary-color)] border-[var(--primary-color)]' : 'border-slate-200 bg-white'}`}>
                                            {selectedIds.has(widget.id) && <Icons.Check size={12} className="text-white" strokeWidth={4} />}
                                        </div>
                                    )}
                                    <div className="flex-1 overflow-hidden relative pointer-events-none">
                                        <WidgetPreview widget={widget} />
                                    </div>
                                </div>
                            )) : (
                                <div className="w-[45%] aspect-[4/5] rounded-xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300">
                                    <span className="text-[10px]">空</span>
                                </div>
                            )}
                            <button 
                                onClick={() => onAddWidget(cat)}
                                className="flex-none w-[15%] snap-center rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-center text-slate-300 hover:text-[var(--primary-color)] hover:bg-indigo-50 transition aspect-[4/5]"
                            >
                                <Icons.Plus size={20} />
                            </button>
                        </div>
                     </div>
                   );
               })}
               <div className="px-6 pt-4">
                  <button onClick={() => onAddWidget()} className="w-full py-4 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 font-bold hover:border-[var(--primary-color)] hover:text-[var(--primary-color)] transition">
                      添加新模块
                  </button>
               </div>
            </div>
          ) : (
             <div className="px-6 py-4">
                {widgets.filter(w => w.dashboardCategory === activeCat).length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-200 rounded-2xl">
                        <p className="text-slate-400 text-sm mb-4">此分类下暂无模块</p>
                        <button 
                            onClick={() => onAddWidget(activeCat || undefined)}
                            className="flex items-center gap-2 text-[var(--primary-color)] bg-indigo-50 px-4 py-2 rounded-full text-xs font-bold"
                        >
                            <Icons.Plus size={14} /> 添加模块
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 auto-rows-fr">
                        {widgets.filter(w => w.dashboardCategory === activeCat).map(widget => (
                            <div 
                                key={widget.id} 
                                onClick={() => isSelectionMode ? toggleSelection(widget.id) : onOpenWidget(widget.id)}
                                className={`bg-white rounded-xl shadow-sm border aspect-[4/5] flex flex-col relative overflow-hidden active:scale-95 transition-transform duration-100 cursor-pointer hover:shadow-md ${isSelectionMode && selectedIds.has(widget.id) ? 'border-[var(--primary-color)] ring-2 ring-[var(--primary-color)]' : 'border-slate-100'}`}
                            >
                                {isSelectionMode && (
                                    <div className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center z-20 transition ${selectedIds.has(widget.id) ? 'bg-[var(--primary-color)] border-[var(--primary-color)]' : 'border-slate-200 bg-white'}`}>
                                        {selectedIds.has(widget.id) && <Icons.Check size={12} className="text-white" strokeWidth={4} />}
                                    </div>
                                )}
                                <div className="flex-1 overflow-hidden relative pointer-events-none">
                                    <WidgetPreview widget={widget} />
                                </div>
                            </div>
                        ))}
                        <button 
                            onClick={() => onAddWidget(activeCat || undefined)}
                            className="rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 hover:text-slate-500 hover:border-slate-300 transition aspect-[4/5]"
                        >
                            <div className="bg-slate-50 rounded-full p-2 mb-2">
                                <Icons.Plus size={20} />
                            </div>
                            <span className="text-[10px] font-bold">ADD</span>
                        </button>
                    </div>
                )}
             </div>
          )}
      </div>

      {isSelectionMode && (
        <div className="fixed bottom-[80px] left-0 right-0 mx-auto w-full max-w-md p-4 z-[60]">
             <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-4 flex justify-around animate-in slide-in-from-bottom-5">
                 <button onClick={() => { if(selectedIds.size > 0) onDeleteWidgets(selectedIds); }} disabled={selectedIds.size === 0} className="flex flex-col items-center gap-1 text-slate-500 hover:text-red-500 disabled:opacity-50">
                     <div className="p-2 bg-slate-100 rounded-full"><Icons.Delete size={20}/></div>
                     <span className="text-[10px] font-bold">删除</span>
                 </button>
                 <button onClick={() => { if(selectedIds.size > 0) handleMove(); }} disabled={selectedIds.size === 0} className="flex flex-col items-center gap-1 text-slate-500 hover:text-indigo-500 disabled:opacity-50">
                     <div className="p-2 bg-slate-100 rounded-full"><Icons.Dashboard size={20}/></div>
                     <span className="text-[10px] font-bold">分类</span>
                 </button>
             </div>
        </div>
      )}
    </div>
  );
};

const WidgetModal: React.FC<{ widget: Widget, widgets: Widget[], onClose: () => void, onUpdate: (w: Widget) => void }> = ({ widget, widgets, onClose, onUpdate }) => {
  const isFullscreen = widget.type === WidgetType.LIST || widget.type === WidgetType.RATING || widget.type === WidgetType.PLAN || widget.type === WidgetType.NOTE;
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Swipe to exit logic (Left Swipe -> Close)
  const touchStart = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => { touchStart.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
      const touchEnd = e.changedTouches[0].clientX;
      if (touchStart.current - touchEnd > 100) { // Left Swipe
          onClose();
      }
  };

  if (isFullscreen) {
    return (
      <div 
        className="fixed inset-0 z-50 bg-[#f8fafc] flex flex-col animate-in slide-in-from-bottom-5 duration-300"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="px-6 pt-12 pb-2 flex justify-between items-start shrink-0 bg-[#f8fafc] border-b border-slate-200">
            <div className="flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-1">
                    <div className="text-slate-400">
                        {getIconForType(widget.type)}
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{widget.type === 'PLAN' ? '计划' : widget.type === 'NOTE' ? '笔记' : widget.type}</span>
                </div>
                <input 
                    value={widget.title} 
                    onChange={(e) => onUpdate({...widget, title: e.target.value})}
                    className="text-4xl font-black text-slate-800 tracking-tight bg-transparent border-none focus:outline-none w-full placeholder-slate-300 p-0"
                    placeholder="输入标题..."
                />
            </div>
            
            <div className="flex items-center gap-2 ml-4">
                {(widget.type === WidgetType.NOTE || widget.type === WidgetType.LIST || widget.type === WidgetType.RATING) && (
                    <button 
                        onClick={() => setIsSelectionMode(!isSelectionMode)}
                        className={`p-2 rounded-full transition ${isSelectionMode ? 'bg-[var(--primary-color)] text-white shadow-md' : 'bg-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-200'}`}
                    >
                        {isSelectionMode ? <Icons.Close size={20} /> : <Icons.CheckSquare size={20} />}
                    </button>
                )}

                <button 
                    onClick={onClose} 
                    className="bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-full p-2 transition"
                >
                    <Icons.Close size={24} />
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 no-scrollbar">
             {widget.type === WidgetType.LIST && <ListFull widget={widget} updateWidget={onUpdate} isSelectionMode={isSelectionMode} setIsSelectionMode={setIsSelectionMode} allWidgets={widgets} />}
             {widget.type === WidgetType.RATING && <RatingFull widget={widget} updateWidget={onUpdate} isSelectionMode={isSelectionMode} setIsSelectionMode={setIsSelectionMode} />}
             {widget.type === WidgetType.PLAN && <PlanFull widget={widget} updateWidget={onUpdate} />}
             {widget.type === WidgetType.NOTE && <NoteFull widget={widget} updateWidget={onUpdate} isSelectionMode={isSelectionMode} setIsSelectionMode={setIsSelectionMode} />}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-200/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
        
        <div className="relative bg-white w-full max-w-md rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300 border border-white/50 overflow-hidden">
            <div className="px-6 pt-6 pb-2 flex justify-between items-start shrink-0">
                <div className="flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="text-slate-400">
                            {getIconForType(widget.type)}
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{widget.type}</span>
                    </div>
                    <input 
                        value={widget.title} 
                        onChange={(e) => onUpdate({...widget, title: e.target.value})}
                        className="text-3xl font-black text-slate-800 tracking-tight bg-transparent border-none focus:outline-none w-full placeholder-slate-300 p-0"
                        placeholder="输入标题..."
                    />
                </div>
                <button 
                    onClick={onClose} 
                    className="bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-full p-2 transition ml-4"
                >
                    <Icons.Close size={20} />
                </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 no-scrollbar">
                {widget.type === WidgetType.LIST && <ListFull widget={widget} updateWidget={onUpdate} isSelectionMode={isSelectionMode} setIsSelectionMode={setIsSelectionMode} allWidgets={widgets} />}
                {widget.type === WidgetType.RATING && <RatingFull widget={widget} updateWidget={onUpdate} isSelectionMode={isSelectionMode} setIsSelectionMode={setIsSelectionMode} />}
                {widget.type === WidgetType.COUNTDOWN && <CountdownFull widget={widget} updateWidget={onUpdate} />}
                {widget.type === WidgetType.LAST_DONE && <LastDoneFull widget={widget} updateWidget={onUpdate} />}
                {widget.type === WidgetType.DATA && <DataFull widget={widget} updateWidget={onUpdate} />}
            </div>
      </div>
    </div>
  );
};

// Helper
const getIconForType = (type: WidgetType) => {
  switch (type) {
    case WidgetType.LIST: return <Icons.List size={16} />;
    case WidgetType.RATING: return <Icons.Rating size={16} />;
    case WidgetType.COUNTDOWN: return <Icons.Countdown size={16} />;
    case WidgetType.LAST_DONE: return <Icons.LastDone size={16} />;
    case WidgetType.PLAN: return <Icons.Plan size={16} />;
    case WidgetType.DATA: return <Icons.Data size={16} />;
    case WidgetType.NOTE: return <Icons.NoteWidget size={16} />;
    default: return <Icons.Dashboard size={16} />;
  }
};
