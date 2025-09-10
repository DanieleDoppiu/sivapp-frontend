import { ModificaProfiloPage } from './app/pages/modifica-profilo/modifica-profilo.page';
import { register } from 'swiper/element/bundle'; // 👈 questo importa TUTTO, incluso autoplay, pagination, effetti ecc.
register(); // 👈 registra gli elementi personalizzati Swiper
import { bootstrapApplication } from '@angular/platform-browser';
import { Routes, provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { RegisterPage } from './app/pages/register/register.page';
import { LoginPage } from './app/pages/login/login.page';
import { HomePage } from './app/pages/home/home.page';
import { PrenotazioneConfigPage } from './app/pages/prenotazione-config/prenotazione-config.page';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core'; // 👉 Import aggiunto
import { EventiPage } from './app/pages/eventi/eventi.page';
import { UserPage } from './app/pages/user/user.page';
import { MiePrenotazioniPage } from './app/pages/mie-prenotazioni/mie-prenotazioni.page';
import { PromoArtistaPage } from './app/pages/promo-artista/promo-artista.page';
import { NgZone } from '@angular/core';
import { CercaPage } from './app/pages/cerca/cerca.page';
import { EventiSeguitiPage } from './app/pages/eventi-seguiti/eventi-seguiti.page';
import { CalendarioArtistaPage } from './app/pages/calendario-artista/calendario-artista.page';
import { PreferitiPage } from './app/pages/preferiti/preferiti.page';
import { ModificaEventoPage } from './app/pages/modificaEvento/modifica.page';
import { GestionePrenotazioniPage } from './app/pages/gestione-prenotazioni/gestione-prenotazioni.page';
import { AdminPage } from './app/pages/admin/admin.page';
import { PagamentoPage } from './app/pages/pagamento/pagamento.page';
import { DettagliPage } from './app/pages/detail/dettagli.page';
import { SuccessPage } from './app/pages/success/success.page';
import { importProvidersFrom, isDevMode } from '@angular/core';
import { FileOpener } from '@awesome-cordova-plugins/file-opener/ngx';
import { IonicModule } from '@ionic/angular';
import { provideHttpClient } from '@angular/common/http';
import 'swiper/element/bundle';
// 👉 IMPORT VIBRATION PLUGIN
import { Vibration } from '@awesome-cordova-plugins/vibration/ngx';
import { provideServiceWorker } from '@angular/service-worker';

// 🌐 DEFINIZIONE ROUTE
const routes: Routes = [
  { path: '', redirectTo: localStorage.getItem('user') ? 'home' : 'register', pathMatch: 'full' },
  { path: 'login', component: LoginPage },
  { path: 'admin', component: AdminPage },
  { path: 'register', component: RegisterPage },
  { path: 'home', component: HomePage },
  { path: 'eventi', component: EventiPage },
  { path: 'configura-prenotazioni/:eventoId', component: PrenotazioneConfigPage },
  { path: 'gestione-prenotazioni/:eventoId', component: GestionePrenotazioniPage },
  { path: 'cerca', component: CercaPage },
  { path: 'dettagli/:id', component: DettagliPage },
  { path: 'preferiti', component: PreferitiPage },
  { path: 'user', component: UserPage },
  { path: 'pagamento', component: PagamentoPage },
  { path: 'modificaProfilo', component: ModificaProfiloPage },
  { path: 'mie-prenotazioni', component: MiePrenotazioniPage},
  { path: 'promo-artista', component: PromoArtistaPage },
  { path: 'promo', component: PromoArtistaPage },
  { path: 'success', component: SuccessPage },
  { path: 'modifica/:id', component: ModificaEventoPage },
  { path: 'eventi-seguiti', component: EventiSeguitiPage },
  { path: 'calendario-artista', component: CalendarioArtistaPage },

  { path: 'prenota/:eventoId',
  loadComponent: () => import('./app/pages/prenotazioni/prenotazioni.page').then(m => m.PrenotazioniPage)
},
  {
    path: 'privacy',
    loadComponent: () => import('./app/pages/privacy-policy/privacy-policy.page').then(m => m.PrivacyPolicyPage)
  },
  {
  path: 'admin-dettagli/:id',
  loadComponent: () => import('./app/pages/admin-dettagli/admin-dettagli.page').then(m => m.AdminDettagliPage)
}

];

// 🌐 GESTIONE LINK DA URL (browser)
const url = new URL(window.location.href);
const pathname = url.pathname;
const eventoId = url.searchParams.get('eventoId');
const userId = url.searchParams.get('user');

// 🌐 Modalità ospite via browser (solo se ospite=true)
const ospite = url.searchParams.get('ospite');
if (ospite === 'true') {
  localStorage.setItem('modalitaOspite', 'true');
} else {
  localStorage.removeItem('modalitaOspite'); // esce dalla modalità guest se non c'è il flag
}

// ✅ Se si proviene da "detail.html" via browser
const eventoDaAprire = localStorage.getItem("eventoDaAprire");
const utenteDaSeguire = localStorage.getItem("utenteDaSeguire");

if (eventoDaAprire) {
  const utenteLoggato = localStorage.getItem("user");

  if (utenteLoggato) {
    // ✅ SEGUO AUTOMATICAMENTE l’utente se indicato
    if (utenteDaSeguire) {
      let seguiti = JSON.parse(localStorage.getItem('seguiti') || '[]');
      if (!seguiti.includes(utenteDaSeguire)) {
        seguiti.push(utenteDaSeguire);
        localStorage.setItem('seguiti', JSON.stringify(seguiti));
      }
    }

    // 🎯 Utente loggato → porta direttamente al dettaglio evento
    window.location.href = `/dettagli/${eventoDaAprire}`;
  } else {
    // 🔐 Utente non loggato → mostra pagina di registrazione
    window.location.href = `/register`;
  }

  // 🧹 Pulisci tutto dopo il primo utilizzo
  localStorage.removeItem("eventoDaAprire");
  localStorage.removeItem("utenteDaSeguire");
}


// 🚀 AVVIO DELL’APPLICAZIONE
bootstrapApplication(AppComponent, {
  providers: [
  provideRouter(routes),
  importProvidersFrom(IonicModule.forRoot()),
  provideHttpClient(),
  Vibration,
  FileOpener,
  provideServiceWorker('ngsw-worker.js', {
    enabled: !isDevMode(),
    registrationStrategy: 'registerWhenStable:30000'
  }), provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
          })
]
})

// ✅ Setup DEEP LINK via Capacitor (solo se è su dispositivo mobile)
if (Capacitor.isNativePlatform()) {
  const zone = new NgZone({});
  App.addListener('appUrlOpen', (event) => {
    zone.run(() => {
      const url = event.url;
      const match = url.match(/dettagli\/([^?]+)(?:\?segui=([^&]+))?/);
      if (match) {
        const eventoId = match[1];
        const userId = match[2];

        localStorage.setItem('eventoDaAprire', eventoId);
        if (userId) localStorage.setItem('utenteDaSeguire', userId);

        // Usa il redirect manuale (non router qui perché siamo nel main.ts)
        window.location.href = `/dettagli/${eventoId}`;
      }
    });
  });
};
