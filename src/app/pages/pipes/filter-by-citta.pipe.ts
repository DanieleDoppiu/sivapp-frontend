import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterByCitta'
})
export class FilterByCittaPipe implements PipeTransform {
  transform(items: any[], citta: string): any[] {
    if (!items) return [];
    if (!citta) return items;
    return items.filter(item => item.citta?.toLowerCase().includes(citta.toLowerCase()));
  }
}
