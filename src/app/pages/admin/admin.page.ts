import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { PushNotifications } from '@capacitor/push-notifications';
import { Router, RouterModule } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Capacitor } from '@capacitor/core';
import { FormsModule } from '@angular/forms';
import { FilterByCittaPipe } from '../pipes/filter-by-citta.pipe';
import QRCode from 'qrcode';
import {
  IonContent, IonList, IonItem, IonLabel, IonTextarea, IonToggle,
  IonTabButton, IonTabBar, IonSelect, IonSelectOption, IonButton,
  IonHeader, IonToolbar, IonTitle, IonText, IonImg, IonSpinner,  IonInput, IonGrid, IonRow, IonCol, IonBadge
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    IonImg, IonText, CommonModule, IonToggle, IonTextarea, IonTabBar,
    FilterByCittaPipe, FormsModule, RouterModule, IonTabButton, IonContent,
    IonList, IonItem, IonLabel, IonSelect, IonSelectOption, IonButton,
    IonHeader, IonToolbar, IonTitle, IonSpinner, IonGrid,   IonInput,  IonRow, IonCol, IonBadge
  ]
})
export class AdminPage implements OnInit {

  eventi: any[] = [];
  province: string[] = [];
  provinceSelezionate: string[] = [];
  popupAttivo: boolean = false;
  id: string = '';
  popupContenuto: string = '';
  messaggioAttivo = false;
  eventiPacchetto: any[] = [];
  pacchettoCorrente: string | null = null;
  tuttiEventiApprovati: any[] = [];
  eventoAperto: string | null = null; // ID evento aperto

  // Nuovi per funzionalità QR
  utentiConEventi: Array<{ username: string; citta: string; numeroEventi: number; }> = [];
  cittaFiltro: string = '';
  loadingUtenti: boolean = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.caricaEventi(); // eventi da approvare
    this.caricaTuttiEventiApprovati(); // eventi visibili

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!user.email) {
      console.error("❌ Nessun utente loggato!");
      this.router.navigate(['/home']);
      return;
    }

    this.http.get<{ admin: boolean }>(`${environment.apiUrl}/api/is-admin/${user.email}`).subscribe(
      (res) => {
        if (!res.admin) {
          console.error("❌ Accesso negato: non sei un admin!");
          this.router.navigate(['/home']);
        } else {
          console.log("✅ Accesso Admin confermato!");
          this.caricaProvince();
          this.caricaEventi();
        }
      },
      (error) => {
        console.error("❌ Errore nella verifica admin", error);
        this.router.navigate(['/home']);
      }
    );
  }

  // ...esistenti...
  caricaProvince() {
    this.http.get<string[]>(`${environment.apiUrl}/api/province`).subscribe(
      (data) => this.province = data,
      (error) => console.error('Errore nel caricamento delle province:', error)
    );
  }

  caricaEventi() {
    const provinceQuery = this.provinceSelezionate.length > 0 ? `?province=${this.provinceSelezionate.join(',')}` : '';
    this.http.get<any[]>(`${environment.apiUrl}/api/eventi-non-approvati${provinceQuery}`).subscribe(
      (data) => {
        this.eventi = data;
        console.log("✅ Eventi caricati:", this.eventi);
      },
      (error) => console.error("❌ Errore nel recupero eventi non approvati", error)
    );
  }

  caricaTuttiEventiApprovati() {
    this.http.get(`${environment.apiUrl}/api/eventi-approvati`).subscribe((res: any) => {
      this.tuttiEventiApprovati = res.eventi || [];
    });
  }

  caricaEventiPacchetto(pacchetto: string) {
    this.pacchettoCorrente = pacchetto;
    this.eventiPacchetto = this.tuttiEventiApprovati.filter(e => e.pacchetto === pacchetto);
  }

  contaEventiPacchetto(pacchetto: string): number {
    return this.tuttiEventiApprovati.filter(e => e.pacchetto === pacchetto).length;
  }

  // ================= QR / utenti con eventi =================
  /**
   * Carica gli utenti che hanno almeno un evento approvato.
   * Endpoint atteso: GET /api/utenti-con-eventi
   * Risposta: [{ username, citta, numeroEventi }]
   */
 caricaUtentiConEventi() {
  this.loadingUtenti = true;
  this.http.get<any[]>(`${environment.apiUrl}/api/utenti-con-eventi`).subscribe({
    next: (data) => {
      // Ordina dal più grande al più piccolo per numeroEventi
      this.utentiConEventi = (data || []).sort((a: any, b: any) =>
        b.numeroEventi - a.numeroEventi
      );
      this.loadingUtenti = false;
    },
    error: (err) => {
      console.error("❌ Errore caricamento utenti con eventi", err);
      this.mostraToast('Errore caricamento lista utenti', 'danger');
      this.loadingUtenti = false;
    }
  });
}


  /**
   * Genera e forza il download di un PNG con il QR del link artista.
   */
  async scaricaQR(username: string) {
    try {
      const link = `https://sivapp.events/calendario-artista?organizzatore=${encodeURIComponent(username)}`;
      const dataUrl = await QRCode.toDataURL(link, { width: 400, margin: 1 });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${username}_QR.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      this.mostraToast('QR scaricato', 'success');
    } catch (err) {
      console.error('Errore generazione QR:', err);
      this.mostraToast('Errore generazione QR', 'danger');
    }
  }

  // ================= utilità e vecchio codice =================
  vaiAlDetail(id: string) {
    this.router.navigate(['/dettagli', id]);
  }

  getImageUrl(locandina: string): string {
    if (!locandina) return 'assets/default-image.jpg';
    if (locandina.startsWith('https://firebasestorage.googleapis.com')) return locandina;
    return `${environment.apiUrl}${locandina.startsWith('/') ? '' : '/'}${locandina}`;
  }

  approvaEvento(id: string) {
    this.http.put(`${environment.apiUrl}/api/approva-evento/${id}`, {}).subscribe(
      () => {
        this.eventi = this.eventi.filter(evento => evento._id !== id);
        console.log(`✅ Evento ${id} approvato!`);
      },
      (error) => console.error("❌ Errore nell'approvazione evento", error)
    );
  }

  async apriPopupInserimentoMessaggio() {
    const alert = await this.alertCtrl.create({
      header: 'Messaggio popup',
      inputs: [
        {
          name: 'messaggio',
          type: 'textarea',
          placeholder: 'Inserisci il messaggio da mostrare all\'apertura dell’app',
        }
      ],
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Salva', handler: (data) => {
            const messaggio = data.messaggio?.trim();
            if (messaggio) {
              this.salvaMessaggioPopup(messaggio);
            } else {
              this.mostraToast('Messaggio vuoto, non salvato.', 'warning');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  salvaMessaggioPopup(messaggio: string) {
    this.http.post(`${environment.apiUrl}/api/messaggio-popup`, { contenuto: messaggio, attivo: true })
      .subscribe({
        next: async () => { this.mostraToast('Messaggio popup salvato con successo!', 'success'); },
        error: async () => { this.mostraToast('Errore durante il salvataggio del messaggio.', 'danger'); }
      });
  }

  aggiornaMessaggioPopup() {
    this.http.put(`${environment.apiUrl}/api/messaggio-popup`, { contenuto: this.popupContenuto, attivo: this.popupAttivo })
      .subscribe({
        next: async () => { this.mostraToast('Messaggio popup aggiornato!', 'success'); },
        error: async () => { this.mostraToast('Errore aggiornando il popup.', 'danger'); }
      });
  }

  async mostraToast(messaggio: string, colore: 'success' | 'danger' | 'warning') {
    const toast = await this.toastCtrl.create({ message: messaggio, duration: 2000, color: colore });
    toast.present();
  }

  rifiutaEvento(evento: any) {
    const conferma = confirm(`Sei sicuro di voler rifiutare ed eliminare l'evento "${evento.nomeEvento}"?`);
    if (!conferma) return;

    if (evento.locandina) {
      fetch(`${environment.apiUrl}/api/delete-locandina`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: evento.locandina })
      }).then(() => console.log('Locandina eliminata'));
    }

    fetch(`${environment.apiUrl}/api/eventi/${evento._id}`, { method: 'DELETE' })
      .then(() => {
        alert('Evento eliminato con successo');
        this.caricaEventi();
      }).catch(err => {
        console.error('Errore nella cancellazione:', err);
        alert('Errore durante la cancellazione');
      });
  }

  vaiAiDettagli(eventoId: string) {
    this.router.navigate(['/admin-dettagli', eventoId]);
  }

  toggleEvento(eventoId: string) {
    this.eventoAperto = this.eventoAperto === eventoId ? null : eventoId;
  }

}
