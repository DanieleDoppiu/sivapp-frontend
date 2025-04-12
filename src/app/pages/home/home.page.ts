import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';
import { TabsComponent } from './../../tabs.component';
import { AlertController, PopoverController } from '@ionic/angular';
import { BadgeNotificationsService } from 'src/app/badge-notifications.service';

import { MenuPopoverComponent } from './../../menu-popover.component'; // 👈 import popover menu

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
  IonButton, IonPopover, IonBadge, IonImg, IonCard, IonCardTitle, IonCardHeader, IonCardContent, IonButtons
} from '@ionic/angular/standalone';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [IonButtons, IonCardContent, IonCardHeader, TabsComponent, IonCardTitle, IonCard, IonImg, IonBadge, IonPopover,
    IonContent, IonList, IonItem, IonLabel, IonThumbnail, IonIcon, IonText,
    IonHeader, IonTabBar, IonTabButton, IonToolbar, IonTitle, IonButton,
    CommonModule, FormsModule, RouterModule
  ]
})
export class HomePage implements OnInit {
  apiUrl = environment.apiUrl;
  numNotificheSeguiti: number = 0;
  numNotifiche: number = 0;

  eventi: any[] = [];
  usernameUtente: string = '';
  cittaUtente: string = '';
  giornoSettimana: string = '';
  giorno: number = 0;
  id: string = '';
  seguendoUtenti: string[] = [];
  isAdmin: boolean = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private alertController: AlertController,
    private badgeService: BadgeNotificationsService,
    private popoverController: PopoverController // 👈 importante
  ) {}

  ngOnInit() {
    this.contaEventiNonApprovati();
    this.contaEventiSeguiti();

    setInterval(() => {
      this.contaEventiNonApprovati();
      this.contaEventiSeguiti();
    }, 30000);

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (user && user.email) {
      this.usernameUtente = user.username;
      this.cittaUtente = user.citta;

      this.badgeService.avviaControlloEventi(user._id);

      this.caricaData();
      this.caricaEventi();
      this.caricaUtentiSeguiti();

      this.http.get<any>(`${environment.apiUrl}/api/is-admin/${user.email}`).subscribe(
        (res) => {
          this.isAdmin = res.admin;
          console.log("✅ Admin Status:", this.isAdmin);
        },
        (error) => {
          console.error("❌ Errore nella verifica admin:", error);
        }
      );
    }
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
    this.http.get<any[]>(`${environment.apiUrl}/api/eventi`).subscribe(
      (data) => {
        const oggi = new Date().toISOString().split('T')[0];
        this.eventi = data.filter(evento =>
          evento.citta === this.cittaUtente &&
          evento.dataEvento === oggi &&
          evento.approvato === 'si'
        );
        console.log("Eventi Filtrati:", this.eventi);
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
        {
          text: 'Annulla',
          role: 'cancel'
        },
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

  caricaUtentiSeguiti() {
    const seguiti = JSON.parse(localStorage.getItem('seguiti') || '[]');
    this.seguendoUtenti = seguiti;
  }

  isEventoSeguito(evento: any): boolean {
    return this.seguendoUtenti.includes(evento.organizzatore);
  }
}
