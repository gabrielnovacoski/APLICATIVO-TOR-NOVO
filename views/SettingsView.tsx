import React, { useState, useEffect } from 'react';
import type { UserProfile } from '../types';
import { fetchPersonnel } from '../services/sheetsService';
import { cloudSyncService } from '../services/cloudSyncService';

interface Personnel {
  id: string;
  name: string;
  graduation: string;
}

const SettingsView: React.FC<{ isLoggedIn: boolean; userProfile: UserProfile | null }> = ({ isLoggedIn, userProfile }) => {

  const [activeTab, setActiveTab] = useState<'profile' | 'sync' | 'system'>('profile');
  const [loading, setLoading] = useState(true);
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);

  // Estados de Sincronização em Nuvem
  const [scriptUrl, setScriptUrl] = useState(() => cloudSyncService.getSyncUrl());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const loadPersonnel = async () => {
      setLoading(true);
      const data = await fetchPersonnel();
      setPersonnelList(data as unknown as Personnel[]);
      setLoading(false);
    };
    loadPersonnel();
  }, []);

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    cloudSyncService.setSyncUrl(scriptUrl);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const result = await cloudSyncService.testConnection(scriptUrl);
    setTestResult(result);
    setIsTesting(false);
  };

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
            { id: 'sync', label: 'Sincronização Nuvem', icon: 'cloud_sync' },
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

          {activeTab === 'sync' && (
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
              <div className="p-8 border-b border-slate-50 flex items-center gap-4">
                <div className="size-12 rounded-2xl bg-tor-blue/10 text-tor-blue flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">cloud_sync</span>
                </div>
                <div>
                  <h3 className="text-slate-900 text-lg font-bold uppercase tracking-wider">Sincronização em Nuvem (Google Sheets)</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                    Mantenha equipes, viaturas e afastamentos sincronizados entre celular e computadores
                  </p>
                </div>
              </div>

              <div className="p-8 space-y-6">
                {/* Status da Sincronização */}
                <div className={`p-5 rounded-2xl border flex items-start gap-4 ${
                  scriptUrl
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50/60 border-amber-200 text-amber-900'
                }`}>
                  <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
                    scriptUrl ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                  }`}>
                    <span className="material-symbols-outlined text-xl">
                      {scriptUrl ? 'cloud_done' : 'cloud_off'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`size-2.5 rounded-full ${scriptUrl ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                      <h4 className="text-xs font-black uppercase tracking-wider">
                        {scriptUrl ? 'Sincronização em Nuvem Ativa' : 'Modo Apenas Local (Sem Sincronização)'}
                      </h4>
                    </div>
                    <p className="text-xs mt-1 leading-relaxed opacity-90">
                      {scriptUrl
                        ? 'Todas as alterações que você fizer no modo Gestor são enviadas em tempo real para a sua Planilha do Google e aparecem em todos os celulares e computadores.'
                        : 'Atualmente as alterações feitas no modo Gestor são salvas somente no navegador deste computador. Configure a URL do Google Apps Script abaixo para sincronizar entre todos os aparelhos.'}
                    </p>
                  </div>
                </div>

                {/* Formulário da URL */}
                <form onSubmit={handleSaveUrl} className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                      <span>URL do Webhook (Google Apps Script)</span>
                    </label>
                    <input
                      type="url"
                      value={scriptUrl}
                      onChange={e => setScriptUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:border-tor-blue focus:ring-0 shadow-sm"
                    />
                    <p className="text-[10px] text-slate-400">
                      Cole aqui a URL gerada na implantação do App da Web no Google Sheets (arquivo <code>google-apps-script.js</code>).
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-tor-dark hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-2 active:scale-95"
                    >
                      <span className="material-symbols-outlined text-sm">save</span>
                      <span>Salvar URL</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={isTesting || !scriptUrl}
                      className="px-5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 disabled:opacity-50 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm flex items-center gap-2 active:scale-95"
                    >
                      {isTesting ? (
                        <>
                          <div className="size-3.5 border-2 border-tor-blue border-t-transparent rounded-full animate-spin"></div>
                          <span>Testando...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-sm text-tor-blue">wifi_protected_setup</span>
                          <span>Testar Conexão</span>
                        </>
                      )}
                    </button>

                    {scriptUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setScriptUrl('');
                          cloudSyncService.setSyncUrl('');
                          setTestResult(null);
                        }}
                        className="text-red-500 hover:text-red-700 text-xs font-bold uppercase tracking-wider px-3 py-2 transition-colors ml-auto"
                      >
                        Remover URL
                      </button>
                    )}
                  </div>

                  {saveSuccess && (
                    <div className="p-3 bg-emerald-100/70 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                      <span className="material-symbols-outlined text-base">check_circle</span>
                      <span>URL salva com sucesso neste navegador!</span>
                    </div>
                  )}

                  {testResult && (
                    <div className={`p-4 rounded-xl border text-xs font-bold flex items-center gap-3 animate-in fade-in ${
                      testResult.success
                        ? 'bg-emerald-100/70 border-emerald-300 text-emerald-800'
                        : 'bg-red-100/70 border-red-300 text-red-800'
                    }`}>
                      <span className="material-symbols-outlined text-lg shrink-0">
                        {testResult.success ? 'check_circle' : 'error'}
                      </span>
                      <span>{testResult.message}</span>
                    </div>
                  )}
                </form>

                {/* Passo a passo de ativação */}
                <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-4">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-tor-blue text-base">menu_book</span>
                    <span>Como obter a URL do Google Apps Script (Passo a Passo)</span>
                  </h4>

                  <ol className="text-xs text-slate-600 space-y-2.5 list-decimal list-inside leading-relaxed">
                    <li>Abra a sua planilha do Google Sheets no computador.</li>
                    <li>No menu superior, vá em <strong>Extensões &gt; Apps Script</strong>.</li>
                    <li>Copie todo o conteúdo do arquivo <strong><code>google-apps-script.js</code></strong> e cole no editor substituindo o código existente.</li>
                    <li>Clique no ícone de disquete (<strong>Salvar</strong>).</li>
                    <li>No canto superior direito, clique em <strong>Implantar &gt; Nova implantação</strong>.</li>
                    <li>Ao lado de <em>Selecione o tipo</em> (engrenagem), selecione <strong>App da Web</strong>.</li>
                    <li>Defina: <em>Executar como:</em> <strong>Eu</strong> e <em>Quem pode acessar:</em> <strong>Qualquer pessoa (Anyone)</strong>.</li>
                    <li>Clique em <strong>Implantar</strong>, autorize as permissões da sua conta e copie a <strong>URL do app da Web</strong> terminada em <code>/exec</code>.</li>
                    <li>Cole a URL no campo acima e clique em <strong>Salvar URL</strong>!</li>
                  </ol>
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
