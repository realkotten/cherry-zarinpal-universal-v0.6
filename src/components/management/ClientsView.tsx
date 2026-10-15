import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  X, 
  UserPlus, 
  Crown, 
  Phone, 
  Calendar, 
  ChevronLeft, 
  Clock, 
  Scissors, 
  DollarSign, 
  Sparkles,
  Coffee,
  CalendarClock
} from 'lucide-react';
import { useAtelier } from '../../store/AtelierContext';
import { 
  filterCustomers, 
  getCustomerStats, 
  normalizePhoneNumber 
} from '../../utils/customerUtils';
import { toPersianDigits } from '../../utils/dateUtils';
import { ClientProfile } from '../../types';
import { CreateCustomerModal } from './CreateCustomerModal';
import { QuickContactButtons } from './QuickContactButtons';

interface ClientsViewProps {
  onOpenDossier: (customerId: string) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({ onOpenDossier }) => {
  const { customers, appointments, pastAppointments } = useAtelier();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'vip' | 'regular'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Active (non-archived) customers
  const activeCustomers = customers.filter((c) => !c.isArchived);

  // Filtered customer list
  const filteredCustomers = activeCustomers.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.memberId && c.memberId.toLowerCase().includes(q))
    );
  });

  // Count
  const totalCount = activeCustomers.length;

  const handleCustomerCreated = (newCustomer: ClientProfile) => {
    onOpenDossier(newCustomer.id);
  };

  return (
    <div id="clients-view-container" className="space-y-3 pb-1" dir="rtl">
      {/* Directory Master Header */}
      <div className="p-3.5 rounded-[26px] apple-glass-card space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl apple-3d-tile text-[#721c24] bg-[#f6f2f4] border border-[#d9c5cb] flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-[#721c24]" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-serif font-bold text-stone-900">
                بانک پرونده‌های مراجعین
              </h2>
              <p className="text-[10px] text-stone-500 font-mono">
                {toPersianDigits(totalCount)} پرونده فعال
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-open-create-customer"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-[#721c24] hover:bg-[#5c131a] text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 text-white" />
            <span>مشتری جدید</span>
          </button>
        </div>

        {/* Real-time Search Input */}
        <div className="relative">
          <input
            type="text"
            id="input-clients-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو با نام یا شماره تماس..."
            className="w-full bg-white/85 border border-slate-200/90 rounded-2xl px-3.5 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:border-[#721c24] pl-8 shadow-2xs"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute left-2.5 top-2.5 text-stone-400 hover:text-stone-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
          )}
        </div>
      </div>

      {/* Customer Directory List */}
      <div>
        {filteredCustomers.length === 0 ? (
          <div className="p-8 text-center apple-glass-card rounded-[26px] space-y-2">
            <Users className="w-8 h-8 mx-auto text-stone-300" />
            <h3 className="text-xs font-bold text-stone-800">مشتری با این مشخصات یافت نشد</h3>
            <p className="text-[10px] text-stone-500 max-w-[220px] mx-auto">
              می‌توانید عبارت جستجو را تغییر دهید یا پرونده جدیدی برای مشتری باز کنید.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setFilterType('all');
              }}
              className="mt-2 px-3 py-1 rounded-xl apple-3d-tile text-stone-700 text-[10px] font-bold hover:bg-white cursor-pointer"
            >
              پاک کردن فیلترها
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredCustomers.map((customer) => {
              const stats = getCustomerStats(customer, appointments, pastAppointments);

              return (
                <div
                  key={customer.id}
                  id={`customer-card-${customer.id}`}
                  onClick={() => onOpenDossier(customer.id)}
                  className="p-3.5 rounded-[24px] apple-glass-card hover:bg-white/95 cursor-pointer transition-all space-y-2.5 group flex flex-col justify-between"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      {customer.avatarUrl ? (
                        <img
                          src={customer.avatarUrl}
                          alt={customer.name}
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-full object-cover border border-[#d9c5cb] shadow-xs shrink-0 bg-stone-900"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#0f172a] text-[#d9c5cb] flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                          {customer.name.slice(0, 1)}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-xs sm:text-sm font-bold text-stone-900 group-hover:text-[#721c24] transition-colors">
                            {customer.name}
                          </h3>
                        </div>
                        <p className="text-[10px] text-stone-500 font-mono mt-0.5" dir="ltr">
                          {customer.phone} · {customer.memberId}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <QuickContactButtons
                        phone={customer.phone}
                        customerName={customer.name}
                        size="xs"
                        showLabels={false}
                      />
                      <div className="flex items-center text-[#721c24] text-[10px] font-bold group-hover:underline mr-1">
                        <span>پرونده</span>
                        <ChevronLeft className="w-3 h-3" />
                      </div>
                    </div>
                  </div>

                  {/* Key Metrics Row */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-slate-100 text-[9px]">
                    <div className="bg-slate-50/90 p-1.5 rounded-xl text-center border border-slate-200/50">
                      <span className="text-[8px] text-stone-400 block">مراجعات</span>
                      <span className="font-bold text-stone-800 font-mono">
                        {toPersianDigits(stats.totalVisits)}
                      </span>
                    </div>

                    <div className="bg-slate-50/90 p-1.5 rounded-xl text-center border border-slate-200/50">
                      <span className="text-[8px] text-stone-400 block">آخرین مراجعه</span>
                      <span className="font-bold text-stone-800 truncate block">
                        {stats.lastVisit ? stats.lastVisit.date.split('،')[1]?.trim() || stats.lastVisit.date : '—'}
                      </span>
                    </div>

                    <div className="bg-slate-50/90 p-1.5 rounded-xl text-center border border-slate-200/50">
                      <span className="text-[8px] text-stone-400 block">مجموع پرداخت</span>
                      <span className="font-bold text-stone-800 font-mono">
                        ${toPersianDigits(stats.totalSpending)}
                      </span>
                    </div>
                  </div>

                  {/* Tags & Preferences Preview */}
                  <div className="flex items-center gap-1.5 flex-wrap text-[8px]">
                    {customer.hairProfile?.hairType && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-stone-600">
                        {customer.hairProfile.hairType}
                      </span>
                    )}
                    {customer.hairProfile?.favoriteFade && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-stone-600">
                        {customer.hairProfile.favoriteFade}
                      </span>
                    )}
                    {customer.hospitality?.beveragePreference && (
                      <span className="px-2 py-0.5 rounded-md bg-[#f6f2f4] text-[#721c24] border border-[#d9c5cb] flex items-center gap-1">
                        <Coffee className="w-2 h-2" />
                        {customer.hospitality.beveragePreference}
                      </span>
                    )}
                    {customer.routineCadence && (
                      <span className="px-2 py-0.5 rounded-md bg-[#f6f2f4] text-[#721c24] border border-[#d9c5cb] font-bold flex items-center gap-1">
                        <CalendarClock className="w-2.5 h-2.5 text-[#721c24]" />
                        <span>روتین: {customer.routineCadence}</span>
                      </span>
                    )}
                    {stats.nextAppointment && (
                      <span className="mr-auto px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-bold">
                        نوبت آتی: {toPersianDigits(stats.nextAppointment.startTime)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal to create a new customer */}
      <CreateCustomerModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCustomerCreated={handleCustomerCreated}
      />
    </div>
  );
};
