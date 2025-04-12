import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AlertController, ToastController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { environment } from 'src/environments/environment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonItem, IonLabel, IonButton, IonInput, IonSelect, IonSelectOption, IonSpinner, IonTabButton, IonIcon, IonTabBar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-modifica-profilo',
  templateUrl: './modifica-profilo.page.html',
  styleUrls: ['./modifica-profilo.page.scss'],
  standalone: true,
  imports: [IonTabBar, IonIcon, IonTabButton, IonSpinner, RouterModule, CommonModule, FormsModule, IonContent, IonHeader, IonTitle, IonToolbar, IonItem, IonLabel, IonButton, IonInput, IonSelect, IonSelectOption]
})
export class ModificaProfiloPage implements OnInit {
  user: any = {}; // 🔹 Assicura che sia inizializzato come oggetto vuoto
  userId: string = '';
  username: string = '';
  email: string = '';
  provincia: string = '';
  citta: string = '';
  province: string[] = [];
  cittaList: string[] = [];
  isLoading: boolean = false;

  constructor(
    private http: HttpClient,
    private alertController: AlertController,
    private toastController: ToastController,
    private router: Router
  ) { }


  ngOnInit() {
    const storedUser = localStorage.getItem('user');

    if (!storedUser) {
      console.error("❌ Nessun utente trovato nel localStorage!");
      return;
    }

    const user = JSON.parse(storedUser);
    this.userId = user._id;
    this.username = user.username;
    this.email = user.email;
    this.provincia = user.provincia;
    this.citta = user.citta;

    console.log("✅ Dati utente caricati:", user);

    // Carica le province e le città corrispondenti
    this.loadProvince();
    if (this.provincia) {
      this.loadCitta(this.provincia);
    }
  }





  // 🔹 Recupera i dati dell'utente loggato
  loadUserData() {
    const storedUser = localStorage.getItem('utente');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.userId = user._id;
      this.username = user.username;
      this.email = user.email;
      this.provincia = user.provincia;
      this.citta = user.citta;

      // Carica le città della provincia selezionata
      if (this.provincia) {
        this.loadCitta(this.provincia);
      }
    }
  }

  // 🔹 Carica le province dal database
  loadProvince() {
    this.http.get<string[]>(`${environment.apiUrl}/api/province`).subscribe(
      (data) => this.province = data,
      (error) => console.error('Errore nel caricamento delle province:', error)
    );
  }

  // 🔹 Carica le città quando si cambia provincia
  loadCitta(provincia: string) {
    this.http.get<{ denominazione_ita: string }[]>(`${environment.apiUrl}/api/citta/${provincia}`).subscribe(
      (data) => this.cittaList = data.map(item => item.denominazione_ita),
      (error) => console.error('Errore nel caricamento delle città:', error)
    );
  }

  // 🔹 Salva le modifiche nel backend
  async salvaModifiche() {
    this.isLoading = true;

    const userData = {
      username: this.username,
      email: this.email,
      provincia: this.provincia,
      citta: this.citta
    };

    this.http.put(`${environment.apiUrl}/api/utente/${this.userId}`, userData).subscribe(
      async (response) => {
        this.isLoading = false;

        // ✅ Aggiorniamo il localStorage
        localStorage.setItem('user', JSON.stringify({ ...userData, _id: this.userId }));

        const alert = await this.alertController.create({
          header: 'Successo!',
          message: 'Profilo aggiornato con successo!',
          buttons: ['OK']
        });
        await alert.present();
        this.router.navigate(['/home']);
      },
      async (error) => {
        this.isLoading = false;
        console.error('Errore durante l’aggiornamento del profilo:', error);

        const alert = await this.alertController.create({
          header: 'Errore!',
          message: 'Si è verificato un errore durante l’aggiornamento. Riprova.',
          buttons: ['OK']
        });
        await alert.present();
      }
    );
  }

}
