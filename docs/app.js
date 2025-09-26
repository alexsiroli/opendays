(function () {
  const turnList = document.getElementById('turn-list');
  const segmented = document.querySelector('.segmented');
  const turnSelector = document.querySelector('.turn-selector');
  let currentTurn = null; // nessun turno selezionato all'ingresso
  const turnTitle = document.getElementById('turn-title');
  const turnMeta = document.getElementById('turn-meta');
  const turnCount = document.getElementById('turn-count');

  /**
   * Struttura dati attesa in data.json:
   * {
   *   "Maschile": { "turno1": ["Nome Cognome"], "turno2": ["..."] },
   *   "Femminile": { "turno1": [], "turno2": [] },
   *   "Misto": { "turno1": [], "turno2": [] }
   * }
   */
  const EMPTY_TURNO = { data: '', allenatore: '', palestra: '', orario: '', nominativi: [] };
  const EMPTY_INFO_COSTI = { allenatore: '', giorni: [], costi: {} };
  const EMPTY_DATA = {
    Maschile: { turno1: { ...EMPTY_TURNO }, turno2: { ...EMPTY_TURNO }, infoCosti: { ...EMPTY_INFO_COSTI } },
    Femminile: { turno1: { ...EMPTY_TURNO }, turno2: { ...EMPTY_TURNO }, infoCosti: { ...EMPTY_INFO_COSTI } },
    Misto: { turno1: { ...EMPTY_TURNO }, turno2: { ...EMPTY_TURNO }, infoCosti: { ...EMPTY_INFO_COSTI } },
    Base: { turno1: { ...EMPTY_TURNO }, turno2: { ...EMPTY_TURNO }, infoCosti: { ...EMPTY_INFO_COSTI } },
  };

  let db = EMPTY_DATA;
  let currentQuery = '';

  // Le etichette dei turni vengono ora lette da data.json (campo ISO "data")

  function renderCategoria(categoria) {
    const dataset = db[categoria] || { turno1: EMPTY_TURNO, turno2: EMPTY_TURNO };
    const turns = computeTurns(dataset);
    const labels = turns.map(t => t.label);
    document.body.setAttribute('data-cat', categoria);
    const isSingleTurn = labels.length <= 1;
    if (turnSelector) {
      renderTurnButtons(turns);
      const selected = currentTurn && currentTurn <= String(turns.length) ? currentTurn : '1';
      setTurnButtonsState(selected);
      renderTurnDetails(turns, selected);
      currentTurn = selected;
    }
  }

  function renderLista(container, nominativi) {
    container.innerHTML = '';
    if (!nominativi || nominativi.length === 0) {
      const li = document.createElement('li');
      li.className = 'vuoto';
      li.textContent = 'Ancora nessun nominativo';
      container.appendChild(li);
      return;
    }
    const sorted = [...nominativi].sort((a, b) =>
      String(a).localeCompare(String(b), 'it', { sensitivity: 'base' })
    );
    const q = currentQuery.trim().toLowerCase();
    for (const nome of sorted) {
      const li = document.createElement('li');
      li.textContent = nome;
      container.appendChild(li);
    }
  }

  function renderMeta(container, turno, categoria, dateLabel) {
    if (!container) return;
    container.innerHTML = '';
    const rows = [
      { label: 'Data', value: formatItalianDate(turno?.data) || '-' },
      { label: 'Allenatore', value: turno?.allenatore || '-' },
      { label: 'Palestra', value: turno?.palestra || '-' },
      { label: 'Orario', value: turno?.orario || '-' },
    ];
    for (const row of rows) {
      const div = document.createElement('div');
      div.className = 'meta-row';
      const lab = document.createElement('span');
      lab.className = 'label';
      lab.textContent = row.label + ':';
      const val = document.createElement('span');
      val.className = 'value';
      if (row.label === 'Palestra') {
        const { text, url } = parsePalestra(row.value);
        if (url) {
          const a = document.createElement('a');
          a.href = url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.textContent = text || 'Mappa';
          val.appendChild(a);
        } else {
          val.textContent = text;
        }
      } else {
        val.textContent = row.value;
      }
      div.appendChild(lab);
      div.appendChild(val);
      container.appendChild(div);
    }

    // Calendar section label
    // Actions: calendar buttons
    const actions = document.createElement('div');
    actions.className = 'turno-actions';
    const addIcsBtn = document.createElement('button');
    addIcsBtn.type = 'button';
    addIcsBtn.className = 'btn';
    addIcsBtn.textContent = 'Apple Calendar';
    addIcsBtn.addEventListener('click', function () {
      try {
        const { start, end, location, title, description, url } = buildEventData(categoria, dateLabel, turno);
        const ics = buildIcs({ start, end, title, location, description, url });
        const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = `${sanitizeFileName(title)}.ics`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      } catch (e) { console.warn('ICS error', e); }
    });

    const googleBtn = document.createElement('button');
    googleBtn.type = 'button';
    googleBtn.className = 'btn outline';
    googleBtn.textContent = 'Google Calendar';
    googleBtn.addEventListener('click', function () {
      try {
        const { start, end, location, title, description, url, displayLocation } = buildEventData(categoria, dateLabel, turno);
        const href = buildGoogleCalendarLink({ start, end, title, location: displayLocation || location, description, url });
        window.open(href, '_blank', 'noopener');
      } catch (e) { console.warn('GCal error', e); }
    });

    actions.appendChild(addIcsBtn);
    actions.appendChild(googleBtn);
    container.appendChild(actions);
  }

  function parsePalestra(raw) {
    if (!raw || typeof raw !== 'string') return { text: '-', url: '' };
    // Trova URL http/https
    const urlMatch = raw.match(/https?:\/\/\S+/);
    const url = urlMatch ? urlMatch[0].replace(/[),.]+$/, '') : '';
    const text = url ? raw.replace(url, '').trim().replace(/[()]/g, '').trim() : raw;
    return { text: text || 'Palestra', url };
  }

  function buildEventData(categoria, dateLabel, turno) {
    const title = 'Open Day Pallavolo CUSB';
    const { text: locText, url: locUrl } = parsePalestra(turno?.palestra || '');
    const location = locText || 'Da definire';
    const start = buildDateFromIsoAndTime(turno?.data, turno?.orario || '21:00');
    const end = new Date(start.getTime() + 90 * 60 * 1000);
    const description = `Allenatore: ${turno?.allenatore || '-'}`;
    return { start, end, location, title, description, url: locUrl || '', displayLocation: locText || '' };
  }

  function parseItalianDateTime(labelWithYear, timeHHmm) {
    // Esempio: "Mercoledi 24 settembre 2025" + "21:30"
    const months = {
      gennaio: 0, febbraio: 1, marzo: 2, aprile: 3, maggio: 4, giugno: 5,
      luglio: 6, agosto: 7, settembre: 8, ottobre: 9, novembre: 10, dicembre: 11,
    };
    const parts = labelWithYear.toLowerCase().split(/\s+/);
    // trova giorno numero e mese
    let day = 1, month = 0, year = new Date().getFullYear();
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (/^\d{1,2}$/.test(p)) day = parseInt(p, 10);
      if (months[p] !== undefined) month = months[p];
      if (/^\d{4}$/.test(p)) year = parseInt(p, 10);
    }
    const [hh, mm] = (timeHHmm || '21:00').split(':').map(x => parseInt(x, 10));
    return new Date(year, month, day, hh, mm || 0, 0);
  }

  function buildDateFromIsoAndTime(isoDate, timeHHmm) {
    // isoDate atteso: YYYY-MM-DD
    if (!isoDate) {
      // fallback: oggi alle HH:mm
      const now = new Date();
      const [hh, mm] = (timeHHmm || '21:00').split(':').map(x => parseInt(x, 10));
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh || 21, mm || 0, 0);
    }
    const [y, m, d] = isoDate.split('-').map(x => parseInt(x, 10));
    const [hh, mm] = (timeHHmm || '21:00').split(':').map(x => parseInt(x, 10));
    return new Date(y, (m - 1), d, hh || 21, mm || 0, 0);
  }

  function formatItalianDate(isoDate) {
    if (!isoDate) return '';
    const months = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
    const weekdays = ['Domenica','Lunedi','Martedi','Mercoledi','Giovedi','Venerdi','Sabato'];
    const [y, m, d] = isoDate.split('-').map(n => parseInt(n, 10));
    const dt = new Date(y, m - 1, d);
    return `${weekdays[dt.getDay()]} ${d} ${months[m - 1]}`;
  }

  function toUtcBasic(dt) {
    // YYYYMMDDTHHMMSSZ
    const pad = n => String(n).padStart(2, '0');
    return (
      dt.getUTCFullYear().toString() +
      pad(dt.getUTCMonth() + 1) +
      pad(dt.getUTCDate()) + 'T' +
      pad(dt.getUTCHours()) +
      pad(dt.getUTCMinutes()) +
      pad(dt.getUTCSeconds()) + 'Z'
    );
  }

  function buildIcs({ start, end, title, location, description, url }) {
    const dtStart = toUtcBasic(start);
    const dtEnd = toUtcBasic(end);
    const uid = Math.random().toString(36).slice(2) + '@cusb-opendays';
    const now = toUtcBasic(new Date());
    const esc = s => (s || '').toString().replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\,').replace(/;/g, '\;');
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CUSB Open Days//IT',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${esc(title)}`,
      `LOCATION:${esc(location)}`,
      `DESCRIPTION:${esc(description)}`,
    ];
    if (url) {
      lines.push(`URL:${esc(url)}`);
    }
    lines.push('END:VEVENT', 'END:VCALENDAR');
    return lines.join('\r\n');
  }

  function buildGoogleCalendarLink({ start, end, title, location, description, url }) {
    const dates = `${toUtcBasic(start)}/${toUtcBasic(end)}`;
    const details = url ? `${description}\nLuogo: ${url}` : description;
    const params = new URLSearchParams({ text: title, dates, location, details });
    return `https://calendar.google.com/calendar/r/eventedit?${params.toString()}`;
  }

  function sanitizeFileName(name) {
    return (name || 'evento').replace(/\s+/g, '_').replace(/[^\w.-]/g, '');
  }

  async function loadData() {
    try {
      const res = await fetch('data.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      // Validazione leggera
      db = {
        Maschile: normalize(json.Maschile),
        Femminile: normalize(json.Femminile),
        Misto: normalize(json.Misto),
        Base: normalize(json.Base),
      };
    } catch (err) {
      console.warn('Impossibile caricare data.json, uso struttura vuota:', err);
      db = EMPTY_DATA;
    }
  }

  function normalize(section) {
    const safe = section && typeof section === 'object' ? section : {};
    return {
      turno1: normalizeTurno(safe.turno1),
      turno2: normalizeTurno(safe.turno2),
      infoCosti: normalizeInfoCosti(safe.infoCosti),
    };
  }

  function normalizeTurno(turno) {
    const t = turno && typeof turno === 'object' ? turno : {};
    return {
      data: typeof t.data === 'string' ? t.data : '',
      allenatore: typeof t.allenatore === 'string' ? t.allenatore : '',
      palestra: typeof t.palestra === 'string' ? t.palestra : '',
      orario: typeof t.orario === 'string' ? t.orario : '',
      nominativi: Array.isArray(t.nominativi) ? t.nominativi : [],
    };
  }

  function normalizeInfoCosti(info) {
    const i = info && typeof info === 'object' ? info : {};
    const giorniRaw = Array.isArray(i.giorni) ? i.giorni : [];
    const giorni = giorniRaw.map(g => ({
      giorno: typeof g.giorno === 'string' ? g.giorno : '',
      palestra: typeof g.palestra === 'string' ? g.palestra : '',
      orario: typeof g.orario === 'string' ? g.orario : '',
    }));
    const costi = i.costi && typeof i.costi === 'object' ? i.costi : {};
    return {
      allenatore: typeof i.allenatore === 'string' ? i.allenatore : '',
      giorni,
      costi,
    };
  }

  segmented.addEventListener('click', function (e) {
    const btn = e.target.closest('.segment');
    if (!btn) return;
    for (const el of segmented.querySelectorAll('.segment')) {
      el.classList.toggle('is-active', el === btn);
      el.setAttribute('aria-pressed', el === btn ? 'true' : 'false');
    }
    const categoria = btn.getAttribute('data-cat');
    renderCategoria(categoria);
  });

  if (turnSelector) {
    turnSelector.addEventListener('click', function (e) {
      const btn = e.target.closest('.turn-btn');
      if (!btn) return;
      const selected = btn.getAttribute('data-turn');
      setTurnButtonsState(selected);
      const categoria = document.body.getAttribute('data-cat');
      const dataset = db[categoria] || { turno1: EMPTY_TURNO, turno2: EMPTY_TURNO };
      const turns = computeTurns(dataset);
      renderTurnDetails(turns, selected);
      currentTurn = selected;
    });
  }

  function setTurnButtonsState(selected) {
    const btns = turnSelector ? Array.from(turnSelector.querySelectorAll('.turn-btn')) : [];
    for (const el of btns) {
      const isActive = el.getAttribute('data-turn') === selected;
      el.classList.toggle('is-active', isActive);
      el.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    }
  }

  function renderTurnButtons(turns) {
    if (!turnSelector) return;
    turnSelector.innerHTML = '';
    turns.forEach((t, idx) => {
      const n = String(idx + 1);
      const btn = document.createElement('button');
      btn.className = 'turn-btn' + (idx === 0 ? ' is-active' : '');
      btn.setAttribute('data-turn', n);
      btn.setAttribute('aria-pressed', idx === 0 ? 'true' : 'false');
      btn.textContent = `Turno ${n}`;
      turnSelector.appendChild(btn);
    });
    // Aggiungi tab unico Info e Costi (vuoto per ora)
    const infocostiBtn = document.createElement('button');
    infocostiBtn.className = 'turn-btn infocosti';
    infocostiBtn.setAttribute('data-turn', 'infocosti');
    infocostiBtn.setAttribute('aria-pressed', 'false');
    infocostiBtn.textContent = 'Info e Costi';
    turnSelector.appendChild(infocostiBtn);
  }

  function renderTurnDetails(turns, selected) {
    if (selected === 'infocosti') {
      if (turnTitle) turnTitle.textContent = 'Info e Costi';
      const categoria = document.body.getAttribute('data-cat');
      const dataset = db[categoria] || { turno1: {}, turno2: {}, infoCosti: {} };
      renderInfoCosti(dataset, categoria);
      return;
    }
    const idx = parseInt(selected, 10) - 1;
    const t = turns[idx];
    if (!t) return;
    if (turnTitle) turnTitle.textContent = `Turno ${selected}`;
    renderMeta(turnMeta, t.data, t.categoria, t.label);
    const list = Array.isArray(t.data?.nominativi) ? t.data.nominativi : [];
    renderLista(turnList, list);
    if (turnCount) turnCount.textContent = `Totale giocatori: ${list.length}`;
  }

  function computeTurns(dataset) {
    const arr = [];
    if (dataset.turno1) arr.push({ label: formatItalianDate(dataset.turno1.data) || 'Turno 1', data: dataset.turno1 });
    if (dataset.turno2 && (dataset.turno2.data || dataset.turno2.orario || (dataset.turno2.nominativi && dataset.turno2.nominativi.length))) {
      arr.push({ label: formatItalianDate(dataset.turno2.data) || 'Turno 2', data: dataset.turno2 });
    }
    return arr;
  }

  function renderInfoCosti(datasetCategoria, categoria) {
    // Meta: allenatore + giorni
    const info = datasetCategoria.infoCosti || {};
    const allenatore = info.allenatore || '';
    const giorni = Array.isArray(info.giorni) ? info.giorni : [];

    // Costruisci blocco meta per Info e Costi
    if (turnMeta) {
      turnMeta.innerHTML = '';
      const rows = [];
      rows.push({ label: 'Allenatore', value: allenatore || '-' });
      if (giorni.length > 0) {
        const pills = document.createElement('div'); pills.className = 'days-pills';
        for (const g of giorni) {
          const giorno = g.giorno || '';
          const pal = g.palestra || '';
          const orario = g.orario || '';
          const { text: palText, url: palUrl } = parsePalestra(pal);
          const pill = document.createElement('div'); pill.className = 'pill';
          const daySpan = document.createElement('span'); daySpan.textContent = giorno;
          pill.appendChild(daySpan);
          if (palUrl) {
            const a = document.createElement('a'); a.href = palUrl; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = palText || 'Palestra';
            pill.appendChild(a);
          } else {
            const s = document.createElement('span'); s.textContent = palText || pal; pill.appendChild(s);
          }
          const time = document.createElement('span'); time.className = 'time'; time.textContent = orario || '';
          pill.appendChild(time);
          pills.appendChild(pill);
        }
        turnMeta.appendChild(pills);
      }
      // Righe base già renderizzate sopra? Per Info e Costi non servono turno-specifiche
    }

    // Lista: pannello costi con controlli
    if (turnList) {
      turnList.innerHTML = '';
      const li = document.createElement('li');
      li.className = 'cost-panel';
      const controls = document.createElement('div'); controls.className = 'cost-controls';

      // Scelte custom (senza select)
      let profilo = 'unibo';
      let rate = categoria === 'Base' ? 'monosettimanale' : '1';
      const lab1 = document.createElement('div'); lab1.className = 'cost-label'; lab1.textContent = 'Profilo';
      const group1 = document.createElement('div'); group1.className = 'choice-group';
      const btnUnibo = document.createElement('button'); btnUnibo.type = 'button'; btnUnibo.className = 'choice-btn is-active'; btnUnibo.textContent = 'UniBo';
      const btnNon = document.createElement('button'); btnNon.type = 'button'; btnNon.className = 'choice-btn'; btnNon.textContent = 'Non UniBo';
      group1.appendChild(btnUnibo); group1.appendChild(btnNon);
      const wrap1 = document.createElement('div'); wrap1.appendChild(lab1); wrap1.appendChild(group1);

      const lab2 = document.createElement('div'); lab2.className = 'cost-label'; lab2.textContent = categoria === 'Base' ? 'Frequenza' : 'Rate';
      const group2 = document.createElement('div'); group2.className = 'choice-group';
      const btn1 = document.createElement('button'); btn1.type = 'button'; btn1.className = 'choice-btn is-active'; btn1.textContent = categoria === 'Base' ? 'Monosettimanale' : 'Una rata';
      const btn2 = document.createElement('button'); btn2.type = 'button'; btn2.className = 'choice-btn'; btn2.textContent = categoria === 'Base' ? 'Bisettimanale' : 'Due rate';
      group2.appendChild(btn1); group2.appendChild(btn2);
      const wrap2 = document.createElement('div'); wrap2.appendChild(lab2); wrap2.appendChild(group2);
      const amount = document.createElement('div'); amount.className = 'cost-amount'; amount.textContent = '';

      controls.appendChild(wrap1); controls.appendChild(wrap2);
      li.appendChild(controls); li.appendChild(amount);
      turnList.appendChild(li);

      const costi = info.costi || {};
      function euro(n) { try { return Number(n).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); } catch { return String(n); } }
      function updateAmount() {
        const cfg = costi[profilo] || {};
        if (categoria === 'Base') {
          if (rate === 'monosettimanale' && typeof cfg.monosettimanale === 'number') {
            amount.textContent = `€ ${euro(cfg.monosettimanale)}`;
          } else if (rate === 'bisettimanale' && typeof cfg.bisettimanale === 'number') {
            amount.textContent = `€ ${euro(cfg.bisettimanale)}`;
          } else {
            amount.textContent = 'Importi in arrivo';
          }
        } else {
          if (rate === '1' && typeof cfg.una_rata === 'number') {
            amount.textContent = `€ ${euro(cfg.una_rata)}`;
          } else if (rate === '2' && Array.isArray(cfg.due_rate) && cfg.due_rate.length === 2) {
            amount.textContent = `€ ${euro(cfg.due_rate[0])} + € ${euro(cfg.due_rate[1])}`;
          } else {
            amount.textContent = 'Importi in arrivo';
          }
        }
      }
      btnUnibo.addEventListener('click', function () { profilo = 'unibo'; btnUnibo.classList.add('is-active'); btnNon.classList.remove('is-active'); updateAmount(); });
      btnNon.addEventListener('click', function () { profilo = 'non_unibo'; btnNon.classList.add('is-active'); btnUnibo.classList.remove('is-active'); updateAmount(); });
      btn1.addEventListener('click', function () { rate = categoria === 'Base' ? 'monosettimanale' : '1'; btn1.classList.add('is-active'); btn2.classList.remove('is-active'); updateAmount(); });
      btn2.addEventListener('click', function () { rate = categoria === 'Base' ? 'bisettimanale' : '2'; btn2.classList.add('is-active'); btn1.classList.remove('is-active'); updateAmount(); });
      updateAmount();
    }

    if (turnCount) turnCount.textContent = '';
  }

  // search UI removed

  (async function init() {
    await loadData();
    const active = segmented.querySelector('.segment.is-active');
    renderCategoria(active ? active.getAttribute('data-cat') : 'Maschile');
    if ('serviceWorker' in navigator) {
      try { await navigator.serviceWorker.register('./sw.js'); } catch {}
    }
  })();
})();