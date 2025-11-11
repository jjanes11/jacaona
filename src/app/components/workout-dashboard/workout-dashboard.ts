import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { WorkoutService } from '../../services/workout.service';

@Component({
  selector: 'app-workout-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './workout-dashboard.html',
  styleUrl: './workout-dashboard.css'
})
export class WorkoutDashboardComponent {
  private workoutService = inject(WorkoutService);
  private router = inject(Router);

  workouts = this.workoutService.workouts;
  showMenu = signal(false);
  showDeleteDialog = signal(false);
  selectedWorkoutId = signal<string | null>(null);
  
  timeOfDay = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  });

  totalWorkouts = computed(() => {
    const currentWorkoutId = this.workoutService.currentWorkout()?.id;
    const routineDraftId = this.workoutService.routineDraft()?.id;
    return this.workouts().filter(w => w.id !== currentWorkoutId && w.id !== routineDraftId).length;
  });
  
  totalVolume = computed(() => {
    const currentWorkoutId = this.workoutService.currentWorkout()?.id;
    const routineDraftId = this.workoutService.routineDraft()?.id;
    
    return this.workouts()
      .filter(w => w.id !== currentWorkoutId && w.id !== routineDraftId)
      .reduce((total, workout) => {
        return total + (workout.exercises.reduce((exerciseTotal, exercise) => {
          return exerciseTotal + (exercise.sets.reduce((setTotal, set) => {
            return setTotal + (set.weight * set.reps);
          }, 0));
        }, 0));
      }, 0);
  });

  currentStreak = computed(() => {
    const currentWorkoutId = this.workoutService.currentWorkout()?.id;
    const routineDraftId = this.workoutService.routineDraft()?.id;
    const completedWorkouts = this.workouts()
      .filter(w => w.completed && w.id !== currentWorkoutId && w.id !== routineDraftId);
    return completedWorkouts.length > 0 ? Math.min(completedWorkouts.length, 7) : 0;
  });

  avgWorkoutTime = computed(() => {
    const currentWorkoutId = this.workoutService.currentWorkout()?.id;
    const routineDraftId = this.workoutService.routineDraft()?.id;
    const completedWorkouts = this.workouts()
      .filter(w => w.completed && w.duration && w.id !== currentWorkoutId && w.id !== routineDraftId);
    if (completedWorkouts.length === 0) return 0;
    
    const totalTime = completedWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0);
    return Math.round(totalTime / completedWorkouts.length);
  });

  recentWorkouts = computed(() => {
    const currentWorkoutId = this.workoutService.currentWorkout()?.id;
    const routineDraftId = this.workoutService.routineDraft()?.id;
    
    return this.workouts()
      .filter(w => w.id !== currentWorkoutId && w.id !== routineDraftId) // Exclude in-progress and draft workouts
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  });



  formatWorkoutDate(date: Date | string): string {
    const workoutDate = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - workoutDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return workoutDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }

  calculateWorkoutDuration(workout: any): string {
    if (workout.duration) {
      return `${workout.duration} min`;
    }
    
    // Don't show estimated time for workouts without a recorded duration
    return '0 min';
  }

  navigateToWorkout(workoutId: string): void {
    this.router.navigate(['/workout', workoutId]);
  }

  openMenu(workoutId: string, event: Event): void {
    event.stopPropagation();
    this.selectedWorkoutId.set(workoutId);
    this.showMenu.set(true);
  }

  closeMenu(): void {
    this.showMenu.set(false);
  }

  saveAsRoutine(): void {
    const workoutId = this.selectedWorkoutId();
    if (workoutId) {
      this.closeMenu();
      // Navigate to routine/new with workout data in state, don't create a draft yet
      this.router.navigate(['/routine/new'], {
        state: { 
          returnUrl: '/home',
          sourceWorkoutId: workoutId
        }
      });
    }
  }

  editWorkout(): void {
    const workoutId = this.selectedWorkoutId();
    if (workoutId) {
      this.closeMenu();
      this.router.navigate(['/edit-workout', workoutId]);
    }
  }

  deleteWorkout(): void {
    this.closeMenu();
    this.showDeleteDialog.set(true);
  }

  confirmDelete(): void {
    const workoutId = this.selectedWorkoutId();
    if (workoutId) {
      this.workoutService.deleteWorkout(workoutId);
    }
    this.showDeleteDialog.set(false);
    this.selectedWorkoutId.set(null);
  }

  cancelDelete(): void {
    this.showDeleteDialog.set(false);
  }
}
