(function () {
  const turno1List = document.getElementById('turno1-list');
  const turno2List = document.getElementById('turno2-list');
  const segmented = document.querySelector('.segmented');

  /**
   * Struttura dati attesa in data.json:
   * {
   *   "Maschile": { "turno1": ["Nome Cognome"], "turno2": ["..."] },
   *   "Femminile": { "turno1": [], "turno2": [] },
   *   "Misto": { "turno1": [], "turno2": [] }
   * }
   */
  const EMPTY_DATA = {
    Maschile: { turno1: [], turno2: [] },
    Femminile: { turno1: [], turno2: [] },
    Misto: { turno1: [], turno2: [] },
  };

  let db = EMPTY_DATA;

  function renderCategoria(categoria) {
    const dataset = db[categoria] || { turno1: [], turno2: [] };
    renderLista(turno1List, dataset.turno1);
    renderLista(turno2List, dataset.turno2);
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
      turno1: Array.isArray(safe.turno1) ? safe.turno1 : [],
      turno2: Array.isArray(safe.turno2) ? safe.turno2 : [],
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


