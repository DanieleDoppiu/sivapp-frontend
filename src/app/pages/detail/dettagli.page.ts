import { TabsComponent } from './../../tabs.component';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonLabel, IonImg, IonTabButton, IonIcon, IonTabs, IonTabBar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-dettagli',
  templateUrl: './dettagli.page.html',
  styleUrls: ['./dettagli.page.scss'],
  standalone: true,
  imports: [IonTabBar, IonTabs, IonIcon, IonTabButton, TabsComponent, CommonModule, RouterModule, IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonLabel, IonImg]
})
export class DettagliPage implements OnInit {
  evento: any;
  preferito: boolean = false;
  animazione: boolean = false;
  seguito: boolean = false;

  constructor(private route: ActivatedRoute, private http: HttpClient) { }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    console.log("ID Evento:", id);

    this.http.get(`${environment.apiUrl}/api/eventi/${id}`).subscribe(
      (data) => {
        this.evento = data;
        console.log("Evento Caricato:", this.evento);

        const seguiti = JSON.parse(localStorage.getItem('seguiti') || '[]');
        this.seguito = seguiti.includes(this.evento.organizzatore);

        const preferiti = JSON.parse(localStorage.getItem('preferiti') || '[]');
        this.preferito = preferiti.includes(this.evento._id);
      },
      (error) => {
        console.error("Errore nel caricamento dell'evento", error);
      }
    );

    // Aggiorna stato del cuore quando i preferiti cambiano in altre pagine
    window.addEventListener('storage', () => {
      const preferiti = JSON.parse(localStorage.getItem('preferiti') || '[]');
      this.preferito = preferiti.includes(this.evento?._id);
    });
  }

  togglePreferito() {
    let preferiti = JSON.parse(localStorage.getItem('preferiti') || '[]');

    if (this.preferito) {
      preferiti = preferiti.filter((id: string) => id !== this.evento._id);
      this.preferito = false;
      console.log("Evento rimosso dai preferiti");
    } else {
      preferiti.push(this.evento._id);
      this.preferito = true;
      console.log("Evento aggiunto ai preferiti");
      this.animazione = true;
      setTimeout(() => { this.animazione = false; }, 700);
    }

    localStorage.setItem('preferiti', JSON.stringify(preferiti));
  }

  seguiOrganizzatore() {
    let seguiti = JSON.parse(localStorage.getItem('seguiti') || '[]');
    if (this.seguito) {
      seguiti = seguiti.filter((id: string) => id !== this.evento.organizzatore);
      this.seguito = false;
    } else {
      seguiti.push(this.evento.organizzatore);
      this.seguito = true;
    }
    localStorage.setItem('seguiti', JSON.stringify(seguiti));
  }

  getImageUrl(locandina: string): string {
    if (!locandina) return 'assets/default-image.jpg';
    if (locandina.startsWith('https://firebasestorage.googleapis.com')) return locandina;
    return `${environment.apiUrl}${locandina.startsWith('/') ? '' : '/'}${locandina}`;
  }

  taggatiEvento() {
    const user = JSON.parse(localStorage.getItem('user')!);
    if (!user || !user._id) {
      console.error("❌ Nessun utente loggato!");
      return;
    }

    this.http.post(`${environment.apiUrl}/api/eventi/${this.evento._id}/tagga`, { userId: user._id }).subscribe(
      (res: any) => {
        console.log(res.message);
        alert(res.message);
      },
      (error) => {
        console.error("❌ Errore nel tagging:", error);
        alert(error.error.message || "Errore nel tagging!");
      }
    );
  }

  condividiEvento() {
    const user = JSON.parse(localStorage.getItem('user')!);
    if (!user || !user._id || !this.evento?._id) {
      console.error("❌ Dati mancanti per la condivisione!");
      return;
    }

    // Questo è l'endpoint che punta al backend (https://sivapp.events/evento)
    const linkCondivisione = `https://sivapp.events/evento?eventoId=${this.evento._id}&user=${user._id}`;
    const messaggio = `🎉 Partecipa a "${this.evento.nomeEvento}" a ${this.evento.citta}! Scopri l'evento e segui ${user.username} su Sivapp! 👇\n${linkCondivisione}`;

    // Copia il link negli appunti
    navigator.clipboard.writeText(messaggio).then(() => {
      alert("🔗 Link copiato! Condividilo con i tuoi amici!");
    }).catch(err => {
      console.error("❌ Errore nella copia del link:", err);
    });

    // Se disponibile, usa il sistema di condivisione nativo
    if (navigator.share) {
      navigator.share({
        title: "Evento su Sivapp",
        text: messaggio,
        url: linkCondivisione
      }).then(() => {
        console.log("✅ Condivisione completata!");
      }).catch(err => {
        console.error("❌ Errore nella condivisione:", err);
      });
    }
  }

}
