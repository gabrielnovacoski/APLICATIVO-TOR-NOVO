import React, { useState, useEffect } from 'react';
import { PersonnelAbsence } from '../types';
import { fetchPersonnel, fetchPersonnelAbsences } from '../services/sheetsService';

interface PersonnelAbsencesProps {
    isLoggedIn: boolean;
}

const parseDateString = (dateStr: string) => {
    if (!dateStr) return new Date();
    const trimmed = dateStr.trim();
    if (trimmed.includes('/')) {
        const parts = trimmed.split('/');
        if (parts.length === 3) {
            const [day, month, year] = parts;
            return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T12:00:00`);
        }
    }
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
    const [personnelList, setPersonnelList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal de adição / edição de afastamento
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAbsenceId, setEditingAbsenceId] = useState<string | null>(null);
    const [formPersonnelName, setFormPersonnelName] = useState('');
    const [formGraduation, setFormGraduation] = useState('');
    const [formType, setFormType] = useState('Férias');
    const [formStartDate, setFormStartDate] = useState('');
    const [formEndDate, setFormEndDate] = useState('');
    const [formDescription, setFormDescription] = useState('');

    const fetchData = async () => {
        setLoading(true);

        const pData = await fetchPersonnel();
        setPersonnelList(pData);

        // Verificar se há dados personalizados salvos no localStorage
        const savedCustom = localStorage.getItem('tor_custom_absences');
        if (savedCustom) {
            try {
                const parsed = JSON.parse(savedCustom);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setAbsences(parsed);
                    setLoading(false);
                    return;
                }
            } catch (e) {
                console.error('Erro ao ler tor_custom_absences do localStorage:', e);
            }
        }

        const aData = await fetchPersonnelAbsences();

        const joinedAbsences = aData.map(absence => {
            const person = pData.find(p => p.id === absence.personnel_id);
            return {
                ...absence,
                personnel: person ? {
                    name: person.name,
                    graduation: person.graduation
                } : { name: absence.personnel?.name || 'Policial', graduation: absence.personnel?.graduation || '' }
            };
        });

        joinedAbsences.sort((a, b) => parseDateString(a.start_date).getTime() - parseDateString(b.start_date).getTime());

        setAbsences(joinedAbsences);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const saveAbsencesToStorage = (updated: PersonnelAbsence[]) => {
        setAbsences(updated);
        localStorage.setItem('tor_custom_absences', JSON.stringify(updated));
    };

    const handleOpenAddModal = () => {
        setEditingAbsenceId(null);
        setFormPersonnelName(personnelList[0]?.name || '');
        setFormGraduation(personnelList[0]?.graduation || '');
        setFormType('Férias');
        const todayStr = new Date().toISOString().split('T')[0];
        setFormStartDate(todayStr);
        setFormEndDate(todayStr);
        setFormDescription('');
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (absence: PersonnelAbsence) => {
        setEditingAbsenceId(absence.id);
        setFormPersonnelName(absence.personnel?.name || '');
        setFormGraduation(absence.personnel?.graduation || '');
        setFormType(absence.type || 'Férias');
        
        // Formatar datas para YYYY-MM-DD para o input type="date"
        const formatInputDate = (dStr: string) => {
            if (!dStr) return '';
            const d = parseDateString(dStr);
            return d.toISOString().split('T')[0];
        };

        setFormStartDate(formatInputDate(absence.start_date));
        setFormEndDate(formatInputDate(absence.end_date));
        setFormDescription(absence.description || '');
        setIsModalOpen(true);
    };

    const handleSaveAbsence = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formPersonnelName.trim()) {
            alert('Por favor, informe o policial.');
            return;
        }

        let updated: PersonnelAbsence[];

        if (editingAbsenceId) {
            // Editando existente
            updated = absences.map(a => {
                if (a.id === editingAbsenceId) {
                    return {
                        ...a,
                        type: formType,
                        start_date: formStartDate,
                        end_date: formEndDate,
                        description: formDescription,
                        personnel: {
                            name: formPersonnelName,
                            graduation: formGraduation
                        }
                    };
                }
                return a;
            });
        } else {
            // Novo
            const newAbsence: PersonnelAbsence = {
                id: `custom-absence-${Date.now()}`,
                personnel_id: `custom-p-${Date.now()}`,
                type: formType,
                start_date: formStartDate,
                end_date: formEndDate,
                description: formDescription,
                personnel: {
                    name: formPersonnelName,
                    graduation: formGraduation
                }
            };
            updated = [newAbsence, ...absences];
        }

        updated.sort((a, b) => parseDateString(a.start_date).getTime() - parseDateString(b.start_date).getTime());
        saveAbsencesToStorage(updated);
        setIsModalOpen(false);
    };

    const handleDeleteAbsence = (id: string) => {
        if (confirm('Tem certeza que deseja remover este registro de afastamento?')) {
            const updated = absences.filter(a => a.id !== id);
            saveAbsencesToStorage(updated);
        }
    };

    const handleResetAbsences = () => {
        if (confirm('Deseja recarregar a lista original de afastamentos da planilha?')) {
            localStorage.removeItem('tor_custom_absences');
            fetchData();
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const trimmed = dateStr.trim();
        if (trimmed.includes('/')) return trimmed;
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
            <div className="px-8 py-6 border-b border-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/50">
                <div className="flex items-center gap-4">
                    <div className="size-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shadow-inner">
                        <span className="material-symbols-outlined text-2xl filled-icon">event_busy</span>
                    </div>
                    <div className="flex flex-col">
                        <h3 className="text-slate-900 text-lg font-bold uppercase tracking-wider leading-tight">Afastamentos e Licenças</h3>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Controle de efetivo fora de serviço</p>
                    </div>
                </div>

                {isLoggedIn && (
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleResetAbsences}
                            className="text-slate-400 hover:text-slate-600 px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-1"
                            title="Recarregar dados originais da planilha"
                        >
                            <span className="material-symbols-outlined text-sm">restart_alt</span>
                            <span>Restaurar</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleOpenAddModal}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-sm">add_circle</span>
                            <span>+ Novo Afastamento</span>
                        </button>
                    </div>
                )}
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

                            let statusBorder = 'border-slate-200';
                            let statusText = 'text-slate-500';
                            let statusBadge = '';
                            let badgeText = '';

                            if (active) {
                                statusBorder = absence.type === 'Férias' ? 'border-orange-500' : 'border-red-500';
                                statusText = absence.type === 'Férias' ? 'text-orange-600' : 'text-red-600';
                                statusBadge = absence.type === 'Férias' ? 'bg-orange-500' : 'bg-red-500';
                                badgeText = 'EM VIGOR';
                            } else if (upcoming) {
                                statusBorder = 'border-blue-500/30';
                                statusText = 'text-blue-600';
                                statusBadge = 'bg-blue-500';
                                badgeText = 'AGENDADO';
                            } else if (completed) {
                                statusBorder = 'border-slate-200';
                                statusText = 'text-slate-500';
                                statusBadge = 'bg-slate-500';
                                badgeText = 'CONCLUÍDO';
                            }

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
                                <div key={absence.id} className={`group relative bg-white border ${statusBorder} ${active ? 'shadow-lg' : completed ? 'bg-slate-50/50' : 'bg-blue-50/10'} rounded-2xl p-4 hover:shadow-md transition-all flex flex-col justify-between min-h-[145px]`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className={`size-10 rounded-xl ${active ? (absence.type === 'Férias' ? 'bg-orange-500' : 'bg-red-500') + ' text-white' : config.bgColor + ' ' + config.color} flex items-center justify-center shrink-0 shadow-sm`}>
                                                <span className="material-symbols-outlined text-xl filled-icon">{config.icon}</span>
                                            </div>
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${active ? statusText : upcoming ? 'text-blue-600' : 'text-slate-400'}`}>
                                                        {absence.type}
                                                    </span>
                                                    {statusBadge && (
                                                        <span className={`${statusBadge} text-white text-[9px] font-black px-1.5 rounded ${active ? 'animate-pulse' : ''} whitespace-nowrap`}>{badgeText}</span>
                                                    )}
                                                </div>
                                                <h4 className="text-slate-900 font-black text-sm uppercase leading-tight truncate">
                                                    {absence.personnel?.graduation ? `${absence.personnel.graduation} ` : ''}{absence.personnel?.name}
                                                </h4>
                                            </div>
                                        </div>

                                        {isLoggedIn && (
                                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity ml-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenEditModal(absence)}
                                                    className="size-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
                                                    title="Editar Afastamento"
                                                >
                                                    <span className="material-symbols-outlined text-xs">edit</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteAbsence(absence.id)}
                                                    className="size-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors"
                                                    title="Remover Afastamento"
                                                >
                                                    <span className="material-symbols-outlined text-xs">delete</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-2 bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="material-symbols-outlined text-slate-400 text-sm shrink-0">calendar_month</span>
                                                <div className="flex flex-col min-w-0">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-0.5">Período</p>
                                                    <p className="text-xs font-bold text-slate-700 leading-tight">
                                                        {formatDate(absence.start_date)} — {formatDate(absence.end_date)}
                                                    </p>
                                                </div>
                                            </div>
                                            {daysLabel && (
                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md shrink-0 shadow-sm ${
                                                    active 
                                                        ? (absence.type === 'Férias' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-red-50 text-red-600 border border-red-100') 
                                                        : 'bg-blue-50 text-blue-600 border border-blue-100'
                                                } whitespace-nowrap`}>
                                                    {daysLabel}
                                                </span>
                                            )}
                                        </div>

                                        {absence.description && (
                                            <p className="text-xs text-slate-500 italic px-1 truncate" title={absence.description}>"{absence.description}"</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal de Adição / Edição de Afastamento */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-white/20 animate-in zoom-in-95 duration-200">
                        <div className="bg-tor-dark p-6 text-white text-center relative">
                            <h3 className="text-lg font-black uppercase tracking-wider">
                                {editingAbsenceId ? 'Editar Afastamento' : 'Novo Afastamento / Licença'}
                            </h3>
                            <p className="text-slate-400 text-xs mt-1">Controle de Efetivo do TOR</p>
                        </div>

                        <form onSubmit={handleSaveAbsence} className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Policial Militar</label>
                                {personnelList.length > 0 ? (
                                    <select
                                        value={formPersonnelName}
                                        onChange={e => {
                                            const selected = personnelList.find(p => p.name === e.target.value);
                                            setFormPersonnelName(e.target.value);
                                            if (selected) setFormGraduation(selected.graduation || '');
                                        }}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-tor-blue focus:ring-0"
                                        required
                                    >
                                        <option value="">Selecione o policial...</option>
                                        {personnelList.map(p => (
                                            <option key={p.id} value={p.name}>
                                                {p.graduation} {p.name}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        value={formPersonnelName}
                                        onChange={e => setFormPersonnelName(e.target.value)}
                                        placeholder="Nome do Policial"
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-tor-blue focus:ring-0"
                                        required
                                    />
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipo de Afastamento</label>
                                <select
                                    value={formType}
                                    onChange={e => setFormType(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-tor-blue focus:ring-0"
                                >
                                    <option value="Férias">Férias</option>
                                    <option value="Atestado Médico">Atestado Médico</option>
                                    <option value="Licença Especial">Licença Especial</option>
                                    <option value="Licença Tratamento Saúde">Licença Tratamento Saúde</option>
                                    <option value="Curso">Curso / Treinamento</option>
                                    <option value="Dispensa">Dispensa Recompensa</option>
                                    <option value="Outro">Outro</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Data Início</label>
                                    <input
                                        type="date"
                                        value={formStartDate}
                                        onChange={e => setFormStartDate(e.target.value)}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-tor-blue focus:ring-0"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Data Fim</label>
                                    <input
                                        type="date"
                                        value={formEndDate}
                                        onChange={e => setFormEndDate(e.target.value)}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-tor-blue focus:ring-0"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Observações / Motivo (Opcional)</label>
                                <input
                                    type="text"
                                    value={formDescription}
                                    onChange={e => setFormDescription(e.target.value)}
                                    placeholder="Ex: Portaria nº 123/2026"
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-tor-blue focus:ring-0"
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-md shadow-emerald-600/20"
                                >
                                    Salvar Dados
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PersonnelAbsences;
