import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SeguiService {
  constructor() {}

  seguiUtente(userId: string): boolean {
    let seguiti = JSON.parse(localStorage.getItem('seguiti') || '[]');

    const isSeguito = seguiti.includes(userId);
    if (isSeguito) {
      seguiti = seguiti.filter((id: string) => id !== userId);
    } else {
      seguiti.push(userId);
    }
    localStorage.setItem('seguiti', JSON.stringify(seguiti));
    return !isSeguito; // ritorna nuovo stato (true = seguito, false = non seguito)
  }

  isSeguito(userId: string): boolean {
    const seguiti = JSON.parse(localStorage.getItem('seguiti') || '[]');
    return seguiti.includes(userId);
  }
}
