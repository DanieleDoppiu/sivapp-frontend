import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonModal,
  IonCheckbox,
  IonItem,
  IonLabel,
  IonList
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-success',
  templateUrl: './success.page.html',
  styleUrls: ['./success.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonHeader, FormsModule, IonTitle, IonToolbar, IonButton, IonModal, IonCheckbox, IonItem, IonLabel, IonList]
})
export class SuccessPage implements OnInit {
  eventoId: string = '';
  showOptionsModal = false;
  opzioni = [
    { label: 'Attiva prenotazioni', key: 'prenotazioni', selected: true }
    // In futuro: { label: 'Attiva biglietteria', key: 'biglietti', selected: false }
  ];

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.eventoId = params['eventoId'] || '';
      console.log('✅ Pagamento completato per evento:', this.eventoId);
      this.showOptionsModal = true; // Apri subito il popup
    });
  }

  vaiAllaConfigurazione() {
    if (this.opzioni.find(o => o.key === 'prenotazioni' && o.selected)) {
      this.router.navigate([`/configura-prenotazioni/${this.eventoId}`]);
    } else {
      this.goHome();
    }
  }

  prenotazioneChecked: boolean = false;

apriConfigurazione() {
  if (this.prenotazioneChecked) {
    this.router.navigate(['/configura-prenotazioni', this.eventoId]);
  } else {
    this.router.navigate(['/home']);
  }
}


  goHome() {
    this.router.navigate(['/home']);
  }
}
