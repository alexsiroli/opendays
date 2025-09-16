# Open Days CUSB — Turni Squadre Agonistiche

Sito statico per pubblicare i turni degli Open Days (Maschile, Femminile, Misto) con due turni per categoria, ospitato su GitHub Pages.

## Come funziona

- I file del sito sono in `docs/`. GitHub Pages può pubblicare automaticamente quella cartella.
- I nominativi sono presi da `docs/data.json` e mostrati in due colonne (Turno 1 e Turno 2).

## Abilitare GitHub Pages

1. Vai su Settings → Pages del repository.
2. In "Build and deployment" scegli Source: "Deploy from a branch".
3. Seleziona Branch: `main` e Cartella: `/docs`.
4. Salva. L'URL pubblico verrà mostrato (es. `https://<utente>.github.io/opendays/`).

## Aggiornare i nominativi

Modifica `docs/data.json` seguendo questa struttura:

```
{
  "Maschile": { "turno1": ["Nome Cognome"], "turno2": ["Nome Cognome"] },
  "Femminile": { "turno1": [], "turno2": [] },
  "Misto": { "turno1": [], "turno2": [] }
}
```

Esempio rapido:

```
{
  "Maschile": {
    "turno1": ["Mario Rossi", "Luca Bianchi"],
    "turno2": ["Giovanni Verdi"]
  },
  "Femminile": { "turno1": [], "turno2": [] },
  "Misto": { "turno1": [], "turno2": [] }
}
```

Una volta fatto commit e push, ricarica la pagina pubblica per vedere l'aggiornamento.

## Sviluppo locale

Basta aprire `docs/index.html` nel browser. Il file `app.js` legge `data.json` in locale.

