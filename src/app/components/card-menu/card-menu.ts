import { 
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  signal,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MenuItem {
  action: string;
  icon: string;
  text: string;
  danger?: boolean;
}

@Component({
  selector: 'app-card-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card-menu.html',
  styleUrl: './card-menu.css'
})
export class CardMenuComponent {
  @Input({ required: true }) menuId!: string;
  @Input({ required: true }) items: MenuItem[] = [];
  @Output() action = new EventEmitter<string>();
  
  private isOpen = signal(false);
  
  // Static to track which menu is open globally (only one menu open at a time)
  private static openMenuId = signal<string | null>(null);

  constructor() {
    // Close this menu if another menu opens
    effect(() => {
      const globalOpenId = CardMenuComponent.openMenuId();
      if (globalOpenId !== this.menuId && this.isOpen()) {
        this.isOpen.set(false);
      }
    });
  }

  @HostListener('click', ['$event'])
  onMenuButtonClick(event: Event): void {
    event.stopPropagation();
    this.toggleMenu();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    // Close menu if clicking outside
    if (this.isOpen()) {
      this.closeMenu();
    }
  }

  toggleMenu(): void {
    const newState = !this.isOpen();
    this.isOpen.set(newState);
    
    if (newState) {
      CardMenuComponent.openMenuId.set(this.menuId);
    } else {
      if (CardMenuComponent.openMenuId() === this.menuId) {
        CardMenuComponent.openMenuId.set(null);
      }
    }
  }

  closeMenu(): void {
    this.isOpen.set(false);
    if (CardMenuComponent.openMenuId() === this.menuId) {
      CardMenuComponent.openMenuId.set(null);
    }
  }

  isMenuOpen(): boolean {
    return this.isOpen();
  }

  executeAction(actionName: string, event: Event): void {
    event.stopPropagation();
    this.closeMenu();
    this.action.emit(actionName);
  }
}
