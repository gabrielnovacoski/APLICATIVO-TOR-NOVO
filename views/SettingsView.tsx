import React, { useState, useEffect } from 'react';
import type { UserProfile } from '../types';
import { fetchPersonnel } from '../services/sheetsService';

interface Personnel {
  id: string;
  name: string;
  graduation: string;
}

const SettingsView: React.FC<{ isLoggedIn: boolean; userProfile: UserProfile | null }> = ({ isLoggedIn, userProfile }) => {

  const [activeTab, setActiveTab] = useState<'profile' | 'system'>('profile');
  const [loading, setLoading] = useState(true);
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);

  useEffect(() => {
    const loadPersonnel = async () => {
      setLoading(true);
      const data = await fetchPersonnel();
      setPersonnelList(data as unknown as Personnel[]);
      setLoading(false);
    };
    loadPersonnel();
  }, []);

  const getRankIcon = (graduation: string) => {
    const g = graduation.toUpperCase();
    const v = '?v=300';
    if (g.includes('SUB TEN') || g.includes('SUBTEN') || g.includes('SUB') || g.includes('TENENTE') || g.includes('TEN')) return `/ranks/subten.png${v}`;
    if (g.includes('1º SGT') || g.includes('1SGT') || g.includes('1ºSGT') || g.includes('1 SGT')) return `/ranks/1sgt.png${v}`;
    if (g.includes('2º SGT') || g.includes('2SGT') || g.includes('2ºSGT') || g.includes('2 SGT')) return `/ranks/2sgt.png${v}`;
    if (g.includes('3º SGT') || g.includes('3SGT') || g.includes('3ºSGT') || g.includes('3 SGT') || g.includes('SGT')) return `/ranks/3sgt.png${v}`;
    if (g.includes('CABO') || g.includes('CB')) return `/ranks/cabo.png${v}`;
    if (g.includes('SOLDADO') || g.includes('SD')) return `/ranks/soldado.png${v}`;
    return null;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-64 shrink-0 space-y-2">
          {[
            { id: 'profile', label: 'Efetivo (Leitura)', icon: 'badge' },
            { id: 'system', label: 'Preferências do Sistema', icon: 'settings_suggest' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all border ${activeTab === tab.id
                ? 'bg-tor-dark text-white border-tor-dark shadow-lg shadow-tor-dark/20 font-bold'
                : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                }`}
            >
              <span className={`material-symbols-outlined text-xl ${activeTab === tab.id ? 'filled-icon' : ''}`}>
                {tab.icon}
              </span>
              <span className="text-sm tracking-tight">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-6">
          {activeTab === 'profile' && (
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
              <div className="p-8 border-b border-slate-50 flex items-center gap-4">
                <div className="size-12 rounded-2xl bg-tor-blue/10 text-tor-blue flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">badge</span>
                </div>
                <div>
                  <h3 className="text-slate-900 text-lg font-bold uppercase tracking-wider">Efetivo Cadastrado na Planilha</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Os policiais agora são lidos automaticamente do Google Sheets.</p>
                </div>
              </div>

              <div className="p-8 space-y-8">
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Policiais Cadastrados ({personnelList.length})</p>

                  {loading ? (
                    <div className="flex justify-center py-12">
                      <div className="size-8 border-4 border-tor-blue border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {personnelList.map((person) => {
                        const rankIcon = getRankIcon(person.graduation);
                        return (
                          <div key={person.id} className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-tor-accent/30 transition-all">
                            <div className="flex items-center gap-4">
                              <div className="size-12 rounded-full overflow-hidden flex items-center justify-center bg-slate-50 border border-slate-100">
                                {rankIcon ? (
                                  <img src={rankIcon} alt={person.graduation} className="w-full h-full object-contain p-1" />
                                ) : (
                                  <span className="material-symbols-outlined text-xl text-slate-400">person</span>
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-800">{person.name}</p>
                                <p className="text-[9px] font-black text-tor-blue uppercase tracking-tighter">{person.graduation}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
              <div className="p-8 border-b border-slate-50 flex items-center gap-4">
                <div className="size-12 rounded-2xl bg-tor-blue/10 text-tor-blue flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">settings_suggest</span>
                </div>
                <div>
                  <h3 className="text-slate-900 text-lg font-bold uppercase tracking-wider">Preferências do Sistema</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Configure sua experiência de uso</p>
                </div>
              </div>
              <div className="p-8 space-y-6">
                {[
                  { id: 'ai', title: 'Assistência de IA Ativa', desc: 'Permite que o Gemini analise dados em tempo real para gerar insights operacionais.', icon: 'auto_awesome', active: true },
                  { id: 'notif', title: 'Notificações Críticas', desc: 'Receber alertas sonoros e visuais para ocorrências de alta prioridade.', icon: 'notifications_active', active: true },
                  { id: 'stats', title: 'Auto-refresh de Estatísticas', desc: 'Atualizar os gráficos de produtividade a cada 5 minutos automaticamente.', icon: 'sync', active: false },
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-6 bg-slate-50/50 rounded-2xl border border-slate-100 group hover:bg-white hover:border-slate-200 transition-all">
                    <div className="flex gap-4">
                      <div className="size-12 rounded-xl bg-white flex items-center justify-center text-slate-400 border border-slate-100 group-hover:text-tor-blue transition-colors">
                        <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800">{item.title}</p>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-sm">{item.desc}</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked={item.active} />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tor-blue"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-slate-200/50">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conectado à Intranet PMRv SC</p>
        </div>
        <div className="flex items-center gap-6">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Versão v3.2.0-STABLE</p>
          <div className="h-4 w-px bg-slate-200"></div>
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">© 2024 TOR Digital Solutions</p>
        </div>
      </footer>
    </div>
  );
};

export default SettingsView;
