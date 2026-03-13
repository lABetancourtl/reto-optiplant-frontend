import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;
  showPassword: boolean = false;
  
  // Estados de focus para las animaciones
  userNameFocused: boolean = false;
  passwordFocused: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      userName: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';
      
      const request = this.loginForm.value;
      this.authService.login(request).subscribe({
        next: (response) => {
          this.authService.saveToken(response.token);
          this.successMessage = '¡Login exitoso! Redirigiendo...';
          // Redirigir según el rol del usuario
          // this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          console.error('Error en login:', error);
          this.isLoading = false;
          this.errorMessage = error.error?.message || 'Credenciales inválidas. Por favor, intenta de nuevo.';
        },
        complete: () => {
          this.isLoading = false;
        }
      });
    }
  }
}
