import { TabsComponent } from './../../tabs.component';
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { IonContent, IonMenu, IonList, IonItem, IonLabel, IonButton, IonThumbnail, IonImg, IonIcon, IonHeader, IonText, IonTabs, IonTabBar, IonToolbar, IonTitle, IonApp } from '@ionic/angular/standalone';

@Component({
  selector: 'app-preferiti',
  templateUrl: './preferiti.page.html',
  styleUrls: ['./preferiti.page.scss'],
  standalone: true,
  imports: [IonApp, IonTitle, IonToolbar, IonMenu, IonTabBar, IonTabs, TabsComponent, IonText, IonHeader, CommonModule, RouterModule, IonContent, IonList, IonItem, IonLabel, IonButton, IonThumbnail, IonImg, IonIcon]
})
export class PreferitiPage implements OnInit {
  preferiti: any[] = [];

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    let preferitiIds = JSON.parse(localStorage.getItem('preferiti') || '[]');

    if (!Array.isArray(preferitiIds)) {
      console.error("Errore: Preferiti non è un array!");
      preferitiIds = [];
    }

    if (preferitiIds.length === 0) {
      this.preferiti = [];
      return;
    }

    this.preferiti = [];

    // ✅ Carica i dettagli degli eventi preferiti dal server
    preferitiIds.forEach((id: string) => {
      this.http.get(`${environment.apiUrl}/api/eventi/${id}`).subscribe(
        (data) => {
          this.preferiti.push(data);
        },
        (error) => {
          console.error("Errore nel caricamento evento preferito:", error);
        }
      );
    });
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

  rimuoviPreferito(evento: any) {
    this.preferiti = this.preferiti.filter(e => e._id !== evento._id);
    localStorage.setItem('preferiti', JSON.stringify(this.preferiti));

    // 🔴 Evento globale per notificare che i preferiti sono cambiati
    window.dispatchEvent(new Event('preferitiAggiornati'));

    console.log('Evento Rimosso:', evento);
  }

  vaiAlDetail(id: string) {
    console.log("Navigazione verso Detail con ID:", id); // Debug
    this.router.navigate(['/dettagli', id]); // Navigazione
  }


}
