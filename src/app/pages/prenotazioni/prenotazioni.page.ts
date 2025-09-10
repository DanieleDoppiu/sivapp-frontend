import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { environment } from 'src/environments/environment';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-prenotazioni',
  templateUrl: './prenotazioni.page.html',
  styleUrls: ['./prenotazioni.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, RouterModule],
})
export class PrenotazioniPage implements OnInit {
  eventoId = '';
  evento: any = null;
telefono: string = '';

  tipologie: any[] = [];
  tipologiaSelezionata = '';
  tipologiaOggettoSelezionata: any = null;
  orario: string = '';

  orariDisponibili: string[] = [];
  orarioSelezionato = '';
  nomePrenotazione = '';
  numeroPersone: number | null = null;
  notePrenotazione = '';

  prenotazioniTotali: Record<string, number> = {};
  postiDisponibiliCorrenti = 0;

  loading = false;
  toastMessage = '';

  userId: string | null = (() => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return user._id || null;
})();


  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.eventoId = this.route.snapshot.paramMap.get('eventoId')!;
    this.caricaDatiEvento();
  }

  private caricaDatiEvento() {
    this.http
      .get<any>(`${environment.apiUrl}/api/eventi/${this.eventoId}`)
      .subscribe({
        next: (res) => {
          this.evento = res;
          this.caricaTipologiePrenotazione();
          this.caricaPrenotazioniTotali();
        },
        error: (err) => console.error('Errore recupero evento:', err)
      });
  }

  private caricaTipologiePrenotazione() {
    this.http
      .get<any>(`${environment.apiUrl}/api/eventi/${this.eventoId}/prenotazioni-config`)
      .subscribe({
        next: (res) => {
          this.tipologie = res.tipologie || [];
        },
        error: (err) => console.error('Errore config prenotazioni:', err)
      });
  }

  private caricaPrenotazioniTotali() {
    this.http
      .get<Record<string, number>>(
        `${environment.apiUrl}/api/eventi/${this.eventoId}/prenotazioni-totali`
      )
      .subscribe({
        next: (res) => {
          this.prenotazioniTotali = res || {};
        },
        error: (err) => console.error('Errore totali prenotazioni:', err)
      });
  }

  getPostiDisponibili(orario: string): number {
    if (!this.tipologiaSelezionata || !this.prenotazioniTotali || !this.tipologiaOggettoSelezionata) {
      return 0;
    }

    const chiave = `${this.tipologiaSelezionata}`;
    const prenotati = this.prenotazioniTotali[chiave] || 0;
    const capienza = this.tipologiaOggettoSelezionata.postiDisponibili || 0;

    return Math.max(capienza - prenotati, 0);
  }

  filtraOrariDisponibili() {
    this.tipologiaOggettoSelezionata = this.tipologie.find(
      (t) => t.nome === this.tipologiaSelezionata
    );
    this.numeroPersone = null;
    this.orarioSelezionato = '';

    if (!this.tipologiaOggettoSelezionata) {
      this.orariDisponibili = [];
      this.postiDisponibiliCorrenti = 0;
      return;
    }

    this.orariDisponibili = this.generaOrari(
      this.tipologiaOggettoSelezionata.orarioInizio,
      this.tipologiaOggettoSelezionata.orarioFine,
      30
    );

    this.calcolaPostiDisponibili();
  }

  private generaOrari(inizio: string, fine: string, stepMinuti: number): string[] {
    const array: string[] = [];
    const [hStart, mStart] = inizio.split(':').map(Number);
    const [hEnd, mEnd] = fine.split(':').map(Number);

    let cursor = new Date();
    cursor.setHours(hStart, mStart, 0);

    const end = new Date();
    end.setHours(hEnd, mEnd, 0);

    while (cursor <= end) {
      const hh = cursor.getHours().toString().padStart(2, '0');
      const mm = cursor.getMinutes().toString().padStart(2, '0');
      array.push(`${hh}:${mm}`);
      cursor = new Date(cursor.getTime() + stepMinuti * 60000);
    }

    return array;
  }

  private calcolaPostiDisponibili() {
    const totPrenotati = this.prenotazioniTotali[this.tipologiaSelezionata] || 0;
    const capienza = this.tipologiaOggettoSelezionata.postiDisponibili;
    this.postiDisponibiliCorrenti = Math.max(capienza - totPrenotati, 0);

    if (
      this.numeroPersone &&
      this.numeroPersone > this.postiDisponibiliCorrenti
    ) {
      this.numeroPersone = this.postiDisponibiliCorrenti;
    }
  }

  aggiornaPostiDisponibili(orario: string) {
    console.log('Orario selezionato:', orario);
  }

  async mostraToast(messaggio: string, colore: 'success' | 'danger') {
    const toast = await this.toastController.create({
      message: messaggio,
      duration: 2000,
      color: colore,
      position: 'bottom'
    });
    await toast.present();
  }

  inviaPrenotazione() {
  if (
    !this.tipologiaSelezionata ||
    !this.orarioSelezionato ||
    !this.nomePrenotazione ||
    !this.numeroPersone
  ) {
    return;
  }

  this.loading = true;

  const payload = {
    tipologia: this.tipologiaSelezionata,
    orario: this.orarioSelezionato,
    telefono: this.telefono,
    nome: this.nomePrenotazione,
    persone: this.numeroPersone,
    note: this.notePrenotazione,
    userId: this.userId // ✅ deve essere presente
  };

  console.log('📤 Payload inviato alla API:', payload); // 👈 AGGIUNGI QUI IL LOG

  this.http
    .post(
      `${environment.apiUrl}/api/eventi/${this.eventoId}/prenota`,
      payload
    )
    .subscribe(
      () => {
        this.loading = false;
        this.caricaPrenotazioniTotali();
        this.mostraToast('✅ Prenotazione inviata con successo!', 'success');

        this.nomePrenotazione = '';
        this.numeroPersone = 1;
        this.orarioSelezionato = '';
        this.notePrenotazione = '';
        this.tipologiaSelezionata = '';
        this.tipologiaOggettoSelezionata = null;

        setTimeout(() => {
          this.router.navigate(['/dettagli', this.eventoId]);
        }, 2000);
      },
      (err) => {
        this.loading = false;
        console.error('Errore prenotazione:', err);
        this.mostraToast('❌ Errore nella prenotazione', 'danger');
      }
    );
}

}
