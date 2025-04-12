import { TestBed } from '@angular/core/testing';

import { ProvinceCittaService } from './province-citta.service';

describe('ProvinceCittaService', () => {
  let service: ProvinceCittaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProvinceCittaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
