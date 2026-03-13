import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stats-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stats-card.component.html',
  styleUrl: './stats-card.component.css'
})
export class StatsCardComponent {
  @Input() label = '';
  @Input() value = '';
  @Input() icon = '';
  @Input() trend = '';
  @Input() trendPositive = true;
  @Input() variant: 'default' | 'success' | 'warning' | 'danger' | 'info' = 'default';
}