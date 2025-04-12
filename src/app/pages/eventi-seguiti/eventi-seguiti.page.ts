import { TabsComponent } from './../../tabs.component';
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { BadgeNotificationsService } from './../../badge-notifications.service'; // Assicurati che il percorso sia corretto
import { IonContent, IonList, IonItem, IonLabel, IonThumbnail, IonIcon, IonHeader, IonToolbar, IonTitle, IonTabBar, IonText, IonImg } from '@ionic/angular/standalone';

@Component({
  selector: 'app-eventi-seguiti',
  templateUrl: './eventi-seguiti.page.html',
  styleUrls: ['./eventi-seguiti.page.scss'],
  standalone: true,
  imports: [IonImg, IonText, IonTabBar, CommonModule, TabsComponent, RouterModule, IonContent, IonList, IonItem, IonLabel, IonThumbnail, IonIcon, IonHeader, IonToolbar, IonTitle]
})
export class EventiSeguitiPage implements OnInit {
  eventiSeguiti: any[] = [];
  giornoSettimana: string = '';
  giorno: number = 0;
  userId: string = '';
  utentiSeguiti: any[] = []; // 🔹 Per recuperare i nomi degli utenti seguiti

  constructor(private http: HttpClient, private router: Router, private badgeService: BadgeNotificationsService) { }

  ngOnInit() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.utentiSeguiti = JSON.parse(localStorage.getItem('seguiti') || '[]');

    if (!user._id) {
      console.error("❌ Nessun utente loggato!");
      return;
    }

    this.userId = user._id;

    this.caricaEventiSeguiti();
    this.caricaData();

    // ✅ Controlla nuovi eventi ogni 30 secondi
    setInterval(() => {
      this.controllaNuoviEventi();
    }, 30000);
  }

  getImageUrl(locandina: string): string {
    // Se manca l'URL dell'immagine, mostra l'immagine di default
    if (!locandina) return 'assets/default-image.jpg';

    // Se l'URL è già un URL di Firebase, lo restituiamo direttamente
    if (locandina.startsWith('https://firebasestorage.googleapis.com')) {
      return locandina; // Restituisce l'URL completo di Firebase
    }

    // Se non è un URL Firebase, trattalo come un percorso relativo (come facevamo prima)
    return `${environment.apiUrl}${locandina.startsWith('/') ? '' : '/'}${locandina}`;
  }


  caricaEventiSeguiti() {
    this.http.post<any[]>(`${environment.apiUrl}/api/eventi-seguiti`, { utentiSeguiti: this.utentiSeguiti, userId: this.userId }).subscribe(
      (data) => {
        this.eventiSeguiti = data;
        console.log("✅ Eventi seguiti e taggati:", this.eventiSeguiti);

      },
      (error) => {
        console.error("❌ Errore nel caricamento degli eventi seguiti", error);
      }
    );
  }

  /**
   * ✅ Trova il nome del taggato e restituisce il valore da mostrare
   */
  /**
 * ✅ Controlla se l'utente è stato taggato in un evento.
 */
isUserTaggato(evento: any): boolean {
  return evento.taggati?.some((t: any) => t._id === this.userId);
}

/**
 * ✅ Trova i nomi degli utenti taggati.
 */
trovaNomeTaggato(taggati: any[]): string {
  if (!taggati || taggati.length === 0) return "Sconosciuto";

  // 🔹 Se c'è un solo taggato, mostra il suo nome
  if (taggati.length === 1) return taggati[0].username;

  // 🔹 Se ci sono più taggati, mostra "Taggati: Nome1, Nome2..."
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
    console.log("Navigazione verso Detail con ID:", id);
    this.router.navigate(['/dettagli', id]);
  }

  caricaData() {
    const giorniSettimana = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const data = new Date();
    this.giornoSettimana = giorniSettimana[data.getDay()];
    this.giorno = data.getDate();
  }
}

