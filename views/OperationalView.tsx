import React, { useState, useEffect, useRef } from 'react';
import { fetchLatestVehicleKm, fetchPersonnelAbsences, fetchPersonnel, fetchSpreadsheetVehicles, fetchSpreadsheetTeams } from '../services/sheetsService';
import PersonnelAbsences from '../components/PersonnelAbsences';
import { PersonnelAbsence as Leave } from '../types';

interface Member {
  name: string;
  role: string;
  icon: string;
}

interface Team {
  id: string;
  name: string;
  sector: string;
  status: string;
  color: string;
  members: Member[];
}

interface Vehicle {
  id: string;
  prefix: string;
  status: 'OPERANDO' | 'BAIXADA';
  model: string;
  year: string;
  plate: string;
  odometer: number;
  oilInterval: number;
  lastOilChangeOdometer: number;
  color: string;
}

const initialTeams: Team[] = [
  {
    id: '1',
    name: 'EQUIPE ALFA',
    sector: 'TOR 1º BPMRv',
    status: 'Patrulhamento',
    color: 'tor-blue',
    members: [
      { name: 'SGT ARAÚJO', role: 'COMANDANTE', icon: 'person' },
      { name: 'CB ALEX', role: 'MOTORISTA', icon: 'navigation' },
      { name: 'CB VICTOR', role: '3º HOMEM', icon: 'shield' },
    ]
  },
  {
    id: '2',
    name: 'EQUIPE BRAVO',
    sector: 'TOR 1º BPMRv',
    status: 'Patrulhamento',
    color: 'tor-blue',
    members: [
      { name: 'SGT SILVY', role: 'COMANDANTE', icon: 'person' },
      { name: 'CB RODRIGO SOUZA', role: 'MOTORISTA', icon: 'navigation' },
      { name: 'CB SAGAZ', role: '3º HOMEM', icon: 'shield' },
      { name: 'SD ESSER', role: '4º HOMEM', icon: 'shield' },
    ]
  }
];

const initialVehicles: Vehicle[] = [
  {
    id: 'TOR 0003',
    prefix: '4582',
    status: 'OPERANDO',
    model: 'Toyota Hilux SW4',
    year: '2024',
    plate: 'ABC-1234',
    odometer: 12450,
    oilInterval: 10000,
    lastOilChangeOdometer: 10000,
    color: 'tor-blue'
  },
  {
    id: 'TOR 0004',
    prefix: '7337',
    status: 'OPERANDO',
    model: 'Toyota Hilux SW4',
    year: '2022',
    plate: 'XYZ-5678',
    odometer: 45892,
    oilInterval: 10000,
    lastOilChangeOdometer: 40000,
    color: 'tor-blue'
  }
];

const getRankIcon = (nameOrGraduation: string) => {
  const normalized = nameOrGraduation.toUpperCase();
  const v = '?v=300';
  if (normalized.includes('SUB TEN') || normalized.includes('SUBTEN') || normalized.includes('SUB') || normalized.includes('TENENTE') || normalized.includes('TEN')) return `/ranks/subten.png${v}`;
  if (normalized.includes('1º SGT') || normalized.includes('1SGT') || normalized.includes('1ºSGT') || normalized.includes('1 SGT')) return `/ranks/1sgt.png${v}`;
  if (normalized.includes('2º SGT') || normalized.includes('2SGT') || normalized.includes('2ºSGT') || normalized.includes('2 SGT')) return `/ranks/2sgt.png${v}`;
  if (normalized.includes('3º SGT') || normalized.includes('3SGT') || normalized.includes('3ºSGT') || normalized.includes('3 SGT') || normalized.includes('SGT')) return `/ranks/3sgt.png${v}`;
  if (normalized.includes('CABO') || normalized.includes('CB')) return `/ranks/cabo.png${v}`;
  if (normalized.includes('SOLDADO') || normalized.includes('SD')) return `/ranks/soldado.png${v}`;
  return null;
};

const OperationalView: React.FC<{ isLoggedIn: boolean }> = ({ isLoggedIn }) => {
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [personnelList, setPersonnelList] = useState<any[]>([]);
  const [activeLeaves, setActiveLeaves] = useState<Leave[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Estados de Modais de Edição
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamFormName, setTeamFormName] = useState('');
  const [teamFormSector, setTeamFormSector] = useState('');
  const [teamFormMembers, setTeamFormMembers] = useState<Member[]>([]);

  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [vehicleFormId, setVehicleFormId] = useState('');
  const [vehicleFormModel, setVehicleFormModel] = useState('');
  const [vehicleFormYear, setVehicleFormYear] = useState('');
  const [vehicleFormPlate, setVehicleFormPlate] = useState('');
  const [vehicleFormOdometer, setVehicleFormOdometer] = useState(0);
  const [vehicleFormLastOil, setVehicleFormLastOil] = useState(0);
  const [vehicleFormInterval, setVehicleFormInterval] = useState(10000);
  const [vehicleFormStatus, setVehicleFormStatus] = useState<'OPERANDO' | 'BAIXADA'>('OPERANDO');

  // Ref para sincronização automática segura
  const vehiclesRef = useRef<Vehicle[]>([]);
  useEffect(() => {
    vehiclesRef.current = vehicles;
  }, [vehicles]);

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

  const fetchData = async () => {
    setLoading(true);

    // Fetch Efetivo e Afastamentos via Google Sheets
    const pData = await fetchPersonnel();
    const aData = await fetchPersonnelAbsences();

    setPersonnelList(pData);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeAData = aData.filter(a => {
      if (!a.start_date || !a.end_date) return false;
      const start = parseDateString(a.start_date);
      const end = parseDateString(a.end_date);
      return today >= start && today <= end;
    }).map(a => {
      const person = pData.find(p => p.id === a.personnel_id);
      return {
        ...a,
        personnel: person ? { name: person.name, graduation: person.graduation } : null
      } as Leave;
    });
    
    setActiveLeaves(activeAData);

    // Verificar se há viaturas customizadas salvas no localStorage
    const savedVehicles = localStorage.getItem('tor_custom_vehicles');
    if (savedVehicles) {
      try {
        const parsedV = JSON.parse(savedVehicles);
        if (Array.isArray(parsedV) && parsedV.length > 0) {
          setVehicles(parsedV);
        } else {
          await loadSpreadsheetVehicles();
        }
      } catch (e) {
        await loadSpreadsheetVehicles();
      }
    } else {
      await loadSpreadsheetVehicles();
    }

    // Verificar se há equipes customizadas salvas no localStorage
    const savedTeams = localStorage.getItem('tor_custom_teams');
    if (savedTeams) {
      try {
        const parsedT = JSON.parse(savedTeams);
        if (Array.isArray(parsedT) && parsedT.length > 0) {
          setTeams(parsedT);
        } else {
          await loadSpreadsheetTeams();
        }
      } catch (e) {
        await loadSpreadsheetTeams();
      }
    } else {
      await loadSpreadsheetTeams();
    }

    setLoading(false);
  };

  const loadSpreadsheetVehicles = async () => {
    let mappedVehicles = await fetchSpreadsheetVehicles();
    if (mappedVehicles.length === 0) {
      mappedVehicles = initialVehicles;
    }

    const updatedVehicles = await Promise.all(mappedVehicles.map(async (v) => {
      try {
        const latestKm = await fetchLatestVehicleKm(v.id);
        if (latestKm !== null && latestKm !== v.odometer) {
          return { ...v, odometer: latestKm };
        }
      } catch (error) {
        console.error('Erro na sincronização:', error);
      }
      return v;
    }));

    const sortedVehicles = updatedVehicles.sort((a, b) => {
      if (a.id === 'TOR 0003') return -1;
      if (b.id === 'TOR 0003') return 1;
      if (a.id === 'TOR 0004') return -1;
      if (b.id === 'TOR 0004') return 1;
      return a.id.localeCompare(b.id);
    });

    setVehicles(sortedVehicles);
  };

  const loadSpreadsheetTeams = async () => {
    let fetchedTeams = await fetchSpreadsheetTeams();
    if (fetchedTeams.length === 0) {
      fetchedTeams = initialTeams;
    }
    setTeams(fetchedTeams);
  };

  useEffect(() => {
    fetchData();

    // Polling Automático de KM (a cada 60s)
    const interval = setInterval(() => {
      syncVehicleKm();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const getMemberStatusIcon = (memberName: string) => {
    const leave = activeLeaves.find(l => {
      return memberName.includes(l.personnel?.name || '@@@');
    });

    if (leave) {
      const typeNorm = leave.type.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
      if (typeNorm.includes('FERIAS')) return { icon: 'beach_access', color: 'text-orange-500', bg: 'bg-orange-50' };
      if (typeNorm.includes('LICENCA') || typeNorm.includes('ATESTADO')) return { icon: 'assignment', color: 'text-purple-500', bg: 'bg-purple-50' };
    }

    return { icon: 'local_police', color: 'text-emerald-500', bg: 'bg-emerald-50' };
  };

  const syncVehicleKm = async () => {
    if (vehiclesRef.current.length === 0) return;
    
    setIsSyncing(true);
    let changed = false;
    const updatedVehicles = await Promise.all(vehiclesRef.current.map(async (v) => {
      const latestKm = await fetchLatestVehicleKm(v.id);
      if (latestKm !== null && latestKm !== v.odometer) {
        changed = true;
        return { ...v, odometer: latestKm };
      }
      return v;
    }));
    
    if (changed) {
      setVehicles(updatedVehicles);
      localStorage.setItem('tor_custom_vehicles', JSON.stringify(updatedVehicles));
    }
    setIsSyncing(false);
  };

  const getVehicleOilStats = (v: Vehicle) => {
    let interval = Number(v.oilInterval) || 10000;
    if (interval <= 0) interval = 10000;

    let lastChange = Number(v.lastOilChangeOdometer) || 0;
    let nextChange = lastChange + interval;

    // Se o odômetro já passou de 10.000 e lastChange é 0 (ou se o usuário preencheu 20.000 como marco final)
    if (lastChange === 0 && v.odometer > 0) {
      if (interval > 10000 && interval % 10000 === 0) {
        nextChange = interval;
        interval = 10000;
        lastChange = nextChange - interval;
      } else {
        const cycle = Math.floor(v.odometer / interval);
        lastChange = cycle * interval;
        nextChange = (cycle + 1) * interval;
      }
    } else if (nextChange <= v.odometer) {
      const cycle = Math.floor(v.odometer / interval);
      lastChange = cycle * interval;
      nextChange = (cycle + 1) * interval;
    }

    const remainingKm = nextChange - v.odometer;
    const isUrgent = remainingKm <= 0;
    const lifePercentage = isUrgent
      ? 0
      : Math.max(0, Math.min(100, Math.round((remainingKm / interval) * 100)));

    return {
      interval,
      lastChange,
      nextChange,
      remainingKm: Math.max(0, remainingKm),
      overdueKm: remainingKm < 0 ? Math.abs(remainingKm) : 0,
      isUrgent,
      lifePercentage
    };
  };

  const calculateOilLife = (v: Vehicle) => {
    return getVehicleOilStats(v).lifePercentage;
  };

  // Funções de Gestão de Equipes
  const handleOpenEditTeam = (team: Team) => {
    setEditingTeam(team);
    setTeamFormName(team.name);
    setTeamFormSector(team.sector);
    setTeamFormMembers(team.members ? [...team.members] : []);
    setIsTeamModalOpen(true);
  };

  const handleOpenAddTeam = () => {
    setEditingTeam(null);
    setTeamFormName(`EQUIPE CHARLIE`);
    setTeamFormSector('TOR 1º BPMRv');
    setTeamFormMembers([
      { name: '', role: 'COMANDANTE', icon: 'person' },
      { name: '', role: 'MOTORISTA', icon: 'navigation' },
      { name: '', role: '3º HOMEM', icon: 'shield' },
    ]);
    setIsTeamModalOpen(true);
  };

  const handleAddMemberToForm = () => {
    setTeamFormMembers([
      ...teamFormMembers,
      { name: '', role: `${teamFormMembers.length + 1}º HOMEM`, icon: 'shield' }
    ]);
  };

  const handleRemoveMemberFromForm = (index: number) => {
    setTeamFormMembers(teamFormMembers.filter((_, i) => i !== index));
  };

  const handleUpdateMemberInForm = (index: number, field: 'name' | 'role', val: string) => {
    const updated = [...teamFormMembers];
    updated[index] = { ...updated[index], [field]: val };
    setTeamFormMembers(updated);
  };

  const handleSaveTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamFormName.trim()) {
      alert('Informe o nome da equipe.');
      return;
    }

    let updatedTeams: Team[];

    if (editingTeam) {
      updatedTeams = teams.map(t => {
        if (t.id === editingTeam.id) {
          return {
            ...t,
            name: teamFormName.trim(),
            sector: teamFormSector.trim(),
            members: teamFormMembers.filter(m => m.name.trim() !== '')
          };
        }
        return t;
      });
    } else {
      const newTeam: Team = {
        id: `team-${Date.now()}`,
        name: teamFormName.trim(),
        sector: teamFormSector.trim(),
        status: 'Patrulhamento',
        color: 'tor-blue',
        members: teamFormMembers.filter(m => m.name.trim() !== '')
      };
      updatedTeams = [...teams, newTeam];
    }

    setTeams(updatedTeams);
    localStorage.setItem('tor_custom_teams', JSON.stringify(updatedTeams));
    setIsTeamModalOpen(false);
  };

  const handleDeleteTeam = (teamId: string) => {
    if (confirm('Tem certeza que deseja remover esta equipe?')) {
      const updated = teams.filter(t => t.id !== teamId);
      setTeams(updated);
      localStorage.setItem('tor_custom_teams', JSON.stringify(updated));
      setIsTeamModalOpen(false);
    }
  };

  // Funções de Gestão de Viaturas
  const handleOpenEditVehicle = (v: Vehicle) => {
    const stats = getVehicleOilStats(v);
    setEditingVehicleId(v.id);
    setVehicleFormId(v.id);
    setVehicleFormModel(v.model);
    setVehicleFormYear(v.year);
    setVehicleFormPlate(v.plate);
    setVehicleFormOdometer(v.odometer);
    setVehicleFormLastOil(v.lastOilChangeOdometer > 0 ? v.lastOilChangeOdometer : stats.lastChange);
    setVehicleFormInterval(stats.interval);
    setVehicleFormStatus(v.status);
    setIsVehicleModalOpen(true);
  };

  const handleOpenAddVehicle = () => {
    setEditingVehicleId(null);
    setVehicleFormId(`TOR ${String(vehicles.length + 1).padStart(4, '0')}`);
    setVehicleFormModel('CHEV/TRAILBLAZER');
    setVehicleFormYear('2026');
    setVehicleFormPlate('');
    setVehicleFormOdometer(10000);
    setVehicleFormLastOil(10000);
    setVehicleFormInterval(10000);
    setVehicleFormStatus('OPERANDO');
    setIsVehicleModalOpen(true);
  };

  const handleSaveVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleFormId.trim()) {
      alert('Informe a identificação da viatura.');
      return;
    }

    let updatedVehicles: Vehicle[];

    if (editingVehicleId) {
      updatedVehicles = vehicles.map(v => {
        if (v.id === editingVehicleId) {
          return {
            ...v,
            id: vehicleFormId.trim(),
            model: vehicleFormModel.trim(),
            year: vehicleFormYear.trim(),
            plate: vehicleFormPlate.trim(),
            odometer: Number(vehicleFormOdometer),
            lastOilChangeOdometer: Number(vehicleFormLastOil),
            oilInterval: Number(vehicleFormInterval),
            status: vehicleFormStatus
          };
        }
        return v;
      });
    } else {
      const newV: Vehicle = {
        id: vehicleFormId.trim(),
        prefix: vehicleFormPlate.trim().replace('-', ''),
        status: vehicleFormStatus,
        model: vehicleFormModel.trim(),
        year: vehicleFormYear.trim(),
        plate: vehicleFormPlate.trim(),
        odometer: Number(vehicleFormOdometer),
        lastOilChangeOdometer: Number(vehicleFormLastOil),
        oilInterval: Number(vehicleFormInterval),
        color: 'tor-blue'
      };
      updatedVehicles = [...vehicles, newV];
    }

    setVehicles(updatedVehicles);
    localStorage.setItem('tor_custom_vehicles', JSON.stringify(updatedVehicles));
    setIsVehicleModalOpen(false);
  };

  const handleDeleteVehicle = (vId: string) => {
    if (confirm('Tem certeza que deseja remover esta viatura do painel?')) {
      const updated = vehicles.filter(v => v.id !== vId);
      setVehicles(updated);
      localStorage.setItem('tor_custom_vehicles', JSON.stringify(updated));
      setIsVehicleModalOpen(false);
    }
  };

  const handleResetAllToSpreadsheet = () => {
    if (confirm('Deseja descartar as alterações locais e recarregar os dados originais da planilha do Google?')) {
      localStorage.removeItem('tor_custom_teams');
      localStorage.removeItem('tor_custom_vehicles');
      localStorage.removeItem('tor_custom_absences');
      fetchData();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="size-16 border-4 border-tor-blue border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-900 font-black uppercase tracking-widest text-sm">Carregando dados operacionais e afastamentos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <style>{`
        @keyframes flash-red {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }
        .animate-flash-red {
          animation: flash-red 0.8s ease-in-out infinite;
        }
      `}</style>

      {/* Banner de Modo de Edição Ativo para o Gestor */}
      {isLoggedIn && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl p-5 px-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl shadow-emerald-600/20">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
              <span className="material-symbols-outlined text-3xl">edit_note</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-white text-emerald-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                  GESTOR ATIVO
                </span>
                <h4 className="text-sm md:text-base font-black uppercase tracking-wider">
                  Modo de Edição Habilitado
                </h4>
              </div>
              <p className="text-xs text-emerald-100 font-medium mt-0.5">
                Você pode alterar guarnições, policiais, viaturas e registrar afastamentos. As modificações são salvas automaticamente.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={handleResetAllToSpreadsheet}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
              title="Restaurar dados originais da planilha do Google"
            >
              <span className="material-symbols-outlined text-sm">restart_alt</span>
              <span>Restaurar Planilha</span>
            </button>
            <button
              type="button"
              onClick={handleOpenAddTeam}
              className="px-4 py-2 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">group_add</span>
              <span>+ Nova Equipe</span>
            </button>
          </div>
        </div>
      )}

      {/* Grid de Equipes (Guarnições) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {teams.map((team) => (
          <div key={team.id} className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all duration-500">
            <div className={`absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -translate-y-12 translate-x-12 opacity-50`}></div>

            <div className="flex justify-between items-start mb-8 relative z-10">
              <div className="flex gap-5 flex-1 min-w-0">
                <div className={`size-16 rounded-[22px] bg-blue-50 flex items-center justify-center text-tor-blue shadow-inner shrink-0`}>
                  <span className="material-symbols-outlined text-4xl filled-icon">shield</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xl md:text-[28px] font-black text-slate-900 leading-tight mb-1 truncate">
                      {team.name}
                    </h3>
                    {isLoggedIn && (
                      <button
                        type="button"
                        onClick={() => handleOpenEditTeam(team)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-tor-blue hover:text-white text-slate-600 text-xs font-black uppercase tracking-wider transition-all shadow-sm"
                        title="Editar Guarnição da Equipe"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                        <span className="hidden sm:inline">Editar</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-slate-400 text-lg mt-0.5">explore</span>
                    <div className="text-xs font-bold leading-relaxed flex-1 whitespace-normal break-words">
                      <span className="text-slate-400 uppercase tracking-tighter mr-1 shrink-0">Setor: </span>
                      <span className="text-tor-blue">{team.sector}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6 relative z-10">
              <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                <p className="text-[12px] md:text-[14px] font-black text-slate-400 uppercase tracking-widest text-center flex-1">
                  GUARNIÇÃO
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {team.members.filter(m => m.name.trim() !== '').map((member, idx) => {
                  const statusInfo = getMemberStatusIcon(member.name);

                  return (
                    <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm transition-all group/member relative">
                      <div className={`absolute -top-2 -right-2 p-1.5 rounded-full ${statusInfo.bg} ${statusInfo.color} shadow-sm z-20`}>
                        <span className="material-symbols-outlined text-sm">{statusInfo.icon}</span>
                      </div>

                      <div className="size-9 md:size-11 rounded-full bg-white flex items-center justify-center text-slate-300 border border-slate-100 shadow-sm group-hover/member:text-slate-500 overflow-hidden transition-colors shrink-0">
                        {getRankIcon(member.name) ? (
                          <img src={getRankIcon(member.name)!} className="w-full h-full object-contain p-1" alt="rank" />
                        ) : (
                          <span className="material-symbols-outlined text-lg md:text-xl">{member.icon}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-slate-800 truncate">{member.name}</p>
                        <p className={`text-[9px] font-black text-tor-blue uppercase tracking-tight`}>
                          {member.role}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Painel de Afastamentos e Licenças com Edição Integrada */}
      <PersonnelAbsences isLoggedIn={isLoggedIn} />

      {/* Status das Viaturas */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-10 rounded-xl bg-tor-blue/10 text-tor-blue flex items-center justify-center">
              <span className={`material-symbols-outlined text-2xl ${isSyncing ? 'animate-spin' : ''}`}>
                {isSyncing ? 'sync' : 'commute'}
              </span>
            </div>
            <div className="flex flex-col">
              <h3 className="text-slate-900 text-lg font-bold uppercase tracking-wider leading-tight">Status das Viaturas</h3>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                {isSyncing ? 'Sincronizando Automaticamente...' : 'Monitoramento Automático Ativo (60s)'}
              </p>
            </div>
          </div>

          {isLoggedIn && (
            <button
              type="button"
              onClick={handleOpenAddVehicle}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">add_circle</span>
              <span>+ Nova Viatura</span>
            </button>
          )}
        </div>

        <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
          {vehicles.map((vehicle, index) => {
            const stats = getVehicleOilStats(vehicle);

            return (
              <div key={vehicle.id} className={`space-y-8 ${index % 2 !== 0 ? 'lg:border-l lg:border-slate-50 lg:pl-12' : ''}`}>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-4">
                      <div className={`px-4 py-1.5 rounded-xl text-white font-black text-xs md:text-sm shadow-lg bg-tor-blue shadow-tor-blue/20 shrink-0`}>
                        {vehicle.id}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md whitespace-nowrap border border-slate-100">{vehicle.plate}</span>
                      {isLoggedIn && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditVehicle(vehicle)}
                          className="size-8 rounded-lg bg-slate-100 hover:bg-tor-blue hover:text-white text-slate-600 flex items-center justify-center transition-all shadow-sm"
                          title="Editar Viatura"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col min-w-0 gap-1">
                      <h4 className="text-slate-900 font-black text-sm md:text-lg leading-tight break-words">
                        {vehicle.model}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-300 font-bold text-[10px] md:text-sm shrink-0">{vehicle.year}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] md:text-[9px] font-black shrink-0 ${vehicle.status === 'OPERANDO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {vehicle.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Odômetro Atual', value: vehicle.odometer },
                    { label: 'Próx. Troca Óleo', value: stats.nextChange },
                  ].map(item => (
                    <div key={item.label} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">{item.label}</p>
                      <p className="text-sm font-black text-slate-800">{item.value.toLocaleString('pt-BR')} km</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-end px-1">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Vida Útil do Óleo</p>
                    <p className={`text-xs font-black ${stats.lifePercentage < 20 ? 'text-red-500' : 'text-tor-blue'}`}>
                      {stats.lifePercentage}%
                    </p>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <div
                      className={`h-full transition-all duration-1000 rounded-full ${stats.lifePercentage < 20 ? 'bg-red-500' : 'bg-gradient-to-r from-tor-blue to-sky-400'}`}
                      style={{ width: `${stats.lifePercentage}%` }}
                    ></div>
                  </div>

                  {stats.isUrgent ? (
                    <div className="flex flex-col items-center gap-1 pt-1">
                      <p className="text-[11px] font-black text-red-600 uppercase tracking-widest animate-flash-red">
                        ⚠️ TROCAR DE ÓLEO URGENTE ⚠️
                      </p>
                      <p className="text-[8px] text-red-500 font-bold uppercase tracking-tighter">
                        Vencido por {stats.overdueKm.toLocaleString('pt-BR')} km
                      </p>
                    </div>
                  ) : (
                    <p className="text-[8px] text-slate-400 font-bold uppercase text-center tracking-tighter">
                      {stats.remainingKm.toLocaleString('pt-BR')} km restantes para troca
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Edição / Criação de Equipe */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-white/20 animate-in zoom-in-95 duration-200">
            <div className="bg-tor-dark p-6 text-white text-center relative">
              <h3 className="text-lg font-black uppercase tracking-wider">
                {editingTeam ? `Editar ${editingTeam.name}` : 'Criar Nova Equipe'}
              </h3>
              <p className="text-slate-400 text-xs mt-1">Configuração da Guarnição Operacional</p>
            </div>

            <form onSubmit={handleSaveTeam} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nome da Equipe</label>
                <input
                  type="text"
                  value={teamFormName}
                  onChange={e => setTeamFormName(e.target.value)}
                  placeholder="Ex: EQUIPE ALFA"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-tor-blue focus:ring-0 uppercase"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Setor / Região</label>
                <input
                  type="text"
                  value={teamFormSector}
                  onChange={e => setTeamFormSector(e.target.value)}
                  placeholder="Ex: TOR 1º BPMRv"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-tor-blue focus:ring-0"
                  required
                />
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Policiais da Guarnição</label>
                  <button
                    type="button"
                    onClick={handleAddMemberToForm}
                    className="text-emerald-600 hover:text-emerald-700 text-[11px] font-black uppercase flex items-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">add_circle</span>
                    <span>Adicionar Policial</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {teamFormMembers.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex-1">
                        {personnelList.length > 0 ? (
                          <select
                            value={m.name}
                            onChange={e => handleUpdateMemberInForm(idx, 'name', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                          >
                            <option value="">Selecione o policial...</option>
                            {personnelList.map(p => (
                              <option key={p.id} value={`${p.graduation} ${p.name}`}>
                                {p.graduation} {p.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={m.name}
                            onChange={e => handleUpdateMemberInForm(idx, 'name', e.target.value)}
                            placeholder="Nome / Graduação"
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                          />
                        )}
                      </div>

                      <div className="w-36">
                        <input
                          type="text"
                          value={m.role}
                          onChange={e => handleUpdateMemberInForm(idx, 'role', e.target.value)}
                          placeholder="Função (ex: MOTORISTA)"
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 uppercase"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveMemberFromForm(idx)}
                        className="size-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center shrink-0 transition-colors"
                        title="Remover da Guarnição"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                {editingTeam && teams.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteTeam(editingTeam.id)}
                    className="px-3 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
                  >
                    Excluir
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-md shadow-emerald-600/20"
                >
                  Salvar Guarnição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição / Adição de Viatura */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-white/20 animate-in zoom-in-95 duration-200">
            <div className="bg-tor-dark p-6 text-white text-center relative">
              <h3 className="text-lg font-black uppercase tracking-wider">
                {editingVehicleId ? `Editar ${editingVehicleId}` : 'Adicionar Viatura'}
              </h3>
              <p className="text-slate-400 text-xs mt-1">Controle de Frota e Manutenção</p>
            </div>

            <form onSubmit={handleSaveVehicle} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Identificação / Prefixo</label>
                  <input
                    type="text"
                    value={vehicleFormId}
                    onChange={e => setVehicleFormId(e.target.value)}
                    placeholder="Ex: TOR 0003"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 uppercase focus:border-tor-blue focus:ring-0"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Placa</label>
                  <input
                    type="text"
                    value={vehicleFormPlate}
                    onChange={e => setVehicleFormPlate(e.target.value)}
                    placeholder="Ex: ABC-1234"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 uppercase focus:border-tor-blue focus:ring-0"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Modelo</label>
                  <input
                    type="text"
                    value={vehicleFormModel}
                    onChange={e => setVehicleFormModel(e.target.value)}
                    placeholder="Ex: Toyota Hilux SW4"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-tor-blue focus:ring-0"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ano</label>
                  <input
                    type="text"
                    value={vehicleFormYear}
                    onChange={e => setVehicleFormYear(e.target.value)}
                    placeholder="Ex: 2024"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-tor-blue focus:ring-0"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">KM Atual (Odômetro)</label>
                  <input
                    type="number"
                    value={vehicleFormOdometer}
                    onChange={e => setVehicleFormOdometer(Number(e.target.value))}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-tor-blue focus:ring-0"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">KM da Última Troca Óleo</label>
                  <input
                    type="number"
                    value={vehicleFormLastOil}
                    onChange={e => setVehicleFormLastOil(Number(e.target.value))}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-tor-blue focus:ring-0"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Intervalo Troca (KM)</label>
                  <input
                    type="number"
                    value={vehicleFormInterval}
                    onChange={e => setVehicleFormInterval(Number(e.target.value))}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-tor-blue focus:ring-0"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status da Viatura</label>
                  <select
                    value={vehicleFormStatus}
                    onChange={e => setVehicleFormStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-tor-blue focus:ring-0"
                  >
                    <option value="OPERANDO">OPERANDO</option>
                    <option value="BAIXADA">BAIXADA</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                {editingVehicleId && (
                  <button
                    type="button"
                    onClick={() => handleDeleteVehicle(editingVehicleId)}
                    className="px-3 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
                  >
                    Excluir
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsVehicleModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-md shadow-emerald-600/20"
                >
                  Salvar Viatura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationalView;
