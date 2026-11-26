/**
 * =========================================================================
 * GOOGLE APPS SCRIPT - SINCRONIZAÇÃO EM NUVEM DO PAINEL OPERACIONAL TOR
 * =========================================================================
 * 
 * INSTRUÇÕES PARA ATIVAÇÃO:
 * 1. Abra a sua Planilha do Google (onde estão os dados do TOR).
 * 2. No menu superior, clique em: Extensões > Apps Script.
 * 3. Apague qualquer código que estiver lá e cole todo este arquivo.
 * 4. Clique no ícone de disquete (Salvar).
 * 5. Clique no botão azul no topo direito: "Implantar" > "Nova implantação".
 * 6. Na engrenagem ao lado de "Selecione o tipo", escolha "App da Web".
 * 7. Preencha os campos exatamente assim:
 *    - Descrição: Sincronização TOR
 *    - Executar como: Eu (seu email do Google)
 *    - Quem pode acessar: Qualquer pessoa (Anyone)  <--- IMPORTANTE!
 * 8. Clique em "Implantar", autorize o acesso com a sua conta Google se solicitado.
 * 9. Copie a "URL do app da Web" gerada (termina com /exec).
 * 10. No aplicativo TOR, vá em Configurações > Sincronização em Nuvem e cole a URL!
 * =========================================================================
 */

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'getAll';

    var result = { status: 'success' };

    if (action === 'getAll') {
      result.teams = getTeamsData(ss);
      result.vehicles = getVehiclesData(ss);
      result.absences = getAbsencesData(ss);
    } else if (action === 'getTeams') {
      result.teams = getTeamsData(ss);
    } else if (action === 'getVehicles') {
      result.vehicles = getVehiclesData(ss);
    } else if (action === 'getAbsences') {
      result.absences = getAbsencesData(ss);
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action;

    if (action === 'saveTeams') {
      saveTeamsData(ss, postData.teams);
    } else if (action === 'saveVehicles') {
      saveVehiclesData(ss, postData.vehicles);
    } else if (action === 'saveAbsences') {
      saveAbsencesData(ss, postData.absences);
    } else {
      throw new Error("Ação desconhecida: " + action);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Dados salvos com sucesso na planilha!'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Localiza uma aba pelo nome ignorando maiúsculas/minúsculas ou cria se não existir
 */
function getOrCreateSheet(ss, name, headers) {
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().trim().toLowerCase() === name.trim().toLowerCase()) {
      return sheets[i];
    }
  }
  var newSheet = ss.insertSheet(name);
  if (headers && headers.length > 0) {
    newSheet.appendRow(headers);
  }
  return newSheet;
}

// -------------------------------------------------------------------------
// EQUIPES
// -------------------------------------------------------------------------
function getTeamsData(ss) {
  var sheet = getOrCreateSheet(ss, "Equipes", ["Equipe", "Setor", "Comandante", "Motorista", "3º Homem", "4º Homem"]);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    var members = [];
    if (row[2]) members.push({ name: String(row[2]), role: 'COMANDANTE', icon: 'person' });
    if (row[3]) members.push({ name: String(row[3]), role: 'MOTORISTA', icon: 'navigation' });
    if (row[4]) members.push({ name: String(row[4]), role: '3º HOMEM', icon: 'shield' });
    if (row[5]) members.push({ name: String(row[5]), role: '4º HOMEM', icon: 'shield' });
    result.push({
      id: String(i),
      name: String(row[0]),
      sector: String(row[1] || 'TOR 1º BPMRv'),
      status: 'Patrulhamento',
      color: 'tor-blue',
      members: members
    });
  }
  return result;
}

function saveTeamsData(ss, teams) {
  var sheet = getOrCreateSheet(ss, "Equipes", ["Equipe", "Setor", "Comandante", "Motorista", "3º Homem", "4º Homem"]);
  sheet.clearContents();
  sheet.appendRow(["Equipe", "Setor", "Comandante", "Motorista", "3º Homem", "4º Homem"]);
  if (!teams || teams.length === 0) return;
  var rows = teams.map(function(t) {
    var m = t.members || [];
    var com = m.find(function(x) { return x.role === 'COMANDANTE'; }) || m[0];
    var mot = m.find(function(x) { return x.role === 'MOTORISTA'; }) || m[1];
    var hom3 = m.find(function(x) { return x.role === '3º HOMEM'; }) || m[2];
    var hom4 = m.find(function(x) { return x.role === '4º HOMEM'; }) || m[3];
    return [
      t.name || '',
      t.sector || 'TOR 1º BPMRv',
      com ? com.name : '',
      mot ? mot.name : '',
      hom3 ? hom3.name : '',
      hom4 ? hom4.name : ''
    ];
  });
  sheet.getRange(2, 1, rows.length, 6).setValues(rows);
}

// -------------------------------------------------------------------------
// VIATURAS
// -------------------------------------------------------------------------
function getVehiclesData(ss) {
  var sheet = getOrCreateSheet(ss, "Viaturas", ["ID", "Prefixo", "Modelo", "Ano", "Placa", "Status", "Intervalo Óleo", "Último Óleo"]);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    result.push({
      id: String(row[0]),
      prefix: String(row[1] || ''),
      model: String(row[2] || ''),
      year: String(row[3] || ''),
      plate: String(row[4] || ''),
      status: String(row[5]) === 'BAIXADA' ? 'BAIXADA' : 'OPERANDO',
      oilInterval: Number(row[6]) || 10000,
      lastOilChangeOdometer: Number(row[7]) || 0,
      odometer: Number(row[7]) || 0,
      color: 'tor-blue'
    });
  }
  return result;
}

function saveVehiclesData(ss, vehicles) {
  var sheet = getOrCreateSheet(ss, "Viaturas", ["ID", "Prefixo", "Modelo", "Ano", "Placa", "Status", "Intervalo Óleo", "Último Óleo"]);
  sheet.clearContents();
  sheet.appendRow(["ID", "Prefixo", "Modelo", "Ano", "Placa", "Status", "Intervalo Óleo", "Último Óleo"]);
  if (!vehicles || vehicles.length === 0) return;
  var rows = vehicles.map(function(v) {
    return [
      v.id || '',
      v.prefix || (v.plate ? String(v.plate).replace('-', '') : ''),
      v.model || '',
      v.year || '',
      v.plate || '',
      v.status || 'OPERANDO',
      v.oilInterval || 10000,
      v.lastOilChangeOdometer || 0
    ];
  });
  sheet.getRange(2, 1, rows.length, 8).setValues(rows);
}

// -------------------------------------------------------------------------
// AFASTAMENTOS E LICENÇAS
// -------------------------------------------------------------------------
function getAbsencesData(ss) {
  var sheet = getOrCreateSheet(ss, "Afastamentos", ["Policial", "Tipo", "Data Início", "Data Fim", "Descrição"]);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    var startStr = row[2] instanceof Date ? Utilities.formatDate(row[2], Session.getScriptTimeZone(), "yyyy-MM-dd") : String(row[2]);
    var endStr = row[3] instanceof Date ? Utilities.formatDate(row[3], Session.getScriptTimeZone(), "yyyy-MM-dd") : String(row[3]);
    result.push({
      id: "absence-" + (i - 1),
      personnel_id: String(row[0]),
      type: String(row[1] || 'Férias'),
      start_date: startStr,
      end_date: endStr,
      description: String(row[4] || '')
    });
  }
  return result;
}

function saveAbsencesData(ss, absences) {
  var sheet = getOrCreateSheet(ss, "Afastamentos", ["Policial", "Tipo", "Data Início", "Data Fim", "Descrição"]);
  sheet.clearContents();
  sheet.appendRow(["Policial", "Tipo", "Data Início", "Data Fim", "Descrição"]);
  if (!absences || absences.length === 0) return;
  var rows = absences.map(function(a) {
    var policeName = a.personnel ? (a.personnel.graduation ? a.personnel.graduation + ' ' + a.personnel.name : a.personnel.name) : (a.personnel_id || '');
    return [
      policeName,
      a.type || 'Férias',
      a.start_date || '',
      a.end_date || '',
      a.description || ''
    ];
  });
  sheet.getRange(2, 1, rows.length, 5).setValues(rows);
}
