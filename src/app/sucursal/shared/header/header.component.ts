import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
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

  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.updateClock();
    this.timer = setInterval(() => this.updateClock(), 10_000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
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