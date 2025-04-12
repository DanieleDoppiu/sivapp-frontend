import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ProvinceCittaService {
  private apiUrl = `${environment.apiUrl}/api/province-citta`; // Sostituisci con il tuo endpoint
  private provinceCittaCache$: Observable<any> | null = null;

  constructor(private http: HttpClient) {}

  // Carica tutte le province e città solo una volta
  getProvinceCitta(): Observable<any> {
    if (!this.provinceCittaCache$) {
      this.provinceCittaCache$ = this.http.get<any[]>(this.apiUrl).pipe(
        shareReplay(1) // Mantiene in memoria i dati evitando richieste ripetute
      );
    }
    return this.provinceCittaCache$;
  }

  // Ottiene l'elenco delle province uniche
  getProvince(): Observable<string[]> {
    return this.getProvinceCitta().pipe(
      map((data) => [...new Set(data.map((item: any) => item.sigla_provincia))].sort())
    );
  }

  // Ottiene le città filtrate per provincia
  getCittaByProvincia(provincia: string): Observable<string[]> {
    return this.getProvinceCitta().pipe(
      map((data) =>
        data
          .filter((item: any) => item.sigla_provincia === provincia)
          .map((item: any) => item.denominazione_ita)
          .sort()
      )
    );
  }
}
