import { Component, OnInit, ViewChild, ElementRef  } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AlertController, ToastController } from '@ionic/angular';
import { Browser } from '@capacitor/browser';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { environment } from 'src/environments/environment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { initializeApp } from 'firebase/app';
import QRCode from 'qrcode';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonItem, IonLabel, IonButton, IonInput, IonSelect, IonSelectOption, IonSpinner, IonTabButton, IonIcon, IonTabBar, IonAvatar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-modifica-profilo',
  templateUrl: './modifica-profilo.page.html',
  styleUrls: ['./modifica-profilo.page.scss'],
  standalone: true,
  imports: [IonAvatar, IonTabBar, IonIcon, IonTabButton, IonSpinner, RouterModule, CommonModule, FormsModule, IonContent, IonHeader, IonTitle, IonToolbar, IonItem, IonLabel, IonButton, IonInput, IonSelect, IonSelectOption]
})
export class ModificaProfiloPage implements OnInit {
   @ViewChild('qrCanvas', { static: false }) qrCanvas!: ElementRef;
  qrData: string = '';
  user: any = {}; // 🔹 Assicura che sia inizializzato come oggetto vuoto
  userId: string = '';
  username: string = '';
  email: string = '';
  provincia: string = '';
  citta: string = '';
  province: string[] = [];
  cittaList: string[] = [];
  isLoading: boolean = false;
  logoUrl: string = '';
mostraCampoLogo: boolean = false;
previewUrl: string | null = null;
logo: File | null = null;


  constructor(
    private http: HttpClient,
    private alertController: AlertController,
    private toastController: ToastController,
    private router: Router,
    private route: ActivatedRoute
  ) { }


ngOnInit() {
  // 1️⃣ Controlla se l'utente ha eventi associati
  this.controllaEventiUtente();

  // 2️⃣ Recupera solo l'ID utente dal localStorage
  const storedUser = localStorage.getItem('user');
  if (!storedUser) {
    console.error("❌ Nessun utente trovato nel localStorage!");
    return;
  }

  const localUser = JSON.parse(storedUser);
  this.userId = localUser._id;

  // 3️⃣ Carica i dati freschi dal server
  this.http.get<any>(`${environment.apiUrl}/api/utente/${this.userId}`).subscribe({
    next: (userData) => {
      this.username = userData.username;
      this.email = userData.email;
      this.provincia = userData.provincia;
      this.citta = userData.citta;
      this.logoUrl = userData.logo || '';
      this.previewUrl = this.logoUrl; // ✅ Anteprima aggiornata dal server

      // Se c'è già la provincia, carica la lista delle città
      this.loadProvince();
      if (this.provincia) {
        this.loadCitta(this.provincia);
      }
       // 👇 prepara il dato per il QR (es. link profilo artista)
        this.qrData = `https://sivapp.it/artista/${this.userId}`;

        // 👇 genera il QR appena hai caricato i dati
        setTimeout(() => this.generaQr(), 300);

      console.log("✅ Dati utente caricati dal server:", userData);
    },
    error: (err) => {
      console.error("❌ Errore nel recupero dati utente dal server:", err);
    }
  });
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

onLogoSelected(event: any) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = async () => {
    this.previewUrl = reader.result as string;

    const compressedFile = await this.compressImage(reader.result as string, 100); // massimo 100KB
    this.logo = compressedFile;
  };

  reader.readAsDataURL(file);
}


compressImage(dataUrl: string, maxSizeKB: number): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 500;
      const scaleSize = MAX_WIDTH / img.width;

      canvas.width = MAX_WIDTH;
      canvas.height = img.height * scaleSize;

      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

      let quality = 0.8;

      const attemptCompress = () => {
        canvas.toBlob((blob) => {
          if (!blob) return;

          // Se sotto la dimensione massima oppure la qualità è troppo bassa
          if (blob.size <= maxSizeKB * 1024 || quality < 0.3) {
            const compressedFile = new File([blob], 'logo_compressed.jpg', { type: 'image/jpeg' });
            resolve(compressedFile);
          } else {
            quality -= 0.1;
            attemptCompress(); // ricomprime con qualità minore
          }
        }, 'image/jpeg', quality);
      };

      attemptCompress();
    };

    img.src = dataUrl;
  });
}

 async generaQr() {
    if (this.qrCanvas && this.qrData) {
      await QRCode.toCanvas(this.qrCanvas.nativeElement, this.qrData, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
    }
  }

  scaricaQr(canvas: HTMLCanvasElement) {
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `qr-${this.userId}.png`;
    link.click();
  }





openPrivacyPolicy() {
  Browser.open({ url: 'https://sites.google.com/view/sivappprivacypolicy' });
}

controllaEventiUtente() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const username = user?.username;

  if (!username) return;

  this.http.get<any[]>(`${environment.apiUrl}/api/eventi`).subscribe({
    next: (eventi) => {
      const oggi = new Date().toISOString().split('T')[0];

      const eventiUtente = eventi.filter(e =>
        e.organizzatore === username &&
        e.dataEvento >= oggi &&
        e.approvato === 'si'
      );

      this.mostraCampoLogo = eventiUtente.length > 0;
    },
    error: (err) => {
      console.error('Errore nel controllo eventi utente:', err);
    }
  });
}


  // 🔹 Salva le modifiche nel backend
async salvaModifiche() {
  this.isLoading = true;

  try {
    let logoUrlFinale = this.logoUrl;

    // 🔹 Se l'utente ha selezionato un nuovo file logo
    if (this.logo) {
    const firebaseConfig = {
  apiKey: "AIzaSyDguDeKr_Eg0saY21VaasDhKMwXPHjF5Qk",
  authDomain: "sivapp-396dc.firebaseapp.com",
  projectId: "sivapp-396dc",
  storageBucket: "sivapp-396dc.firebasestorage.app",
  messagingSenderId: "1042752944419",
  appId: "1:1042752944419:web:39d69f26bf2ab6afcc3496",
  measurementId: "G-GBLH1LE4J5"
};

      const app = initializeApp(firebaseConfig);
      const storage = getStorage(app);
      const storageRef = ref(storage, `loghi-utenti/${this.userId}_${this.logo.name}`);
      await uploadBytes(storageRef, this.logo);

      logoUrlFinale = await getDownloadURL(storageRef);
    }

    // 🔹 Prepara i dati per il backend
    const userData = {
      username: this.username,
      email: this.email,
      provincia: this.provincia,
      citta: this.citta,
      logo: logoUrlFinale
    };

    this.http.put(`${environment.apiUrl}/api/utente/${this.userId}`, userData).subscribe(
      async (response: any) => {
        this.isLoading = false;

        // ✅ Aggiorna localStorage
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
  } catch (error) {
    this.isLoading = false;
    console.error('❌ Errore durante il caricamento del logo su Firebase:', error);

    const alert = await this.alertController.create({
      header: 'Errore!',
      message: 'Caricamento immagine fallito. Riprova.',
      buttons: ['OK']
    });
    await alert.present();
  }
}


  vaiAPromoArtista() {
     console.log('👉 Navigazione verso /promo-artista'); // DEBUG
  this.router.navigate(['/promo-artista']);
}

}
