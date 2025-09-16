(function () {
  const turno1List = document.getElementById('turno1-list');
  const turno2List = document.getElementById('turno2-list');
  const segmented = document.querySelector('.segmented');
  const turno1Title = document.getElementById('turno1-title');
  const turno2Title = document.getElementById('turno2-title');
  const turno1Meta = document.getElementById('turno1-meta');
  const turno2Meta = document.getElementById('turno2-meta');
  const searchInput = document.getElementById('search-input');
  const searchReset = document.getElementById('search-reset');

  /**
   * Struttura dati attesa in data.json:
   * {
   *   "Maschile": { "turno1": ["Nome Cognome"], "turno2": ["..."] },
   *   "Femminile": { "turno1": [], "turno2": [] },
   *   "Misto": { "turno1": [], "turno2": [] }
   * }
   */
  const EMPTY_TURNO = { allenatore: '', palestra: '', orario: '', nominativi: [] };
  const EMPTY_DATA = {
    Maschile: { turno1: { ...EMPTY_TURNO }, turno2: { ...EMPTY_TURNO } },
    Femminile: { turno1: { ...EMPTY_TURNO }, turno2: { ...EMPTY_TURNO } },
    Misto: { turno1: { ...EMPTY_TURNO }, turno2: { ...EMPTY_TURNO } },
  };

  let db = EMPTY_DATA;
  let currentQuery = '';

  const DATE_LABELS = {
    Maschile: [
      'Mercoledi 24 settembre',
      'Venerdi 26 settembre',
    ],
    Femminile: [
      'Lunedi 22 settembre',
      'Mercoledi 24 settembre',
    ],
    Misto: [
      'Martedi 23 settembre',
      'Giovedi 25 settembre',
    ],
  };

  function renderCategoria(categoria) {
    const dataset = db[categoria] || { turno1: EMPTY_TURNO, turno2: EMPTY_TURNO };
    const labels = DATE_LABELS[categoria] || ['Turno 1', 'Turno 2'];
    if (turno1Title) turno1Title.textContent = labels[0];
    if (turno2Title) turno2Title.textContent = labels[1];
    renderMeta(turno1Meta, dataset.turno1, categoria, labels[0]);
    renderMeta(turno2Meta, dataset.turno2, categoria, labels[1]);
    renderLista(turno1List, dataset.turno1?.nominativi);
    renderLista(turno2List, dataset.turno2?.nominativi);
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
      if (q && nome.toLowerCase().includes(q)) {
        li.classList.add('hl');
      }
      li.textContent = nome;
      container.appendChild(li);
    }
  }

  function renderMeta(container, turno, categoria, dateLabel) {
    if (!container) return;
    container.innerHTML = '';
    const rows = [
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
    const title = `Open Day ${categoria}`;
    const { text: locText, url: locUrl } = parsePalestra(turno?.palestra || '');
    const location = locText || 'Da definire';
    const year = new Date().getFullYear();
    const start = parseItalianDateTime(`${dateLabel} ${year}`, turno?.orario || '21:00');
    const end = new Date(start.getTime() + 90 * 60 * 1000);
    const description = `Allenatore: ${turno?.allenatore || '-'}\nCategoria: ${categoria}`;
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
    };
  }

  function normalizeTurno(turno) {
    const t = turno && typeof turno === 'object' ? turno : {};
    return {
      allenatore: typeof t.allenatore === 'string' ? t.allenatore : '',
      palestra: typeof t.palestra === 'string' ? t.palestra : '',
      orario: typeof t.orario === 'string' ? t.orario : '',
      nominativi: Array.isArray(t.nominativi) ? t.nominativi : [],
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

  if (searchInput && searchReset) {
    searchInput.addEventListener('input', function () {
      currentQuery = searchInput.value || '';
      // ricalcola la vista corrente mantenendo categoria attiva
      const active = segmented.querySelector('.segment.is-active');
      const categoria = active ? active.getAttribute('data-cat') : 'Maschile';
      renderCategoria(categoria);
    });
    searchReset.addEventListener('click', function () {
      currentQuery = '';
      searchInput.value = '';
      const active = segmented.querySelector('.segment.is-active');
      const categoria = active ? active.getAttribute('data-cat') : 'Maschile';
      renderCategoria(categoria);
      searchInput.focus();
    });
  }

  (async function init() {
    await loadData();
    const active = segmented.querySelector('.segment.is-active');
    renderCategoria(active ? active.getAttribute('data-cat') : 'Maschile');
  })();
})();


