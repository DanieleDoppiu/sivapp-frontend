import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { environment } from 'src/environments/environment';
import { IonContent, IonList, IonItem, IonSelectOption, IonLabel, IonSelect, IonThumbnail, IonIcon, IonHeader, IonToolbar, IonTitle, IonTabBar, IonText, IonImg, IonButton, IonModal, IonAvatar, IonCard } from '@ionic/angular/standalone';
import { TabsComponent } from 'src/app/tabs.component';

@Component({
  selector: 'app-calendario-artista',
  templateUrl: './calendario-artista.page.html',
  styleUrls: ['./calendario-artista.page.scss'],
  standalone: true,
  imports: [IonCard, IonAvatar, IonModal,
    IonButton, IonImg, IonText, IonTabBar, CommonModule, IonSelectOption, IonSelect, RouterModule,
    IonContent, IonList, IonItem, IonLabel, IonThumbnail, IonIcon, IonHeader, IonToolbar, IonTitle, TabsComponent
  ]
})
export class CalendarioArtistaPage implements OnInit {
  eventi: any[] = [];
  eventiRaggruppatiPerGiorno: { [data: string]: any[] } = {};
  organizzatore: string = '';
  mostraPopup: boolean = false;
nomeOrganizzatore: string = '';


  constructor(private route: ActivatedRoute, private http: HttpClient) {}

 ngOnInit() {
  this.route.queryParamMap.subscribe(params => {
    this.organizzatore = params.get('organizzatore') || '';
    if (this.organizzatore) {
      this.nomeOrganizzatore = this.organizzatore;
      this.caricaEventi();


      const seguiParam = params.get('segui');
      const popupMostrato = localStorage.getItem(`popupCalendario_${this.organizzatore}`);

      if (seguiParam && !popupMostrato) {
        this.verificaFollowEApriPopup();
      }
    }
  });
}



async verificaFollowEApriPopup() {
  const seguiti = JSON.parse(localStorage.getItem('seguiti') || '[]');
  if (!seguiti.includes(this.organizzatore)) {
    this.mostraPopup = true;
  }
}

  caricaEventi() {
    this.http.get<any[]>(`${environment.apiUrl}/api/eventi`).subscribe(eventi => {
      const oggi = new Date().toISOString().split('T')[0];
      const eventiOrganizzatore = eventi.filter(e =>
        e.organizzatore === this.organizzatore &&
        e.dataEvento >= oggi &&
        e.approvato === 'si'
      ).sort((a, b) => a.dataEvento.localeCompare(b.dataEvento));

      this.eventi = eventiOrganizzatore;
      this.raggruppaEventiPerGiorno();
    });
  }


  raggruppaEventiPerGiorno() {
    this.eventiRaggruppatiPerGiorno = {};
    for (const evento of this.eventi) {
      const data = evento.dataEvento;
      if (!this.eventiRaggruppatiPerGiorno[data]) {
        this.eventiRaggruppatiPerGiorno[data] = [];
      }
      this.eventiRaggruppatiPerGiorno[data].push(evento);
    }
  }


  async segui() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const utenteId = user?._id || this.getOspiteId();

  try {
    await this.http.post(`${environment.apiUrl}/api/follow`, {
      followerId: utenteId,
      seguitoUsername: this.organizzatore
    }).toPromise();

    const seguiti = JSON.parse(localStorage.getItem('seguiti') || '[]');
    seguiti.push(this.organizzatore);
    localStorage.setItem('seguiti', JSON.stringify(seguiti));

    this.mostraPopup = false;
    localStorage.setItem(`popupCalendario_${this.organizzatore}`, 'true');
  } catch (err) {
    console.error("Errore nel follow:", err);
  }
}


getOspiteId(): string {
  let ospiteId = localStorage.getItem('ospite_id');
  if (!ospiteId) {
    ospiteId = 'ospite_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('ospite_id', ospiteId);
  }
  return ospiteId;
}



  getImageUrl(locandina: string): string {
    if (!locandina) return 'assets/default-image.jpg';
    if (locandina.startsWith('https://firebasestorage.googleapis.com')) return locandina;
    return `${environment.apiUrl}${locandina.startsWith('/') ? '' : '/'}${locandina}`;
  }

  vaiAlDetail(id: string) {
    window.location.href = `/dettagli/${id}`;
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

  isUserTaggato(evento: any): boolean {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return evento.taggati?.some((t: any) => t._id === user?._id);
  }

  trovaNomeTaggato(taggati: any[]): string {
    if (!taggati || taggati.length === 0) return "Sconosciuto";
    if (taggati.length === 1) return taggati[0].username;
    return "Taggati: " + taggati.map(t => t.username).join(', ');
  }
}
