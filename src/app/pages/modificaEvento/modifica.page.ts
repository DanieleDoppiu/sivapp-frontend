import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from 'src/environments/environment';
import { FormsModule } from '@angular/forms';
import { IonTextarea, IonTabBar, IonIcon } from '@ionic/angular/standalone';
import { RouterModule } from '@angular/router';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonItem, IonLabel, IonInput, IonButton, IonText,
  IonThumbnail, IonImg, IonSelect, IonSelectOption
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-modifica',
  templateUrl: './modifica.page.html',
  styleUrls: ['./modifica.page.scss'],
  standalone: true,
  imports: [IonIcon, IonTabBar,
    CommonModule, FormsModule, RouterModule, IonContent,
    IonHeader, IonTitle, IonToolbar, IonItem, IonLabel,
    IonInput, IonButton, IonText, IonThumbnail, IonImg,
    IonSelect, IonSelectOption, IonTextarea
  ]
})
export class ModificaEventoPage implements OnInit {
  evento: any = {};
  editMode: any = {};
  nuovaLocandina: File | null = null;
  imagePreview: string | null = null;
  province: string[] = [];
  cities: string[] = [];

  constructor(private route: ActivatedRoute, private http: HttpClient, private router: Router) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    console.log("ID Evento:", id);

    this.http.get(`${environment.apiUrl}/api/eventi/${id}`).subscribe(
      (data) => {
        this.evento = data;
        this.imagePreview = this.evento.locandina ? `${environment.apiUrl}${this.evento.locandina}` : null;
        console.log("Evento Caricato:", this.evento);

        // Carica province e città per la modifica
        this.loadProvinces();
        this.loadCities(this.evento.provincia);
      },
      (error) => {
        console.error("Errore nel caricamento dell'evento", error);
      }
    );
  }



  // ✅ Cambia modalità di modifica di un campo
  toggleEdit(campo: string) {
    this.editMode[campo] = !this.editMode[campo];
  }

  // ✅ Selezione immagine con anteprima
  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.nuovaLocandina = file;

      // Generiamo un'anteprima
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  // ✅ Carica la lista delle province
  loadProvinces() {
    this.http.get<string[]>(`${environment.apiUrl}/api/province`).subscribe(
      (data) => { this.province = data; },
      (error) => { console.error("Errore nel caricamento delle province", error); }
    );
  }

  getImageUrl(locandina: string): string {
    // Se manca l'URL dell'immagine, mostra l'immagine di default
    if (!locandina) return 'assets/default-image.jpg';

    // Se l'URL è già un URL di Firebase, lo restituiamo direttamente
    if (locandina.startsWith('https://firebasestorage.googleapis.com')) {
      return locandina; // Restituisce l'URL completo di Firebase
    }

    // Se non è un URL Firebase, trattalo come un percorso relativo (come facevamo prima)
    return `${environment.apiUrl}${locandina.startsWith('/') ? '' : '/'}${locandina}`;
  }


  // ✅ Carica le città in base alla provincia selezionata
  loadCities(provincia: string) {
    this.http.get<any[]>(`${environment.apiUrl}/api/citta/${provincia}`).subscribe(
      (data) => { this.cities = data.map(item => item.denominazione_ita).sort(); },
      (error) => { console.error("Errore nel caricamento delle città", error); }
    );
  }

  // ✅ Aggiorna l'evento con le modifiche e torna alla Home
  aggiornaEvento() {
    const formData = new FormData();
    formData.append('nomeEvento', this.evento.nomeEvento);
    formData.append('descrizione', this.evento.descrizione);
    formData.append('dataEvento', this.evento.dataEvento);
    formData.append('provincia', this.evento.provincia);
    formData.append('citta', this.evento.citta);
    formData.append('genere', this.evento.genere || '');

    if (this.nuovaLocandina) {
      formData.append('locandina', this.nuovaLocandina);
    }

    this.http.put(`${environment.apiUrl}/api/eventi/${this.evento._id}`, formData)
      .subscribe(
        (response) => {
          console.log("Evento aggiornato con successo!", response);
          alert("Evento aggiornato!");
          this.router.navigate(['/home']); // 🔥 Torna alla Home
        },
        (error) => {
          console.error("Errore nell'aggiornamento dell'evento", error);
          alert("Errore nell'aggiornamento!");
        }
      );
  }

  // ✅ L'input della descrizione si adatta al testo inserito
  adattaAltezza(event: any) {
    const input = event.target;
    input.style.height = 'auto';
    input.style.height = input.scrollHeight + 'px';
  }
}
