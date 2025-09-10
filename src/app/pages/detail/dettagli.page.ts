import { FollowService } from './../../services/follow.service';
import { TabsComponent } from './../../tabs.component';
import { Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { Calendar } from '@awesome-cordova-plugins/calendar/ngx';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonLabel, IonImg, IonTabButton, IonIcon, IonTabs, IonTabBar, IonItem, IonModal, IonAvatar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-dettagli',
  templateUrl: './dettagli.page.html',
  styleUrls: ['./dettagli.page.scss'],
  standalone: true,
  providers: [Calendar],
  imports: [IonAvatar, IonModal, IonItem, IonTabBar, IonTabs, IonIcon, IonTabButton, TabsComponent, CommonModule, RouterModule, IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonLabel, IonImg]
})
export class DettagliPage implements OnInit {
  evento: any;
  preferito: boolean = false;
  animazione: boolean = false;
  seguito: boolean = false;
  eventoId: string = '';
  mostraPrenotazioniBtn: boolean = false;
  mostraPopupFollow: boolean = false;
  mostraFollower: boolean = false;
numeroFollowerOrganizzatore: number = 0;
  canShare = !!navigator.share;
  isAdmin = false;
  utenteEmail = '';
isAutoreEvento = false;
tagFacebook: string = '';
tagInstagram: string = '';
logoOrganizzatore: string = '';


views = 0;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private followService: FollowService,
 private router: Router,
    private calendar: Calendar) { }

ngOnInit() {
  this.verificaSeAdmin();
  const id = this.route.snapshot.paramMap.get('id');
  console.log("ID Evento:", id);
  this.eventoId = id || '';

  this.http.get(`${environment.apiUrl}/api/eventi/${id}`).subscribe(
    (data) => {
      this.evento = data;
      console.log("Evento caricato:", this.evento);

      this.caricaFollowerOrganizzatore();

    const seguiti = JSON.parse(localStorage.getItem('seguiti') || '[]');
this.seguito = seguiti.includes(this.evento.organizzatore);

const preferiti = JSON.parse(localStorage.getItem('preferiti') || '[]');
this.preferito = preferiti.includes(this.evento._id);

// 🎯 Mostra numero visualizzazioni
this.http.post<{ visualizzazioni: number }>(`${environment.apiUrl}/api/eventi/${id}/visualizza`, {}).subscribe(
  (res) => {
    this.evento.visualizzazioni = res.visualizzazioni;

const user = JSON.parse(localStorage.getItem('user') || '{}');
this.utenteEmail = user?.email || '';
this.isAutoreEvento = this.evento?.organizzatore === user?.username;


  },
  (err) => console.error('Errore incrementando visualizzazioni:', err)
);

// 🎯 Mostra popup se NON seguo e non l'ho mai mostrato per questo evento
const popupMostrati = JSON.parse(localStorage.getItem('popupFollowMostrati') || '[]');
if (!this.seguito && !popupMostrati.includes(this.evento._id)) {
  this.mostraPopupFollow = true;
}
  } );

  // 🔍 Verifica se esiste una configurazione prenotazioni
  this.http.get(`${environment.apiUrl}/api/eventi/${id}/prenotazioni-config`).subscribe({
    next: () => {
      this.mostraPrenotazioniBtn = true;
    },
    error: (err) => {
      if (err.status !== 404) {
        console.error('Errore nel recupero config prenotazioni:', err);
      }
    }
  });

  // 🔄 Aggiorna stato del cuore quando i preferiti cambiano
  window.addEventListener('storage', () => {
    const preferiti = JSON.parse(localStorage.getItem('preferiti') || '[]');
    this.preferito = preferiti.includes(this.evento?._id);
  });
}


vaiAlCalendario() {
  if (this.evento?.organizzatore) {
    this.router.navigate(['/calendario-artista'], {
      queryParams: { organizzatore: this.evento.organizzatore }
    });
  }
}




incrementaViews() {
  this.http.post<{ views: number }>(`${environment.apiUrl}/api/eventi/${this.evento._id}/incrementa-views`, {})
    .subscribe(
      (res) => {
        this.views = res.views;
        console.log('📈 Views aggiornate:', this.views);
      },
      (err) => {
        console.error('❌ Errore aggiornando views', err);
      }
    );
}


verificaSeAdmin() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!user?.email) return;

  this.http.get<{ admin: boolean }>(`${environment.apiUrl}/api/is-admin/${user.email}`).subscribe(
    (res) => {
      this.isAdmin = res.admin;
      console.log("🛡️ Sei admin?", this.isAdmin);

      // Ora che so se sono admin, faccio la chiamata per mostrare le visualizzazioni
      if (this.isAdmin && this.eventoId) {
        this.http.post<{ visualizzazioni: number }>(`${environment.apiUrl}/api/eventi/${this.eventoId}/visualizza`, {}).subscribe(
          (res) => {
            this.evento.visualizzazioni = res.visualizzazioni;
          },
          (err) => console.error('Errore incrementando visualizzazioni:', err)
        );
      }
    },
    (err) => console.error('❌ Errore nella verifica admin', err)
  );
}





togglePreferito() {
  console.log("Evento:", this.evento);
  let preferiti = JSON.parse(localStorage.getItem('preferiti') || '[]');

  if (this.preferito) {
    preferiti = preferiti.filter((id: string) => id !== this.evento._id);
    this.preferito = false;
    // Rimuovi evento dal calendario se vuoi (opzionale)
  } else {
    preferiti.push(this.evento._id);
    this.preferito = true;
    this.animazione = true;
    setTimeout(() => { this.animazione = false; }, 700);

    // Aggiungi al calendario solo quando aggiungi ai preferiti
    this.aggiungiEventoAlCalendario(this.evento);
    console.log("Evento aggiunto ai preferiti e al calendario");
  }

  localStorage.setItem('preferiti', JSON.stringify(preferiti));
}


  async seguiOrganizzatore() {
  if (!this.evento?.organizzatore) return;

  if (this.seguito) {
    await this.followService.smettiDiSeguire(this.evento.organizzatore);
    this.seguito = false;
  } else {
    await this.followService.segui(this.evento.organizzatore);
    this.seguito = true;
  }
}

gestisciPrenotazioni() {
  if (!this.evento) return;

  if (this.mostraPrenotazioniBtn) {
    window.location.href = `/gestione-prenotazioni/${this.evento._id}`;
  } else {
    window.location.href = `/configura-prenotazioni/${this.evento._id}`;
  }
}

  isCreatoreEvento(): boolean {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return this.evento?.organizzatore === user?.username;
}


  getDescrizioneFormattata(): string {
    if (!this.evento || !this.evento.descrizione) return '';

    let testo = this.evento.descrizione;

    if (this.evento.pagato === 'si' && this.evento.approvato === 'si') {
      // Link con http/https
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      testo = testo.replace(urlRegex, (match: string) => {
        return `<a href="${match}" target="_blank">${match}</a>`;
      });

      // Link con www
      const wwwRegex = /(^|\s)(www\.[^\s]+)/g;
      testo = testo.replace(wwwRegex, (fullMatch: string, spazio: string, link: string) => {
        return `${spazio}<a href="http://${link}" target="_blank">${link}</a>`;
      });

      // Numeri di telefono
      const telRegex = /(\b(?:tel\.?|telefono)?\s?:?\s?\+?\d{2,4}[\s\-]?\d{2,4}[\s\-]?\d{2,4}[\s\-]?\d{2,4}\b)/gi;
      testo = testo.replace(telRegex, (match: string) => {
        const numero = match.replace(/[^\d\+]/g, ''); // Pulisce caratteri inutili
        return `<a href="tel:${numero}">📞 ${match}</a>`;
      });
    }

    return testo;
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

caricaFollowerOrganizzatore() {
  if (!this.evento?.organizzatore) return;

  this.http.get<any>(`${environment.apiUrl}/api/utente-by-username/${this.evento.organizzatore}`).subscribe(
    (utente) => {
      if (utente.mostraFollower) {
        this.mostraFollower = true;

        this.http.get<{ count: number }>(`${environment.apiUrl}/api/followers/count-by-username/${utente.username}`).subscribe(
          (res) => {
            this.numeroFollowerOrganizzatore = res.count;
            console.log('✅ Numero follower organizzatore:', this.numeroFollowerOrganizzatore);
          },
          (err) => console.error('❌ Errore nel conteggio follower per username', err)
        );

      }
       this.logoOrganizzatore = utente.logo; // ⬅️ Aggiungi questa riga
    },
    (err) => console.error('Errore nel recupero utente by username', err)
  );
}

vaiAlCalendarioArtista() {
  if (!this.evento?.organizzatore) return;

  this.router.navigate(['/calendario-artista'], {
    queryParams: { username: this.evento.organizzatore }
  });
}



aggiungiEventoAlCalendario(evento: any) {
  const dataEvento = evento.dataEvento;  // <-- usa dataEvento qui
  const dataFormattata = new Date(dataEvento);

  if (isNaN(dataFormattata.getTime())) {
    console.error('❌ La data non è valida:', dataEvento);
    return;
  } else {
    console.log('✅ Data valida:', dataFormattata);
  }

  const endDate = new Date(dataFormattata);
  endDate.setHours(endDate.getHours() + 2); // esempio: evento di 2 ore

  this.calendar.createEvent(
    evento.nomeEvento,
    evento.citta || '',
    evento.descrizione || '',
    dataFormattata,
    endDate
  ).then(() => {
    console.log('✅ Evento aggiunto al calendario');
  }).catch(err => {
    console.error('❌ Errore aggiungendo al calendario:', err);
  });
}




condividiEvento() {
  const user = JSON.parse(localStorage.getItem('user')!);
  if (!user || !user._id || !this.evento?._id) {
    console.error("❌ Dati mancanti per la condivisione!");
    return;
  }

  const messaggio = this.getMessaggio();
  const linkCondivisione = this.getLinkCondivisione();

  navigator.clipboard.writeText(`${messaggio}\n${linkCondivisione}`).then(() => {
    alert("🔗 Link copiato! Condividilo con i tuoi amici!");
  }).catch(err => {
    console.error("❌ Errore nella copia del link:", err);
  });

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



condividiWhatsApp() {
  const url = encodeURIComponent(this.getLinkCondivisione());
  const text = encodeURIComponent(this.getMessaggio());
  window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
}

condividiFacebook() {
  const url = encodeURIComponent(this.getLinkCondivisione());
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
}

condividiTwitter() {
  const url = encodeURIComponent(this.getLinkCondivisione());
  const text = encodeURIComponent(this.getMessaggio());
  window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
}

getLinkCondivisione() {
  return `https://sivapp.events/public/apri?eventoId=${this.evento._id}&user=${JSON.parse(localStorage.getItem('user')!)._id}`;
}

getMessaggio() {
  const user = JSON.parse(localStorage.getItem('user')!);
  const base = `🎉 Partecipa a "${this.evento.nomeEvento}" a ${this.evento.citta}! Scopri l'evento e segui ${user.username} su Sivapp!`;
  const link = this.getLinkCondivisione();

  let tagSection = '';
  if (this.tagFacebook || this.tagInstagram) {
    tagSection = '\n🔗 Tag social:';
    if (this.tagFacebook) tagSection += `\n📘 Facebook: ${this.tagFacebook}`;
    if (this.tagInstagram) tagSection += `\n📸 Instagram: ${this.tagInstagram}`;
  }

  return `${base}\n${link}${tagSection}\n\n#Sivapp.events`;
}


async accettaFollow() {
  this.mostraPopupFollow = false;
  this.salvaEventoPopupMostrato();
  await this.seguiOrganizzatore(); // ⚠️ la tua funzione esistente
  window.location.href = `/calendario-artista?organizzatore=${this.evento.organizzatore}`;
}

rifiutaFollow() {
  this.mostraPopupFollow = false;
  this.salvaEventoPopupMostrato(); // solo per non mostrare di nuovo il popup
}

salvaEventoPopupMostrato() {
  const popupMostrati = JSON.parse(localStorage.getItem('popupFollowMostrati') || '[]');
  if (!popupMostrati.includes(this.evento._id)) {
    popupMostrati.push(this.evento._id);
    localStorage.setItem('popupFollowMostrati', JSON.stringify(popupMostrati));
  }
}

vaiAdAdminDettagli() {
  if (!this.eventoId) return;

  this.router.navigate(['/admin-dettagli', this.eventoId]);
}

}
