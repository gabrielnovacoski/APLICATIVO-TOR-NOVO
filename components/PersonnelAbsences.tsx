import React, { useState, useEffect } from 'react';
import { PersonnelAbsence } from '../types';
import { fetchPersonnel, fetchPersonnelAbsences } from '../services/sheetsService';

interface PersonnelAbsencesProps {
    isLoggedIn: boolean;
}

const parseDateString = (dateStr: string) => {
    if (!dateStr) return new Date();
    const trimmed = dateStr.trim();
    // Se estiver no formato DD/MM/YYYY
    if (trimmed.includes('/')) {
        const parts = trimmed.split('/');
        if (parts.length === 3) {
            const [day, month, year] = parts;
            return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T12:00:00`);
        }
    }
    // Se estiver no formato YYYY-MM-DD ou DD-MM-YYYY
    if (trimmed.includes('-')) {
        const parts = trimmed.split('-');
        if (parts.length === 3) {
            if (parts[0].length === 2 && parts[2].length === 4) {
                const [day, month, year] = parts;
                return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T12:00:00`);
            }
            return new Date(trimmed + 'T12:00:00');
        }
    }
    return new Date(trimmed);
};

const PersonnelAbsences: React.FC<PersonnelAbsencesProps> = ({ isLoggedIn }) => {
    const [absences, setAbsences] = useState<PersonnelAbsence[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);

        // Fetch personnel and absences
        const pData = await fetchPersonnel();
        const aData = await fetchPersonnelAbsences();

        // Join personnel data into absences
        const joinedAbsences = aData.map(absence => {
            const person = pData.find(p => p.id === absence.personnel_id);
            return {
                ...absence,
                personnel: person ? {
                    name: person.name,
                    graduation: person.graduation
                } : { name: 'Desconhecido', graduation: '' }
            };
        });

        // Sort by start_date ascending using robust parser
        joinedAbsences.sort((a, b) => parseDateString(a.start_date).getTime() - parseDateString(b.start_date).getTime());

        setAbsences(joinedAbsences);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const trimmed = dateStr.trim();
        if (trimmed.includes('/')) return trimmed; // Já está formatado como DD/MM/YYYY
        const parts = trimmed.split('-');
        if (parts.length !== 3) return trimmed;
        const [year, month, day] = parts;
        return `${day}/${month}/${year}`;
    };

    const getAbsenceConfig = (type: string) => {
        const normalized = type.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
        if (normalized.includes('FERIAS')) return { icon: 'beach_access', color: 'text-emerald-500', bgColor: 'bg-orange-50' };
        if (normalized.includes('ATESTADO')) return { icon: 'description', color: 'text-blue-500', bgColor: 'bg-blue-50' };
        if (normalized.includes('MEDICA')) return { icon: 'medical_services', color: 'text-red-500', bgColor: 'bg-red-50' };
        if (normalized.includes('ESPECIAL')) return { icon: 'military_tech', color: 'text-purple-500', bgColor: 'bg-purple-50' };
        if (normalized.includes('LICENCA')) return { icon: 'medical_services', color: 'text-red-500', bgColor: 'bg-red-50' };
        if (normalized.includes('CURSO')) return { icon: 'school', color: 'text-emerald-500', bgColor: 'bg-emerald-50' };
        return { icon: 'more_horiz', color: 'text-slate-500', bgColor: 'bg-slate-50' };
    };

    const getAbsenceStatus = (startDate: string, endDate: string) => {
        if (!startDate || !endDate) return 'COMPLETED';
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const start = parseDateString(startDate);
        const end = parseDateString(endDate);

        if (today < start) return 'UPCOMING';
        if (today > end) return 'COMPLETED';
        return 'ACTIVE';
    };

    const isActiveAbsence = (startDate: string, endDate: string) => {
        return getAbsenceStatus(startDate, endDate) === 'ACTIVE';
    };

    const activeAbsences = absences.filter(a => isActiveAbsence(a.start_date, a.end_date));
    const totalActive = activeAbsences.length;
    const vacationsActive = activeAbsences.filter(a => {
        const normalized = a.type.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
        return normalized.includes('FERIAS');
    }).length;
    const medicalActive = totalActive - vacationsActive;

    if (loading && absences.length === 0) {
        return <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Carregando afastamentos da planilha...</div>;
    }

    return (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden mb-8">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                    <div className="size-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl filled-icon">event_busy</span>
                    </div>
                    <div className="flex flex-col">
                        <h3 className="text-slate-900 text-lg font-bold uppercase tracking-wider leading-tight">Afastamentos e Licenças</h3>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Controle de efetivo fora de serviço</p>
                    </div>
                </div>
            </div>

            <div className="p-3 md:p-6">
                {/* Dashboard de Insights */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                    <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 flex items-center gap-4 transition-all hover:shadow-sm">
                        <div className="size-12 rounded-xl bg-slate-200/50 text-slate-500 flex items-center justify-center shadow-inner">
                            <span className="material-symbols-outlined text-2xl">person_off</span>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Total Afastados</p>
                            <p className="text-2xl font-black text-slate-900">{totalActive}</p>
                        </div>
                    </div>

                    <div className="bg-orange-50/30 rounded-2xl p-4 border border-orange-100/50 flex items-center gap-4 transition-all hover:shadow-sm">
                        <div className="size-12 rounded-xl bg-orange-100/50 text-orange-500 flex items-center justify-center shadow-inner">
                            <span className="material-symbols-outlined text-2xl filled-icon">beach_access</span>
                        </div>
                        <div>
                            <p className="text-[10px] text-orange-400/80 font-black uppercase tracking-widest leading-none mb-1">Em Férias</p>
                            <p className="text-2xl font-black text-slate-900">{vacationsActive}</p>
                        </div>
                    </div>

                    <div className="bg-red-50/30 rounded-2xl p-4 border border-red-100/50 flex items-center gap-4 transition-all hover:shadow-sm">
                        <div className="size-12 rounded-xl bg-red-100/50 text-red-500 flex items-center justify-center shadow-inner">
                            <span className="material-symbols-outlined text-2xl filled-icon">medical_services</span>
                        </div>
                        <div>
                            <p className="text-[10px] text-red-400/80 font-black uppercase tracking-widest leading-none mb-1">Atestado/Licença</p>
                            <p className="text-2xl font-black text-slate-900">{medicalActive}</p>
                        </div>
                    </div>
                </div>
                {absences.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        <span className="material-symbols-outlined text-2xl text-slate-300 mb-1">person_off</span>
                        <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest">Nenhum policial afastado</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 min-[440px]:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                        {absences.map((absence) => {
                            const config = getAbsenceConfig(absence.type);
                            const status = getAbsenceStatus(absence.start_date, absence.end_date);
                            const active = status === 'ACTIVE';
                            const upcoming = status === 'UPCOMING';
                            const completed = status === 'COMPLETED';

                            let statusColor = 'emerald-500';
                            let statusBg = 'bg-emerald-500';
                            let statusBorder = 'border-emerald-500/30';
                            let statusText = 'text-emerald-600';
                            let statusBadge = '';
                            let badgeText = '';

                            if (active) {
                                statusColor = absence.type === 'Férias' ? 'orange-500' : 'red-500';
                                statusBg = absence.type === 'Férias' ? 'bg-orange-500' : 'bg-red-500';
                                statusBorder = absence.type === 'Férias' ? 'border-orange-500' : 'border-red-500';
                                statusText = absence.type === 'Férias' ? 'text-orange-600' : 'text-red-600';
                                statusBadge = statusBg;
                                badgeText = 'EM VIGOR';
                            } else if (upcoming) {
                                statusColor = 'blue-500';
                                statusBg = 'bg-blue-500';
                                statusBorder = 'border-blue-500/30';
                                statusText = 'text-blue-600';
                                statusBadge = 'bg-blue-500';
                                badgeText = 'AGENDADO';
                            } else if (completed) {
                                statusColor = 'slate-400';
                                statusBg = 'bg-slate-400';
                                statusBorder = 'border-slate-200';
                                statusText = 'text-slate-500';
                                statusBadge = 'bg-slate-500';
                                badgeText = 'CONCLUÍDO';
                            }

                            // Cálculo de dias restantes / início
                            let daysLabel = '';
                            if (active || upcoming) {
                                const startClean = parseDateString(absence.start_date);
                                startClean.setHours(0, 0, 0, 0);
                                const endClean = parseDateString(absence.end_date);
                                endClean.setHours(0, 0, 0, 0);
                                const todayClean = new Date();
                                todayClean.setHours(0, 0, 0, 0);

                                if (active) {
                                    const diffTime = endClean.getTime() - todayClean.getTime();
                                    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                                    if (diffDays === 0) {
                                        daysLabel = 'Último dia hoje';
                                    } else if (diffDays === 1) {
                                        daysLabel = 'Resta 1 dia';
                                    } else {
                                        daysLabel = `Restam ${diffDays} dias`;
                                    }
                                } else if (upcoming) {
                                    const diffTime = startClean.getTime() - todayClean.getTime();
                                    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                                    if (diffDays === 1) {
                                        daysLabel = 'Começa amanhã';
                                    } else {
                                        daysLabel = `Começa em ${diffDays} dias`;
                                    }
                                }
                            }

                            return (
                                <div key={absence.id} className={`group relative bg-white border ${statusBorder} ${active ? 'ring-2 ring-' + statusColor + '/10 shadow-lg' : completed ? 'bg-slate-50/50' : 'bg-blue-50/10'} rounded-xl p-3 md:p-4 hover:shadow-md transition-all flex flex-col justify-between min-h-[135px]`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className={`size-9 md:size-10 rounded-lg ${active ? statusBg + ' text-white' : config.bgColor + ' ' + config.color} flex items-center justify-center shrink-0 shadow-sm`}>
                                                <span className="material-symbols-outlined text-lg md:text-xl filled-icon">{config.icon}</span>
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${active ? statusText : upcoming ? 'text-blue-600' : 'text-slate-400'}`}>
                                                        {absence.type}
                                                    </span>
                                                    {statusBadge && (
                                                        <span className={`${statusBadge} text-white text-[8px] md:text-[9px] font-black px-1.5 rounded-sm ${active ? 'animate-pulse' : ''} whitespace-nowrap`}>{badgeText}</span>
                                                    )}
                                                </div>
                                                <h4 className="text-slate-900 font-black text-[13px] md:text-sm uppercase leading-tight">
                                                    {absence.personnel?.graduation} {absence.personnel?.name}
                                                </h4>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg p-2 border border-slate-100/50">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="material-symbols-outlined text-slate-400 text-sm shrink-0">calendar_month</span>
                                                <div className="flex flex-col min-w-0">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-0.5">Período</p>
                                                    <p className="text-[11px] md:text-xs font-bold text-slate-700 leading-tight">
                                                        {formatDate(absence.start_date)} — {formatDate(absence.end_date)}
                                                    </p>
                                                </div>
                                            </div>
                                            {daysLabel && (
                                                <span className={`text-[8px] md:text-[9px] font-black uppercase px-2 py-0.5 rounded-md shrink-0 shadow-sm ${
                                                    active 
                                                        ? (absence.type === 'Férias' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-red-50 text-red-600 border border-red-100') 
                                                        : 'bg-blue-50 text-blue-600 border border-blue-100'
                                                } whitespace-nowrap`}>
                                                    {daysLabel}
                                                </span>
                                            )}
                                        </div>

                                        {absence.description && (
                                            <p className="text-[10px] md:text-xs text-slate-500 italic px-1" title={absence.description}>"{absence.description}"</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PersonnelAbsences;
