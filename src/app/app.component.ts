import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { BadgeNotificationsService } from './badge-notifications.service';  // Aggiungi il servizio qui
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],  // Importazione dei componenti Ionic necessari
})
export class AppComponent implements OnInit {

  constructor(
    private badgeService: BadgeNotificationsService,
    private router: Router
  ) {}

  ngOnInit() {
    // Verifica se l'utente è loggato e avvia il controllo degli eventi
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user && user._id) {

    }
  }
}
