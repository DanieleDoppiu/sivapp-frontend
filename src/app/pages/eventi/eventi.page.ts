import { TabsComponent } from './../../tabs.component';
import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { IonTextarea } from '@ionic/angular/standalone';
import { environment } from 'src/environments/environment';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonItem,
  IonInput,
  IonLabel,
  IonButton,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-eventi',
  templateUrl: './eventi.page.html',
  styleUrls: ['./eventi.page.scss'],
  standalone: true,
  imports: [
    IonTextarea,
    IonIcon,
    IonTabButton,
    IonTabBar,
    TabsComponent,
    RouterModule,
    IonTabs,
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonItem,
    IonInput,
    IonLabel,
    IonButton,
    IonSelect,
    IonSelectOption,
    IonSpinner
  ]
})
export class EventiPage {
  eventoId: string = '';
  nomeEvento: string = '';
  descrizione: string = '';
  organizzatore: string = '';
  provincia: string = '';
  citta: string = '';
  genere: string = '';
  dataEvento: string = '';
  locandina: File | null = null;
  imagePreview: string | null = null;
  province: string[] = [];
  cities: string[] = [];
  isLoading: boolean = false;

  generi = [
    '🎵 Musicale', '🏛️ Culturale','⚽ Sportivo', '🍝 Gastronomico', '💃 Ballo',
    ' 💼 Aziendale', '🤝 Sociale e di Beneficenza', '💻 Tecnologico', '🎨 Artistico e creativo',
    '📚 Educativo', '⛪ Religioso e Spirituale', '🎭 Intrattenimento',
    '🌳 all aperto', '👨‍👩‍👧‍👦 per Bambini e Famiglie', '👗 Moda e Bellezza',
    '✈️ Viaggio e Turismo', '🧘 Salute e Benessere', '🐾Animali', '🎓 Corsi'
  ];

  constructor(
    private http: HttpClient,
    private alertController: AlertController,
    private router: Router
  ) {}

  async ngOnInit() {
    const user = JSON.parse(localStorage.getItem('user')!);
    if (user) {
      this.organizzatore = user.username;
      this.provincia = user.provincia;
      this.loadProvinces();
      this.loadCities(this.provincia);
    }

    // ✅ Mostra messaggio benvenuto la prima volta
    await this.mostraMessaggioBenvenuto();
  }

  async mostraMessaggioBenvenuto() {
  const ultimo = localStorage.getItem('alertCreazioneEventoData');
  const oggi = Date.now();

  if (!ultimo || (oggi - parseInt(ultimo)) > 7 * 24 * 60 * 60 * 1000) {
    const alert = await this.alertController.create({
      header: '🎯 Attenzione!',
      message: `La forza di Sivapp è che tutti vedono il tuo evento: niente algoritmi! 🔥

    Condividi il link del tuo evento:
    📌 Chi lo apre inizierà automaticamente a seguirti
    📅 Vedrà in anteprima tutti i tuoi eventi futuri!

    📣 Usa i social per farlo conoscere!`,
      buttons: ['OK']
    });
    await alert.present();
    localStorage.setItem('alertCreazioneEventoData', oggi.toString());
  }
}

  loadProvinces() {
    this.http.get<string[]>(`${environment.apiUrl}/api/province`).subscribe((data) => {
      this.province = data;
    });
  }

  loadCities(provincia: string) {
    if (provincia) {
      this.http.get<any[]>(`${environment.apiUrl}/api/citta/${provincia}`).subscribe((data) => {
        this.cities = data.map(item => item.denominazione_ita).sort();
      });
    }
  }

  onImageSelected(event: any) {
    const file = event.target.files[0];
    this.locandina = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

 submitEvento() {
  // ✅ Validazione campi obbligatori
  if (!this.nomeEvento || !this.provincia || !this.citta || !this.dataEvento) {
    this.alertController.create({
      header: 'Attenzione!',
      message: 'Compila tutti i campi obbligatori.',
      buttons: ['OK']
    }).then(alert => alert.present());
    return;
  }

  this.isLoading = true;

  const evento = new FormData();
  evento.append('nomeEvento', this.nomeEvento);
  evento.append('descrizione', this.descrizione);
  evento.append('organizzatore', this.organizzatore);
  evento.append('provincia', this.provincia);
  evento.append('citta', this.citta);
  evento.append('genere', this.genere);
  evento.append('dataEvento', this.dataEvento);

  if (this.locandina) {
    evento.append('locandina', this.locandina);
  }

  this.http.post<{ message: string, eventoId: string }>(`${environment.apiUrl}/api/eventi`, evento).subscribe(
    async (response) => {
      if (response && response.eventoId) {
        this.eventoId = response.eventoId;
      } else {
        console.error("❌ ERRORE: eventoId non ricevuto");
      }

      this.isLoading = false;
      this.router.navigate(['/pagamento'], {
        queryParams: {
          eventoId: this.eventoId,
          nomeEvento: this.nomeEvento
        }
      });
    },
    async (error) => {
      this.isLoading = false;
      console.error("❌ Errore nella creazione dell'evento:", error);
      const alert = await this.alertController.create({
        header: 'Errore!',
        message: "Errore nella creazione dell'evento!",
        buttons: ['OK']
      });
      await alert.present();
    }
  );
}

}
