import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FollowService {
  constructor(private http: HttpClient) {}

  private getLocalSeguiti(): string[] {
    return JSON.parse(localStorage.getItem('seguiti') || '[]');
  }

  private setLocalSeguiti(seguiti: string[]) {
    localStorage.setItem('seguiti', JSON.stringify(seguiti));
  }

  isSeguito(organizzatore: string): boolean {
    return this.getLocalSeguiti().includes(organizzatore);
  }

  async segui(organizzatore: string): Promise<void> {
    const seguiti = this.getLocalSeguiti();
    if (!seguiti.includes(organizzatore)) {
      seguiti.push(organizzatore);
      this.setLocalSeguiti(seguiti);
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user && user._id) {
      try {
        await this.http.post(`${environment.apiUrl}/api/utenti/segui`, {
          followerId: user._id,
          seguitoId: organizzatore
        }).toPromise();
        console.log('✅ Aggiunto anche nel DB');
      } catch (err) {
        console.error('❌ Errore nel salvataggio backend:', err);
      }
    }
  }

  async seguiConIdPersonalizzato(followerId: string, seguitoId: string): Promise<void> {
  const seguiti = this.getLocalSeguiti();
  if (!seguiti.includes(seguitoId)) {
    seguiti.push(seguitoId);
    this.setLocalSeguiti(seguiti);
  }

  try {
    await this.http.post(`${environment.apiUrl}/api/utenti/segui`, {
      followerId,
      seguitoId
    }).toPromise();
    console.log(`✅ Aggiunto follow ${followerId} → ${seguitoId} anche nel DB`);
  } catch (err) {
    console.error('❌ Errore nel salvataggio backend:', err);
  }
}


  async smettiDiSeguire(organizzatore: string): Promise<void> {
    const seguiti = this.getLocalSeguiti().filter(id => id !== organizzatore);
    this.setLocalSeguiti(seguiti);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user && user._id) {
      try {
        await this.http.post(`${environment.apiUrl}/api/utenti/smetti`, {
          followerId: user._id,
          seguitoId: organizzatore
        }).toPromise();
        console.log('✅ Rimosso anche nel DB');
      } catch (err) {
        console.error('❌ Errore nella rimozione backend:', err);
      }
    }
  }

  // Carica seguiti combinando DB e localStorage (se loggato)
  async getSeguiti(): Promise<string[]> {
    const local = this.getLocalSeguiti();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (user && user._id) {
      try {
        const dalDb = await this.http.get<string[]>(`${environment.apiUrl}/api/utenti/seguiti/${user._id}`).toPromise();
        const unione = Array.from(new Set([...local, ...(dalDb || [])]));
        this.setLocalSeguiti(unione); // aggiorna localStorage
        return unione;
      } catch (err) {
        console.error('⚠️ Errore nel caricamento dal DB, uso solo localStorage');
        return local;
      }
    }

    return local;
  }
}
