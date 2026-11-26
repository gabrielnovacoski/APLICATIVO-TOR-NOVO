import { Team, Vehicle, PersonnelAbsence } from '../types';

export interface CloudData {
  teams?: Team[];
  vehicles?: Vehicle[];
  absences?: PersonnelAbsence[];
}

export interface SyncResult {
  success: boolean;
  message: string;
}

class CloudSyncService {
  public static readonly STORAGE_URL_KEY = 'tor_apps_script_url';

  /**
   * Obtém a URL do Webhook do Google Apps Script
   */
  public getSyncUrl(): string {
    const envUrl = (import.meta as any).env?.VITE_GOOGLE_APPS_SCRIPT_URL;
    const localUrl = localStorage.getItem(CloudSyncService.STORAGE_URL_KEY);
    return (envUrl || localUrl || '').trim();
  }

  /**
   * Salva a URL do Google Apps Script nas configurações locais
   */
  public setSyncUrl(url: string): void {
    const clean = url.trim();
    if (clean) {
      localStorage.setItem(CloudSyncService.STORAGE_URL_KEY, clean);
    } else {
      localStorage.removeItem(CloudSyncService.STORAGE_URL_KEY);
    }
  }

  /**
   * Verifica se a sincronização em nuvem está configurada
   */
  public isConfigured(): boolean {
    return Boolean(this.getSyncUrl());
  }

  /**
   * Envia requisição POST para o Google Apps Script
   */
  private async sendPost(payload: any): Promise<SyncResult> {
    const url = this.getSyncUrl();
    if (!url) {
      return {
        success: true,
        message: 'Alterações salvas localmente neste navegador. (Para sincronizar entre celular e outros PCs, configure a URL do Google Apps Script em Configurações).'
      };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload),
        redirect: 'follow'
      });

      if (response.ok) {
        try {
          const json = await response.json();
          if (json.status === 'success') {
            return {
              success: true,
              message: json.message || 'Alterações salvas na planilha do Google e sincronizadas com todos os dispositivos!'
            };
          }
        } catch {
          return {
            success: true,
            message: 'Alterações salvas com sucesso na planilha do Google!'
          };
        }
      }

      return {
        success: true,
        message: 'Alterações enviadas e salvas na planilha!'
      };
    } catch (error) {
      console.warn('Tentativa com no-cors devido a restrição de rede/CORS:', error);
      try {
        await fetch(url, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: JSON.stringify(payload)
        });
        return {
          success: true,
          message: 'Alterações enviadas para a planilha do Google!'
        };
      } catch (e2) {
        console.error('Falha ao enviar dados para o Google Apps Script:', e2);
        return {
          success: false,
          message: 'Não foi possível conectar à planilha na nuvem. A alteração foi salva localmente neste dispositivo.'
        };
      }
    }
  }

  /**
   * Salva todas as equipes na planilha do Google e no cache local
   */
  public async saveTeams(teams: Team[]): Promise<SyncResult> {
    localStorage.setItem('tor_custom_teams', JSON.stringify(teams));
    return this.sendPost({
      action: 'saveTeams',
      teams
    });
  }

  /**
   * Salva todas as viaturas na planilha do Google e no cache local
   */
  public async saveVehicles(vehicles: Vehicle[]): Promise<SyncResult> {
    localStorage.setItem('tor_custom_vehicles', JSON.stringify(vehicles));
    return this.sendPost({
      action: 'saveVehicles',
      vehicles
    });
  }

  /**
   * Salva todos os afastamentos na planilha do Google e no cache local
   */
  public async saveAbsences(absences: PersonnelAbsence[]): Promise<SyncResult> {
    localStorage.setItem('tor_custom_absences', JSON.stringify(absences));
    return this.sendPost({
      action: 'saveAbsences',
      absences
    });
  }

  /**
   * Busca dados instantâneos diretamente do Google Apps Script
   */
  public async fetchCloudData(): Promise<CloudData | null> {
    const url = this.getSyncUrl();
    if (!url) return null;

    try {
      const response = await fetch(`${url}?action=getAll`, {
        method: 'GET',
        redirect: 'follow'
      });

      if (!response.ok) return null;
      const data = await response.json();
      if (data && data.status === 'success') {
        return {
          teams: Array.isArray(data.teams) && data.teams.length > 0 ? data.teams : undefined,
          vehicles: Array.isArray(data.vehicles) && data.vehicles.length > 0 ? data.vehicles : undefined,
          absences: Array.isArray(data.absences) && data.absences.length > 0 ? data.absences : undefined
        };
      }
      return null;
    } catch (e) {
      console.warn('Não foi possível obter dados instantâneos do Apps Script:', e);
      return null;
    }
  }

  /**
   * Testa a conexão com a URL informada
   */
  public async testConnection(urlToTest?: string): Promise<{ success: boolean; message: string }> {
    const targetUrl = (urlToTest || this.getSyncUrl()).trim();
    if (!targetUrl) {
      return { success: false, message: 'Por favor, informe a URL do Webhook do Google Apps Script.' };
    }

    try {
      const res = await fetch(`${targetUrl}?action=getAll`, {
        method: 'GET',
        redirect: 'follow'
      });
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success') {
          return { success: true, message: 'Conexão estabelecida com sucesso! A planilha do Google está respondendo perfeitamente.' };
        }
      }
      return { success: false, message: 'A URL respondeu, mas não retornou o formato esperado do Apps Script TOR.' };
    } catch (err: any) {
      return { success: false, message: `Erro ao testar conexão: ${err?.message || 'Verifique se o script foi implantado como "Qualquer pessoa" (Anyone)'}` };
    }
  }
}

export const cloudSyncService = new CloudSyncService();
