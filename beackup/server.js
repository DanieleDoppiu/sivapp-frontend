require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const mongoose = require('mongoose');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');


const admin = require('firebase-admin');






// 🔹 Usa la chiave Firebase direttamente dall'env
const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket:  "sivapp-396dc.firebasestorage.app"
});

const app = express();
app.use(cors());
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(bodyParser.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));

// 🔹 Servire le immagini statiche
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 🔹 Configurazione Multer per l'upload immagini
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() }); // ✅ Ora salva i file in memoria!


// 🔹 lista admin
const AdminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true }
});
const Admin = mongoose.model('Admin', AdminSchema, 'admins');


// creazione user seguiti
const FollowSchema = new mongoose.Schema({
  followerId: { type: String, required: true },
  seguitoId: { type: String, required: true },
  data: { type: Date, default: Date.now }
});

const Follow = mongoose.model('Follow', FollowSchema, 'follows');


// 🔹 Modelli MongoDB
const UserSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  provincia: String,
  citta: String,
  tagFacebook: { type: String, default: "" },
tagInstagram: { type: String, default: "" },
  mostraFollower: { type: Boolean, default: false },
 logo: { type: String, default: "" },
  stelle: { type: Number, default: 0 },      // stelline correnti (0..10)
  bonusEvento: { type: Boolean, default: false }

});
const User = mongoose.model('User', UserSchema);

const ProvinceCittaSchema = new mongoose.Schema({
  sigla_provincia: String,
  denominazione_ita: String
});
const ProvinceCitta = mongoose.model('ProvinceCitta', ProvinceCittaSchema, 'ProvinceCitta');

const EventoSchema = new mongoose.Schema({
  nomeEvento: String,
  descrizione: String,
  organizzatore: String,
  provincia: String,
  citta: String,
  genere: String,
  dataEvento: String,
  locandina: String,
  approvato: { type: String, default: 'no' },
  pagato: { type: String, default: 'no' },
  pacchetto: { type: String, default: 'gratis' },
  taggati: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  visualizzazioni: { type: Number, default: 0}

 });
const Evento = mongoose.model('Evento', EventoSchema, 'eventi');


const UtentePremiumSchema = new mongoose.Schema({
  email: { type: String, required: true },
  premiumFinoA: { type: String } // ISO date, es: "2025-12-31"
});

const UtentePremium = mongoose.model('UtentePremium', UtentePremiumSchema, 'utentiPremium');


const PrenotazioneSchema = new mongoose.Schema({
  eventoId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Evento', required: true },
  tipologia:       String,
  orario:          String,
  nome:            String,
  telefono:        Number,
  persone:         Number,
  note:            String,
  userId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tavoloAssegnato: String,

  // Nuovo: stato e proposta di modifica
  stato: {
    type: String,
    enum: [
      'attiva',               // prenotazione confermata e in uso
      'in_attesa_cancellazione', // l’utente ha richiesto di cancellare
      'in_attesa_modifica',   // l’utente ha proposto una modifica
      'cancellata',           // l’organizzatore ha approvato la cancellazione
      'modificata'            // l’organizzatore ha approvato la modifica
    ],
    default: 'attiva'
  },
  modificaProposta: {
    orario:  String,
    persone: Number,
    note:    String
  },

  dataCreazione:    { type: Date, default: Date.now }
});
const Prenotazione = mongoose.model('Prenotazione', PrenotazioneSchema, 'prenotazioni');

//const Prenotazione = require('./models/Prenotazione'); // path corretto al modello


// models/MessaggioUtente.js
const MessaggioUtenteSchema = new mongoose.Schema({
  mittenteUsername: { type: String, required: true },   // chi invia (admin o utente)
  destinatarioUsername: { type: String, required: true }, // chi riceve
  messaggio: { type: String, required: true },          // testo del messaggio
  allegatoUrl: { type: String, default: null },          // URL file (opzionale)
  consentiRisposta: { type: Boolean, default: false },   // se può rispondere
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'MessaggioUtente', default: null },
  letto: { type: Boolean, default: false },
  data: { type: Date, default: Date.now }
});


const MessaggioUtente = mongoose.model('MessaggioUtente', MessaggioUtenteSchema);
module.exports = MessaggioUtente;


const SeguitiSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // ID dell'utente che segue
  seguiti: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] // Array utenti seguiti
});

const Seguiti = mongoose.model('Seguiti', SeguitiSchema, 'seguiti');


// ✅ **Connessione a MongoDB**
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connesso"))
  .catch(err => console.log("❌ Errore di connessione:", err));

  // funzione per ottenere i token degli admin
  async function getAdminTokens(adminEmails) {
    try {
      const users = await User.find({ email: { $in: adminEmails } }, 'fcmToken'); // Recupera i token degli admin
      return users.map(user => user.fcmToken).filter(token => token); // 🔹 Filtra i token validi
    } catch (error) {
      console.error("❌ Errore nel recupero dei token Firebase:", error);
      return [];
    }
  }


// --- Definizione schema e modello inline per PrenotazioneConfig ---
const TipologiaSchema = new mongoose.Schema({
  tipoPosto: { type: String, enum: ['tavolo','posto'], required: true },
  nome: { type: String, required: true },
  postiDisponibili: { type: Number, required: true },
  orarioInizio: { type: String, required: true },
  orarioFine: { type: String, required: true },
  infoAggiuntive: { type: String, default: '' },
  tempoLimiteModifica: { type: Number, default: 60 } // in minuti
});

const PrenotazioneConfigSchema = new mongoose.Schema({
  eventoId: { type: String, required: true, unique: true },
  tipologie: { type: [TipologiaSchema], required: true }
}, { timestamps: true });

const PrenotazioneConfig = mongoose.model('PrenotazioneConfig', PrenotazioneConfigSchema);


const MessaggioPopupSchema = new mongoose.Schema({
  contenuto: String,
  attivo: Boolean,
  data: { type: Date, default: Date.now },
});

const MessaggioPopup = mongoose.model('MessaggioPopup', MessaggioPopupSchema);




// --------------------------------------------------------

// ====================== 🔹 ENDPOINTS 🔹 ======================
//elimina eventi passati dal database e immagini da firebird ogni giorno a mezzanotte
app.get('/api/cron/elimina-eventi', async (req, res) => {
  try {
    const limite = new Date();
    limite.setDate(limite.getDate() - 2);
    limite.setHours(0, 0, 0, 0);

    const eventi = await Evento.find();

    let eliminati = 0;

    for (const evento of eventi) {
      const dataEvento = new Date(evento.dataEvento);
      dataEvento.setHours(0, 0, 0, 0);

      if (dataEvento < limite) {
        if (evento.locandina) {
          const fileName = decodeURIComponent(evento.locandina.split('/o/')[1].split('?')[0]);
          await admin.storage().bucket().file(fileName).delete();
          console.log(`🗑️ Locandina dell'evento ${evento.nomeEvento} eliminata da Firebase.`);
        }

        // Elimino prenotazioni legate all'evento
        await Prenotazione.deleteMany({ eventoId: evento._id });
        console.log(`🗑️ Prenotazioni legate all'evento ${evento.nomeEvento} eliminate.`);

        // Elimino configurazione prenotazioni legata all'evento
        await PrenotazioneConfig.deleteOne({ eventoId: evento._id.toString() });
        console.log(`🗑️ Configurazione prenotazioni dell'evento ${evento.nomeEvento} eliminata.`);

        await Evento.findByIdAndDelete(evento._id);
        console.log(`🗑️ Evento ${evento.nomeEvento} eliminato dal database.`);
        eliminati++;
      }
    }

    console.log(`✅ CRON: Puliti ${eliminati} eventi e dati collegati.`);
    res.status(200).json({ messaggio: 'Pulizia completata', eliminati });

  } catch (err) {
    console.error("❌ Errore nella pulizia eventi:", err);
    res.status(500).json({ errore: 'Errore nella pulizia' });
  }
});










// ✅ Registrazione utente con controllo email duplicata
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, provincia, citta } = req.body;

    // 🔍 Controlla se l'email esiste già
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Questa email è già registrata.' });
    }

    // ✅ Prosegui con la registrazione se non esiste
    const newUser = new User({ username, email, password, provincia, citta });
    await newUser.save();

    res.status(201).json({
      message: 'Registrazione completata',
      user: newUser
    });

  } catch (err) {
    res.status(400).json({ message: 'Errore nella registrazione', error: err });
  }
});



// login
// ✅ **Login utente**
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });

    if (!user) {
      return res.status(401).json({ message: "❌ Credenziali non valide" });
    }

    // ✅ Invia TUTTI i dati necessari nel formato corretto
    res.json({
      message: "✅ Login riuscito!",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        provincia: user.provincia,
        citta: user.citta
      }
    });

  } catch (err) {
    console.error("❌ Errore nel login:", err);
    res.status(500).json({ message: "Errore nel server" });
  }
});

// ➤ API per verificare se un utente è admin
// ✅ Verifica se un utente è admin e restituisce le province assegnate
app.get('/api/is-admin/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.json({ admin: false });
    }

    res.json({ admin: true, province: admin.province || [] });
  } catch (err) {
    console.error("❌ Errore nella verifica admin:", err);
    res.status(500).json({ message: "Errore nel server" });
  }
});



// ➤ API per recuperare gli eventi non approvati
app.get('/api/eventi-non-approvati', async (req, res) => {
  try {
    const { province } = req.query; // Riceve un array di province selezionate

    let filter = { approvato: "no" };
    if (province) {
      const provinceArray = province.split(',');
      filter.provincia = { $in: provinceArray };
    }

    const eventi = await Evento.find(filter);
    res.json(eventi);
  } catch (err) {
    console.error("❌ Errore nel recupero eventi non approvati:", err);
    res.status(500).json({ message: "Errore nel server" });
  }
});


// ➤ API per approvare un evento

app.put('/api/approva-evento/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const evento = await Evento.findByIdAndUpdate(id, { approvato: "si" }, { new: true });

    if (!evento) {
      return res.status(404).json({ message: "Evento non trovato" });
    }

    res.json({ message: "✅ Evento approvato!", evento });
  } catch (err) {
    console.error("❌ Errore nell'approvazione evento:", err);
    res.status(500).json({ message: "Errore nel server" });
  }
});



// ✅ Eventi già approvati
app.get('/api/eventi-approvati', async (req, res) => {
  try {
    const eventi = await Evento.find({ approvato: 'si' });
    res.json({ eventi });
  } catch (err) {
    console.error('❌ Errore nel recupero eventi approvati:', err);
    res.status(500).json({ message: 'Errore interno' });
  }
});


// ✅ **restituisci un utente per la modifica
app.get('/api/utente/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "❌ Utente non trovato" });
    }

    res.json(user);
  } catch (err) {
    console.error("❌ Errore nel recupero dell'utente:", err);
    res.status(500).json({ message: "Errore nel server" });
  }
});



// ✅ **modifica utente**
app.put('/api/utente/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, provincia, citta, mostraFollower, logo } = req.body; // <-- aggiunto logo

    const user = await User.findByIdAndUpdate(
      id,
      { username, email, provincia, citta, mostraFollower, logo }, // <-- aggiunto logo
      { new: true }
    );

    if (!user) return res.status(404).json({ message: 'Utente non trovato' });

    res.json({ message: 'Profilo aggiornato con successo!', user });
  } catch (err) {
    res.status(500).json({ message: 'Errore nel server', error: err });
  }
});


// ✅ **Endpoint per eliminare un utente**
app.delete('/api/utente/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Trova l'utente
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "❌ Utente non trovato" });
    }

    // Cancella l'utente dal database
    await User.findByIdAndDelete(id);

    console.log(`✅ Utente ${id} eliminato con successo!`);
    res.json({ message: "✅ Account eliminato con successo!" });

  } catch (err) {
    console.error("❌ Errore nell'eliminazione dell'utente:", err);
    res.status(500).json({ message: "Errore nel server" });
  }
});





// ======================= 📩 MESSAGGI POPUP ======================= //

// ✅ Invio messaggio da admin a un utente
app.post('/api/messaggi/admin', async (req, res) => {
  try {
    const { mittenteUsername, destinatarioUsername, messaggio, allegatoUrl, consentiRisposta } = req.body;

    if (!mittenteUsername || !destinatarioUsername || !messaggio) {
      return res.status(400).json({ message: 'Campi obbligatori mancanti' });
    }

    const nuovoMessaggio = new MessaggioUtente({
      mittenteUsername,
      destinatarioUsername,
      messaggio,
      allegatoUrl: allegatoUrl || null,
      consentiRisposta: consentiRisposta || false
    });

    await nuovoMessaggio.save();
    res.json({ ok: true, messaggio: 'Messaggio inviato all’utente' });
  } catch (err) {
    console.error('❌ Errore invio messaggio da admin:', err);
    res.status(500).json({ message: 'Errore del server' });
  }
});


// ✅ Risposta da utente a un messaggio ricevuto
app.post('/api/messaggi/risposta', async (req, res) => {
  try {
    const { originalMessageId, username, messaggio, allegatoUrl } = req.body;

    if (!originalMessageId || !username || !messaggio) {
      return res.status(400).json({ message: 'Campi obbligatori mancanti' });
    }

    // Trova il messaggio originale
    const messaggioOriginale = await MessaggioUtente.findById(originalMessageId);
    if (!messaggioOriginale) {
      return res.status(404).json({ message: 'Messaggio originale non trovato' });
    }

    // Controlla se era consentita la risposta
    if (!messaggioOriginale.consentiRisposta) {
      return res.status(403).json({ message: 'Non è consentita la risposta a questo messaggio' });
    }

    // Salva la risposta (mittente = utente, destinatario = chi ha inviato l’originale)
    const risposta = new MessaggioUtente({
      mittenteUsername: username,
      destinatarioUsername: messaggioOriginale.mittenteUsername,
      messaggio,
      allegatoUrl: allegatoUrl || null,
      replyTo: messaggioOriginale._id
    });

    await risposta.save();

    // 🔹 Segna come letto il messaggio originale (oppure eliminalo del tutto)
    await MessaggioUtente.findByIdAndUpdate(originalMessageId, { letto: true });
    // await MessaggioUtente.findByIdAndDelete(originalMessageId); // <-- se vuoi eliminare

    res.json({ ok: true, messaggio: 'Risposta inviata al mittente originale e messaggio aggiornato' });
  } catch (err) {
    console.error('❌ Errore invio risposta:', err);
    res.status(500).json({ message: 'Errore del server' });
  }
});


// ✅ Recupera messaggi per un utente (solo non letti)
app.get('/api/messaggi/:username', async (req, res) => {
  try {
    const messaggi = await MessaggioUtente.find({
      destinatarioUsername: req.params.username,
      letto: false
    });
    res.json(messaggi);
  } catch (err) {
    console.error('❌ Errore recupero messaggi:', err);
    res.status(500).json({ message: 'Errore del server' });
  }
});


// ✅ Segna un messaggio come letto o lo elimina
app.post('/api/messaggi/segna-letto', async (req, res) => {
  try {
    const { id, soloFlag } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'ID messaggio mancante' });
    }

    if (soloFlag) {
      // 🔹 Caso: aggiorno solo il flag "letto"
      await MessaggioUtente.findByIdAndUpdate(id, { letto: true });
      return res.json({ ok: true, message: 'Messaggio segnato come letto (non eliminato)' });
    } else {
      // 🔹 Caso: elimino del tutto
      await MessaggioUtente.findByIdAndDelete(id);
      return res.json({ ok: true, message: 'Messaggio eliminato dopo la lettura' });
    }
  } catch (err) {
    console.error('❌ Errore segna-letto:', err);
    res.status(500).json({ message: 'Errore del server' });
  }
});







// ✅ restituisce un numero di followers
// Rotta: Conta i follower per un organizzatore (usando il suo username)
app.get('/api/followers/count/:userId', async (req, res) => {
  const userId = req.params.userId;
  try {
    const count = await Follow.countDocuments({ seguitoId: userId });
    res.json({ count });
  } catch (err) {
    console.error("Errore nel conteggio follower:", err);
    res.status(500).json({ error: 'Errore nel conteggio follower' });
  }
});

// 🔢 Conta i follower usando lo username
app.get('/api/followers/count-by-username/:username', async (req, res) => {
  const username = req.params.username;
  try {
    const count = await Follow.countDocuments({ seguitoId: username });
    res.json({ count });
  } catch (err) {
    console.error("❌ Errore nel conteggio follower per username:", err);
    res.status(500).json({ error: 'Errore nel conteggio follower' });
  }
});


//mi diche chi mi segue
// 🔍 Lista di follower per un organizzatore
app.get('/api/followers/list/:username', async (req, res) => {
  const username = req.params.username;

  try {
    const followers = await Follow.find({ seguitoId: username });
    res.json(followers);
  } catch (err) {
    console.error("❌ Errore nel recupero follower:", err);
    res.status(500).json({ error: 'Errore nel recupero follower' });
  }
});



//   crea una lista di utenti seguiti su Mongo Db
app.post('/api/utenti/segui', async (req, res) => {
  const { followerId, seguitoId } = req.body;

  if (!followerId || !seguitoId) {
    return res.status(400).json({ message: 'Parametri mancanti' });
  }

  try {
    // 🔍 Controlla se esiste già
    const giàSegue = await Follow.findOne({ followerId, seguitoId });

    if (giàSegue) {
      return res.status(200).json({ success: true, message: 'Già segue' });
    }

    // ✅ Salva il nuovo follow
    const nuovoFollow = new Follow({ followerId, seguitoId });
    await nuovoFollow.save();

    res.status(200).json({ success: true, message: 'Seguito salvato' });
  } catch (error) {
    console.error('Errore nel salvataggio follow:', error);
    res.status(500).json({ success: false, message: 'Errore nel server' });
  }
});

app.post('/api/utenti/smetti', async (req, res) => {
  const { followerId, seguitoId } = req.body;

  if (!followerId || !seguitoId) {
    return res.status(400).json({ message: 'Parametri mancanti' });
  }

  try {
    const result = await Follow.findOneAndDelete({ followerId, seguitoId });

    if (!result) {
      return res.status(404).json({ success: false, message: 'Follow non trovato' });
    }

    res.status(200).json({ success: true, message: 'Follow rimosso' });
  } catch (error) {
    console.error('Errore nella rimozione follow:', error);
    res.status(500).json({ success: false, message: 'Errore nel server' });
  }
});

// Node.js + MongoDB (pseudo-codice)
// GET utenti che hanno caricato almeno un evento approvato
app.get('/api/utenti-con-eventi', async (req, res) => {
  try {
    // Trova eventi approvati
    const eventi = await Evento.find({ approvato: 'si' }).lean();

    // Ottieni lista username organizzatori
    const organizzatoriUsername = [...new Set(eventi.map(e => e.organizzatore))];

    // Recupera utenti con quei username
    const utenti = await User.find({ username: { $in: organizzatoriUsername } }, 'username citta').lean();

    // Mappa username -> utente
    const utentiMap = utenti.reduce((acc, u) => {
      acc[u.username] = u;
      return acc;
    }, {});

    // Aggrega numero eventi per username
    const aggregati = eventi.reduce((acc, ev) => {
      if (!ev.organizzatore) return acc;
      if (!acc[ev.organizzatore]) {
        acc[ev.organizzatore] = {
          username: ev.organizzatore,
          citta: utentiMap[ev.organizzatore]?.citta || '',
          numeroEventi: 0
        };
      }
      acc[ev.organizzatore].numeroEventi++;
      return acc;
    }, {});

    res.json(Object.values(aggregati));
  } catch (err) {
    console.error('Errore in /utenti-con-eventi:', err);
    res.status(500).json({ errore: err.message });
  }
});





app.get('/api/utenti/seguiti/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const seguiti = await Follow.find({ followerId: userId }).select('seguitoId -_id');
    const seguitoIds = seguiti.map(f => f.seguitoId); // ✅ CORRETTO
    res.json(seguitoIds);
  } catch (err) {
    console.error('Errore recupero seguiti:', err);
    res.status(500).json({ message: 'Errore interno server' });
  }
});



// ✅ Recupera un utente a partire dallo username
app.get('/api/utente-by-username/:username', async (req, res) => {
  try {
    const utente = await User.findOne({ username: req.params.username });
    if (!utente) return res.status(404).json({ message: 'Utente non trovato' });
    res.json(utente);
  } catch (err) {
    console.error("❌ Errore nel recupero utente by username:", err);
    res.status(500).json({ message: "Errore nel server" });
  }
});


// ✅ Recupera tutti gli eventi degli utenti seguiti e taggati
app.post('/api/eventi-seguiti', async (req, res) => {
  try {
    const { utentiSeguiti, userId } = req.body;

      if (!utentiSeguiti || utentiSeguiti.length === 0) {
      console.log("⚠️ Nessun utente seguito, ritorno array vuoto.");
      return res.json([]);
    }

    // 🔹 Troviamo gli ID corrispondenti agli username seguiti
    const utentiSeguitiDocs = await User.find({ username: { $in: utentiSeguiti } }, '_id');
    const utentiSeguitiIds = utentiSeguitiDocs.map(user => user._id.toString());

    // 🔹 Troviamo gli eventi organizzati dagli utenti seguiti
    const eventiOrganizzati = await Evento.find({ organizzatore: { $in: utentiSeguiti } })
      .sort({ dataEvento: 1 })
      .populate('taggati', 'username _id');


    // 🔹 Troviamo gli eventi di TERZE PERSONE dove gli utenti seguiti sono taggati
    const eventiDoveSeguitiSonoTaggati = await Evento.find({
      taggati: { $in: utentiSeguitiIds }, // L'evento ha come taggato uno degli utenti seguiti
      organizzatore: { $nin: utentiSeguiti } // L'evento NON è stato pubblicato da un utente seguito
    })
    .sort({ dataEvento: 1 })
    .populate('taggati', 'username _id');

      // 🔹 Uniamo i due array senza duplicati
    const eventiUniti = [...eventiOrganizzati, ...eventiDoveSeguitiSonoTaggati];


    res.json(eventiUniti);
  } catch (err) {
    console.error("❌ Errore nel recupero degli eventi seguiti:", err);
    res.status(500).json({ message: "Errore nel server" });
  }
});





// endpoint per la notifica di utenti seguiti
app.get('/api/nuovi-eventi-seguiti/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // 🔹 Trova gli utenti seguiti
    const utentiSeguiti = await Seguiti.findOne({ userId });

    if (!utentiSeguiti || utentiSeguiti.seguiti.length === 0) {
      return res.json([]); // Nessun seguito, nessun evento da controllare
    }

    // 🔹 Trova eventi nuovi degli utenti seguiti o eventi dove l'utente è stato taggato
    const nuoviEventi = await Evento.find({
      $or: [
        { organizzatore: { $in: utentiSeguiti.seguiti } }, // Eventi creati dagli utenti seguiti
        { taggati: userId } // Eventi in cui l'utente è stato taggato
      ],
      dataEvento: { $gte: new Date().toISOString().split('T')[0] } // Solo eventi futuri
    });

    res.json(nuoviEventi);
  } catch (err) {
    console.error("❌ Errore nel recupero nuovi eventi:", err);
    res.status(500).json({ message: "Errore nel server" });
  }
});




// endpoint per taggarsi a un evento
app.post('/api/eventi/:id/tagga', async (req, res) => {
  try {
    const { userId } = req.body;
    const evento = await Evento.findById(req.params.id);

    if (!evento) {
      return res.status(404).json({ message: "❌ Evento non trovato" });
    }

    // Verifica se l'utente è già taggato
    if (evento.taggati.includes(userId)) {
      return res.status(400).json({ message: "⚠️ Sei già taggato in questo evento!" });
    }

    evento.taggati.push(userId);
    await evento.save();

    res.json({ message: "✅ Ti sei taggato con successo!", evento });
  } catch (err) {
    console.error("❌ Errore nel tagging:", err);
    res.status(500).json({ message: "Errore nel server" });
  }
});





// ✅ **Ottenere province**
app.get('/api/province', async (req, res) => {
  try {
    const province = await ProvinceCitta.distinct("sigla_provincia");
    res.json(province);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ **Ottenere città di una provincia**
app.get('/api/citta/:provincia', async (req, res) => {
  try {
    const { provincia } = req.params;
    const citta = await ProvinceCitta.find({ sigla_provincia: provincia }, 'denominazione_ita');
    res.json(citta);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ✅ **Ottenere tutti gli eventi ordinati**
app.get('/api/eventi', async (req, res) => {
  try {
    const eventi = await Evento.find().sort({ pagato: -1, dataEvento: 1 });
    res.json(eventi);
  } catch (err) {
    res.status(500).json({ message: 'Errore nel recupero degli eventi', error: err });
  }
});


// ✅ **Ottenere un singolo evento**
app.get('/api/eventi/:id', async (req, res) => {
  try {
    const evento = await Evento.findById(req.params.id);
    if (!evento) return res.status(404).json({ message: "Evento non trovato" });
    res.json(evento);
  } catch (err) {
    res.status(500).json({ message: "Errore nel recupero dell'evento", error: err });
  }
});

// ✅ **Creare un nuovo evento**
// ✅ **Creare un nuovo evento**
app.post('/api/eventi', upload.single('locandina'), async (req, res) => {
  try {
    const { nomeEvento, descrizione, provincia, citta, genere, dataEvento, organizzatore } = req.body;
     const pacchetto = req.body.pacchetto || 'gratis';
    let pagato = 'no';
    let approvato = 'no'; // 🔧 DICHIARATO IN ALTO
    let locandinaUrl = '';

    console.log('📥 Dati ricevuti:', req.body);

    // 🔍 Trova l'utente tramite username
    const utente = await User.findOne({ username: organizzatore });
    if (!utente) {
      console.log('❌ Utente non trovato:', organizzatore);
      return res.status(404).json({ message: 'Utente non trovato' });
    }

    // 🔍 Verifica se è premium
    const premium = await UtentePremium.findOne({ email: utente.email });
    const oggi = new Date();

    const isPremium = premium && (!premium.premiumFinoA || new Date(premium.premiumFinoA) >= oggi);

    if (isPremium) {
      pagato = 'si';
      approvato = 'si'; // 🔧 IMPOSTATO CORRETTAMENTE
      console.log('🎉 Utente PREMIUM: evento marcato come pagato e approvato');
    } else {
      console.log('ℹ️ Utente NON premium');
    }

    // 🔄 Upload immagine se presente
    if (req.file) {
      const bucket = admin.storage().bucket();
      const fileName = `locandine/${Date.now()}-${req.file.originalname}`;

      const resizedImage = await sharp(req.file.buffer)
        .resize({ width: 800, height: 800, fit: sharp.fit.inside, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      const file = bucket.file(fileName);
      await file.save(resizedImage, {
        metadata: { contentType: 'image/jpeg' },
        public: true
      });

      locandinaUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
    }

    // 📝 Salva evento
    const nuovoEvento = new Evento({
      nomeEvento,
      descrizione,
      provincia,
      citta,
      genere,
      dataEvento,
      approvato, // ✅ ORA PRENDE IL VALORE CORRETTO
      pagato,
      pacchetto,
      organizzatore,
      locandina: locandinaUrl
    });

    await nuovoEvento.save();
    console.log('✅ Evento salvato con ID:', nuovoEvento._id);

    return res.status(201).json({ message: 'Evento creato con successo!', eventoId: nuovoEvento._id });

  } catch (err) {
    console.error('❌ Errore durante la creazione evento:', err);
    return res.status(500).json({ message: 'Errore nella creazione evento', error: err.message || err });
  }
});


// Esempio in Express.js
app.post('/api/eventi/:id/visualizza', async (req, res) => {
  try {
    const evento = await Evento.findByIdAndUpdate(
      req.params.id,
      { $inc: { visualizzazioni: 1 } },
      { new: true }
    );
    res.json({ visualizzazioni: evento.visualizzazioni });
  } catch (err) {
    res.status(500).json({ error: 'Errore durante aggiornamento visualizzazioni' });
  }
});




// ✅ Upsert configurazione prenotazioni per evento
app.post('/api/eventi/:eventoId/prenotazioni-config', async (req, res) => {
  try {
    const { eventoId } = req.params;
    const { tipologie } = req.body;

    if (!Array.isArray(tipologie) || tipologie.length === 0) {
      return res.status(400).json({ message: 'Deve essere fornita almeno una tipologia' });
    }

    const config = await PrenotazioneConfig.findOneAndUpdate(
      { eventoId },
      { tipologie },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ message: 'Configurazione salvata', config });
  } catch (err) {
    console.error('Errore prenotazioni-config:', err);
    res.status(500).json({ message: 'Errore interno server' });
  }
});


// ✅ elimina una tipologia di prenotazione
app.put('/api/prenotazioni-configurate/:configId/rimuovi-tipologia/:tipologiaId', async (req, res) => {
  try {
    const { configId, tipologiaId } = req.params;

    const prenotazioneAggiornata = await PrenotazioneConfig.findByIdAndUpdate(
      configId,
      {
        $pull: {
          tipologie: { _id: tipologiaId }
        }
      },
      { new: true }
    );

    if (!prenotazioneAggiornata) {
      return res.status(404).json({ message: 'Configurazione non trovata' });
    }

    res.json({ message: 'Tipologia eliminata con successo', prenotazioneAggiornata });
  } catch (err) {
    console.error('Errore eliminazione tipologia:', err);
    res.status(500).json({ message: 'Errore del server', error: err });
  }
});

// ✅ modifica una tipologia di prenotazione
app.put('/api/prenotazioni-configurate/:configId/modifica-tipologia/:tipologiaId', async (req, res) => {
  const { configId, tipologiaId } = req.params;
  const aggiornamenti = req.body;

  try {
    const config = await PrenotazioneConfig.findOneAndUpdate(
      { _id: configId, "tipologie._id": tipologiaId },
      {
        $set: {
          "tipologie.$[elem].nome": aggiornamenti.nome,
          "tipologie.$[elem].postiDisponibili": aggiornamenti.postiDisponibili,
          "tipologie.$[elem].orarioInizio": aggiornamenti.orarioInizio,
          "tipologie.$[elem].orarioFine": aggiornamenti.orarioFine,
          "tipologie.$[elem].infoAggiuntive": aggiornamenti.infoAggiuntive
        }
      },
      {
        arrayFilters: [{ "elem._id": tipologiaId }],
        new: true
      }
    );

    if (!config) {
      return res.status(404).json({ message: 'Tipologia non trovata' });
    }

    res.json({ message: 'Tipologia aggiornata', config });
  } catch (error) {
    console.error('Errore durante modifica tipologia:', error); // <<< stampa errore dettagliato
    res.status(500).json({ message: 'Errore durante aggiornamento tipologia', error: error.message });
  }
});



// ✅ Salva una prenotazione
app.post('/api/eventi/:eventoId/prenota', async (req, res) => {
  try {
    const { eventoId } = req.params;
    const { tipologia, orario, nome, telefono, persone, note, userId } = req.body;

    console.log('📩 Richiesta ricevuta per nuova prenotazione:', req.body); // 👈 AGGIUNGI QUESTO

    const nuovaPrenotazione = new Prenotazione({
      eventoId,
      tipologia,
      orario,
      nome,
      telefono,
      persone,
      note,
      userId
    });

    await nuovaPrenotazione.save();

    res.status(201).json({ message: 'Prenotazione salvata con successo', prenotazione: nuovaPrenotazione });
  } catch (err) {
    console.error('❌ Errore nel salvataggio prenotazione:', err);
    res.status(500).json({ message: 'Errore nel salvataggio della prenotazione', error: err });
  }
});



// ✅ recupera prenotazioni totali
app.get('/api/eventi/:eventoId/prenotazioni-totali', async (req, res) => {
  const { eventoId } = req.params;

  try {
    const aggregati = await Prenotazione.aggregate([
      // Converte eventoId da stringa a ObjectId
      { $match: { eventoId: new mongoose.Types.ObjectId(eventoId) } },
      {
        $group: {
          _id: "$tipologia",
          totalePersone: { $sum: "$persone" }
        }
      }
    ]);

    // Trasforma l’array in un oggetto { tipologia: totalePersone, ... }
    const risultato = aggregati.reduce((acc, cur) => {
      acc[cur._id] = cur.totalePersone;
      return acc;
    }, {});

    return res.status(200).json(risultato);
  } catch (error) {
    console.error('Errore nel recupero prenotazioni totali:', error);
    return res.status(500).json({ error: 'Errore nel recupero prenotazioni totali' });
  }
});


// ✅ Restituisce tutte le prenotazioni per un evento
app.get('/api/eventi/:eventoId/prenotazioni', async (req, res) => {
  try {
    const { eventoId } = req.params;
    const prenotazioni = await Prenotazione.find({
      eventoId: new mongoose.Types.ObjectId(eventoId)
    });

    res.status(200).json(prenotazioni);
  } catch (err) {
    console.error('Errore GET /prenotazioni:', err);
    res.status(500).json({ message: 'Errore server' });
  }
});

// ✅ modifica una singola prenotazione
app.put('/api/prenotazioni/:prenotazioneId', async (req, res) => {
  try {
    const { prenotazioneId } = req.params;
    const aggiornamenti = req.body;

    const prenotazioneAggiornata = await Prenotazione.findByIdAndUpdate(
      prenotazioneId,
      aggiornamenti,
      { new: true }
    );

    if (!prenotazioneAggiornata) {
      return res.status(404).json({ message: 'Prenotazione non trovata' });
    }

    res.status(200).json(prenotazioneAggiornata);
  } catch (err) {
    console.error('Errore PUT /prenotazioni:', err);
    res.status(500).json({ message: 'Errore server' });
  }
});


// ✅ 2.2. Endpoint “richiesta‐cancellazione”
app.put('/api/prenotazioni/:id/richiesta-cancellazione', async (req, res) => {
  try {
    const { id } = req.params;
    const pren = await Prenotazione.findById(id);
    if (!pren) return res.status(404).json({ message: 'Prenotazione non trovata' });

    // Se non è più “attiva”, non posso chiedere cancellazione
    if (pren.stato !== 'attiva') {
      return res.status(400).json({ message: 'Impossibile chiedere cancellazione in questo stato' });
    }

    // Imposto lo stato e salvo
    pren.stato = 'in_attesa_cancellazione';
    await pren.save();

    // Notifico l’organizzatore via push (se ha expoPushToken)
    const evento = await Evento.findById(pren.eventoId);
    const utente = await User.findById(pren.userId);
    const organizzatore = evento
      ? await User.findById(evento.organizzatoreId)
      : null;

    if (organizzatore?.expoPushToken) {
      const nomeCliente = utente?.username || pren.nome;
      inviaNotificaPush({
        to:    organizzatore.expoPushToken,
        title: 'Richiesta di cancellazione prenotazione',
        body:  `Il cliente ${nomeCliente} chiede di cancellare la sua prenotazione.`
      });
    }

    return res.json({ message: 'Richiesta di cancellazione inviata' });
  } catch (err) {
    console.error('Errore richiesta-cancellazione:', err);
    return res.status(500).json({ message: 'Errore server' });
  }
});



//✅ restituisce per ogni prenotazione uno stato
// Assicurati di avere in testa a server.js (o dove definisci gli endpoint):
// const Prenotazione       = mongoose.model('Prenotazione', PrenotazioneSchema);
// const PrenotazioneConfig = mongoose.model('PrenotazioneConfig', PrenotazioneConfigSchema);
// const Evento             = mongoose.model('Evento', EventoSchema);
// const User               = mongoose.model('User', UserSchema);

app.get('/api/eventi/:eventoId/prenotazioni-gestore', async (req, res) => {
  try {
    const { eventoId } = req.params;

    // 1) Trova TUTTE le prenotazioni per questo evento
    const prenotazioniRaw = await Prenotazione.find({
      eventoId: new mongoose.Types.ObjectId(eventoId)
    })
    .populate('eventoId')   // per leggere dataEvento, nomeEvento, locandina, ecc.
    .lean();                // così ci restituisce plain JS object

    // 2) Recupera la configurazione delle tipologie per quest’evento
    const config = await PrenotazioneConfig.findOne({ eventoId }).lean();
    //   config.tipologie è un array di oggetti { _id, nome, postiDisponibili, orarioInizio, orarioFine, infoAggiuntive, tempoLimiteModifica }

    // 3) Per ogni prenotazione, calcola:
    //    • tempoLimiteModifica (in minuti) prelevato dalla tipologia configurata
    //    • stato: "attiva" | "in_attesa_modifica" | "in_attesa_cancellazione"
    //    • se presente, la modificaProposta (ritornata già come campo di Prenotazione se salvata in precedenza)
    //    • isEditable = (oraCorrente < dataEventoMs - tempoLimiteModifica*60000)
    const oraCorrenteMs = Date.now();

    const risultato = prenotazioniRaw.map(p => {
      // 3.a) trova, dal config, l’oggetto tipologia corrispondente a p.tipologia
      let tempoLimite = null;
      if (config && Array.isArray(config.tipologie)) {
        const tipoObj = config.tipologie.find(t => t.nome === p.tipologia);
        if (tipoObj) {
          tempoLimite = tipoObj.tempoLimiteModifica ?? 60;
        }
      }

      // 3.b) determina lo stato della prenotazione
      //     se esiste p.modificaProposta e p.stato === 'in_attesa_modifica'
      //     se esiste p.richestaCancellazione o p.stato === 'in_attesa_cancellazione'
      //     altrimenti 'attiva'
      let stato = 'attiva';
      if (p.stato === 'in_attesa_modifica') {
        stato = 'in_attesa_modifica';
      } else if (p.stato === 'in_attesa_cancellazione') {
        stato = 'in_attesa_cancellazione';
      }

      // 3.c) calcola isEditable: vero se siamo prima del cutoff
      let isEditable = false;
      if (tempoLimite !== null && p.eventoId?.dataEvento) {
        const dataEventoMs = new Date(p.eventoId.dataEvento).getTime();
        const cutoff = dataEventoMs - tempoLimite * 60000;
        isEditable = oraCorrenteMs < cutoff;
      }

      return {
        ...p,
        tempoLimiteModifica: tempoLimite,      // in minuti
        stato,                                  // 'attiva' | 'in_attesa_modifica' | 'in_attesa_cancellazione'
        isEditable,                             // booleano
        // p.modificaProposta viene già ritor­nato se salvato nel DB
      };
    });

    // 4) Ritorna tutto insieme
    return res.status(200).json(risultato);
  } catch (err) {
    console.error('Errore GET /prenotazioni-gestore:', err);
    return res.status(500).json({ message: 'Errore server' });
  }
});



//✅ 2.1. Endpoint “richiesta‐modifica”
app.put('/api/prenotazioni/:id/richiesta-modifica', async (req, res) => {
  try {
    const { id } = req.params;
    const { orario, persone, note } = req.body;

    const pren = await Prenotazione.findById(id);
    if (!pren) return res.status(404).json({ message: 'Prenotazione non trovata' });

    // Deve essere ancora “attiva” per poter richiedere una modifica
    if (pren.stato !== 'attiva') {
      return res.status(400).json({ message: 'Impossibile proporre modifica in questo stato' });
    }

    // Salva i campi proposti in modificaProposta e marca lo stato
    pren.modificaProposta = { orario, persone, note };
    pren.stato = 'in_attesa_modifica';
    await pren.save();

    // Invia notifica push all’organizzatore
    const evento = await Evento.findById(pren.eventoId);
    const utente  = await User.findById(pren.userId);
    const organizzatore = evento
      ? await User.findById(evento.organizzatoreId)
      : null;

    if (organizzatore?.expoPushToken) {
      inviaNotificaPush({
        to:    organizzatore.expoPushToken,
        title: 'Richiesta di modifica prenotazione',
        body:  `Il cliente ${utente?.username || pren.nome} ha proposto una modifica.`
      });
    }

    return res.json({ message: 'Richiesta di modifica inviata' });
  } catch (err) {
    console.error('Errore richiesta-modifica:', err);
    return res.status(500).json({ message: 'Errore server' });
  }
});

// 3.1. Endpoint “approva-modifica”
app.put('/api/prenotazioni/:id/approva-modifica', async (req, res) => {
  try {
    const { id } = req.params;
    const pren = await Prenotazione.findById(id);
    if (!pren) return res.status(404).json({ message: 'Prenotazione non trovata' });

    // Deve essere in stato “in_attesa_modifica” per applicare
    if (pren.stato !== 'in_attesa_modifica') {
      return res.status(400).json({ message: 'Nessuna modifica pendente da approvare' });
    }

    // Copia i valori da modificaProposta nei campi veri
    if (pren.modificaProposta) {
      pren.orario  = pren.modificaProposta.orario;
      pren.persone = pren.modificaProposta.persone;
      pren.note    = pren.modificaProposta.note;
      // Svuota modificaProposta
      pren.modificaProposta = {};
    }
    pren.stato = 'modificata';
    await pren.save();

    // Notifica push all’utente
    const utente = await User.findById(pren.userId);
    if (utente?.expoPushToken) {
      inviaNotificaPush({
        to:    utente.expoPushToken,
        title: 'Modifica approvata',
        body:  'La tua richiesta di modifica è stata approvata dall’organizzatore.'
      });
    }

    return res.json({ message: 'Modifica approvata e applicata' });
  } catch (err) {
    console.error('Errore approva-modifica:', err);
    return res.status(500).json({ message: 'Errore server' });
  }
});


// ✅ cancella una singola prenotazione
app.delete('/api/prenotazioni/:prenotazioneId', async (req, res) => {
  try {
    const { prenotazioneId } = req.params;

    const prenotazioneEliminata = await Prenotazione.findByIdAndDelete(prenotazioneId);

    if (!prenotazioneEliminata) {
      return res.status(404).json({ message: 'Prenotazione non trovata' });
    }

    res.status(200).json({ message: 'Prenotazione eliminata con successo' });
  } catch (err) {
    console.error('Errore DELETE /prenotazioni:', err);
    res.status(500).json({ message: 'Errore server' });
  }
});


// ✅ Ottiene tutte le prenotazioni fatte da un utente
app.get('/api/mie-prenotazioni/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const prenotazioni = await Prenotazione.find({
      userId: new mongoose.Types.ObjectId(userId)
    }).populate('eventoId');

    const risultati = await Promise.all(
      prenotazioni.map(async (p) => {
        const config = await PrenotazioneConfig.findOne({ eventoId: p.eventoId._id.toString() });

        const tipoObj = config?.tipologie.find(t => t.nome === p.tipologia);
        const tempoLimite = tipoObj?.tempoLimiteModifica ?? null;

        let isEditable = false;
        if (tempoLimite !== null && p.eventoId?.dataEvento) {
          const [ore, minuti] = p.orario.split(':').map(Number);
const dataEvento = new Date(p.eventoId.dataEvento);
dataEvento.setHours(ore);
dataEvento.setMinutes(minuti);
dataEvento.setSeconds(0);
dataEvento.setMilliseconds(0);

const cutoff = dataEvento.getTime() - tempoLimite * 60000;
isEditable = Date.now() < cutoff;

        }

        return {
          ...p.toObject(),
          tempoLimiteModifica: tempoLimite,
          isEditable
        };
      })
    );

    res.status(200).json(risultati);
  } catch (err) {
    console.error('Errore GET /mie-prenotazioni:', err);
    res.status(500).json({ message: 'Errore server' });
  }
});


// ✅ cancella una prenotazione fatta da un utente
app.delete('/api/prenotazioni/:id', async (req, res) => {
  try {
    const prenotazione = await Prenotazione.findByIdAndDelete(req.params.id);

    if (!prenotazione) {
      return res.status(404).json({ message: 'Prenotazione non trovata' });
    }

    const evento = await Evento.findById(prenotazione.eventoId);
    const utente = await User.findById(prenotazione.userId);
    const organizzatore = evento
      ? await User.findById(evento.organizzatoreId)
      : null;

    if (organizzatore?.expoPushToken) {
      inviaNotificaPush({
        to: organizzatore.expoPushToken,
        title: 'Prenotazione cancellata',
        body: `Il cliente ${utente?.username || prenotazione.nomePrenotazione} ha annullato la sua prenotazione.`
      });
    }

    res.json({ message: 'Prenotazione cancellata con successo' });
  } catch (error) {
    console.error('Errore DELETE /prenotazioni/:id', error);
    res.status(500).json({ message: 'Errore del server' });
  }
});




// ✅ Aggiungi una singola tipologia a una configurazione esistente
// Aggiunta multipla di tipologie a una configurazione esistente
app.patch('/api/prenotazioni-configurate/:configId/aggiungi-tipologie', async (req, res) => {
  const { configId } = req.params;
  const { tipologie } = req.body;

  try {
    await PrenotazioneConfig.updateOne(
      { _id: configId },
      { $push: { tipologie: { $each: tipologie } } }
    );
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Errore durante il salvataggio delle tipologie' });
  }
});



// ✅ assgnazione tavolo
app.put('/api/prenotazioni/:id/tavolo', async (req, res) => {
  try {
    const { id } = req.params;
    const { tavoloAssegnato } = req.body;

    await Prenotazione.findByIdAndUpdate(id, { tavoloAssegnato });
    res.status(200).json({ message: 'Tavolo aggiornato' });
  } catch (err) {
    console.error('Errore PUT /tavolo:', err);
    res.status(500).json({ message: 'Errore server' });
  }
});


// ✅ Recupera configurazione prenotazioni per evento
app.get('/api/eventi/:eventoId/prenotazioni-config', async (req, res) => {
  try {
    const { eventoId } = req.params;
    const config = await PrenotazioneConfig.findOne({ eventoId });

    if (!config) {
      return res.status(404).json({ message: 'Nessuna configurazione trovata' });
    }
    res.status(200).json(config);
  } catch (err) {
    console.error('Errore GET prenotazioni-config:', err);
    res.status(500).json({ message: 'Errore interno server' });
  }
});

// ✅ *ZONA AMMINISTRATORE**

// ✅ **Conteggio eventi da approvare (separato dal POST)**
app.get('/api/eventi-non-approvati/count', async (req, res) => {
  try {
    const count = await Evento.countDocuments({ approvato: "no" });
    res.json({ count });
  } catch (error) {
    console.error("❌ Errore nel conteggio eventi:", error);
    res.status(500).json({ message: "Errore nel conteggio degli eventi non approvati" });
  }
});
// ✅ Salvataggio del messaggio popup (manca nel tuo codice attuale!)
app.post('/api/messaggio-popup', async (req, res) => {
  try {
    console.log("📩 Body ricevuto:", req.body);

    if (!req.body.contenuto || req.body.contenuto.trim() === "") {
      return res.status(400).json({ success: false, message: "Messaggio vuoto" });
    }

    // 🔹 Disattiva eventuali messaggi attivi precedenti
    await MessaggioPopup.updateMany({ attivo: true }, { $set: { attivo: false } });

    const nuovo = new MessaggioPopup({
      contenuto: req.body.contenuto,
      attivo: req.body.attivo ?? true,
    });

    await nuovo.save();
    console.log("✅ Messaggio salvato nel database");
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Errore nel salvataggio del messaggio popup:", err);
    res.status(500).json({ success: false });
  }
});

// ✅ Popup per messaggi amministratore
app.get('/api/messaggio-popup-attivo', async (req, res) => {
  try {
    console.log("➡️ Richiesta GET /api/messaggio-popup-attivo ricevuta");

    const messaggio = await MessaggioPopup.findOne({ attivo: true }).sort({ data: -1 });

    console.log("🔍 Messaggio trovato:", messaggio);

    if (!messaggio) {
      console.log("ℹ️ Nessun messaggio popup attivo trovato");
      return res.status(200).json({});
    }

    res.json(messaggio);
  } catch (err) {
    console.error("❌ Errore nel recupero del messaggio popup:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Aggiorna o disattiva il messaggio popup
app.put('/api/messaggio-popup', async (req, res) => {
  try {
    const { contenuto, attivo } = req.body;

    if (contenuto?.trim() === '') {
      return res.status(400).json({ success: false, message: 'Il contenuto non può essere vuoto' });
    }

    // Cerca il messaggio attivo o l'ultimo inserito
    let messaggio = await MessaggioPopup.findOne().sort({ data: -1 });

    if (messaggio) {
      messaggio.contenuto = contenuto ?? messaggio.contenuto;
      messaggio.attivo = typeof attivo === 'boolean' ? attivo : messaggio.attivo;
      await messaggio.save();
    } else {
      messaggio = new MessaggioPopup({ contenuto, attivo: attivo ?? false });
      await messaggio.save();
    }

    res.json({ success: true, messaggio });
  } catch (err) {
    console.error("❌ Errore aggiornamento messaggio popup:", err);
    res.status(500).json({ success: false, message: 'Errore interno' });
  }
});





// ✅ Endpoint per contare i nuovi eventi degli utenti seguiti
app.get('/api/nuovi-eventi-seguiti/count/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // 🔹 Trova gli utenti seguiti dall'utente loggato
    const utentiSeguiti = await Seguiti.findOne({ userId });

    if (!utentiSeguiti || utentiSeguiti.seguiti.length === 0) {
      return res.json({ count: 0 }); // Se non segue nessuno, nessuna notifica
    }

    // 🔹 Contiamo gli eventi pubblicati dagli utenti seguiti o eventi dove l'utente è stato taggato
    const nuoviEventiCount = await Evento.countDocuments({
      $or: [
        { organizzatore: { $in: utentiSeguiti.seguiti } }, // Eventi creati dagli utenti seguiti
        { taggati: userId } // Eventi in cui l'utente è stato taggato
      ],
      dataEvento: { $gte: new Date().toISOString().split('T')[0] } // Solo eventi futuri
    });

    res.json({ count: nuoviEventiCount });
  } catch (err) {
    console.error("❌ Errore nel recupero nuovi eventi:", err);
    res.status(500).json({ message: "Errore nel server" });
  }
});
//✅Condividere un evento in modo avanzato su dettagli
app.get('/assets/public/apri', (req, res) => {
  const { eventoId, user } = req.query; // Ottieni i parametri dalla query

  // Verifica che i parametri siano presenti
  if (!eventoId || !user) {
    return res.status(400).json({ errore: "Evento o utente mancante" });
  }

  // Rispondi con uno script che fa il redirect basato sul dispositivo
  res.send(`
    <!DOCTYPE html>
    <html lang="it">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Redirect Intelligente</title>
        <script>
          // Funzione per determinare il dispositivo
          function detectDevice() {
            const userAgent = navigator.userAgent || navigator.vendor || window.opera;

            // Se è un dispositivo Android
            if (/android/i.test(userAgent)) {
              // Verifica se l'app è installata (tentativo di apertura dell'app tramite intent)
              window.location.href = "sivapp://evento?id=${eventoId}&user=${user}";

              // Se l'app non si apre, redirige al Play Store dopo un breve delay
              setTimeout(() => {
                window.location.href = "https://play.google.com/store/apps/details?id=com.sivapp";
              }, 2000);
            }
            // Se è un dispositivo iOS
            else if (/iPhone|iPad|iPod/i.test(userAgent)) {
              // Mostra un messaggio che la versione iOS non è ancora disponibile
              alert("A breve anche la versione iOS di Sivapp!");
            }
          }

          // Esegui il controllo del dispositivo al caricamento della pagina
          window.onload = detectDevice;
        </script>
      </head>
      <body>
        <p>Sei stato reindirizzato, se non accade nulla, probabilmente sei su iOS.</p>
      </body>
    </html>
  `);
});



//✅Condividere un evento
app.get('/evento', async (req, res) => {
  const { eventoId, user } = req.query;

  if (!eventoId || !user) {
    return res.redirect('https://sivapp.events'); // Se manca qualcosa, reindirizza alla home
  }

  // Controlliamo se l'utente sta usando un telefono
  const userAgent = req.get('User-Agent') || '';
  const isMobile = /android|iphone|ipad|ipod/i.test(userAgent);

  if (isMobile) {
    // Se ha l’app → Apriamo la pagina evento + seguiti
    res.redirect(`sivapp://dettagli/${eventoId}?segui=${user}`);
  } else {
    // Se non ha l’app → Apriamo il Play Store
    res.redirect('https://play.google.com/store/apps/details?id=com.sivapp');
  }
});





// ✅ **Modificare un evento**
app.put('/api/eventi/:id', upload.single('locandina'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nomeEvento, descrizione, provincia, citta, dataEvento, genere } = req.body;

    const evento = await Evento.findById(id);
    if (!evento) return res.status(404).json({ message: 'Evento non trovato' });

    let locandinaPath = evento.locandina;

    if (req.file) {
      const newFileName = `${Date.now()}-${req.file.originalname}`;
      const newImagePath = path.join(__dirname, 'uploads', newFileName);

      await sharp(req.file.path).resize({ width: 600 }).jpeg({ quality: 80 }).toFile(newImagePath);
      fs.unlinkSync(req.file.path);

      if (evento.locandina) {
        const oldImagePath = path.join(__dirname, evento.locandina);
        if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
      }

      locandinaPath = `/uploads/${newFileName}`;
    }

    // 🔹 Se il genere non viene inviato dal client, mantieni quello esistente
    evento.genere = genere || evento.genere;
    evento.nomeEvento = nomeEvento;
    evento.descrizione = descrizione;
    evento.provincia = provincia;
    evento.citta = citta;
    evento.dataEvento = dataEvento;
    evento.locandina = locandinaPath;

    await evento.save();
    res.json({ message: 'Evento aggiornato con successo', evento });

  } catch (err) {
    console.error('Errore nell’aggiornamento dell’evento:', err);
    res.status(500).json({ message: 'Errore nel server', error: err });
  }
});





// ✅ **Eliminare un evento**
app.delete('/api/eventi/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const evento = await Evento.findById(id);

    if (!evento) {
      return res.status(404).json({ message: "Evento non trovato" });
    }

    // 🔹 Se esiste una locandina, cancelliamo l'immagine da Firebase Storage
    if (evento.locandina) {
      // Decodifica il nome del file
      const fileName = decodeURIComponent(evento.locandina.split('/o/')[1].split('?')[0]);

      console.log("Nome file decodificato:", fileName); // Stampa il nome del file per il debug

      // 🔹 Elimina il file da Firebase Storage
      await admin.storage().bucket().file(fileName).delete();
    }

    // 🔹 Elimina l'evento dal database
    await Evento.findByIdAndDelete(id);
    res.status(200).json({ message: 'Evento eliminato con successo!' });
  } catch (err) {
    console.error("Errore durante l'eliminazione dell'evento:", err);
    res.status(400).json({ message: 'Errore durante l\'eliminazione', error: err });
  }
});





// ✅ **Creazione di un'intenzione di pagamento con Stripe**
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { eventoId, amount } = req.body;

    const allowedAmounts = [200, 500, 1000]; // Cent. = 2€, 5€, 10€
if (!allowedAmounts.includes(amount)) {
  return res.status(400).json({ error: 'Importo non valido' });
}

    const pacchetti = {
  200: 'evidenza',
  500: 'social',
  1000: 'settimanale'
};

const pacchetto = pacchetti[amount];
if (!pacchetto) {
  return res.status(400).json({ error: 'Pacchetto non valido' });
}


    console.log("🔹 Evento ID ricevuto:", eventoId);
    console.log("🔹 Stripe Secret Key:", process.env.STRIPE_SECRET_KEY ? "OK" : "MANCANTE!");

    if (!mongoose.Types.ObjectId.isValid(eventoId)) {
      return res.status(400).json({ error: 'ID evento non valido' });
    }

    const evento = await Evento.findById(eventoId);
    if (!evento) {
      return res.status(404).json({ error: 'Evento non trovato' });
    }

    // ✅ Assicuriamoci che CLIENT_URL sia definito
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:8100';

    console.log("📌 Evento ID ricevuto nella richiesta:", eventoId);
    console.log("📌 Nome Evento:", evento.nomeEvento);
    console.log("📌 CLIENT_URL:", clientUrl);
    console.log("📌 Creando sessione di pagamento su Stripe...");

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: evento.nomeEvento || "Evento Sivapp" },
          unit_amount: amount, // Prezzo varia in base al pacchetto scelto
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${clientUrl}/success?eventoId=${eventoId}`,
      cancel_url: `${clientUrl}/cancel`,

      metadata: { eventoId: eventoId,
  pacchetto: pacchetto }, // ✅ Aggiunto metadato corretto
    });

    console.log("✅ Sessione di pagamento creata con ID:", session.id);
    console.log("✅ Metadati inviati a Stripe:", session.metadata);

    // ✅ INVIA UNA SOLA RISPOSTA HTTP
    return res.json({ id: session.id });

  } catch (err) {
    console.error('❌ Errore nella creazione della sessione di pagamento:', err);

    // ✅ Se c'è un errore, controlla che non sia già stata inviata una risposta
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Errore nel server' });
    }
  }
});





// ✅ **Webhook Stripe per gestire gli eventi di pagamento completati**
// ✅ **Creazione di un'intenzione di pagamento con Stripe**
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { eventoId } = req.body;

    console.log("📌 Creando sessione di pagamento...");
    console.log("🔹 Evento ID:", eventoId);

    if (!mongoose.Types.ObjectId.isValid(eventoId)) {
      return res.status(400).json({ error: 'ID evento non valido' });
    }

    const evento = await Evento.findById(eventoId);
    if (!evento) {
      return res.status(404).json({ error: 'Evento non trovato' });
    }

    const clientUrl = process.env.CLIENT_URL || 'https://sivapp-backend.onrender.com';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: evento.nomeEvento },
          unit_amount: 200, // Prezzo in centesimi (2€)
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${clientUrl}/success?eventoId=${eventoId}`,
      cancel_url: `${clientUrl}/cancel`,
      metadata: { eventoId } // ✅ Aggiungiamo l'eventoId nei metadati
    });

    console.log("✅ Sessione di pagamento creata:", session.id);
    console.log("✅ Metadati inviati:", session.metadata);

    res.json({ id: session.id });

  } catch (err) {
    console.error('❌ Errore nella creazione della sessione di pagamento:', err);
    res.status(500).json({ error: 'Errore nel server' });
  }
});




// ✅ Webhook Stripe per gestire i pagamenti completati
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('❌ Errore nel webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    console.log("✅ Webhook ricevuto! Aggiornamento evento...");
    console.log("🔹 Sessione ID:", session.id);
    console.log("🔹 Metadati:", session.metadata);

    try {
      const eventoId = session.metadata.eventoId;
      const pacchetto = session.metadata.pacchetto || 'evidenza'; // fallback se manca

      if (!eventoId) {
        console.error("❌ eventoId mancante");
        return res.status(400).json({ error: "eventoId mancante" });
      }

      await Evento.findByIdAndUpdate(
        eventoId,
        {
          approvato: "si",
          pagato: "si",
          pacchetto: pacchetto
        },
        { new: true }
      );

      console.log(`✅ Evento ${eventoId} aggiornato con pacchetto: ${pacchetto}`);
    } catch (error) {
      console.error('❌ Errore aggiornamento evento nel DB:', error);
      return res.status(500).json({ error: "Errore aggiornamento evento" });
    }
  }

  res.json({ received: true });
});





// **Avvia il server**
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server in ascolto sulla porta ${PORT}`));
