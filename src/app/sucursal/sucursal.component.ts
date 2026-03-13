import { Component } from '@angular/core';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-sucursal',
  imports: [],
  templateUrl: './sucursal.component.html',
  styleUrl: './sucursal.component.css'
})
export class SucursalComponent {
  branchName: string = '';

  constructor(private authService: AuthService) {
    this.branchName = this.authService.getUserBranch();
  }
}
