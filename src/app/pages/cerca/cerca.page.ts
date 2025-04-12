
import { TabsComponent } from './../../tabs.component';
import { Component, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonContent, IonSelect, IonSelectOption, IonHeader, IonTitle, IonToolbar, IonItem, IonLabel, IonInput, IonList, IonThumbnail, IonImg, IonText, IonIcon, IonTabButton, IonTabBar, IonTabs } from '@ionic/angular/standalone';

@Component({
  selector: 'app-cerca',
  templateUrl: './cerca.page.html',
  styleUrls: ['./cerca.page.scss'],
  standalone: true,
  imports: [IonTabs, IonTabBar, IonSelectOption, IonSelect, TabsComponent, IonTabButton, CommonModule, FormsModule, RouterModule, IonContent, IonHeader, IonTitle, IonToolbar, IonItem, IonLabel, IonInput, IonList, IonThumbnail, IonImg, IonText, IonIcon]
})
export class CercaPage implements OnInit {
    eventi: any[] = [];
  province: string[] = [];
  cities: string[] = [];
  provincia: string = '';
  citta: string = '';
  data: string = '';
  id: string = '';
  isLoading: boolean = false;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    const user = JSON.parse(localStorage.getItem('user')!);
    if (user) {
      this.provincia = user.provincia; // Provincia preimpostata
      this.data = new Date().toISOString().split('T')[0]; // Data odierna preimpostata
      this.loadProvinces();
      this.loadCities(this.provincia);
      this.caricaEventi();
    }
  }

  loadProvinces() {
    this.http.get<string[]>(`${environment.apiUrl}/api/province`).subscribe(
      (data) => {
        this.province = data.sort();
      },
      (error) => {
        console.error('Errore nel caricamento delle province', error);
      }
    );
  }

  loadCities(provincia: string) {
    this.isLoading = true;
    this.http.get<any[]>(`${environment.apiUrl}/api/citta/${provincia}`).subscribe(
      (data) => {
        this.cities = data.map((item) => item.denominazione_ita).sort();
        this.isLoading = false;
        this.caricaEventi();
      },
      (error) => {
        console.error('Errore nel caricamento delle città', error);
        this.isLoading = false;
      }
    );
  }

  onProvinciaChange(event: any) {
    this.provincia = event.detail.value;
    this.citta = '';
    this.loadCities(this.provincia);
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

  onCittaChange() {
    this.caricaEventi();
  }

  onDataChange(dataSelezionata: string) {
    console.log("Hai selezionato la data:", dataSelezionata);
    this.data = dataSelezionata;
    this.caricaEventi();
  }


  caricaEventi() {
    console.log("Chiamata funzione caricaEventi()");
    console.log("Data corrente:", this.data);

    this.http.get<any[]>(`${environment.apiUrl}/api/eventi`).subscribe(
      (data) => {
        this.eventi = data.filter((evento) =>
          evento.approvato === 'si' &&
          evento.provincia === this.provincia &&
          (this.citta ? evento.citta === this.citta : true) &&
          evento.dataEvento === this.data
        );

        console.log("Eventi filtrati:", this.eventi);
      },
      (error) => {
        console.error("Errore nel caricamento degli eventi", error);
      }
    );
  }

  vaiAlDetail(id: string) {
    console.log("Navigazione verso Detail con ID:", id); // Debug
    this.router.navigate(['/dettagli', id]); // Navigazione
  }




}
