import { Component, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Input() title = 'Dashboard';
  @Input() subtitle = '';
  @Input() pendingAlerts = 3;
  @Input() sidebarCollapsed = false;

  @Output() openMobile = new EventEmitter<void>();
  @Output() toggleCollapse = new EventEmitter<void>();

  currentTime = '';
  currentDate = '';
  hasScrolled = false;

  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.updateClock();
    this.timer = setInterval(() => this.updateClock(), 10_000);
    this.updateScrollState();
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.updateScrollState();
  }

  private updateScrollState(): void {
    this.hasScrolled = window.scrollY > 0;
  }

  private updateClock(): void {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });
    this.currentDate = now.toLocaleDateString('es-MX', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  }
}