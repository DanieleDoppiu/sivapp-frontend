import { TabsComponent } from './../../tabs.component';
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from 'src/environments/environment';
import { RouterModule, Router } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonIcon, IonButton, IonThumbnail, IonImg, IonText, IonTabBar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-user',
  templateUrl: './user.page.html',
  styleUrls: ['./user.page.scss'],
  standalone: true,
  imports: [IonTabBar, IonText, CommonModule, RouterModule, TabsComponent, IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonIcon, IonButton, IonThumbnail, IonImg]
})
export class UserPage implements OnInit {
  eventi: any[] = [];
  eventiFiltrati: any[] = [];
  eventiRaggruppatiPerGiorno: { [data: string]: any[] } = {};
  utente: string = '';

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    const user = JSON.parse(localStorage.getItem('user')!);
    if (user) {
      this.utente = user.username;
      this.caricaEventi();
    }
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

 caricaEventi() {
  this.http.get<any[]>(`${environment.apiUrl}/api/eventi`).subscribe(
    (data) => {
      this.eventi = data.filter(evento => evento.organizzatore === this.utente);
      console.log(`Eventi dell'utente:`, this.eventi);
      this.raggruppaEventiPerGiorno(); // 👈 AGGIUNTA FONDAMENTALE
    },
    (error) => {
      console.error("Errore nel caricamento degli eventi", error);
    }
  );
}

  vaiAlDetail(id: string) {
    this.router.navigate(['/dettagli', id]);
  }

  cancellaEvento(id: string) {
    if (confirm("Sei sicuro di voler eliminare questo evento?")) {
      this.http.delete(`${environment.apiUrl}/api/eventi/${id}`).subscribe(
        (response) => {
          console.log("Evento eliminato:", response);
          alert("Evento eliminato con successo!");
          this.caricaEventi(); // Ricarica gli eventi aggiornati
        },
        (error) => {
          console.error("Errore nell'eliminazione dell'evento", error);
          console.log("Errore completo:", error); // Log dell'errore completo per il debug
          alert("Errore durante l'eliminazione dell'evento!");
        }
      );
    }
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

getGiorniOrdinati(): string[] {
  return Object.keys(this.eventiRaggruppatiPerGiorno).sort((a, b) => a.localeCompare(b));
}

formattaData(data: string): string {
  const opzioni = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' } as const;
  return new Date(data).toLocaleDateString('it-IT', opzioni);
}

isWeekend(data: string): boolean {
  const giorno = new Date(data).getDay();
  return giorno === 0 || giorno === 6;
}


  modificaEvento(id: string) {
    this.router.navigate(['/modifica', id]); // Passa l'ID come parametro
  }
}
