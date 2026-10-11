import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TechStackItem {
  name: string;
  version: string;
  role: string;
  icon: string;
  badgeColor: string;
}

export interface GameSkeletonItem {
  id: string;
  title: string;
  category: string;
  status: 'Ready' | 'In Development' | 'Planned';
  tag: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'Fuzzley Games';

  // Reactive state using Angular Signals
  clickCount = signal(0);
  isReady = signal(true);

  doubleCount = computed(() => this.clickCount() * 2);

  readonly techStack: TechStackItem[] = [
    {
      name: 'Angular',
      version: 'v22',
      role: 'Frontend Framework & Standalone Signals',
      icon: '🅰️',
      badgeColor: '#ec4899',
    },
    {
      name: 'Vite',
      version: 'v8',
      role: 'Next-Gen ESM Dev Server & Bundler',
      icon: '⚡',
      badgeColor: '#8b5cf6',
    },
    {
      name: 'TypeScript',
      version: 'v6',
      role: 'Strict Type-Safe Architecture',
      icon: '📘',
      badgeColor: '#3b82f6',
    },
    {
      name: 'Yarn',
      version: 'v4',
      role: 'Fast Deterministic Package Manager',
      icon: '🧶',
      badgeColor: '#10b981',
    },
  ];

  readonly gameSkeletons: GameSkeletonItem[] = [
    {
      id: 'puzzle-quest',
      title: 'Neon Maze Runner',
      category: 'Arcade / Puzzle',
      status: 'Planned',
      tag: 'WebGL / Canvas',
    },
    {
      id: 'card-battler',
      title: 'Aether Tactics',
      category: 'Turn-Based Strategy',
      status: 'Planned',
      tag: 'Angular State',
    },
    {
      id: 'speed-typer',
      title: 'Hyper Pulse',
      category: 'Action Rhythm',
      status: 'Planned',
      tag: 'Audio API',
    },
  ];

  incrementCounter(): void {
    this.clickCount.update((c) => c + 1);
  }

  resetCounter(): void {
    this.clickCount.set(0);
  }
}
