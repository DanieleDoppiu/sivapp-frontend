import { ModificaProfiloPage } from './app/pages/modifica-profilo/modifica-profilo.page';
import { bootstrapApplication } from '@angular/platform-browser';
import { Routes, provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { RegisterPage } from './app/pages/register/register.page';
import { LoginPage } from './app/pages/login/login.page';
import { HomePage } from './app/pages/home/home.page';
import { EventiPage } from './app/pages/eventi/eventi.page';
import { CercaPage } from './app/pages/cerca/cerca.page';
import { EventiSeguitiPage } from './app/pages/eventi-seguiti/eventi-seguiti.page';
import { PreferitiPage } from './app/pages/preferiti/preferiti.page';
import { ModificaEventoPage } from './app/pages/modificaEvento/modifica.page';
import { UserPage } from './app/pages/user/user.page';
import { AdminPage } from './app/pages/admin/admin.page';
import { PagamentoPage } from './app/pages/pagamento/pagamento.page';
import { DettagliPage } from './app/pages/detail/dettagli.page';
import { SuccessPage } from './app/pages/success/success.page';
import { importProvidersFrom } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { provideHttpClient } from '@angular/common/http';

// 👉 IMPORT VIBRATION PLUGIN
import { Vibration } from '@awesome-cordova-plugins/vibration/ngx';

const routes: Routes = [
  { path: '', redirectTo: localStorage.getItem('user') ? 'home' : 'register', pathMatch: 'full' },
  { path: 'login', component: LoginPage },
  { path: 'admin', component: AdminPage },
  { path: 'register', component: RegisterPage },
  { path: 'home', component: HomePage },
  { path: 'eventi', component: EventiPage },
  { path: 'cerca', component: CercaPage },
  { path: 'dettagli/:id', component: DettagliPage },
  { path: 'preferiti', component: PreferitiPage },
  { path: 'user', component: UserPage },
  { path: 'pagamento', component: PagamentoPage },
  { path: 'modificaProfilo', component: ModificaProfiloPage },
  { path: 'success', component: SuccessPage },
  { path: 'modifica/:id', component: ModificaEventoPage },
  { path: 'eventi-seguiti', component: EventiSeguitiPage },
];

// 🔁 GESTIONE LINK CON PARAMETRI
const urlParams = new URLSearchParams(window.location.search);
const eventoId = urlParams.get('eventoId');
const userId = urlParams.get('user');

if (eventoId) {
  window.location.href = `/dettagli/${eventoId}`;
  if (userId) {
    let seguiti = JSON.parse(localStorage.getItem('seguiti') || '[]');
    if (!seguiti.includes(userId)) {
      seguiti.push(userId);
      localStorage.setItem('seguiti', JSON.stringify(seguiti));
      alert("✅ Ora segui questo utente!");
    }
  }
}

// 🚀 AVVIO DELL’APP + PROVIDER PER VIBRATION
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    importProvidersFrom(IonicModule.forRoot()),
    provideHttpClient(),
    Vibration // 👉 AGGIUNTO QUI
  ]
});
