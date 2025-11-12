import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { WorkoutService } from '../../services/workout.service';
import { ConfirmationDialog } from '../confirmation-dialog/confirmation-dialog';

@Component({
  selector: 'app-workout-detail',
  imports: [CommonModule, ConfirmationDialog],
  templateUrl: './workout-detail.html',
  styleUrl: './workout-detail.css',
})
export class WorkoutDetailComponent {
  private workoutService = inject(WorkoutService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Convert route params to signal
  private workoutId = toSignal(
    this.route.params.pipe(map(params => params['id']))
  );

  // Computed signal that automatically updates when workoutId changes
  workout = computed(() => {
    const id = this.workoutId();
    if (!id) {
      this.router.navigate(['/home']);
      return null;
    }
    
    const foundWorkout = this.workoutService.workouts().find(w => w.id === id);
    if (!foundWorkout) {
      this.router.navigate(['/home']);
      return null;
    }
    
    return foundWorkout;
  });

  showMenu = signal(false);
  showDeleteDialog = signal(false);

  workoutStats = computed(() => {
    const w = this.workout();
    if (!w) return { duration: '0m', volume: 0, sets: 0 };

    const totalSets = w.exercises.reduce((sum, e) => sum + e.sets.length, 0);
    const totalVolume = w.exercises.reduce((sum, e) => 
      sum + e.sets.reduce((setSum, s) => setSum + (s.weight * s.reps), 0), 0);
    
    let durationStr = '0m';
    if (w.startTime && w.endTime) {
      const durationMinutes = Math.floor((new Date(w.endTime).getTime() - new Date(w.startTime).getTime()) / 1000 / 60);
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      if (hours > 0) {
        durationStr = `${hours}h ${minutes}m`;
      } else {
        durationStr = `${minutes}m`;
      }
    }

    return {
      duration: durationStr,
      volume: totalVolume,
      sets: totalSets
    };
  });

  goBack(): void {
    this.router.navigate(['/home']);
  }

  openMenu(): void {
    this.showMenu.set(true);
  }

  closeMenu(): void {
    this.showMenu.set(false);
  }

  saveAsRoutine(): void {
    const workout = this.workout();
    if (workout) {
      this.closeMenu();
      // Navigate to routine/new with workout data in state, don't create a draft yet
      this.router.navigate(['/routine/new'], {
        state: { 
          returnUrl: `/workout/${workout.id}`,
          sourceWorkoutId: workout.id
        }
      });
    }
  }

  editWorkout(): void {
    const workout = this.workout();
    if (!workout) return;
    
    this.closeMenu();
    this.router.navigate(['/edit-workout', workout.id]);
  }

  deleteWorkout(): void {
    this.closeMenu();
    this.showDeleteDialog.set(true);
  }

  confirmDelete(): void {
    const workout = this.workout();
    if (!workout) return;

    this.workoutService.deleteWorkout(workout.id);
    this.showDeleteDialog.set(false);
    this.router.navigate(['/home']);
  }

  cancelDelete(): void {
    this.showDeleteDialog.set(false);
  }

  getSetTypeDisplay(type?: 'normal' | 'warmup' | 'failure' | 'drop'): string {
    if (!type || type === 'normal') return '';
    if (type === 'warmup') return 'W';
    if (type === 'failure') return 'F';
    if (type === 'drop') return 'D';
    return '';
  }

  getSetTypeClass(type?: 'normal' | 'warmup' | 'failure' | 'drop'): string {
    if (!type || type === 'normal') return '';
    return `jacaona-set-type-${type}`;
  }
}
