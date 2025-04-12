import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AlertController } from '@ionic/angular';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router'; // ✅ Importa Router
import { of } from 'rxjs';
import {
  IonSelect,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonItem,
  IonInput,
  IonLabel,
  IonButton,
  IonSelectOption,
  IonSpinner,
  IonText
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [
    IonText,
    IonSpinner,
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
    IonSelectOption,
    IonSelect
  ]
})
export class RegisterPage {
  provincia: string = ''; // Provincia selezionata
  province: string[] = []; // Lista delle province
  citta: string = ''; // Città selezionata
  cities: string[] = []; // Lista delle città filtrate
  username: string = '';
  email: string = '';
  password: string = '';
  isLoading: boolean = false; // Stato di caricamento

  constructor(
    private http: HttpClient,
    private alertController: AlertController,
    private router: Router // ✅ Inietta il Router
  ) {
    this.loadProvinces();
  }



  // Carica la lista delle province dal backend
  loadProvinces() {
    this.http.get<string[]>(`${environment.apiUrl}/api/province`)
      .pipe(
        catchError((error: any) => {
          console.error('Errore nel caricamento delle province', error);
          return of([]); // Se c'è un errore, restituisce un array vuoto
        })
      )
      .subscribe((data) => {
        this.province = data;
      });
  }

  // Carica le città in base alla provincia selezionata
  loadCities(event: any) {
    this.provincia = event.detail.value;
    console.log("Provincia selezionata:", this.provincia);

    if (this.provincia) {
      this.isLoading = true; // Attiva il loader

      this.http.get<any[]>(`${environment.apiUrl}/api/citta/${this.provincia}`)
        .pipe(
          catchError((error: any) => {
            console.error('Errore nel caricamento delle città', error);
            this.isLoading = false;
            return of([]); // Restituisce un array vuoto in caso di errore
          })
        )
        .subscribe((data) => {
          this.cities = data.map((item) => item.denominazione_ita)
          .sort((a, b) => a.localeCompare(b)); // ✅ Ordina le città in ordine alfabetico

          console.log("Città caricate:", this.cities);
          this.isLoading = false; // Disattiva il loader
        });
    } else {
      this.cities = [];
    }
  }

  updateCitta(event: any) {
    this.citta = event.detail.value;
    console.log("Città selezionata:", this.citta); // ✅ Controlla se il valore viene aggiornato
  }


  // Registra l'utente
  registerUser() {
    if (!this.username?.trim() || !this.email?.trim() || !this.password?.trim() || !this.provincia || !this.citta) {
      this.showErrorAlert('Tutti i campi sono obbligatori!');
      return;
    }

    const user = {
      username: this.username,
      email: this.email,
      password: this.password,
      provincia: this.provincia,
      citta: this.citta
    };

    this.http.post<any>(`${environment.apiUrl}/api/register`, user).subscribe(
      async (res) => {
        if (res && res.user) {
          console.log('Registrazione completata!', res);

          // ✅ Salva i dati corretti nel localStorage
          localStorage.setItem('user', JSON.stringify(res.user));

          // ✅ Mostra messaggio di successo
          const alert = await this.alertController.create({
            header: 'Successo!',
            message: 'Registrazione completata con successo.',
            buttons: ['OK']
          });
          await alert.present();

          // ✅ Vai alla Home
          this.router.navigate(['/home']);
        }
      },
      (error) => {
        console.error('Errore nella registrazione', error);
        this.showErrorAlert(error.error.message || 'Errore sconosciuto');
      }
    );
  }



  // Mostra un alert di errore
  async showErrorAlert(message: string) {
    const alert = await this.alertController.create({
      header: 'Errore!',
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

    // ✅ Metodo per andare alla pagina di Login

    goToLogin() {
  console.log("Navigazione a Login");
  this.router.navigateByUrl('/login', { replaceUrl: true });
}

}
