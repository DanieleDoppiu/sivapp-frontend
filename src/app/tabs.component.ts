import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { BadgeNotificationsService } from './badge-notifications.service'; // Importa il servizio

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [IonicModule, RouterModule, CommonModule],
  template: `
    <ion-tab-bar slot="bottom">
      <ion-tab-button tab="home" [routerLink]="['/home']" [class.selected]="selectedTab === '/home'">
        <ion-icon name="home"></ion-icon>
        <ion-label>Home</ion-label>
      </ion-tab-button>

      <ion-tab-button tab="cerca" [routerLink]="['/cerca']" [class.selected]="selectedTab === '/cerca'">
        <ion-icon name="search"></ion-icon>
        <ion-label>Cerca</ion-label>
      </ion-tab-button>

      <div class="fab-space"></div>

      <ion-tab-button tab="preferiti" [routerLink]="['/preferiti']" [class.selected]="selectedTab === '/preferiti'">
        <ion-icon name="heart"></ion-icon>
        <ion-label>Preferiti</ion-label>
      </ion-tab-button>

      <ion-tab-button tab="eventi-seguiti" [routerLink]="['/eventi-seguiti']" [class.selected]="selectedTab === '/eventi-seguiti'">
  <ion-icon name="people"></ion-icon>
  <ion-label>Following</ion-label>

  <!-- Badge spostato fuori -->
  <div class="custom-badge" *ngIf="badgeCount > 0">{{ badgeCount }}</div>
</ion-tab-button>
    </ion-tab-bar>

    <div class="fab-button" (click)="goToEventi()">
      <ion-icon name="add-circle-outline"></ion-icon>
    </div>
  `,
  styles: [`
    ion-tab-bar {
      --background: white;
      height: 60px;
      box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
      padding: 5px 0;
    }

    ion-tab-button {
      --color: #9e9e9e;
      position: relative;
    }

    .custom-badge {
  position: absolute;
  top: 4px;
  right: 10px;
  background: var(--ion-color-danger);
  color: white;
  border-radius: 50%;
  font-size: 11px;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  font-weight: bold;
}

    ion-tab-button.selected {
      --color: var(--ion-color-sivapp);
    }

    .fab-space {
      flex: 1;
    }

    .fab-button {
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--ion-color-sivapp);
      width: 65px;
      height: 65px;
      border-radius: 50%;
      box-shadow: 0 6px 20px rgba(233, 30, 99, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      transition: transform 0.2s ease-in-out;
    }

    .fab-button ion-icon {
      color: white;
      font-size: 36px;
    }

    .fab-button:active {
      transform: translateX(-50%) scale(0.95);
    }

    .badge {
      position: absolute;
      top: 2px;
      right: 10px;
      background: red;
      color: white;
      border-radius: 50%;
      font-size: 12px;
      padding: 2px 6px;
      z-index: 100;
    }
  `]
})
export class TabsComponent implements OnInit {
  selectedTab: string = '';
  badgeCount: number = 0;

  constructor(
    public badgeService: BadgeNotificationsService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    // Aggiungi un filtro per aggiornare la selezione dei tab
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.selectedTab = event.urlAfterRedirects;
    });
  }

  ngOnInit() {
    // Sottoscrizione al badgeCount$ per ottenere il numero aggiornato del badge
    this.badgeService.badgeCount$.subscribe(count => {
      console.log('Badge count aggiornato:', count);  // Debug: Verifica se il valore arriva correttamente
      this.badgeCount = count;                       // Aggiorna il badgeCount
      this.cdr.detectChanges();                      // Forza il rilevamento dei cambiamenti in Angular
    });
  }

  goToEventi() {
    this.router.navigate(['/eventi']);
  }
}
