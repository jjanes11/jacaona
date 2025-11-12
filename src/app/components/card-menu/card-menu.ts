import { 
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { BottomSheetDialog } from '../bottom-sheet-dialog/bottom-sheet-dialog';

export interface MenuItem {
  action: string;
  icon: string;
  text: string;
  danger?: boolean;
}

@Component({
  selector: 'app-card-menu',
  standalone: true,
  imports: [CommonModule, BottomSheetDialog],
  templateUrl: './card-menu.html',
  styleUrl: './card-menu.css',
  host: {
    '(click)': 'onHostClick($event)'
  }
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

  onHostClick(event: Event): void {
    // Only toggle if the click is on the host element itself (the button), 
    // not on child elements like the overlay
    const target = event.target as HTMLElement;
    const currentTarget = event.currentTarget as HTMLElement;
    
    // Check if click is directly on the host or its immediate button child
    if (target === currentTarget || target.closest('.jacaona-menu-overlay') === null) {
      event.stopPropagation();
      this.toggleMenu();
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
