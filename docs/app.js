(function () {
  const turno1List = document.getElementById('turno1-list');
  const turno2List = document.getElementById('turno2-list');
  const segmented = document.querySelector('.segmented');
  const turno1Title = document.getElementById('turno1-title');
  const turno2Title = document.getElementById('turno2-title');
  const turno1Meta = document.getElementById('turno1-meta');
  const turno2Meta = document.getElementById('turno2-meta');

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
    renderMeta(turno1Meta, dataset.turno1);
    renderMeta(turno2Meta, dataset.turno2);
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
    for (const nome of nominativi) {
      const li = document.createElement('li');
      li.textContent = nome;
      container.appendChild(li);
    }
  }

  function renderMeta(container, turno) {
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
      val.textContent = row.value;
      div.appendChild(lab);
      div.appendChild(val);
      container.appendChild(div);
    }
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

  (async function init() {
    await loadData();
    const active = segmented.querySelector('.segment.is-active');
    renderCategoria(active ? active.getAttribute('data-cat') : 'Maschile');
  })();
})();


