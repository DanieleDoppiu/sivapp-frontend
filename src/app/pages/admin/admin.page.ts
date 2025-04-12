import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { PushNotifications } from '@capacitor/push-notifications';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Capacitor } from '@capacitor/core';
import { FormsModule } from '@angular/forms';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonContent, IonList, IonItem, IonLabel, IonTabButton, IonTabBar, IonSelect, IonSelectOption, IonButton, IonHeader, IonToolbar, IonTitle, IonText, IonImg } from '@ionic/angular/standalone';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [IonImg, IonText, CommonModule, IonTabBar, FormsModule, RouterModule, IonTabButton, IonContent, IonList, IonItem, IonLabel, IonSelect, IonSelectOption, IonButton, IonHeader, IonToolbar, IonTitle]
})
export class AdminPage implements OnInit {
  eventi: any[] = [];
  province: string[] = [];
  provinceSelezionate: string[] = [];
  eventoAperto: string | null = null; // ✅ Salva l'ID dell'evento aperto


  constructor(private http: HttpClient, private router: Router) {}



  ngOnInit() {
    this.registraNotifiche();
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

  // ✅ Registra notifiche push per gli admin
  async registraNotifiche() {
    if (!Capacitor.isNativePlatform()) {
      console.warn("❌ Notifiche push non supportate sul web.");
      return;
    }

    let permesso = await PushNotifications.requestPermissions();
    if (permesso.receive === 'granted') {
      PushNotifications.register();
    }

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log("🔔 Notifica ricevuta:", notification);
      alert(notification.title + "\n" + notification.body);
      this.caricaEventi(); // 🔄 Ricarica gli eventi
    });
  }
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
        console.log("✅ Eventi caricati:", this.eventi); // 🔹 Debug
      },
      (error) => console.error("❌ Errore nel recupero eventi non approvati", error)
    );
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

  approvaEvento(id: string) {
    this.http.put(`${environment.apiUrl}/api/approva-evento/${id}`, {}).subscribe(
      () => {
        this.eventi = this.eventi.filter(evento => evento._id !== id); // ✅ Rimuove l'evento dalla lista
        console.log(`✅ Evento ${id} approvato!`);
      },
      (error) => console.error("❌ Errore nell'approvazione evento", error)
    );
  }

  /**
   * ✅ Espande o chiude l'evento cliccato
   */
  toggleEvento(eventoId: string) {
    this.eventoAperto = this.eventoAperto === eventoId ? null : eventoId;
  }

}
