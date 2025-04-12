import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { BehaviorSubject, interval, catchError, of } from 'rxjs';
import { Vibration } from '@awesome-cordova-plugins/vibration/ngx';

@Injectable({
  providedIn: 'root'
})
export class BadgeNotificationsService {
  private badgeCountSubject = new BehaviorSubject<number>(0);
  public badgeCount$ = this.badgeCountSubject.asObservable();

  private userId: string = '';
  private ultimoCount = 0;

  constructor(
    private http: HttpClient,
    private toastController: ToastController,
    private vibration: Vibration
  ) {}

  avviaControlloEventi(userId: string) {
    this.userId = userId;
    console.log('📡 Avvio controllo badge notifiche con userId:', userId);

    this.aggiornaBadge();

    interval(30000).subscribe(() => {
      this.aggiornaBadge();
    });
  }

  private aggiornaBadge() {
    const utentiSeguiti = JSON.parse(localStorage.getItem('seguiti') || '[]');

    if (!this.userId || utentiSeguiti.length === 0) {
      console.warn('⚠️ Nessun utente loggato o lista "seguiti" vuota.');
      return;
    }

    const url = `${environment.apiUrl}/api/eventi-seguiti`;
    const body = { userId: this.userId, utentiSeguiti };

    console.log('📬 Controllo eventi seguiti da:', url);
    console.log('📦 Dati inviati:', body);

    this.http.post<any[]>(url, body)
      .pipe(
        catchError(err => {
          console.error('❌ Errore nel recupero eventi seguiti:', err);
          return of([]);
        })
      )
      .subscribe((eventi: any[]) => {
        const count = eventi.length;
        console.log(`🔔 Eventi seguiti trovati: ${count}`);

        if (count > this.ultimoCount) {
          this.vibraTelefono();
          this.mostraToast(`Hai ${count} eventi di persone che segui!`);
        }

        this.ultimoCount = count;
        this.badgeCountSubject.next(count);
      });
  }

  private async mostraToast(messaggio: string) {
    const toast = await this.toastController.create({
      message: messaggio,
      duration: 3000,
      color: 'dark',
      position: 'top'
    });
    toast.present();
  }

  private vibraTelefono() {
    try {
      this.vibration.vibrate(1000); // vibra per 1 secondo
    } catch (err) {
      console.warn('⚠️ Vibrazione non disponibile:', err);
    }
  }
}
