import React, { useState, useRef, useEffect } from 'react';
import { Widget, WidgetType, PlaylistItem, RatingItem, DataPoint, PlanQuestion, PlanRecords, NotebookItem, Note } from '../types';
import { Icons } from './Icons';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format, differenceInDays, addDays, subDays, startOfWeek, isSameDay, isToday, eachDayOfInterval, addWeeks, subWeeks, endOfWeek, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// --- Types ---

export interface FullViewProps {
    widget: Widget;
    updateWidget: (w: Widget) => void;
    isSelectionMode?: boolean;
    setIsSelectionMode?: (b: boolean) => void;
    allWidgets?: Widget[];
    onImageClick?: (src: string) => void;
    searchQuery?: string;
}

// --- Shared Constants ---
// Updated Palette per user request
const COLORS = [
    '#000000', // Black
    '#ffffff', // White
    '#bbf7d0', // Green 200
    '#34d399', // Emerald 400
    '#fcd34d', // Amber 300
    '#f87171', // Red 400
    '#60a5fa', // Blue 400
    '#bfdbfe'  // Blue 200
];

// Update light bg list to include the light ones from the new palette
const LIGHT_BG_COLORS = [
    '#ffffff', 
    '#bbf7d0', 
    '#fcd34d', 
    '#bfdbfe',
    // Legacy support
    '#f1f5f9', '#e0f2fe', '#f3e8ff', '#fef3c7', '#d1fae5', '#ffe4e6', '#ddd6fe', '#e2e8f0', '#fca5a5', '#d8b4fe', '#fdba74', '#cbd5e1'
];

// --- Shared Components ---

export const MinimalHeader: React.FC<{ icon: React.ReactNode, title: string, color?: string }> = ({ icon, title, color }) => (
    <div className="mb-1.5 flex items-center gap-1.5">
        <div className={`w-5 border-b-[1.5px] pb-0.5 ${color ? 'text-white border-white/40' : 'text-slate-900 border-slate-900'}`}>
            {React.cloneElement(icon as React.ReactElement<any>, { size: 16, strokeWidth: 2.5 })}
        </div>
        <div className={`font-bold text-sm leading-tight truncate ${color ? 'text-white' : 'text-slate-900'}`}>{title}</div>
    </div>
);

export const ExpandableTagStrip: React.FC<{
    tags: string[];
    selectedTag: string | null;
    onSelect: (tag: string | null) => void;
}> = ({ tags, selectedTag, onSelect }) => {
    const [expanded, setExpanded] = useState(false);

    if (tags.length === 0) {
        return <div className="text-xs text-slate-300 py-1 pl-1">暂无标签...</div>;
    }

    return (
        <div className="flex items-start gap-2 mb-2">
            <div className={`flex-1 flex gap-2 ${expanded ? 'flex-wrap' : 'overflow-x-auto no-scrollbar'}`}>
                <button 
                    onClick={() => onSelect(null)}
                    className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium transition-colors ${!selectedTag ? 'bg-[var(--primary-color)] text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                >
                    全部
                </button>
                {tags.map(tag => (
                    <button 
                        key={tag}
                        onClick={() => onSelect(tag === selectedTag ? null : tag)}
                        className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedTag === tag ? 'bg-[var(--primary-color)] text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                    >
                        #{tag}
                    </button>
                ))}
            </div>
            <button 
                onClick={() => setExpanded(!expanded)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full shrink-0 mt-0.5"
            >
                {expanded ? <Icons.ChevronUp size={16} /> : <Icons.ChevronDown size={16} />}
            </button>
        </div>
    );
};

export const CategoryTabStrip: React.FC<{
    categories: string[];
    activeCategory: string | null; // null means "All"
    onSelect: (cat: string | null) => void;
    onAdd?: () => void;
    onEdit?: (oldName: string, newName: string) => void;
    onDelete?: (name: string) => void;
}> = ({ categories, activeCategory, onSelect, onAdd, onEdit, onDelete }) => {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleTouchStart = (cat: string) => {
        if (!onEdit || !onDelete) return;
        timerRef.current = setTimeout(() => {
            const newName = prompt("编辑分类名称 (留空删除)", cat);
            if (newName === null) return;
            if (newName.trim() === "") {
                if(confirm(`确定删除分类 "${cat}"?`)) onDelete(cat);
            } else if (newName !== cat) {
                onEdit(cat, newName);
            }
        }, 800);
    };

    const handleTouchEnd = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    return (
        <div className="flex items-center gap-2 mb-4 w-full">
             <div className="flex-1 overflow-x-auto no-scrollbar flex gap-2 pr-2 items-center">
                <button
                    onClick={() => onSelect(null)}
                    className={`flex-none px-4 py-1.5 rounded-full text-xs font-bold transition select-none ${
                        activeCategory === null
                        ? 'bg-[var(--primary-color)] text-white shadow-md'
                        : 'bg-white text-slate-500 border border-slate-200'
                    }`}
                >
                    全部
                </button>

                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => onSelect(cat)}
                        onMouseDown={() => handleTouchStart(cat)}
                        onMouseUp={handleTouchEnd}
                        onMouseLeave={handleTouchEnd}
                        onTouchStart={() => handleTouchStart(cat)}
                        onTouchEnd={handleTouchEnd}
                        className={`flex-none px-4 py-1.5 rounded-full text-xs font-bold transition select-none ${
                            activeCategory === cat 
                            ? 'bg-[var(--primary-color)] text-white shadow-md' 
                            : 'bg-white text-slate-500 border border-slate-200'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
                
                {onAdd && (
                    <button 
                        onClick={onAdd}
                        className="flex-none px-3 py-1.5 rounded-full text-xs font-bold bg-white text-slate-400 border border-dashed border-slate-300 hover:text-[var(--primary-color)] hover:border-[var(--primary-color)] transition flex items-center gap-1"
                    >
                        <Icons.Plus size={12} /> 新建
                    </button>
                )}
             </div>
        </div>
    );
};


// --- Small Card Views (Preview) ---

export const WidgetPreview: React.FC<{ widget: Widget }> = ({ widget }) => {
  switch (widget.type) {
    case WidgetType.LIST: {
      const data = widget.data as { items: PlaylistItem[] };
      const topItems = data.items.filter(i => !i.completed).slice(0, 3);
      const remaining = data.items.filter(i => !i.completed).length - topItems.length;

      return (
        <div className="flex flex-col h-full justify-between p-3">
          <div className="flex flex-col items-start gap-1">
             <div className="text-slate-900">
                <Icons.List size={18} strokeWidth={2.5} />
             </div>
             <div className="font-bold text-sm leading-tight truncate text-slate-900">{widget.title}</div>
          </div>
          <div className="flex-1 flex flex-col justify-end space-y-1.5">
             {topItems.length > 0 ? topItems.map(item => (
                 <div key={item.id} className="flex items-center gap-1.5 text-slate-600">
                     <div className={`w-1 h-1 rounded-full shrink-0 ${item.starred ? 'bg-amber-400' : 'bg-slate-300'}`}></div>
                     <span className="text-[11px] truncate font-medium leading-tight">{item.title}</span>
                 </div>
             )) : (
                 <div className="text-[10px] text-slate-300">暂无待办!</div>
             )}
             {remaining > 0 && <div className="text-[9px] text-slate-400 pl-2.5">还有 {remaining} 项</div>}
          </div>
        </div>
      );
    }
    case WidgetType.RATING: {
      const data = widget.data as { items: RatingItem[] };
      const latest = data.items[0];
      
      if (latest && latest.cover) {
        return (
          <div className="absolute inset-0 flex flex-col">
            <div className="h-[65%] relative overflow-hidden bg-slate-900">
               <div 
                 className="absolute inset-0 bg-cover bg-center opacity-60 blur-xl scale-150"
                 style={{ backgroundImage: `url(${latest.cover})` }}
               />
               <div className="absolute inset-0 flex items-center justify-center p-3 z-10">
                 <img 
                   src={latest.cover} 
                   alt={latest.title} 
                   className="h-full w-auto max-w-full object-contain shadow-2xl rounded-sm"
                 />
               </div>
            </div>
            
            <div className="h-[35%] bg-white px-3 flex flex-col justify-center z-20">
               <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{latest.category}</div>
               <div className="flex justify-between items-center">
                 <div className="font-bold text-slate-900 text-xs leading-tight truncate pr-1 flex-1">{latest.title}</div>
                 <div className="flex items-center gap-0.5 text-amber-500 shrink-0">
                   <span className="text-xs font-bold">{latest.rating}</span>
                   <Icons.Rating size={10} fill="currentColor" />
                 </div>
               </div>
            </div>
          </div>
        );
      }

      return (
        <div className="flex flex-col h-full justify-between p-3">
            <MinimalHeader icon={<Icons.Rating />} title={widget.title} />
            {latest ? (
                <div>
                     <div className="text-sm font-bold text-slate-800 line-clamp-2 leading-tight">{latest.title}</div>
                     <div className="flex justify-between items-end mt-1">
                        <div className="text-[10px] text-slate-500 truncate">{latest.category}</div>
                        <div className="flex items-center gap-0.5 text-amber-500">
                            <span className="text-lg font-bold">{latest.rating}</span>
                            <Icons.Rating size={12} fill="currentColor" />
                        </div>
                     </div>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center text-slate-300 text-[10px]">暂无评分</div>
            )}
        </div>
      );
    }
    case WidgetType.COUNTDOWN: {
      const data = widget.data as { targetDate: string; eventName: string };
      const daysLeft = differenceInDays(new Date(data.targetDate), new Date());
      const isPast = daysLeft < 0;
      const bgColor = widget.color || '#34d399';
      const isLight = LIGHT_BG_COLORS.includes(bgColor.toLowerCase());
      const textColor = isLight ? 'text-slate-900' : 'text-white';
      
      return (
        <div className="absolute inset-0 p-3 flex flex-col justify-between" style={{ backgroundColor: bgColor }}>
          <div className="flex flex-col items-start gap-1">
             <div className={`${isLight ? 'text-slate-900' : 'text-white'}`}>
                <Icons.Calendar size={18} strokeWidth={2.5} />
             </div>
             <div className={`font-bold text-sm leading-tight truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{data.eventName}</div>
          </div>
          <div>
            <div className={`text-4xl font-black tracking-tighter leading-none mb-0.5 ${textColor}`}>
              {Math.abs(daysLeft)}
            </div>
            <div className={`text-[10px] font-bold ${isLight ? 'text-slate-500' : 'text-white/60'}`}>
              {isPast ? '已过去(天)' : '天后'}
            </div>
          </div>
        </div>
      );
    }
    case WidgetType.LAST_DONE: {
      const data = widget.data as { lastDate: number };
      const daysSince = differenceInDays(new Date(), new Date(data.lastDate));
      
      if (widget.color) {
           const isLight = LIGHT_BG_COLORS.includes(widget.color.toLowerCase());
           const textColor = isLight ? 'text-slate-900' : 'text-white';

           return (
            <div className="absolute inset-0 p-3 flex flex-col justify-between" style={{ backgroundColor: widget.color }}>
                <div className="flex flex-col items-start gap-1">
                    <div className={`${isLight ? 'text-slate-900' : 'text-white'}`}>
                        <Icons.LastDone size={18} strokeWidth={2.5} />
                    </div>
                    <div className={`font-bold text-sm leading-tight truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{widget.title}</div>
                </div>
                <div>
                    <div className={`text-4xl font-black tracking-tighter leading-none mb-0.5 ${textColor}`}>
                        {daysSince}
                    </div>
                    <div className={`text-[10px] font-bold ${isLight ? 'text-slate-500' : 'text-white/60'}`}>天前</div>
                </div>
            </div>
           );
      }

      return (
        <div className="flex flex-col h-full justify-between p-3">
          <div className="flex flex-col items-start gap-1">
             <div className="text-slate-900">
                <Icons.LastDone size={18} strokeWidth={2.5} />
             </div>
             <div className="font-bold text-sm leading-tight truncate text-slate-900">{widget.title}</div>
          </div>
          <div className="flex-1 flex items-end justify-end">
             <div className="text-right">
                <div className="text-4xl font-black text-emerald-600 tracking-tighter leading-none">
                    {daysSince}
                </div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">天前</div>
             </div>
          </div>
        </div>
      );
    }
    case WidgetType.PLAN: {
      const data = widget.data as { questions: PlanQuestion[]; records: PlanRecords };
      const today = format(new Date(), 'yyyy-MM-dd');
      const todayRecord = data.records[today] || {};
      const filledCount = Object.keys(todayRecord).length;
      const totalCount = data.questions.length;
      const progress = totalCount === 0 ? 0 : (filledCount / totalCount) * 100;

      return (
        <div className="flex flex-col h-full justify-between p-3">
           <div className="flex flex-col items-start gap-1">
             <div className="text-slate-900">
                <Icons.Plan size={18} strokeWidth={2.5} />
             </div>
             <div className="font-bold text-sm leading-tight truncate text-slate-900">{widget.title}</div>
          </div>
           <div className="flex-1 flex flex-col justify-end">
                <div className="flex justify-between items-end mb-1">
                    <span className="text-[10px] font-bold text-slate-400">今日</span>
                    <span className="text-lg font-black text-[var(--primary-color)]">{Math.round(progress)}%</span>
                </div>
                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--primary-color)] transition-all duration-500" style={{ width: `${progress}%` }}></div>
                </div>
           </div>
        </div>
      );
    }
    case WidgetType.DATA: {
       const data = widget.data as { label: string; unit: string; points: DataPoint[] };
       const lastVal = data.points.length > 0 ? data.points[data.points.length - 1].value : 0;
       return (
         <div className="flex flex-col h-full justify-between p-3 pb-0">
           <div className="flex flex-col items-start gap-1">
             <div className="text-slate-900">
                <Icons.Data size={18} strokeWidth={2.5} />
             </div>
             <div className="font-bold text-sm leading-tight truncate text-slate-900">{widget.title}</div>
          </div>
           <div>
               <div className="text-3xl font-black text-purple-600 tracking-tighter leading-none truncate -ml-0.5">{lastVal}<span className="text-[10px] ml-0.5 text-slate-400 font-medium">{data.unit}</span></div>
           </div>
            <div className="h-10 w-full -mx-3 -mb-1 opacity-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.points.slice(-5)}>
                  <Line type="monotone" dataKey="value" stroke="#9333ea" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
         </div>
       );
    }
    case WidgetType.NOTE: {
        const data = widget.data as { items: NotebookItem[] };
        const latestNote = data.items && data.items.length > 0 ? data.items[0] : null;
        const count = data.items?.length || 0;
        
        return (
            <div className="flex flex-col h-full p-3 bg-yellow-50 justify-between">
                <div className="flex flex-col items-start gap-1">
                    <div className="text-slate-900">
                        <Icons.NoteWidget size={18} strokeWidth={2.5} />
                    </div>
                    <div className="font-bold text-sm leading-tight truncate text-slate-900">{widget.title}</div>
                </div>
                <div className="flex-1 overflow-hidden relative">
                    {latestNote ? (
                         <div className="text-[11px] text-slate-600 font-medium leading-relaxed line-clamp-3 whitespace-pre-wrap" dangerouslySetInnerHTML={{__html: latestNote.content}}></div>
                    ) : (
                        <p className="text-[10px] text-slate-400 italic">空空如也...</p>
                    )}
                </div>
                {count > 0 && (
                    <div className="text-[9px] text-slate-400 text-right mt-0.5">{count} 条笔记</div>
                )}
            </div>
        )
    }
    default: return null;
  }
};

// --- Full Views ---

export const ListFull: React.FC<FullViewProps> = ({ widget, updateWidget, isSelectionMode, setIsSelectionMode }) => {
    const data = widget.data as { items: PlaylistItem[]; categories: string[] };
    const [newItemText, setNewItemText] = useState('');
    const [activeTab, setActiveTab] = useState<string | null>(data.categories[0] || '默认');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newItemCategory, setNewItemCategory] = useState(data.categories[0] || '默认');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [editingItem, setEditingItem] = useState<PlaylistItem | null>(null);
    const [randomItem, setRandomItem] = useState<PlaylistItem | null>(null);

    useEffect(() => {
        if(showAddModal) setNewItemCategory(activeTab || '默认');
    }, [showAddModal, activeTab]);

    useEffect(() => {
        if(!isSelectionMode) setSelectedIds(new Set());
    }, [isSelectionMode]);

    const addItem = () => {
        if (!newItemText.trim()) return;
        const newItem: PlaylistItem = {
            id: Date.now().toString(),
            title: newItemText,
            completed: false,
            category: newItemCategory,
            starred: false
        };
        updateWidget({ ...widget, data: { ...data, items: [newItem, ...data.items] } });
        setNewItemText('');
        setShowAddModal(false);
    };

    const toggleItem = (id: string) => {
        if (isSelectionMode) {
            const newSet = new Set(selectedIds);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            setSelectedIds(newSet);
        } else {
            const newItems = data.items.map(i => i.id === id ? { ...i, completed: !i.completed } : i);
            updateWidget({ ...widget, data: { ...data, items: newItems } });
        }
    };

    const toggleStar = (id: string) => {
        const newItems = data.items.map(i => i.id === id ? { ...i, starred: !i.starred } : i);
        updateWidget({ ...widget, data: { ...data, items: newItems } });
    };

    const deleteItem = (id: string) => {
        updateWidget({ ...widget, data: { ...data, items: data.items.filter(i => i.id !== id) } });
    };

    const deleteSelected = () => {
        if(confirm(`删除选中的 ${selectedIds.size} 项?`)) {
            updateWidget({ ...widget, data: { ...data, items: data.items.filter(i => !selectedIds.has(i.id)) } });
            setSelectedIds(new Set());
            if(setIsSelectionMode) setIsSelectionMode(false);
        }
    };

    const moveSelected = () => {
        const cat = prompt("移动到哪个分类?", data.categories[0]);
        if(cat && data.categories.includes(cat)) {
            const newItems = data.items.map(i => selectedIds.has(i.id) ? { ...i, category: cat } : i);
            updateWidget({ ...widget, data: { ...data, items: newItems } });
            setSelectedIds(new Set());
            if(setIsSelectionMode) setIsSelectionMode(false);
        } else if (cat) alert('分类不存在');
    };

    const filteredItems = data.items.filter(i => i.category === activeTab);
    const sortedItems = [...filteredItems].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (a.starred !== b.starred) return a.starred ? -1 : 1;
        return a.id > b.id ? -1 : 1;
    });

    const handleRandom = () => {
        const candidates = filteredItems.filter(i => !i.completed);
        if (candidates.length === 0) {
            alert("当前没有未完成的项目！");
            return;
        }
        const randomIndex = Math.floor(Math.random() * candidates.length);
        setRandomItem(candidates[randomIndex]);
    };

    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleTouchStart = (item: PlaylistItem) => {
        if(isSelectionMode) return;
        longPressTimer.current = setTimeout(() => { setEditingItem(item); }, 600);
    };
    const handleTouchEnd = () => { if(longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } };

    return (
        <div className="flex flex-col h-full relative pt-4">
            <CategoryTabStrip 
                categories={data.categories} activeCategory={activeTab} onSelect={setActiveTab}
                onAdd={() => { const newCat = prompt("新建分类"); if(newCat && !data.categories.includes(newCat)) { updateWidget({...widget, data: {...data, categories: [...data.categories, newCat]}}); setActiveTab(newCat); } }}
                onEdit={(o, n) => { const newCats = data.categories.map(c => c === o ? n : c); updateWidget({...widget, data: {...data, categories: newCats}}); if(activeTab === o) setActiveTab(n); }}
                onDelete={(n) => { const newCats = data.categories.filter(c => c !== n); updateWidget({...widget, data: {...data, categories: newCats}}); setActiveTab(null); }}
            />
             
            <div className="flex justify-end px-1 mb-2">
                 <button 
                    onClick={handleRandom}
                    className="flex items-center gap-1 bg-white border border-slate-200 text-slate-500 hover:text-[var(--primary-color)] hover:border-[var(--primary-color)] px-3 py-1.5 rounded-full text-xs font-bold transition shadow-sm"
                 >
                     <Icons.Shuffle size={14} /> 随机选择
                 </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pb-24">
                {sortedItems.map(item => (
                    <div key={item.id} onClick={() => isSelectionMode && toggleItem(item.id)} onMouseDown={() => handleTouchStart(item)} onMouseUp={handleTouchEnd} onMouseLeave={handleTouchEnd} onTouchStart={() => handleTouchStart(item)} onTouchEnd={handleTouchEnd} className={`flex items-center gap-3 p-3 bg-white border rounded-xl shadow-sm transition-all select-none active:scale-[0.99] ${item.starred ? 'border-amber-200 bg-amber-50/30' : 'border-slate-100'} ${isSelectionMode && selectedIds.has(item.id) ? 'ring-2 ring-[var(--primary-color)] bg-indigo-50/50' : ''}`}>
                        <button onClick={(e) => { e.stopPropagation(); toggleItem(item.id); }} className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${isSelectionMode ? (selectedIds.has(item.id) ? 'bg-[var(--primary-color)] border-[var(--primary-color)]' : 'border-slate-300 bg-white') : (item.completed ? 'bg-[var(--primary-color)] border-[var(--primary-color)]' : 'border-slate-300 bg-white')}`}>{(isSelectionMode ? selectedIds.has(item.id) : item.completed) && <Icons.Check size={12} className="text-white" />}</button>
                        <span className={`flex-1 text-sm break-all ${item.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{item.title}</span>
                        {!isSelectionMode && (<button onClick={(e) => { e.stopPropagation(); toggleStar(item.id); }} className={`${item.starred ? 'text-amber-400' : 'text-slate-300 hover:text-amber-300'} shrink-0`}><Icons.Rating size={18} fill={item.starred ? "currentColor" : "none"} /></button>)}
                    </div>
                ))}
                {filteredItems.length === 0 && <div className="text-center text-slate-300 text-xs py-8">暂无项目</div>}
            </div>
            {isSelectionMode && (
                <div className="absolute bottom-4 left-4 right-4 z-20"><div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-3 flex justify-around items-center"><button onClick={deleteSelected} disabled={selectedIds.size === 0} className="flex flex-col items-center gap-1 text-red-500 disabled:opacity-50 text-[10px] font-bold"><Icons.Delete size={18}/> 删除</button><button onClick={moveSelected} disabled={selectedIds.size === 0} className="flex flex-col items-center gap-1 text-slate-600 disabled:opacity-50 text-[10px] font-bold"><Icons.Dashboard size={18}/> 分类</button></div></div>
            )}
            {!isSelectionMode && (<div className="absolute bottom-6 right-6 z-10"><button onClick={() => setShowAddModal(true)} className="w-14 h-14 bg-[var(--primary-color)] text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition"><Icons.Plus size={28} /></button></div>)}
            {showAddModal && (<div className="absolute inset-0 z-20 bg-black/50 backdrop-blur-sm flex items-end justify-center sm:items-center p-4 animate-in fade-in"><div className="bg-white w-full rounded-2xl p-5 shadow-2xl animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}><div className="flex justify-between items-center mb-4"><h3 className="font-bold text-slate-800">添加事项</h3><button onClick={() => setShowAddModal(false)} className="p-1 rounded-full bg-slate-100 text-slate-500"><Icons.Close size={20}/></button></div><input autoFocus className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none mb-4" placeholder="输入事项内容..." value={newItemText} onChange={e => setNewItemText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()}/><div className="mb-4"><label className="text-xs font-bold text-slate-400 mb-2 block">分类</label><div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">{data.categories.map(cat => (<button key={cat} onClick={() => setNewItemCategory(cat)} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border ${newItemCategory === cat ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)]' : 'border-slate-200 text-slate-500'}`}>{cat}</button>))}</div></div><button onClick={addItem} className="w-full bg-[var(--primary-color)] text-white py-3 rounded-xl font-bold shadow-md">确认添加</button></div></div>)}
            {editingItem && (<div className="absolute inset-0 z-30 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"><div className="bg-white w-full rounded-2xl p-5 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}><h3 className="font-bold text-slate-800 mb-4">编辑事项</h3><input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none mb-4" value={editingItem.title} onChange={e => setEditingItem({...editingItem, title: e.target.value})}/><div className="flex gap-2"><button onClick={() => { deleteItem(editingItem.id); setEditingItem(null); }} className="flex-1 bg-red-50 text-red-500 py-3 rounded-xl font-bold">删除</button><button onClick={() => { const newItems = data.items.map(i => i.id === editingItem.id ? editingItem : i); updateWidget({...widget, data: {...data, items: newItems}}); setEditingItem(null); }} className="flex-1 bg-[var(--primary-color)] text-white py-3 rounded-xl font-bold">保存</button></div></div></div>)}
            
            {/* Random Result Modal */}
            {randomItem && (
                 <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in" onClick={() => setRandomItem(null)}>
                     <div className="bg-white w-full rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 text-center" onClick={e => e.stopPropagation()}>
                         <div className="w-16 h-16 bg-[var(--primary-color)] rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-lg animate-bounce">
                             <Icons.Shuffle size={32} />
                         </div>
                         <h3 className="text-xl font-black text-slate-800 mb-2">命运的选择</h3>
                         <div className="text-lg text-slate-600 font-medium py-4 border-t border-b border-slate-100 my-4">
                             {randomItem.title}
                         </div>
                         <button onClick={() => setRandomItem(null)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold">
                             太好了!
                         </button>
                     </div>
                 </div>
            )}
        </div>
    );
};

export const RatingFull: React.FC<FullViewProps> = ({ widget, updateWidget, isSelectionMode, setIsSelectionMode }) => {
    // ... same as before
    const data = widget.data as { items: RatingItem[]; categories: string[] };
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [viewingItem, setViewingItem] = useState<RatingItem | null>(null);
    const [editingItem, setEditingItem] = useState<RatingItem | null>(null);
    const [title, setTitle] = useState('');
    const [rating, setRating] = useState(0);
    const [category, setCategory] = useState(data.categories[0] || 'Movie');
    const [cover, setCover] = useState<string>('');
    const [review, setReview] = useState('');
    const [randomItem, setRandomItem] = useState<RatingItem | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { if (!isSelectionMode) setSelectedIds(new Set()); }, [isSelectionMode]);
    useEffect(() => { if (editingItem) { setTitle(editingItem.title); setRating(editingItem.rating); setCategory(editingItem.category); setCover(editingItem.cover || ''); setReview(editingItem.review || ''); setShowAddModal(true); } }, [editingItem]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = (event) => { if (typeof event.target?.result === 'string') setCover(event.target.result); }; reader.readAsDataURL(file); } };
    const handleSave = () => { if (!title.trim()) return; if (editingItem) { const newItems = data.items.map(i => i.id === editingItem.id ? { ...i, title, rating, category, cover: cover || undefined, review: review || undefined } : i); updateWidget({ ...widget, data: { ...data, items: newItems } }); setEditingItem(null); } else { const newItem: RatingItem = { id: Date.now().toString(), title, rating, category, cover: cover || undefined, review: review || undefined }; updateWidget({ ...widget, data: { ...data, items: [newItem, ...data.items] } }); } setTitle(''); setRating(0); setCover(''); setReview(''); setShowAddModal(false); };
    const toggleSelection = (id: string) => { const newSet = new Set(selectedIds); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); setSelectedIds(newSet); };
    const deleteSelected = () => { if(confirm(`删除选中的 ${selectedIds.size} 项?`)) { updateWidget({ ...widget, data: { ...data, items: data.items.filter(i => !selectedIds.has(i.id)) } }); setSelectedIds(new Set()); if(setIsSelectionMode) setIsSelectionMode(false); } };
    const moveSelected = () => { const cat = prompt("移动到哪个分类?", data.categories[0]); if(cat && data.categories.includes(cat)) { const newItems = data.items.map(i => selectedIds.has(i.id) ? { ...i, category: cat } : i); updateWidget({ ...widget, data: { ...data, items: newItems } }); setSelectedIds(new Set()); if(setIsSelectionMode) setIsSelectionMode(false); } else if (cat) alert('分类不存在'); };
    const deleteItem = (id: string) => { updateWidget({ ...widget, data: { ...data, items: data.items.filter(i => i.id !== id) } }); };
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleTouchStart = (item: RatingItem) => { if(isSelectionMode) return; longPressTimer.current = setTimeout(() => { setEditingItem(item); }, 600); };
    const handleTouchEnd = () => { if(longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } };
    const filteredItems = activeCategory ? data.items.filter(i => i.category === activeCategory) : data.items;

    const handleRandom = () => {
        if (filteredItems.length === 0) {
            alert("当前列表为空！");
            return;
        }
        const randomIndex = Math.floor(Math.random() * filteredItems.length);
        setRandomItem(filteredItems[randomIndex]);
    };

    return (
        <div className="flex flex-col h-full relative pt-4">
            <CategoryTabStrip categories={data.categories} activeCategory={activeCategory} onSelect={setActiveCategory} onAdd={() => { const newCat = prompt("新建分类"); if(newCat && !data.categories.includes(newCat)) { updateWidget({...widget, data: {...data, categories: [...data.categories, newCat]}}); setActiveCategory(newCat); } }} onEdit={(o, n) => { const newCats = data.categories.map(c => c === o ? n : c); updateWidget({...widget, data: {...data, categories: newCats}}); if(activeCategory === o) setActiveCategory(n); }} onDelete={(n) => { const newCats = data.categories.filter(c => c !== n); updateWidget({...widget, data: {...data, categories: newCats}}); setActiveCategory(null); }} />
            
             <div className="flex justify-end px-1 mb-2">
                 <button 
                    onClick={handleRandom}
                    className="flex items-center gap-1 bg-white border border-slate-200 text-slate-500 hover:text-[var(--primary-color)] hover:border-[var(--primary-color)] px-3 py-1.5 rounded-full text-xs font-bold transition shadow-sm"
                 >
                     <Icons.Shuffle size={14} /> 随机回顾
                 </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pb-24">
                {filteredItems.map(item => (
                    <div key={item.id} onClick={() => { if (isSelectionMode) toggleSelection(item.id); else setViewingItem(item); }} onMouseDown={() => handleTouchStart(item)} onMouseUp={handleTouchEnd} onMouseLeave={handleTouchEnd} onTouchStart={() => handleTouchStart(item)} onTouchEnd={handleTouchEnd} className={`flex gap-3 p-3 bg-white rounded-xl border shadow-sm relative overflow-hidden active:scale-[0.99] transition-all ${isSelectionMode && selectedIds.has(item.id) ? 'ring-2 ring-[var(--primary-color)] bg-indigo-50/30 border-[var(--primary-color)]' : 'border-slate-100'}`}>
                        {isSelectionMode && (<div className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition z-10 ${selectedIds.has(item.id) ? 'bg-[var(--primary-color)] border-[var(--primary-color)]' : 'border-slate-200 bg-white'}`}>{selectedIds.has(item.id) && <Icons.Check size={12} className="text-white" strokeWidth={4} />}</div>)}
                        {item.cover && (<div className="w-16 h-20 shrink-0 rounded-lg overflow-hidden bg-slate-100"><img src={item.cover} className="w-full h-full object-cover" alt={item.title} /></div>)}
                        <div className="flex-1 min-w-0 flex flex-col"><div className="flex justify-between items-start"><div className="font-bold text-slate-800 truncate pr-2">{item.title}</div><div className="flex items-center gap-1 text-amber-400 shrink-0"><span className="font-bold text-sm">{item.rating}</span><Icons.Rating size={12} fill="currentColor" /></div></div><div className="text-xs text-slate-400 mt-0.5 mb-1">{item.category}</div>{item.review && (<div className="text-xs text-slate-600 line-clamp-2 mt-auto bg-slate-50 p-1.5 rounded">{item.review}</div>)}{!isSelectionMode && (<div className="flex justify-end mt-1"><button onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }} className="text-slate-300 hover:text-red-400 opacity-0"><Icons.Delete size={14} /></button></div>)}</div>
                    </div>
                ))}
            </div>
            {isSelectionMode && (<div className="absolute bottom-4 left-4 right-4 z-20"><div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-3 flex justify-around items-center"><button onClick={deleteSelected} disabled={selectedIds.size === 0} className="flex flex-col items-center gap-1 text-red-500 disabled:opacity-50 text-[10px] font-bold"><Icons.Delete size={18}/> 删除</button><button onClick={moveSelected} disabled={selectedIds.size === 0} className="flex flex-col items-center gap-1 text-slate-600 disabled:opacity-50 text-[10px] font-bold"><Icons.Dashboard size={18}/> 分类</button></div></div>)}
            {!isSelectionMode && (<div className="absolute bottom-6 right-6 z-10"><button onClick={() => { setEditingItem(null); setTitle(''); setRating(0); setCover(''); setReview(''); setShowAddModal(true); }} className="w-14 h-14 bg-[var(--primary-color)] text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition"><Icons.Plus size={28} /></button></div>)}
            {viewingItem && (<div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in" onClick={() => setViewingItem(null)}><div className="bg-white w-full rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>{viewingItem.cover ? (<div className="w-full aspect-[3/4] max-h-[50vh] bg-slate-100 relative"><img src={viewingItem.cover} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4 text-white"><h3 className="text-xl font-bold leading-tight">{viewingItem.title}</h3><div className="flex items-center gap-1 text-amber-400 mt-1"><span className="font-bold">{viewingItem.rating}</span><Icons.Rating size={16} fill="currentColor" /><span className="text-xs text-white/70 ml-2 px-2 py-0.5 bg-white/20 rounded-full backdrop-blur-md">{viewingItem.category}</span></div></div></div>) : (<div className="p-6 pb-2"><h3 className="text-xl font-bold text-slate-800 leading-tight">{viewingItem.title}</h3><div className="flex items-center gap-1 text-amber-400 mt-1"><span className="font-bold">{viewingItem.rating}</span><Icons.Rating size={16} fill="currentColor" /><span className="text-xs text-slate-400 ml-2 px-2 py-0.5 bg-slate-100 rounded-full">{viewingItem.category}</span></div></div>)}<div className="p-6 overflow-y-auto flex-1 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{viewingItem.review || <span className="italic text-slate-300">暂无评价...</span>}</div></div></div>)}
            {showAddModal && (<div className="absolute inset-0 z-20 bg-black/50 backdrop-blur-sm flex items-end justify-center sm:items-center p-4 animate-in fade-in"><div className="bg-white w-full rounded-2xl p-5 shadow-2xl animate-in slide-in-from-bottom-10 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}><div className="flex justify-between items-center mb-4"><h3 className="font-bold text-slate-800">{editingItem ? '编辑记录' : '记录书影音'}</h3><button onClick={() => setShowAddModal(false)} className="p-1 rounded-full bg-slate-100 text-slate-500"><Icons.Close size={20}/></button></div><div className="flex gap-4 mb-4"><div onClick={() => fileInputRef.current?.click()} className="w-24 h-32 bg-slate-100 rounded-lg flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-200 transition shrink-0 overflow-hidden relative">{cover ? (<img src={cover} className="w-full h-full object-cover" alt="cover" />) : (<><Icons.Image size={24} /><span className="text-[10px] mt-1">封面</span></>)}<input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} /></div><div className="flex-1 space-y-3"><input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none font-bold" placeholder="名称..." value={title} onChange={e => setTitle(e.target.value)} /><div><label className="text-[10px] font-bold text-slate-400 mb-1 block">分类</label><select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg px-2 py-2 outline-none">{data.categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div><div><label className="text-[10px] font-bold text-slate-400 mb-1 block">评分</label><div className="flex gap-1">{[1, 2, 3, 4, 5].map(v => (<button key={v} onClick={() => setRating(v)} className={`${rating >= v ? 'text-amber-400' : 'text-slate-200'}`}><Icons.Rating size={20} fill="currentColor" /></button>))}</div></div></div></div><textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none mb-4 min-h-[80px]" placeholder="写点评价..." value={review} onChange={e => setReview(e.target.value)} /><button onClick={handleSave} className="w-full bg-[var(--primary-color)] text-white py-3 rounded-xl font-bold shadow-md">{editingItem ? '保存修改' : '保存记录'}</button></div></div>)}
            
            {/* Random Result Modal */}
            {randomItem && (
                 <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in" onClick={() => setRandomItem(null)}>
                     <div className="bg-white w-full rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 text-center flex flex-col items-center" onClick={e => e.stopPropagation()}>
                         <div className="w-16 h-16 bg-[var(--primary-color)] rounded-full flex items-center justify-center mb-4 text-white shadow-lg animate-bounce">
                             <Icons.Shuffle size={32} />
                         </div>
                         <h3 className="text-xl font-black text-slate-800 mb-2">随机回顾</h3>
                         
                         {randomItem.cover && (
                             <div className="w-24 h-32 rounded-lg overflow-hidden shadow-md my-4">
                                 <img src={randomItem.cover} className="w-full h-full object-cover" />
                             </div>
                         )}

                         <div className="text-lg text-slate-800 font-bold py-2">
                             {randomItem.title}
                         </div>
                         
                         <div className="flex items-center gap-1 text-amber-500 mb-6 justify-center">
                            <span className="font-bold">{randomItem.rating}</span>
                            <Icons.Rating size={16} fill="currentColor" />
                         </div>

                         <button onClick={() => setRandomItem(null)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold">
                             就它了!
                         </button>
                     </div>
                 </div>
            )}
        </div>
    );
};

export const CountdownFull: React.FC<FullViewProps> = ({ widget, updateWidget }) => {
    // ... existing CountdownFull
    const data = widget.data as { targetDate: string; eventName: string };
    const [date, setDate] = useState(data.targetDate);
    const [name, setName] = useState(data.eventName);
    
    useEffect(() => {
        if (date !== data.targetDate || name !== data.eventName) {
            const timeout = setTimeout(() => {
                updateWidget({ ...widget, data: { targetDate: date, eventName: name } });
            }, 500);
            return () => clearTimeout(timeout);
        }
    }, [date, name]);

    const handleColorChange = (color: string) => {
        updateWidget({ ...widget, color });
    };

    return (
        <div className="space-y-6 pt-4">
            <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-400">事件名称</label>
                <input 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-[var(--primary-color)] transition"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="输入事件..."
                />
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-400">目标日期</label>
                <input 
                    type="date"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-[var(--primary-color)] transition"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                />
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-400">卡片颜色</label>
                <div className="flex gap-3 flex-wrap">
                    {COLORS.map(c => (
                        <button 
                            key={c}
                            onClick={() => handleColorChange(c)}
                            className={`w-10 h-10 rounded-full border-2 transition-transform ${widget.color === c ? 'scale-110 border-slate-400' : 'border-transparent hover:scale-105'}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export const LastDoneFull: React.FC<FullViewProps> = ({ widget, updateWidget }) => {
    // ... existing LastDoneFull
    const data = widget.data as { lastDate: number; frequencyDays: number; history?: number[] };
    const [freq, setFreq] = useState(data.frequencyDays.toString());
    const daysSince = differenceInDays(new Date(), new Date(data.lastDate));

    const handleDoIt = () => {
        const now = Date.now();
        const newHistory = [now, ...(data.history || [])].slice(0, 20); // keep last 20
        updateWidget({ ...widget, data: { ...data, lastDate: now, history: newHistory } });
    };

    const handleFreqChange = (val: string) => {
        setFreq(val);
        const days = parseInt(val);
        if (!isNaN(days) && days > 0) {
            updateWidget({ ...widget, data: { ...data, frequencyDays: days } });
        }
    };

    const handleColorChange = (color: string) => {
        updateWidget({ ...widget, color });
    };

    return (
        <div className="space-y-8 pt-4">
             <div className="flex flex-col items-center justify-center py-6">
                 <div className="text-[100px] font-black leading-none tracking-tighter text-[var(--primary-color)]">
                     {daysSince}
                 </div>
                 <div className="text-slate-400 font-bold tracking-widest uppercase">天前</div>
             </div>

             <button 
                onClick={handleDoIt}
                className="w-full py-4 bg-[var(--primary-color)] text-white text-xl font-bold rounded-2xl shadow-lg active:scale-95 transition flex items-center justify-center gap-2"
             >
                 <Icons.Check size={28} /> 刚刚做了!
             </button>

             <div className="space-y-4">
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-400">重复频率 (天)</label>
                    <input 
                        type="number"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-[var(--primary-color)] transition"
                        value={freq}
                        onChange={e => handleFreqChange(e.target.value)}
                    />
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-400 mb-2 block">背景颜色</label>
                    <div className="flex gap-3 flex-wrap">
                        {COLORS.map(c => (
                            <button 
                                key={c}
                                onClick={() => handleColorChange(c)}
                                className={`w-10 h-10 rounded-full border-2 transition-transform ${widget.color === c ? 'scale-110 border-slate-400' : 'border-transparent hover:scale-105'}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                </div>

                {data.history && data.history.length > 0 && (
                    <div className="pt-4 border-t border-slate-100">
                        <label className="text-xs font-bold text-slate-400 mb-2 block">历史记录</label>
                        <div className="space-y-2">
                            {data.history.map((ts, idx) => (
                                <div key={idx} className="flex justify-between text-sm text-slate-600 bg-slate-50 p-2 rounded-lg">
                                    <span>{format(ts, 'yyyy-MM-dd HH:mm')}</span>
                                    <span className="text-slate-400 text-xs">记录</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
             </div>
        </div>
    );
};

export const PlanFull: React.FC<FullViewProps> = ({ widget, updateWidget }) => {
    // ... existing PlanFull
    const data = widget.data as { questions: PlanQuestion[]; records: PlanRecords };
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [editMode, setEditMode] = useState(false);
    
    // Generate simple calendar strip (last 7 days)
    const dates = eachDayOfInterval({
        start: subDays(new Date(), 6),
        end: new Date()
    });

    const currentRecord = data.records[selectedDate] || {};

    const handleAnswerChange = (qId: string, text: string) => {
        const newRecord = { ...currentRecord, [qId]: text };
        const newRecords = { ...data.records, [selectedDate]: newRecord };
        updateWidget({ ...widget, data: { ...data, records: newRecords } });
    };

    const addQuestion = () => {
        const text = prompt("输入新问题:");
        if (text) {
            const newQ = { id: Date.now().toString(), text };
            updateWidget({ ...widget, data: { ...data, questions: [...data.questions, newQ] } });
        }
    };

    const deleteQuestion = (id: string) => {
        if (confirm("删除此问题?")) {
            updateWidget({ ...widget, data: { ...data, questions: data.questions.filter(q => q.id !== id) } });
        }
    };

    return (
        <div className="flex flex-col h-full pt-4">
             {/* Date Strip */}
             <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                 {dates.map(d => {
                     const dateStr = format(d, 'yyyy-MM-dd');
                     const isSelected = dateStr === selectedDate;
                     const isT = isToday(d);
                     return (
                         <button 
                            key={dateStr}
                            onClick={() => setSelectedDate(dateStr)}
                            className={`flex-none flex flex-col items-center justify-center w-14 h-16 rounded-xl border transition ${isSelected ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)] shadow-md' : 'bg-white border-slate-200 text-slate-500'}`}
                         >
                             <span className="text-[10px] font-bold uppercase">{isT ? '今' : format(d, 'EEE', { locale: zhCN })}</span>
                             <span className="text-lg font-black">{format(d, 'd')}</span>
                         </button>
                     );
                 })}
             </div>

             <div className="flex justify-between items-center mb-2 mt-2">
                 <h3 className="font-bold text-slate-800">
                     {isToday(parseISO(selectedDate)) ? '今日复盘' : selectedDate}
                 </h3>
                 <button onClick={() => setEditMode(!editMode)} className="text-xs text-slate-400 px-2 py-1 rounded bg-slate-100 hover:text-[var(--primary-color)]">
                     {editMode ? '完成设置' : '管理问题'}
                 </button>
             </div>

             <div className="flex-1 overflow-y-auto space-y-4 pb-12">
                 {data.questions.map(q => (
                     <div key={q.id} className="space-y-2">
                         <div className="flex justify-between">
                            <label className="text-sm font-bold text-slate-600 flex-1">{q.text}</label>
                            {editMode && <button onClick={() => deleteQuestion(q.id)} className="text-red-400 ml-2"><Icons.Close size={16} /></button>}
                         </div>
                         {!editMode && (
                             <textarea 
                                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-700 outline-none focus:border-[var(--primary-color)] focus:ring-1 focus:ring-[var(--primary-color)] transition min-h-[80px]"
                                placeholder="写下你的想法..."
                                value={currentRecord[q.id] || ''}
                                onChange={e => handleAnswerChange(q.id, e.target.value)}
                             />
                         )}
                     </div>
                 ))}
                 {editMode && (
                     <button onClick={addQuestion} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-bold hover:border-[var(--primary-color)] hover:text-[var(--primary-color)]">
                         + 添加问题
                     </button>
                 )}
             </div>
        </div>
    );
};

export const DataFull: React.FC<FullViewProps> = ({ widget, updateWidget }) => {
    const data = widget.data as { label: string; unit: string; points: DataPoint[] };
    const [val, setVal] = useState('');
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    const handleAdd = () => {
        const num = parseFloat(val);
        if (isNaN(num)) return;
        
        // Remove existing point for same date if exists, then add new
        const newPoints = data.points.filter(p => p.date !== date);
        newPoints.push({ date, value: num });
        newPoints.sort((a, b) => a.date > b.date ? 1 : -1);
        
        updateWidget({ ...widget, data: { ...data, points: newPoints } });
        setVal('');
    };

    const handleDelete = (d: string) => {
        updateWidget({ ...widget, data: { ...data, points: data.points.filter(p => p.date !== d) } });
    };

    return (
        <div className="flex flex-col h-full pt-4 space-y-6">
            <div className="h-48 w-full bg-slate-50 rounded-2xl p-2 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.points}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" tick={{fontSize: 10}} tickFormatter={d => d.slice(5)} stroke="#94a3b8" />
                        <YAxis tick={{fontSize: 10}} stroke="#94a3b8" />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="#9333ea" strokeWidth={3} dot={{r: 4, fill: '#9333ea'}} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="flex gap-2 items-end">
                <div className="flex-1">
                    <label className="text-[10px] font-bold text-slate-400 mb-1 block">日期</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none" />
                </div>
                <div className="flex-1">
                    <label className="text-[10px] font-bold text-slate-400 mb-1 block">数值 ({data.unit})</label>
                    <input type="number" value={val} onChange={e => setVal(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none" placeholder="0.0" />
                </div>
            </div>
            
            <button onClick={handleAdd} className="w-full bg-slate-900 text-white p-3 rounded-xl hover:bg-slate-700 transition flex items-center justify-center gap-2 font-bold shadow-md active:scale-[0.98]">
                <Icons.Plus size={20} /> 记录数据
            </button>

            <div className="flex justify-between items-center mt-2">
                 <h4 className="font-bold text-slate-800">历史数据</h4>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pb-12">
                {[...data.points].reverse().map((p, i) => (
                    <div key={p.date} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl">
                        <span className="text-slate-500 text-sm font-medium">{p.date}</span>
                        <div className="flex items-center gap-4">
                            <span className="font-bold text-slate-800">{p.value} <span className="text-xs text-slate-400 font-normal">{data.unit}</span></span>
                            <button onClick={() => handleDelete(p.date)} className="text-slate-300 hover:text-red-400"><Icons.Close size={16} /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const NoteFull: React.FC<FullViewProps> = ({ widget, updateWidget, isSelectionMode, setIsSelectionMode, onImageClick, searchQuery }) => {
    const data = widget.data as { items: NotebookItem[] };
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [editingNote, setEditingNote] = useState<NotebookItem | null>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showTagMenu, setShowTagMenu] = useState(false);

    useEffect(() => { if (!isSelectionMode) setSelectedIds(new Set()); }, [isSelectionMode]);

    const items = data.items || [];
    const allTags = Array.from(new Set(items.flatMap(i => i.tags)));
    const recentTags = allTags.slice(0, 8);

    const filteredItems = searchQuery 
        ? items.filter(i => i.content.toLowerCase().includes(searchQuery.toLowerCase()) || i.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())))
        : items;

    const handleSave = () => {
        if (!editorRef.current) return;
        const content = editorRef.current.innerHTML;
        if (!editorRef.current.innerText.trim() && !content.includes('<img')) return;

        const timestamp = Date.now();
        const textContent = editorRef.current.innerText || '';
        const regex = /#[\w\u4e00-\u9fa5]+/g;
        const tags = textContent.match(regex)?.map(t => t.substring(1)) || [];

        if (editingNote) {
            const newItems = data.items.map(i => i.id === editingNote.id ? { ...i, content, tags } : i);
            updateWidget({ ...widget, data: { ...data, items: newItems } });
            setEditingNote(null);
        } else {
            const newItem: NotebookItem = { id: timestamp.toString(), content, tags, createdAt: timestamp };
            updateWidget({ ...widget, data: { ...data, items: [newItem, ...data.items] } });
        }
        editorRef.current.innerHTML = '';
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
        setSelectedIds(newSet);
    };

    const deleteSelected = () => {
        if (confirm(`删除选中 ${selectedIds.size} 条笔记?`)) {
            updateWidget({ ...widget, data: { ...data, items: data.items.filter(i => !selectedIds.has(i.id)) } });
            setSelectedIds(new Set());
            if (setIsSelectionMode) setIsSelectionMode(false);
        }
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
            reader.onload = (event) => {
                if (typeof event.target?.result === 'string') {
                    editorRef.current?.focus();
                    document.execCommand('insertImage', false, event.target.result);
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

    const startEditing = (item: NotebookItem) => {
        if (isSelectionMode) return;
        setEditingNote(item);
    };

    useEffect(() => {
        if (editingNote && editorRef.current) {
            editorRef.current.innerHTML = editingNote.content;
            // focus logic if needed
        }
    }, [editingNote]);

    return (
        <div className="flex flex-col h-full relative pt-2">
            <div className="flex-1 overflow-y-auto space-y-3 pb-40 no-scrollbar px-1">
                {filteredItems.map(item => (
                    <div 
                        key={item.id} 
                        onClick={() => isSelectionMode ? toggleSelection(item.id) : startEditing(item)}
                        className={`bg-white p-3 rounded-xl border shadow-sm relative overflow-hidden active:scale-[0.99] transition-all 
                            ${isSelectionMode && selectedIds.has(item.id) ? 'ring-2 ring-[var(--primary-color)] bg-indigo-50/20 border-transparent' : 'border-slate-100'}
                            ${editingNote?.id === item.id ? 'ring-2 ring-[var(--primary-color)] border-transparent' : ''}
                        `}
                    >
                         {isSelectionMode && (
                            <div className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-white ${selectedIds.has(item.id) ? 'bg-[var(--primary-color)] border-[var(--primary-color)]' : 'border-slate-200'}`}>
                                {selectedIds.has(item.id) && <Icons.Check size={12} className="text-white" />}
                            </div>
                        )}
                        <div 
                             className="text-sm text-slate-700 leading-relaxed max-h-32 overflow-hidden relative pointer-events-none prose prose-sm max-w-none [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5"
                             dangerouslySetInnerHTML={{__html: item.content}} 
                        />
                        <div className="mt-2 flex justify-between items-center">
                            <div className="flex gap-1 flex-wrap">
                                {item.tags.map(t => <span key={t} className="text-[9px] bg-slate-50 text-slate-400 px-1.5 py-0.5 rounded font-medium">#{t}</span>)}
                            </div>
                            <span className="text-[9px] text-slate-300">{format(item.createdAt, 'MM-dd')}</span>
                        </div>
                    </div>
                ))}
                {items.length === 0 && <div className="text-center text-slate-300 text-xs py-10">暂无笔记</div>}
            </div>

            {/* Input Area */}
            {!isSelectionMode && (
                <div className="absolute bottom-0 left-0 right-0 -mx-6 bg-white border-t border-slate-100 z-30">
                    {showTagMenu && (
                        <div className="absolute bottom-[100%] left-4 w-48 bg-white rounded-xl shadow-xl border border-slate-200 p-2 grid grid-cols-2 gap-1 animate-in slide-in-from-bottom-2 z-[70]">
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
                            className="w-full text-slate-800 placeholder-slate-400 outline-none bg-transparent min-h-[80px] text-sm leading-relaxed empty:before:content-['添加笔记...'] empty:before:text-slate-300 
                                        [&>ul]:list-disc [&>ul]:pl-5 
                                        [&_img]:max-w-[25%] [&_img]:inline-block [&_img]:m-1 [&_img]:object-cover [&_img]:rounded-lg"
                        />
                        <div className="flex justify-end mt-2 items-center gap-2">
                            {editingNote && (
                                <button 
                                    onClick={() => { setEditingNote(null); if(editorRef.current) editorRef.current.innerHTML=''; }}
                                    className="text-slate-400 hover:text-slate-600 text-xs font-bold px-3 py-1.5"
                                >
                                    取消编辑
                                </button>
                            )}
                            <button 
                                onClick={handleSave}
                                className={`bg-slate-900 text-white px-5 py-2 rounded-full text-xs font-bold hover:bg-slate-800 transition flex items-center gap-1 shadow-md ${editingNote ? 'bg-[var(--primary-color)]' : ''}`}
                            >
                                {editingNote ? '更新' : '保存'} <Icons.ArrowRight size={12} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isSelectionMode && (
                <div className="absolute bottom-4 left-4 right-4 z-20">
                    <button onClick={deleteSelected} disabled={selectedIds.size === 0} className="w-full bg-white border border-slate-200 text-red-500 font-bold py-3 rounded-2xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                        <Icons.Delete size={18}/> 删除选中 ({selectedIds.size})
                    </button>
                </div>
            )}
        </div>
    );
};
