import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { environment } from 'src/environments/environment';
import { ActivatedRoute, Router } from '@angular/router';

interface TipologiaPosto {
  tipoPosto: 'tavolo' | 'posto';
  nome: string;
  postiDisponibili: number;
  orarioInizio: string;
  orarioFine: string;
  infoAggiuntive?: string;
}

@Component({
  standalone: true,
  selector: 'app-prenotazione-config',
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './prenotazione-config.page.html',
  styleUrls: ['./prenotazione-config.page.scss']
})
export class PrenotazioneConfigPage {
  eventoId = '';
  tipologie: TipologiaPosto[] = [];

constructor(private http: HttpClient, private router: Router, private route: ActivatedRoute) {}


  ngOnInit() {
    this.eventoId = this.route.snapshot.paramMap.get('eventoId') || '';
  }

  aggiungiTipologia() {
    this.tipologie.push({
      tipoPosto: 'tavolo',
      nome: '',
      postiDisponibili: 0,
      orarioInizio: '',
      orarioFine: '',
      infoAggiuntive: ''
    });
  }

  rimuoviTipologia(index: number) {
    this.tipologie.splice(index, 1);
  }

  salvaConfigurazione() {
  if (!this.tipologie.length) {
    alert('Aggiungi almeno una tipologia');
    return;
  }

  for (const t of this.tipologie) {
    if (!t.nome || !t.postiDisponibili || !t.orarioInizio || !t.orarioFine) {
      alert('Compila tutti i campi obbligatori per ogni tipologia');
      return;
    }
  }

  const payload = {
    tipologie: this.tipologie
  };

  this.http.post(`${environment.apiUrl}/api/eventi/${this.eventoId}/prenotazioni-config`, payload)
    .subscribe({
      next: (res) => {
        console.log('✅ Configurazione salvata:', res);
        alert('Configurazione salvata!');
        this.router.navigate(['/dettagli', this.eventoId]);
      },
      error: (err) => {
        console.error('❌ Errore nel salvataggio:', err);
        alert('Errore nel salvataggio configurazione');
      }
    });
}

}
