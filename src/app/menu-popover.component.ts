import { Component, OnInit } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { IonList, IonItem, IonBadge } from '@ionic/angular/standalone';
import { AlertController } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-menu-popover',
  template: `
    <ion-list class="glass-popover">
      <ion-item button *ngIf="!isGuest" routerLink="/modificaProfilo">Profilo</ion-item>
      <ion-item button routerLink="/user">i miei eventi</ion-item>
      <ion-item button routerLink="/mie-prenotazioni">le mie prenotazioni</ion-item>
      <ion-item button routerLink="/admin" *ngIf="isAdmin" color="sivapp">
        Gestione Sivapp
        <ion-badge slot="end" color="danger" *ngIf="eventiDaApprovare > 0">{{ eventiDaApprovare }}</ion-badge>
      </ion-item>
            <ion-item button (click)="logout()">Logout</ion-item>
            <ion-item button (click)="cancellaAccount()">cancella account</ion-item>
    </ion-list>
  `,
   styles: [`
   ::ng-deep .popover-wrapper {
  background: transparent !important;
  box-shadow: none !important;
}

::ng-deep .popover-content {
  background: transparent !important;
  box-shadow: none !important;
}
    ::ng-deep .popover-viewport {
      background: rgba(57, 63, 56, 0.07) !important;
      box-shadow: none !important;
      backdrop-filter: blur(10px) !important;
      -webkit-backdrop-filter: blur(10px) !important;
      border-radius: 16px !important;
      border: 1px solid rgba(255, 255, 255, 0.18) !important;
      animation: fadeInScale 0.8s ease-in-out;
    }

    @keyframes fadeInScale {
      0% {
        opacity: 0;
        transform: scale(0.9);
      }
      100% {
        opacity: 1;
        transform: scale(1);
      }
    }

    ::ng-deep ion-list {
      background: transparent !important;
    }

    ::ng-deep ion-item {
      --background: transparent !important;
      color: #000;
    }

    ion-badge {
      margin-left: auto;
    }
  `]



  ,
  standalone: true,
  imports: [CommonModule, RouterModule, IonList, IonItem, IonBadge]

})
export class MenuPopoverComponent implements OnInit {
  isAdmin = false;
  eventiDaApprovare = 0;

  constructor(
    private popoverCtrl: PopoverController,
    private alertController: AlertController,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user?.email) {
      this.http.get<any>(`${environment.apiUrl}/api/is-admin/${user.email}`).subscribe(
        (res) => {
          this.isAdmin = res.admin;
          if (this.isAdmin) {
            this.caricaEventiDaApprovare();
          }
        },
        (err) => {
          console.error('Errore durante il controllo admin:', err);
        }
      );
    }
  }

  isGuest = localStorage.getItem('modalitaOspite') === 'true';

  caricaEventiDaApprovare() {
    this.http.get<any[]>(`${environment.apiUrl}/api/eventi-non-approvati`).subscribe(
      (eventi) => {
        this.eventiDaApprovare = eventi.length;
      },
      (err) => {
        console.error('Errore nel recupero eventi da approvare:', err);
      }
    );
  }

  async vaiA(percorso: string) {
    await this.popoverCtrl.dismiss();
    this.router.navigate(['/' + percorso]);
  }

  async logout() {
    localStorage.removeItem('user');
    await this.popoverCtrl.dismiss();
    this.router.navigate(['/login']);
  }

  async cancellaAccount() {
    const user = JSON.parse(localStorage.getItem('user')!);

    if (!user || !user._id) {
      console.error("❌ Nessun ID utente trovato nel localStorage!");
      return;
    }

    const alert = await this.alertController.create({
      header: 'Conferma eliminazione',
      message: 'Sei sicuro di voler eliminare il tuo account? Questa azione è irreversibile.',
      buttons: [
        {
          text: 'Annulla',
          role: 'cancel'
        },
        {
          text: 'Elimina',
          handler: async () => {
            this.http.delete(`${environment.apiUrl}/${user._id}`).subscribe(
              async () => {
                console.log("✅ Account eliminato con successo!");
                localStorage.removeItem('user');
                await this.router.navigate(['/register']);
              },
              (error) => {
                console.error("❌ Errore nell'eliminazione dell'account:", error);
              }
            );
          }
        }
      ]
    });
    await alert.present();
  }


}
