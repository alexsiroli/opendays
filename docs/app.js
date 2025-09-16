(function () {
  const categoriaSelect = document.getElementById('categoria-select');
  const turno1List = document.getElementById('turno1-list');
  const turno2List = document.getElementById('turno2-list');

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

  categoriaSelect.addEventListener('change', function () {
    renderCategoria(categoriaSelect.value);
  });

  (async function init() {
    await loadData();
    renderCategoria(categoriaSelect.value);
  })();
})();


