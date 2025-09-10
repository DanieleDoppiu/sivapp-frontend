import { TabsComponent } from './../../tabs.component';
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FollowService } from 'src/app/services/follow.service';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { BadgeNotificationsService } from './../../badge-notifications.service';
import { IonContent, IonList, IonItem, IonSelectOption, IonLabel, IonSelect, IonThumbnail, IonIcon, IonHeader, IonToolbar, IonTitle, IonTabBar, IonText, IonImg, IonButton } from '@ionic/angular/standalone';

@Component({
  selector: 'app-eventi-seguiti',
  templateUrl: './eventi-seguiti.page.html',
  styleUrls: ['./eventi-seguiti.page.scss'],
  standalone: true,
  imports: [IonButton, IonImg, IonText, IonTabBar, CommonModule, FormsModule, TabsComponent, IonSelectOption, IonSelect, RouterModule, IonContent, IonList, IonItem, IonLabel, IonThumbnail, IonIcon, IonHeader, IonToolbar, IonTitle]
})
export class EventiSeguitiPage implements OnInit {
  eventiSeguiti: any[] = [];
  eventiFiltrati: any[] = [];
  eventiRaggruppatiPerGiorno: { [data: string]: any[] } = {};
  userId: string = '';
  organizzatoreSelezionato: string = '';
  organizzatoriUnici: string[] = [];
  utentiSeguiti: any[] = [];
  provenienzaQr: boolean = false;
  artistaSeguitoId: string | null = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private badgeService: BadgeNotificationsService,
    private followService: FollowService
  ) {}

  async ngOnInit() {
    const queryParams = new URLSearchParams(window.location.search);
    const artistaId = queryParams.get('segui');

    if (artistaId) {
      this.artistaSeguitoId = artistaId;
      this.provenienzaQr = true;

      const ospiteId = this.getOspiteId();
      await this.followService.seguiConIdPersonalizzato(ospiteId, artistaId);
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.userId = user._id || '';

    this.utentiSeguiti = await this.followService.getSeguiti();

    if (!this.userId) {
      console.warn("⚠️ Nessun utente loggato, carico solo eventi locali.");
    }

    this.caricaEventiSeguiti();

    setInterval(() => {
      this.controllaNuoviEventi();
    }, 30000);
  }

  ionViewWillEnter() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.userId = user._id || '';
    this.followService.getSeguiti().then(seguiti => {
      this.utentiSeguiti = seguiti;
      this.caricaEventiSeguiti();
    });
  }

  getOspiteId(): string {
    let ospiteId = localStorage.getItem('ospite_id');
    if (!ospiteId) {
      ospiteId = 'ospite_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('ospite_id', ospiteId);
    }
    return ospiteId;
  }

  caricaEventiSeguiti() {
    this.http.post<any[]>(`${environment.apiUrl}/api/eventi-seguiti`, {
      utentiSeguiti: this.utentiSeguiti,
      userId: this.userId
    }).subscribe(
      (data) => {
        this.eventiSeguiti = data.sort((a, b) => a.dataEvento.localeCompare(b.dataEvento));
        this.organizzatoriUnici = [...new Set(data.map(e => e.organizzatore).filter(Boolean))];
        this.applicaFiltro();
        console.log("✅ Eventi seguiti:", this.eventiSeguiti);
      },
      (error) => {
        console.error("❌ Errore nel caricamento degli eventi seguiti", error);
      }
    );
  }

  applicaFiltro() {
    this.eventiFiltrati = this.organizzatoreSelezionato
      ? this.eventiSeguiti.filter(e => e.organizzatore === this.organizzatoreSelezionato)
      : this.eventiSeguiti;

    this.raggruppaEventiPerGiorno();
  }

  raggruppaEventiPerGiorno() {
    this.eventiRaggruppatiPerGiorno = {};
    for (const evento of this.eventiFiltrati) {
      const data = evento.dataEvento;
      if (!this.eventiRaggruppatiPerGiorno[data]) {
        this.eventiRaggruppatiPerGiorno[data] = [];
      }
      this.eventiRaggruppatiPerGiorno[data].push(evento);
    }
  }

  getImageUrl(locandina: string): string {
    if (!locandina) return 'assets/default-image.jpg';
    if (locandina.startsWith('https://firebasestorage.googleapis.com')) return locandina;
    return `${environment.apiUrl}${locandina.startsWith('/') ? '' : '/'}${locandina}`;
  }

  isUserTaggato(evento: any): boolean {
    return evento.taggati?.some((t: any) => t._id === this.userId);
  }

  trovaNomeTaggato(taggati: any[]): string {
    if (!taggati || taggati.length === 0) return "Sconosciuto";
    if (taggati.length === 1) return taggati[0].username;
    return "Taggati: " + taggati.map(t => t.username).join(', ');
  }

  controllaNuoviEventi() {
    if (!this.userId) return;
    this.http.get<any[]>(`${environment.apiUrl}/api/nuovi-eventi-seguiti/${this.userId}`).subscribe(
      (data) => {
        if (data.length > 0) {
          alert(`🔔 ${data.length} nuovi eventi dai tuoi seguiti o dove sei stato taggato!`);
        }
      },
      (error) => {
        console.error("❌ Errore nel controllo nuovi eventi:", error);
      }
    );
  }

  vaiAlDetail(id: string) {
    this.router.navigate(['/dettagli', id]);
  }

  formattaData(dataStr: string): string {
    const giorni = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const mesi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    const [anno, mese, giorno] = dataStr.split('-').map(Number);
    const data = new Date(anno, mese - 1, giorno);
    return `${giorni[data.getDay()]} ${giorno} ${mesi[data.getMonth()]}`;
  }

  isWeekend(dataStr: string): boolean {
    const [anno, mese, giorno] = dataStr.split('-').map(Number);
    const data = new Date(anno, mese - 1, giorno);
    const giornoSettimana = data.getDay();
    return giornoSettimana === 0 || giornoSettimana === 6;
  }

  getGiorniOrdinati(): string[] {
    return Object.keys(this.eventiRaggruppatiPerGiorno).sort((a, b) => a.localeCompare(b));
  }
}
