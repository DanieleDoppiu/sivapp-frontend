
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';
import { TabsComponent } from './../../tabs.component';
import { ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertController, PopoverController } from '@ionic/angular';
import { IonToggle} from '@ionic/angular/standalone';
import { BadgeNotificationsService } from 'src/app/badge-notifications.service';
import { MenuPopoverComponent } from './../../menu-popover.component';

import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import {
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonThumbnail,
  IonIcon,
  IonText,
  IonHeader,
  IonTabBar,
  IonTabButton,
  IonToolbar,
  IonTitle,
  IonButton,
  IonPopover,
  IonBadge,
  IonImg,
  IonCard,
  IonCardTitle,
  IonCardHeader,
  IonCardContent,
  IonButtons
} from '@ionic/angular/standalone';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
   schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    IonButtons, IonCardContent, IonCardHeader, TabsComponent, IonCardTitle,
    IonCard, IonImg, IonBadge, IonPopover, IonContent, IonList, IonItem,
    IonLabel, IonThumbnail, IonIcon, IonText, IonHeader, IonTabBar,
    IonTabButton, IonToolbar, IonTitle, IonButton, CommonModule,
    FormsModule, IonToggle, RouterModule,
  ]
})


export class HomePage implements OnInit {
  timeoutRedirect: any;
  apiUrl = environment.apiUrl;
  numNotificheSeguiti: number = 0;
  numNotifiche: number = 0;
   isOspite: boolean = false;

  eventi: any[] = [];
  usernameUtente: string = '';
  cittaUtente: string = '';
  giornoSettimana: string = '';
  giorno: number = 0;
  id: string = '';
  seguendoUtenti: string[] = [];
  isAdmin: boolean = false;
  numeroFollower: number = 0;
haEventi: boolean = false;
mostraFollower: boolean = false;
eventiInEvidenza: any[] = [];





  constructor(
    private http: HttpClient,
    private router: Router,
    private alertController: AlertController,
    private badgeService: BadgeNotificationsService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute ,
    private popoverController: PopoverController
  ) {}

ngOnInit() {
  this.caricaEventiInEvidenza();
  this.route.queryParams.subscribe(params => {
     // ✅ Se arriva da link ospite → inizializza ospite
    if (params['ospite'] === 'true') {
      const ora = Date.now();
      localStorage.setItem("isOspite", "true");
      localStorage.setItem("ospiteDaLink", "true");
      localStorage.setItem("ospiteScadenza", ora.toString());
    }


    this.controllaMessaggiUtente();
    console.log("📣 controllo messaggi utente avviato");



    this.isOspite = params['ospite'] === 'true' || localStorage.getItem("isOspite") === "true";
    const ospiteDaLink = localStorage.getItem("ospiteDaLink") === "true";
    const scadenza = parseInt(localStorage.getItem("ospiteScadenza") || "0", 10);
    const oraAttuale = Date.now();
    const tempoMassimo = 10 * 60 * 1000; // 10 minuti

    if (this.isOspite && ospiteDaLink) {
      const tempoRimanente = tempoMassimo - (oraAttuale - scadenza);

      if (tempoRimanente > 0) {
        this.usernameUtente = 'Ospite';
           // ✅ Se ospite → chiedi provincia se non presente
        if (!localStorage.getItem("cittaSelezionata")) {
  this.mostraPopupCitta(); // ← sarà qui che poi carichi gli eventi
} else {
  this.cittaUtente = localStorage.getItem("cittaSelezionata")!;
  this.caricaData();
  this.caricaEventi();
  this.mostraPopupCitta();
}
        console.log("👤 Accesso come ospite da link, città:", this.cittaUtente);



        // ⏳ Avvisa 1 minuto prima della scadenza
        if (tempoRimanente > 60000) {
          setTimeout(() => {
            alert("⏳ La sessione ospite sta per scadere. Registrati per continuare a usare l'app.");
          }, tempoRimanente - 60000);
        }

        // 🔒 Logout automatico allo scadere
        setTimeout(() => {
          localStorage.removeItem("isOspite");
          localStorage.removeItem("ospiteDaLink");
          localStorage.removeItem("ospiteScadenza");
          this.router.navigate(['/register']);
        }, tempoRimanente);

        return;
      } else {
        // ⛔ Scaduto: cancella dati e vai a register
        localStorage.removeItem("isOspite");
        localStorage.removeItem("ospiteDaLink");
        localStorage.removeItem("ospiteScadenza");
        this.router.navigate(['/register']);
        return;
      }
    }



    // ✅ Utente registrato
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user && user.email) {
      this.usernameUtente = user.username;
      this.cittaUtente = user.citta;
      console.log("👤 Accesso utente registrato, città:", this.cittaUtente);

      this.badgeService.avviaControlloEventi(user._id);
      this.caricaData();
      this.caricaEventi();
      this.caricaUtentiSeguiti();
      this.verificaSeUtenteHaEventi();
this.caricaNumeroFollower();

      this.mostraMessaggioPopup();

      this.http.get<any>(`${environment.apiUrl}/api/is-admin/${user.email}`).subscribe(
        (res) => this.isAdmin = res.admin,
        (error) => console.error("❌ Errore nella verifica admin:", error)
      );
    } else {
      // 🚫 Nessun utente e nessuna modalità ospite → redirect
      this.router.navigate(['/register']);
    }
    this.http.get<any>(`${environment.apiUrl}/api/utente/${user._id}`).subscribe(
  (res) => {
    this.mostraFollower = res.mostraFollower || false;
  },
  (err) => console.error("Errore nel recupero preferenza mostraFollower", err)
);

  });

  this.contaEventiNonApprovati();
  this.contaEventiSeguiti();

  setInterval(() => {
    this.contaEventiNonApprovati();
    this.contaEventiSeguiti();
  }, 30000);
}






  ionViewWillEnter() {

}



async mostraPopupCitta() {
  const alert = await this.alertController.create({
    header: 'Benvenuto!',
    subHeader: 'Per mostrarti gli eventi vicino a te, inserisci la tua città.',
    inputs: [
      {
        name: 'citta',
        type: 'text',
        placeholder: 'Es. Milano, Torino, Roma...'
      }
    ],
    buttons: [
      {
        text: 'Annulla',
        role: 'cancel',
        handler: () => {
          console.log('Popup città annullato');
        }
      },
      {
        text: 'Conferma',
        handler: (data) => {
          if (data.citta && data.citta.trim() !== '') {
            this.cittaUtente = data.citta.trim();
            localStorage.setItem("cittaSelezionata", this.cittaUtente);
            console.log("✅ Città selezionata:", this.cittaUtente);
            this.caricaEventi(); // oppure filtraEventi(), a seconda di come si chiama da te
          } else {
            this.mostraPopupCitta(); // ripeti se vuoto
          }
        }
      }
    ]
  });

  await alert.present();
}




controllaMessaggiUtente() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const username = user.username;

  if (!username) {
    console.warn('⚠️ Nessun username trovato in localStorage');
    return;
  }

  this.http.get<any[]>(`${environment.apiUrl}/api/messaggi/${username}`).subscribe(
    async (messaggi) => {
      console.log("📩 Messaggi ricevuti:", messaggi);
      for (let messaggio of messaggi) {
        const alert = await this.alertController.create({
          header: '📬 Messaggio da SIVAPP',
          message: messaggio.messaggio,
          buttons: ['OK']
        });
        await alert.present();

        // Dopo che l'utente lo legge, segna come letto
        this.http.post(`${environment.apiUrl}/api/messaggi/segna-letto`, { id: messaggio._id }).subscribe();
      }
    },
    (err) => console.error('❌ Errore nel recupero messaggi', err)
  );
}




  async apriMenu(ev: Event) {
    const popover = await this.popoverController.create({
      component: MenuPopoverComponent,
      event: ev,
      translucent: true,
      showBackdrop: true
    });

    await popover.present();
  }

  contaEventiSeguiti() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user || !user._id) return;

    this.http.get<{ count: number }>(`${environment.apiUrl}/api/nuovi-eventi-seguiti/count/${user._id}`)
      .subscribe((res) => {
        this.numNotificheSeguiti = res.count;
      }, (error) => {
        console.error("❌ Errore nel conteggio eventi seguiti", error);
      });
  }

  contaEventiNonApprovati() {
    this.http.get<{ count: number }>(`${environment.apiUrl}/api/eventi-non-approvati/count`)
      .subscribe((res) => {
        this.numNotifiche = res.count;
      }, (error) => {
        console.error("❌ Errore nel conteggio eventi da approvare", error);
      });
  }

  getImageUrl(locandina: string): string {
    if (!locandina) return 'assets/default-image.jpg';
    if (locandina.startsWith('https://firebasestorage.googleapis.com')) {
      return locandina;
    }
    return `${environment.apiUrl}${locandina.startsWith('/') ? '' : '/'}${locandina}`;
  }

  caricaData() {
    const giorniSettimana = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const data = new Date();
    this.giornoSettimana = giorniSettimana[data.getDay()];
    this.giorno = data.getDate();
  }

caricaEventi() {
  const oggi = new Date().toISOString().split('T')[0];

  this.http.get<any[]>(`${environment.apiUrl}/api/eventi`).subscribe(
    (data) => {
      this.eventi = data.filter(evento =>
  evento.citta?.trim().toLowerCase() === this.cittaUtente?.trim().toLowerCase() &&
  evento.dataEvento === oggi &&
  evento.approvato === 'si'
);

      console.log("Eventi Filtrati:", this.eventi);

      if (this.eventi.length === 0) {
        // ⏱️ Imposta timeout e salvalo
        this.timeoutRedirect = setTimeout(() => {
          this.router.navigate(['/cerca']);
        }, 5000); // 5 secondi

        // 👂 Intercetta qualsiasi interazione utente
        const cancelRedirect = () => {
          if (this.timeoutRedirect) {
            clearTimeout(this.timeoutRedirect);
            this.timeoutRedirect = null;
            console.log('Redirect annullato per interazione utente');
          }

          // 🧹 Rimuove tutti gli event listener
          window.removeEventListener('click', cancelRedirect);
          window.removeEventListener('touchstart', cancelRedirect);
          window.removeEventListener('scroll', cancelRedirect);
          window.removeEventListener('keydown', cancelRedirect);
        };

        // ⏱️ Aggiunge i listener
        window.addEventListener('click', cancelRedirect);
        window.addEventListener('touchstart', cancelRedirect);
        window.addEventListener('scroll', cancelRedirect);
        window.addEventListener('keydown', cancelRedirect);
      }
    },
    (error) => {
      console.error('Errore nel caricamento degli eventi', error);
    }
  );
}

  vaiAlDetail(id: string) {
    this.router.navigate(['/dettagli', id]);
  }

  async cancellaAccount() {
    const user = JSON.parse(localStorage.getItem('user')!);

    if (!user || !user._id) {
      console.error("❌ Nessun ID utente trovato nel localStorage!");
      return;
    }

    const alert = await this.alertController.create({
      header: 'Conferma eliminazione',
      message: 'Sei sicuro di voler eliminare il tuo account? Questa azione è irreversibile.',
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Elimina',
          handler: async () => {
            this.http.delete(`${environment.apiUrl}/${user._id}`).subscribe(
              async () => {
                localStorage.removeItem('user');
                await this.router.navigate(['/register']);
              },
              (error) => {
                console.error("❌ Errore nell'eliminazione dell'account:", error);
              }
            );
          }
        }
      ]
    });

    await alert.present();
  }


caricaEventiInEvidenza() {
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;
 if (!user || !user.provincia) {
    console.warn('Nessun utente trovato o provincia mancante.');
    return;
  }

  const provinciaUtente = user.provincia;
  const oggi = new Date().toISOString().split('T')[0];

  this.http.get<any[]>(`${environment.apiUrl}/api/eventi`).subscribe(
    (data) => {
      console.log('Tutti gli eventi ricevuti:', data);

      this.eventiInEvidenza = data.filter(evento => {
        const valido =
          evento.approvato === 'si' &&
          evento.pagato === 'si' &&
          evento.provincia === provinciaUtente &&
          evento.dataEvento >= oggi &&
          evento.locandina;

        if (valido) {
          console.log('Evento valido per evidenza:', evento);
        }

        return valido;
      });

      console.log('Eventi in evidenza trovati:', this.eventiInEvidenza);
    },
    (error) => {
      console.error('Errore nel caricamento eventi in evidenza', error);
    }
  );
}





  caricaUtentiSeguiti() {
    const seguiti = JSON.parse(localStorage.getItem('seguiti') || '[]');
    this.seguendoUtenti = seguiti;
  }

  isEventoSeguito(evento: any): boolean {
    return this.seguendoUtenti.includes(evento.organizzatore);
  }

  // ✅ Nuova funzione per mostrare popup una volta al giorno
  async mostraMessaggioPopup() {
    try {
      const messaggio: any = await this.http.get(`${environment.apiUrl}/api/messaggio-popup-attivo`).toPromise();
      if (!messaggio || !messaggio.contenuto) return;

      const oggi = new Date().toISOString().split('T')[0];
      const ultimoMostrato = localStorage.getItem('popupMostratoData');
      const messaggioMostratoId = localStorage.getItem('popupMostratoId');

      if (messaggio._id !== messaggioMostratoId || oggi !== ultimoMostrato) {
        const alert = await this.alertController.create({
          header: 'Info',
          message: messaggio.contenuto,
          buttons: ['OK']
        });

        await alert.present();

        localStorage.setItem('popupMostratoId', messaggio._id);
        localStorage.setItem('popupMostratoData', oggi);
      }
    } catch (err) {
      console.error('Errore nel recupero del messaggio popup', err);
    }
  }


  verificaSeUtenteHaEventi() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!user || !user.username) return;

  this.http.get<any[]>(`${environment.apiUrl}/api/eventi`).subscribe(
    (eventi) => {
      this.haEventi = eventi.some(e => e.organizzatore === user.username);
    },
    (err) => console.error("Errore nel controllo eventi utente", err)
  );
}

caricaNumeroFollower() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!user || !user.username) {
    console.warn('⚠️ Utente o username non disponibile in localStorage', user);
    return;
  }

  console.log("Richiedo follower per username:", user.username);

  this.http.get<{ count: number }>(`${environment.apiUrl}/api/followers/count-by-username/${user.username}`).subscribe(
    (res) => {
      console.log("Risposta follower count API:", res);
      this.numeroFollower = res.count;
    },
    (err) => {
      console.error("Errore recupero follower:", err);
    }
  );
}




caricaListaFollower() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!user || !user.username) return;

  this.http.get<any[]>(`${this.apiUrl}/api/followers/list/${user.username}`).subscribe(
    (res) => {
      console.log("👥 Lista follower:", res);
    },
    (err) => {
      console.error("❌ Errore nel recupero lista follower", err);
    }
  );
}

aggiornaMostraFollower() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!user || !user._id) return;

  this.http.put(`${environment.apiUrl}/api/utente/${user._id}`, {
    mostraFollower: this.mostraFollower
  }).subscribe(
    () => console.log("✅ Preferenza aggiornata"),
    (err) => console.error("❌ Errore aggiornamento preferenza", err)
  );
}



}
