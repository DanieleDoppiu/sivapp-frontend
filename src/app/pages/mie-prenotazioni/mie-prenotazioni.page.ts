import { Component, OnInit } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from 'src/environments/environment';

import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonCard,
  IonCardHeader,
  IonImg,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonButton,
  IonText, IonIcon, IonTabBar, IonTabButton, IonLabel
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-mie-prenotazioni',
  templateUrl: './mie-prenotazioni.page.html',
  styleUrls: ['./mie-prenotazioni.page.scss'],
  standalone: true,
  imports: [IonLabel, IonTabButton, IonTabBar, IonIcon, RouterModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonCard,
    IonCardHeader,
    IonImg,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonButton,
    IonText,
    CommonModule
  ],
})
export class MiePrenotazioniPage implements OnInit {
  miePrenotazioni: any[] = [];
  userId: string = '';

  constructor(
    private alertController: AlertController,
    private toastController: ToastController,
    private http: HttpClient
  ) {}

  ngOnInit() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.userId = user._id;

    if (!this.userId) {
      console.error('ID utente non trovato nel localStorage');
      return;
    }

    this.caricaPrenotazioni();
  }

  private caricaPrenotazioni() {
    this.http
      .get<any[]>(`${environment.apiUrl}/api/mie-prenotazioni/${this.userId}`)
      .subscribe({
        next: (data) => {
          this.miePrenotazioni = data.map(p => {
            this.checkModificabilitaPrenotazione(p);
            return p;
          });
        },
        error: (err) => {
          console.error('Errore durante il recupero delle prenotazioni:', err);
        }
      });
  }

  private checkModificabilitaPrenotazione(prenotazione: any) {
    try {
      if (
        !prenotazione.eventoId?.dataEvento ||
        !prenotazione.orario ||
        prenotazione.tempoLimiteModifica == null
      ) {
        prenotazione.isEditable = false;
        return;
      }

      const dataEvento = new Date(prenotazione.eventoId.dataEvento);
      const [ore, minuti] = prenotazione.orario.split(':').map(Number);
      const dataOrarioPrenotazione = new Date(dataEvento);
      dataOrarioPrenotazione.setHours(ore, minuti, 0, 0);

      const dataLimite = new Date(
        dataOrarioPrenotazione.getTime() - prenotazione.tempoLimiteModifica * 60000
      );

      const adesso = new Date();
      prenotazione.isEditable = adesso < dataLimite;
    } catch (error) {
      console.error('Errore nel calcolo isEditable:', error);
      prenotazione.isEditable = false;
    }
  }

  async mostraFormModifica(pren: any) {
    const alert = await this.alertController.create({
      header: 'Modifica Prenotazione',
      inputs: [
        {
          name: 'orario',
          type: 'time',
          value: pren.modificaProposta?.orario || pren.orario
        },
        {
          name: 'persone',
          type: 'number',
          value: pren.modificaProposta?.persone || pren.persone
        },
        {
          name: 'note',
          type: 'textarea',
          value: pren.modificaProposta?.note || pren.note
        }
      ],
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Invia',
          handler: (data) => {
            this.http
              .put(
                `${environment.apiUrl}/api/prenotazioni/${pren._id}/richiesta-modifica`,
                {
                  orario: data.orario,
                  persone: data.persone,
                  note: data.note
                }
              )
              .subscribe({
                next: () => {
                  pren.stato = 'in_attesa_modifica';
                  pren.modificaProposta = {
                    orario: data.orario,
                    persone: data.persone,
                    note: data.note
                  };
                  pren.isEditable = false;
                },
                error: (err) => console.error('Errore richiesta modifica:', err)
              });
          }
        }
      ]
    });
    await alert.present();
  }

  async confermaCancellazione(pren: any) {
    const alert = await this.alertController.create({
      header: 'Conferma',
      message: 'Vuoi davvero richiedere la cancellazione della prenotazione?',
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Conferma',
          handler: () => {
            this.http
              .put(
                `${environment.apiUrl}/api/prenotazioni/${pren._id}/richiesta-cancellazione`,
                {}
              )
              .subscribe({
                next: () => {
                  pren.stato = 'in_attesa_cancellazione';
                  pren.isEditable = false;
                },
                error: (err) => console.error('Errore richiesta cancellazione:', err)
              });
          }
        }
      ]
    });
    await alert.present();
  }
}
