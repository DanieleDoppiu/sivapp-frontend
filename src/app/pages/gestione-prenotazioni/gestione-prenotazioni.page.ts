import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastController } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { IonicModule, AlertController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-gestione-prenotazioni',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, RouterModule],
  templateUrl: './gestione-prenotazioni.page.html',
  styleUrls: ['./gestione-prenotazioni.page.scss']
})
export class GestionePrenotazioniPage implements OnInit {
  eventoId: string = '';
  configId: string = '';
  tipologie: any[] = [];
  prenotazioni: any[] = [];
  eventoPassato: boolean = false;
  mostraForm = false;

  tipologiaTemp = {
    nome: '',
    postiDisponibili: 0,
    orarioInizio: '',
    orarioFine: '',
    infoAggiuntive: '',
    tempoLimiteModifica: 60
  };

  constructor(
    private http: HttpClient,
    private toastController: ToastController,
    private route: ActivatedRoute,
    private alertCtrl: AlertController,
    private router: Router
  ) {}

  ngOnInit() {
    this.eventoId = this.route.snapshot.paramMap.get('eventoId')!;
    this.verificaDataEvento();
  }

  async toast(messaggio: string) {
  const toast = await this.toastController.create({
    message: messaggio,
    duration: 2000,
    color: 'success'
  });
  toast.present();
}

 async verificaDataEvento() {
  try {
    const evento = await firstValueFrom(
      this.http.get<any>(`${environment.apiUrl}/api/eventi/${this.eventoId}`)
    );
    const oggi = new Date();
    const dataEvento = new Date(evento.dataEvento);

    if (dataEvento < oggi) {
      this.eventoPassato = true; // puoi usarlo per mostrare un badge "Evento passato", se vuoi
    }

    this.caricaTipologie();
    this.caricaPrenotazioni();
  } catch (err) {
    console.error('Errore durante la verifica della data evento:', err);
  }
}


  async caricaTipologie() {
    try {
      const config = await firstValueFrom(
        this.http.get<any>(`${environment.apiUrl}/api/eventi/${this.eventoId}/prenotazioni-config`)
      );
      this.configId = config._id;

      const totaliPrenotati = await firstValueFrom(
        this.http.get<Record<string, number>>(
          `${environment.apiUrl}/api/eventi/${this.eventoId}/prenotazioni-totali`
        )
      );

      this.tipologie = (config.tipologie || []).map((tipo: any) => {
        const prenotati = totaliPrenotati[tipo.nome] || 0;
        return {
          id: tipo._id,
          nome: tipo.nome,
          posti: tipo.postiDisponibili,
          orario: `${tipo.orarioInizio} - ${tipo.orarioFine}`,
          infoAggiuntive: tipo.infoAggiuntive || '',
          tempoLimiteModifica: tipo.tempoLimiteModifica ?? 60,
          prenotati,
          rimasti: tipo.postiDisponibili - prenotati,
          configId: config._id
        };
      });
    } catch (err) {
      console.error('Errore caricamento tipologie:', err);
      this.tipologie = [];
    }
  }

  async caricaPrenotazioni() {
    try {
      this.prenotazioni = await firstValueFrom(
        this.http.get<any[]>(`${environment.apiUrl}/api/eventi/${this.eventoId}/prenotazioni-gestore`)
      );
    } catch (err) {
      console.error('Errore durante caricamento prenotazioni:', err);
      this.prenotazioni = [];
    }
  }

  getPrenotazioniPerTipo(nomeTipo: string) {
    return this.prenotazioni.filter(p => p.tipologia === nomeTipo);
  }

  approvaModifica(pren: any) {
    this.http
      .put(
        `${environment.apiUrl}/api/prenotazioni/${pren._id}/approva-modifica`,
        {
          orario: pren.modificaProposta.orario,
          persone: pren.modificaProposta.persone,
          note: pren.modificaProposta.note
        }
      )
      .subscribe({
        next: () => {
          pren.orario = pren.modificaProposta.orario;
          pren.persone = pren.modificaProposta.persone;
          pren.note = pren.modificaProposta.note;
          pren.stato = 'attiva';
          delete pren.modificaProposta;
        },
        error: err => console.error('Errore approvazione modifica:', err)
      });
  }

  approvaCancellazione(pren: any) {
    this.http
      .delete(`${environment.apiUrl}/api/prenotazioni/${pren._id}`)
      .subscribe({
        next: () => {
          this.prenotazioni = this.prenotazioni.filter(p => p._id !== pren._id);
        },
        error: err => console.error('Errore approvazione cancellazione:', err)
      });
  }

  async salvaTavolo(pren: any) {
    try {
      await firstValueFrom(
        this.http.put(`${environment.apiUrl}/api/prenotazioni/${pren._id}/tavolo`, {
          tavoloAssegnato: pren.tavoloAssegnato
        })
      );
    } catch (err) {
      console.error('Errore nel salvataggio tavolo:', err);
    }
  }

  salvaTipologia() {
    const nuova = { ...this.tipologiaTemp };
    this.http
      .patch(
        `${environment.apiUrl}/api/prenotazioni-configurate/${this.configId}/aggiungi-tipologie`,
        { tipologie: [nuova] }
      )
      .subscribe({
        next: () => {
          this.resetForm();
          this.caricaTipologie();
        },
        error: err => console.error('Errore salvataggio tipologia:', err)
      });
  }


  resetForm() {
    this.tipologiaTemp = {
      nome: '',
      postiDisponibili: 0,
      orarioInizio: '',
      orarioFine: '',
      infoAggiuntive: '',
      tempoLimiteModifica: 60
    };
    this.mostraForm = false;
  }

  eliminaTipologia(tipologiaId: string) {
    this.http
      .put(
        `${environment.apiUrl}/api/prenotazioni-configurate/${this.configId}/rimuovi-tipologia/${tipologiaId}`,
        {}
      )
      .subscribe({
        next: () => this.caricaTipologie(),
        error: err => console.error('Errore eliminazione tipologia:', err)
      });
  }

  async modificaTipologia(tipologia: any) {
    const alert = await this.alertCtrl.create({
      header: 'Modifica Tipologia',
      inputs: [
        { name: 'nome', type: 'text', value: tipologia.nome },
        { name: 'postiDisponibili', type: 'number', value: tipologia.posti },
        { name: 'orarioInizio', type: 'time', value: tipologia.orario?.split(' - ')[0] || '' },
        { name: 'orarioFine', type: 'time', value: tipologia.orario?.split(' - ')[1] || '' },
        { name: 'infoAggiuntive', type: 'textarea', value: tipologia.infoAggiuntive },
        { name: 'tempoLimiteModifica', type: 'number', value: tipologia.tempoLimiteModifica || 60 }
      ],
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Salva',
          handler: async (data) => {
            const updated = {
              nome: data.nome,
              postiDisponibili: Number(data.postiDisponibili),
              orarioInizio: data.orarioInizio,
              orarioFine: data.orarioFine,
              infoAggiuntive: data.infoAggiuntive,
              tempoLimiteModifica: Number(data.tempoLimiteModifica)
            };
            await this.aggiornaTipologia(tipologia.id, updated);
          }
        }
      ]
    });
    await alert.present();
  }

  async aggiornaTipologia(tipologiaId: string, dati: any) {
    try {
      await firstValueFrom(
        this.http.put(
          `${environment.apiUrl}/api/prenotazioni-configurate/${this.configId}/modifica-tipologia/${tipologiaId}`,
          dati
        )
      );
      this.caricaTipologie();
      const alert = await this.alertCtrl.create({
        header: 'Successo',
        message: 'Tipologia modificata correttamente.',
        buttons: ['OK']
      });
      await alert.present();
    } catch (err) {
      console.error('Errore durante la modifica tipologia:', err);
      const alert = await this.alertCtrl.create({
        header: 'Errore',
        message: 'Impossibile modificare la tipologia. Riprova.',
        buttons: ['OK']
      });
      await alert.present();
    }
  }

  exportToExcel(): void {
  const datiPersonalizzati = this.prenotazioni.map(pren => ({
    TipologiaTavolo: pren.tipologia,
    Nome: pren.nome,
    Persone: pren.persone,
    Orario: pren.orario,
    Note: pren.note || '', // opzionale
    Tavolo: pren.tavoloAssegnato || '' // opzionale
  }));

  const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datiPersonalizzati);
  const workbook: XLSX.WorkBook = {
    Sheets: { Prenotazioni: worksheet },
    SheetNames: ['Prenotazioni']
  };
  XLSX.writeFile(workbook, 'prenotazioni.xlsx');
}


  prenotazioneInModifica: any = null;

avviaModificaGestore(prenotazione: any) {
  // Clona l'oggetto per evitare effetti collaterali
  this.prenotazioneInModifica = { ...prenotazione };
}

salvaModificaGestore() {
  const prenotazioneId = this.prenotazioneInModifica._id;
  // Chiamata API per aggiornare la prenotazione
  this.http.put(`${environment.apiUrl}/api/prenotazioni/${prenotazioneId}`, {
    orario: this.prenotazioneInModifica.orario,
    persone: this.prenotazioneInModifica.persone,
    note: this.prenotazioneInModifica.note,
    stato: 'attiva' // in caso volessi forzare a "attiva"
  }).subscribe(() => {
    this.toast('Prenotazione aggiornata con successo');
    this.caricaPrenotazioni(); // ricarica prenotazioni
    this.prenotazioneInModifica = null;
  });
}

async confermaCancellazioneDiretta(p: any) {
  const conferma = confirm(`Vuoi davvero cancellare la prenotazione di ${p.nome}?`);
  if (!conferma) return;

  try {
    await firstValueFrom(
      this.http.delete(`${environment.apiUrl}/api/prenotazioni/${p._id}`, {

      })
    );
    this.toast('Prenotazione cancellata');
    this.caricaPrenotazioni();
  } catch (err) {
    console.error('Errore nella cancellazione:', err);
    this.toast('Errore durante la cancellazione');
  }
}




}
