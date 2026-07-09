# ATA-Flow

Dit project bevat een browserinterface voor het selecteren en behandelen van FTTH/ATA werkorders.

## Bestanden

- `index.html` bevat de pagina en schermindeling.
- `css/style.css` bevat de vormgeving.
- `js/main.js` bevat de inbox, selectie, formulierlogica, Excel-upload en CSV-export.

## Gebruik

Open `index.html` in de browser voor lokaal testen zonder backend. Klik op een werkorder of vink deze aan om het behandelformulier direct onder de inbox te openen.

Voor automatisch e-mail versturen gebruik je de backend:

1. Open deze map in VS Code.
2. Open de terminal in VS Code.
3. Voer `npm install` uit.
4. Kopieer `.env.example` naar `.env`.
5. Vul in `.env` je SMTP/mailgegevens in.
6. Voer `npm start` uit.
7. Open `http://localhost:3000`.

Standaard SuperAdmin login:

- Gebruikersnaam: `superadmin`
- Wachtwoord: `superadmin`

SuperAdmin users kunnen alle inboxen zien, werkorders toekennen en users aanmaken. Admin users kunnen alle inboxen zien en werkorders behandelen, maar geen users aanmaken. Contractor users zien alleen hun eigen contractor-inbox.

SuperAdmin users kunnen in het `Users` scherm ook wachtwoorden van users zien en wijzigen.

Dashboard:

- Alleen SuperAdmin ziet het dashboard.
- Het dashboard toont hoeveel werkorders openstaan per contractor en het totaal openstaand.

Survey planning:

- Als een werkorder op `Survey` staat, verschijnt in het behandelscherm een blok voor uitvoerdatum en uitvoertijd.
- Bij `Survey` afmelden zijn uitvoerdatum en uitvoertijd verplicht.
- SuperAdmin beheert de e-mailadressen per contractor in het `Users` scherm.

Processtappen:

- `Taak afmelden` zet de werkorder naar de volgende processtap.
- Bij elke afmelding opent de app een conceptmail naar het e-mailadres van de contractor met de afgemelde en volgende processtap. Klik daarna in je mailprogramma nog op `Verzenden`.
- Als de backend via `npm start` draait en de SMTP-gegevens in `.env` goed staan, wordt de e-mail automatisch verstuurd.
- `Vorige` zet de werkorder een processtap terug en is alleen beschikbaar voor SuperAdmin.

Voor het bijwerken van de inbox kun je een `.xlsx`, `.xls` of `.csv` uploaden.

Alleen SuperAdmin kan bestanden uploaden. Bij uploaden kan SuperAdmin kiezen tussen:

- `Toevoegen/bijwerken`: nieuwe aanvragen toevoegen en bestaande aanvragen bijwerken.
- `Gehele inbox vervangen`: de bestaande inbox leegmaken en vervangen door het bestand.

Alleen SuperAdmin kan vanuit de algemene inbox geselecteerde werkorders verwijderen of alle werkorders verwijderen.

De kolomnamen mogen lijken op:

- `Aansluitnr`
- `Dienst`
- `Mutatie`
- `Internet nummer`
- `Naam debiteur`
- `Aangeslotene`
- `Naam aangeslotene`
- `Adres`
- `Status`
- `Contractor`
- `Processtap`
- `Laatste gebruiker`
- `Laatste wijziging`

De gegevens worden lokaal in de browser opgeslagen.

## GitHub upload

Maak eerst een nieuwe repository aan op GitHub. Voer daarna in de VS Code terminal uit:

```bash
git init
git add .
git commit -m "Initial FTTH workorder app"
git branch -M main
git remote add origin https://github.com/JOUW-GEBRUIKERSNAAM/JOUW-REPOSITORY.git
git push -u origin main
```

Je kunt ook het meegeleverde bash-script gebruiken in Git Bash:

```bash
bash github-upload.sh
```

Let op: `.env` wordt niet geupload naar GitHub. Je wachtwoorden blijven daardoor lokaal.

## Backend/mailserver

De kleine backend staat in `server.js`. Deze doet twee dingen:

- De app openen via `http://localhost:3000`.
- E-mail versturen via `/api/send-process-email` met Nodemailer.

Je hebt SMTP-gegevens nodig van je e-mailprovider. Vaak gebruik je hiervoor geen normaal wachtwoord maar een app-password.
