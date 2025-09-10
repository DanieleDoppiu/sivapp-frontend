import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from 'src/environments/environment';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonIcon,
  IonToolbar,
  IonTabBar,
  IonTabButton,
  IonItem,
  IonInput,
  IonLabel,
  IonButton,
  IonText,
  AlertController
} from '@ionic/angular/standalone';

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

  constructor(
    private http: HttpClient,
    private router: Router,
    private alertCtrl: AlertController
  ) {}

  loginUser() {
    const user = {
      email: this.email,
      password: this.password
    };

    this.http.post<any>(`${environment.apiUrl}/api/login`, user).subscribe(
      async (res) => {
        if (!res || !res.user) {
          await this.mostraErrore('Credenziali non valide. Riprova.');
          return;
        }

        localStorage.setItem('user', JSON.stringify(res.user));
        this.router.navigate(['/home']);
      },
      async (error) => {
        console.error('Errore nel login', error);
        await this.mostraErrore('Email o password errate.');
      }
    );
  }

  async mostraErrore(msg: string) {
    const alert = await this.alertCtrl.create({
      header: 'Errore',
      message: msg,
      buttons: ['OK']
    });
    await alert.present();
  }

  goToRegister() {
    setTimeout(() => {
      this.router.navigate(['/register']);
    }, 100);
  }

  async recuperaPassword() {
    const alert = await this.alertCtrl.create({
      header: 'Recupera Password',
      message: 'Contatta l’amministratore o scrivi a sivapp.daniele@yahoo.com per reimpostare la password.',
      buttons: ['OK']
    });
    await alert.present();
  }
}
