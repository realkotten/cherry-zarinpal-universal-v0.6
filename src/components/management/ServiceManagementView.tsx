import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle, ArrowRight, ChevronDown, ChevronUp, FolderPlus, Plus, Scissors, Search, Sparkles,
} from 'lucide-react';
import { Service, ServiceCategory, ServiceInput } from '../../types';
import { useAtelier } from '../../store/AtelierContext';
import { useDragList } from '../../hooks/useDragList';
import { CategorySection } from './CategorySection';
import { ServiceFormModal } from './ServiceFormModal';
import { CategoryFormModal } from './CategoryFormModal';
import { AccoutrementsManagementSection } from './AccoutrementsManagementSection';
import { toPersianDigits } from '../../utils/dateUtils';

interface ServiceManagementViewProps {
  onBack?: () => void;
}

export const ServiceManagementView: React.FC<ServiceManagementViewProps> = ({ onBack }) => {
  const {
    categories, services, accoutrements, moveCategory, reorderCategories,
    addCategory, updateCategory, deleteCategory,
    addService, updateService,
  } = useAtelier();

  const [activeCatalogTab, setActiveCatalogTab] = useState<'main' | 'accoutrements'>('main');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // Modals
  const [serviceModal, setServiceModal] = useState<{
    open: boolean;
    editing: Service | null;
    presetCatId?: string;
  }>({ open: false, editing: null });

  const [categoryModal, setCategoryModal] = useState<{
    open: boolean;
    editing: ServiceCategory | null;
  }>({ open: false, editing: null });

  const [deleteCatTarget, setDeleteCatTarget] = useState<ServiceCategory | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  );

  const catDrag = useDragList(
    sortedCategories.map((c) => c.id),
    reorderCategories
  );

  const displayedCategories = useMemo(() => {
    const map = new Map(sortedCategories.map((c) => [c.id, c] as const));
    return catDrag.displayOrder.map((id) => map.get(id)).filter((c): c is ServiceCategory => Boolean(c));
  }, [sortedCategories, catDrag.displayOrder]);

  return (
    <div
      className="pb-12 pt-1 w-full"
      dir="rtl"
    >
      <div className="w-full space-y-3.5">
        {/* Header */}
        <div className="apple-glass-card rounded-[26px] p-3.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="rounded-xl apple-3d-tile p-2 text-stone-600 transition-colors hover:bg-white"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            ) : (
              <div className="w-9 h-9 rounded-2xl apple-3d-tile text-[#721c24] bg-[#f6f2f4] border border-[#d9c5cb] flex items-center justify-center shrink-0">
                <Scissors className="w-4 h-4 text-[#721c24]" />
              </div>
            )}
            <div>
              <h1 className="text-xs sm:text-sm font-serif font-bold text-stone-900">مدیریت خدمات و قیمت‌ها</h1>
              <p className="text-[10px] text-stone-500">
                {activeCatalogTab === 'main'
                  ? `${toPersianDigits(categories.length)} دسته‌بندی · ${toPersianDigits(services.length)} خدمت اصلی`
                  : `${toPersianDigits(accoutrements.length)} خدمت مکمل و مراقبتی`}
              </p>
            </div>
          </div>

          {activeCatalogTab === 'main' && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCategoryModal({ open: true, editing: null })}
                className="flex items-center gap-1 rounded-2xl apple-3d-tile px-2.5 py-1.5 text-[11px] font-bold text-stone-700 hover:bg-white cursor-pointer"
              >
                <FolderPlus className="h-3.5 w-3.5 text-[#721c24]" />
                <span className="hidden sm:inline">دسته جدید</span>
              </button>
              <button
                type="button"
                onClick={() => setServiceModal({ open: true, editing: null })}
                className="flex items-center gap-1 rounded-2xl bg-[#721c24] px-3 py-1.5 text-[11px] font-bold text-white shadow-xs hover:bg-[#5c131a] cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>خدمت جدید</span>
              </button>
            </div>
          )}
        </div>

        {/* Tab Switcher: Main Services vs Additional Services (Accoutrements) */}
        <div className="flex items-center gap-1.5 rounded-[22px] apple-glass-subtle p-1.5">
          <button
            type="button"
            onClick={() => setActiveCatalogTab('main')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-2xl py-2 text-xs font-bold transition-all cursor-pointer ${
              activeCatalogTab === 'main'
                ? 'bg-[#721c24] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/75'
            }`}
          >
            <Scissors className={`h-3.5 w-3.5 ${activeCatalogTab === 'main' ? 'text-[#d9c5cb]' : 'text-[#721c24]'}`} />
            <span>خدمات اصلی ({toPersianDigits(services.length)})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveCatalogTab('accoutrements')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-2xl py-2 text-xs font-bold transition-all cursor-pointer ${
              activeCatalogTab === 'accoutrements'
                ? 'bg-[#721c24] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/75'
            }`}
          >
            <Sparkles className={`h-3.5 w-3.5 ${activeCatalogTab === 'accoutrements' ? 'text-[#d9c5cb]' : 'text-[#721c24]'}`} />
            <span>خدمات مکمل ({toPersianDigits(accoutrements.length)})</span>
          </button>
        </div>

        {/* Main Services Tab Content */}
        {activeCatalogTab === 'main' ? (
          <div className="space-y-3.5">
            {/* Search */}
            <div className="relative">
              <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجوی نام خدمت یا دسته..."
                className="w-full rounded-2xl border border-slate-200/90 bg-white/85 py-2.5 pl-3 pr-9 text-xs font-medium text-stone-800 placeholder-stone-400 shadow-2xs backdrop-blur-md outline-none focus:border-[#721c24] focus:ring-2 focus:ring-[#721c24]/20"
              />
            </div>

            {/* Categories list */}
            <div className="space-y-3">
              {displayedCategories.map((category, index) => (
                <div
                  key={category.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    catDrag.handleDragOver(category.id);
                  }}
                  onDrop={(e) => e.preventDefault()}
                  onDragEnd={catDrag.handleDragEnd}
                  className="relative w-full"
                >
                  {/* Category-level arrow reordering buttons for touch */}
                  <div className="absolute left-2 top-2 z-10 flex gap-0.5 sm:hidden">
                    <button
                      type="button"
                      title="جابه‌جایی دسته به بالا"
                      disabled={index === 0}
                      onClick={() => moveCategory(category.id, 'up')}
                      className="rounded bg-white/80 p-1 text-stone-500 shadow-sm disabled:opacity-25"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      title="جابه‌جایی دسته به پایین"
                      disabled={index === displayedCategories.length - 1}
                      onClick={() => moveCategory(category.id, 'down')}
                      className="rounded bg-white/80 p-1 text-stone-500 shadow-sm disabled:opacity-25"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>

                  <CategorySection
                    category={category}
                    onToast={showToast}
                    onAddService={(cid) => setServiceModal({ open: true, editing: null, presetCatId: cid })}
                    onEditService={(svc) => setServiceModal({ open: true, editing: svc })}
                    onEditCategory={(cat) => setCategoryModal({ open: true, editing: cat })}
                    onDeleteCategory={(cat) => setDeleteCatTarget(cat)}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Accoutrements (Additional Services) Tab Content */
          <AccoutrementsManagementSection onToast={showToast} />
        )}
      </div>

      {/* Service Modal */}
      <ServiceFormModal
        isOpen={serviceModal.open}
        editing={serviceModal.editing}
        presetCategoryId={serviceModal.presetCatId}
        categories={categories}
        onClose={() => setServiceModal({ open: false, editing: null })}
        onSubmit={(input: ServiceInput) => {
          const result = serviceModal.editing
            ? updateService(serviceModal.editing.id, input)
            : addService(input);
          if (result.success) {
            showToast(serviceModal.editing ? 'تغییرات ذخیره شد' : 'خدمت جدید اضافه شد');
            setServiceModal({ open: false, editing: null });
          }
          return result;
        }}
      />

      {/* Category Modal */}
      <CategoryFormModal
        isOpen={categoryModal.open}
        editing={categoryModal.editing}
        onClose={() => setCategoryModal({ open: false, editing: null })}
        onSubmit={(name: string) => {
          const result = categoryModal.editing
            ? updateCategory(categoryModal.editing.id, { name })
            : addCategory(name);
          if (result.success) {
            showToast(categoryModal.editing ? 'نام دسته تغییر کرد' : 'دسته‌بندی جدید ایجاد شد');
            setCategoryModal({ open: false, editing: null });
          }
          return result;
        }}
      />

      {/* Delete Category Modal */}
      <AnimatePresence>
        {deleteCatTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4 backdrop-blur-sm"
            onClick={() => setDeleteCatTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              dir="rtl"
              className="w-full max-w-sm rounded-[24px] bg-white p-5 shadow-2xl"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-rose-50 p-2">
                  <AlertTriangle className="h-5 w-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-stone-900">حذف دسته‌بندی</h3>
                  <p className="mt-1.5 text-xs leading-5 text-stone-500">
                    آیا از حذف دسته‌بندی «{deleteCatTarget.name}» مطمئن هستید؟
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const res = deleteCategory(deleteCatTarget.id);
                    if (res.success) {
                      showToast(`«${deleteCatTarget.name}» حذف شد`);
                      setDeleteCatTarget(null);
                    } else {
                      showToast(res.message ?? 'خطا در حذف دسته‌بندی');
                    }
                  }}
                  className="rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-700"
                >
                  حذف دسته‌بندی
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteCatTarget(null)}
                  className="rounded-xl border border-stone-200 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50"
                >
                  انصراف
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-stone-900/90 px-4 py-2 text-xs font-bold text-white shadow-xl backdrop-blur-md"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
