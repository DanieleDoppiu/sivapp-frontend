import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule, NgIf, NgForOf } from '@angular/common';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { environment } from 'src/environments/environment';
import { ActivatedRoute, Router } from '@angular/router';
import html2canvas from 'html2canvas';
import { Share } from '@capacitor/share';
import { FileOpener } from '@awesome-cordova-plugins/file-opener/ngx';
import jsPDF from 'jspdf';
import { IonContent, IonButton, IonIcon, ToastController, IonText } from '@ionic/angular/standalone';
import { FollowService } from 'src/app/services/follow.service';

@Component({
  selector: 'app-promo-artista',
  templateUrl: './promo-artista.page.html',
  styleUrls: ['./promo-artista.page.scss'],
  standalone: true,
  imports: [IonText, IonContent, IonButton, IonIcon, CommonModule, NgIf, NgForOf]
})
export class PromoArtistaPage implements OnInit {
  artistaNome = '';
  artistaCitta = '';
  eventi: any[] = [];
  qrCodeUrl = '';
  qrLink = '';
  mostraBanner: boolean = false;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private followService: FollowService,
    private toastController: ToastController,
    private fileOpener: FileOpener
  ) {}

 ngOnInit(): void {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!user || !user.username || !user._id) return;

  this.artistaNome = user.username;
  this.artistaCitta = user.citta;

this.qrLink = `https://sivapp.events/calendario-artista?organizzatore=${encodeURIComponent(user.username)}`;


  this.qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(this.qrLink)}`;

  this.caricaEventi(user.username);

  // 👉 Sposta la logica di follow al metodo separato e richiamalo qui
  this.checkAutoFollow();
}

async checkAutoFollow() {
  const artistaDaSeguire = this.route.snapshot.queryParamMap.get('segui');
  if (!artistaDaSeguire) return;

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const ospiteId = user._id || this.getOspiteId(); // usa _id se loggato

  try {
    await this.followService.seguiConIdPersonalizzato(ospiteId, artistaDaSeguire);

    const toast = await this.toastController.create({
      message: '🎉 Stai seguendo questo artista!',
      duration: 2000,
      color: 'success'
    });
    toast.present();

    setTimeout(() => {
      this.router.navigate(['/eventi-seguiti']);
    }, 1000);
  } catch (err) {
    console.error('❌ Errore durante il follow automatico:', err);
  }
}



  getOspiteId(): string {
    let ospiteId = localStorage.getItem('ospite_id');
    if (!ospiteId) {
      ospiteId = 'ospite_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('ospite_id', ospiteId);
    }
    return ospiteId;
  }

  caricaEventi(organizzatore: string) {
    this.http.get<any[]>(`${environment.apiUrl}/api/eventi`).subscribe(eventi => {
      const oggi = new Date().toISOString().split('T')[0];
      this.eventi = eventi.filter(e =>
        e.organizzatore === organizzatore &&
        e.dataEvento >= oggi &&
        e.approvato === 'si'
      ).sort((a, b) => a.dataEvento.localeCompare(b.dataEvento));
    });
  }

async salvaImmagine() {
  try {
    const elemento = document.getElementById('sezioneStampabile');
    if (!elemento) {
      console.error("Elemento non trovato");
      return;
    }
    const canvas = await html2canvas(elemento, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const base64Data = imgData.split(',')[1];

    await Filesystem.writeFile({
      path: 'test.png',
      data: base64Data,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });

    console.log("Salvataggio immagine riuscito!");
  } catch (err) {
    console.error("Errore:", err);
  }
}

async sharePageLink() {
  const encodedLink = `https://sivapp.events/calendario-artista?organizzatore=${encodeURIComponent(this.artistaNome)}`;

  try {
    await Share.share({
      title: 'Guarda la pagina artista',
      text: `Ecco il link alla pagina dell’artista:\n${encodedLink}`,
      url: encodedLink,
      dialogTitle: 'Condividi link pagina artista'
    });
  } catch (error) {
    console.error('Errore nella condivisione del link', error);
  }
}





  chiudi() {
    this.router.navigate(['/home']);
  }
}
