import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from 'src/environments/environment';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http'; // ✅ Importa HttpClient
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonIcon, IonToolbar, IonTabBar, IonTabButton, IonItem, IonInput, IonLabel, IonButton, IonText } from '@ionic/angular/standalone';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonItem,
    IonInput,
    IonLabel,
    IonIcon,
    IonButton,
    IonTabBar,
    RouterModule,
    IonTabButton,
    IonText
  ]
})
export class LoginPage {
  email: string = '';
  password: string = '';

  constructor(private http: HttpClient, private router: Router) {} // ✅ Aggiunto HttpClient



  loginUser() {
    const user = {
      email: this.email,
      password: this.password
    };

    this.http.post<any>(`${environment.apiUrl}/api/login`, user).subscribe(
      (res) => {
        console.log('Risposta dal server:', res);

        if (!res || !res.user) {
          console.error('Errore: nessun utente restituito dal server');
          return;
        }

        // ✅ Salva TUTTI i dati dell'utente correttamente nel localStorage
        localStorage.setItem('user', JSON.stringify(res.user));

        // ✅ Vai alla Home
        this.router.navigate(['/home']);
      },
      (error) => {
        console.error('Errore nel login', error);
      }
    );
  }



  goToRegister() {
    console.log("Navigazione a Register");
    setTimeout(() => {
      this.router.navigate(['/register']);
    }, 100); // Aspetta 100 millisecondi prima di navigare
  }





}


