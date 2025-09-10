import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AlertController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonThumbnail, IonToolbar, IonButton, IonLabel, IonImg, IonItem, IonList, IonIcon, IonTextarea } from '@ionic/angular/standalone';

@Component({
  selector: 'app-admin-dettagli',
  templateUrl: './admin-dettagli.page.html',
  styleUrls: ['./admin-dettagli.page.scss'],
  standalone: true,
  imports: [IonTextarea, IonIcon, IonList, CommonModule,  FormsModule, RouterModule, IonThumbnail, IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonLabel, IonImg, IonItem]
})
export class AdminDettagliPage implements OnInit {
  evento: any;
  organizzatoreEmail: string = '';
  eventiSimili: any[] = [];
  testoMessaggio: string = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.caricaEvento(id);
    }
  }

caricaEvento(id: string) {
  this.http.get<any>(`${environment.apiUrl}/api/eventi/${id}`).subscribe(
    (evento) => {
      this.evento = evento;
      if (evento.organizzatore) {
        this.caricaEmailOrganizzatore(evento.organizzatore);
      }
      this.caricaEventiSimili(evento.dataEvento, evento.citta, evento._id);
    },
    (err) => console.error('Errore nel caricamento evento', err)
  );
}


  caricaEmailOrganizzatore(username: string) {
    this.http.get<any>(`${environment.apiUrl}/api/utente-by-username/${username}`).subscribe(
      (utente) => {
        this.organizzatoreEmail = utente.email || 'Email non disponibile';
      },
      (err) => console.error('Errore nel recupero email organizzatore', err)
    );
  }

  caricaEventiSimili(dataEvento: string, citta: string, idEvento: string) {
  this.http.get<any[]>(`${environment.apiUrl}/api/eventi`).subscribe(
    (eventi) => {
      this.eventiSimili = eventi.filter(e =>
        e.citta?.trim().toLowerCase() === citta?.trim().toLowerCase() &&
        e.dataEvento === dataEvento &&
        e._id !== idEvento
      );
    },
    (err) => console.error('Errore nel recupero eventi simili', err)
  );
}

vaiAlDetail(id: string) {
  this.router.navigate(['/dettagli', id]);
}


  approvaEvento() {
    this.http.put(`${environment.apiUrl}/api/approva-evento/${this.evento._id}`, {}).subscribe(
      async () => {
        const toast = await this.toastCtrl.create({ message: 'Evento approvato', duration: 2000, color: 'success' });
        toast.present();
        this.router.navigate(['/admin']);
      },
      (err) => console.error('Errore approvazione', err)
    );
  }

  async rifiutaEvento() {
    const alert = await this.alertCtrl.create({
      header: 'Conferma',
      message: `Vuoi davvero eliminare l'evento "${this.evento.nomeEvento}"?`,
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        { text: 'Elimina', handler: () => this.eliminaEvento() }
      ]
    });
    await alert.present();
  }

  eliminaEvento() {
    this.http.delete(`${environment.apiUrl}/api/eventi/${this.evento._id}`).subscribe(
      async () => {
        const toast = await this.toastCtrl.create({ message: 'Evento eliminato', duration: 2000, color: 'danger' });
        toast.present();
        this.router.navigate(['/admin']);
      },
      (err) => console.error('Errore eliminazione evento', err)
    );
  }

  getDescrizioneFormattata(): string {
    if (!this.evento?.descrizione) return '';

    let testo = this.evento.descrizione;

    testo = testo.replace(/(https?:\/\/[\w./?=&%-]+)/g, '<a href="$1" target="_blank">$1</a>');
    testo = testo.replace(/(^|\s)(www\.[^\s]+)/g, '$1<a href="http://$2" target="_blank">$2</a>');

    const telRegex = /(\b(?:tel\.?|telefono)?\s?:?\s?\+?\d{2,4}[\s\-]?\d{2,4}[\s\-]?\d{2,4}[\s\-]?\d{2,4}\b)/gi;
    testo = testo.replace(telRegex, (match: string) => {
      const numero = match.replace(/[^\d\+]/g, '');
      return `<a href="tel:${numero}">📞 ${match}</a>`;
    });

    return testo;
  }


  inviaMessaggio() {
  if (!this.testoMessaggio.trim()) return;

  this.http.post(`${environment.apiUrl}/api/messaggi`, {
    destinatarioUsername: this.evento.organizzatore,
    messaggio: this.testoMessaggio.trim()
  }).subscribe({
    next: async () => {
      const toast = await this.toastCtrl.create({ message: 'Messaggio inviato!', duration: 2000, color: 'success' });
      toast.present();
      this.testoMessaggio = '';
    },
    error: async () => {
      const toast = await this.toastCtrl.create({ message: 'Errore invio messaggio', duration: 2000, color: 'danger' });
      toast.present();
    }
  });
}


  getImageUrl(locandina: string): string {
    if (!locandina) return 'assets/default-image.jpg';
    if (locandina.startsWith('https://firebasestorage.googleapis.com')) return locandina;
    return `${environment.apiUrl}${locandina.startsWith('/') ? '' : '/'}${locandina}`;
  }
}
