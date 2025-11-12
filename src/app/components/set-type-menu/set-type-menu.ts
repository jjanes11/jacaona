import { 
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  signal,
  effect,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkoutService } from '../../services/workout.service';
import { BottomSheetDialog } from '../bottom-sheet-dialog/bottom-sheet-dialog';

export type SetType = 'normal' | 'warmup' | 'failure' | 'drop';

@Component({
  selector: 'app-set-type-menu',
  standalone: true,
  imports: [CommonModule, BottomSheetDialog],
  templateUrl: './set-type-menu.html',
  styleUrl: './set-type-menu.css'
})
export class SetTypeMenuComponent {
  @Input({ required: true }) workoutId!: string;
  @Input({ required: true }) exerciseId!: string;
  @Input({ required: true }) setId!: string;
  @Output() closed = new EventEmitter<void>();
  
  private workoutService = inject(WorkoutService);
  protected isOpen = signal(true); // Opens immediately when component is created
  
  // Static to track which menu is open globally (only one menu open at a time)
  private static openMenuId = signal<string | null>(null);

  constructor() {
    const menuId = `${this.exerciseId}-${this.setId}`;
    SetTypeMenuComponent.openMenuId.set(menuId);
    
    // Close this menu if another menu opens
    effect(() => {
      const globalOpenId = SetTypeMenuComponent.openMenuId();
      if (globalOpenId !== menuId && this.isOpen()) {
        this.closeMenu();
      }
    });
  }

  closeMenu(): void {
    this.isOpen.set(false);
    SetTypeMenuComponent.openMenuId.set(null);
    this.closed.emit();
  }

  setSetType(type: SetType): void {
    const workout = this.workoutService.workouts().find(w => w.id === this.workoutId)
      || this.workoutService.currentWorkout();
    
    if (workout) {
      const exercise = workout.exercises.find(e => e.id === this.exerciseId);
      const set = exercise?.sets.find(s => s.id === this.setId);
      
      if (set) {
        const updatedSet = { ...set, type };
        this.workoutService.updateSet(this.workoutId, this.exerciseId, updatedSet);
      }
    }
    
    this.closeMenu();
  }

  removeSet(): void {
    this.workoutService.removeSetFromExercise(this.workoutId, this.exerciseId, this.setId);
    this.closeMenu();
  }
}
