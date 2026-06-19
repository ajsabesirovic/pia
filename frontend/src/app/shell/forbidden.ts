import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forbidden',
  imports: [RouterLink],
  template: `
    <div class="card" style="text-align:center">
      <h1>403</h1>
      <p class="muted">Nemate dozvolu za pristup ovoj stranici.</p>
      <a class="btn btn-primary" routerLink="/narudzbenice">Nazad na narudžbenice</a>
    </div>
  `,
})
export class ForbiddenComponent {}
