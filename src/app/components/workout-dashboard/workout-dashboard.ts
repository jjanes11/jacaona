import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { WorkoutService } from '../../services/workout.service';
import { CardMenuComponent, MenuItem } from '../card-menu/card-menu';
import { ConfirmationDialog } from '../confirmation-dialog/confirmation-dialog';

@Component({
  selector: 'app-workout-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, CardMenuComponent, ConfirmationDialog],
  templateUrl: './workout-dashboard.html',
  styleUrl: './workout-dashboard.css'
})
export class WorkoutDashboardComponent {
  private workoutService = inject(WorkoutService);
  private router = inject(Router);

  workouts = this.workoutService.workouts;
  showDeleteDialog = signal(false);
  selectedWorkoutId = signal<string | null>(null);

  menuItems: MenuItem[] = [
    {
      action: 'save-routine',
      icon: 'M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z',
      text: 'Save as Routine'
    },
    {
      action: 'edit',
      icon: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
      text: 'Edit Workout'
    },
    {
      action: 'delete',
      icon: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
      text: 'Delete Workout',
      danger: true
    }
  ];
  
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

  handleMenuAction(workoutId: string, action: string): void {
    this.selectedWorkoutId.set(workoutId);
    
    switch (action) {
      case 'save-routine':
        this.saveAsRoutine();
        break;
      case 'edit':
        this.editWorkout();
        break;
      case 'delete':
        this.deleteWorkout();
        break;
    }
  }

  private saveAsRoutine(): void {
    const workoutId = this.selectedWorkoutId();
    if (workoutId) {
      // Navigate to routine/new with workout data in state, don't create a draft yet
      this.router.navigate(['/routine/new'], {
        state: { 
          returnUrl: '/home',
          sourceWorkoutId: workoutId
        }
      });
    }
  }

  private editWorkout(): void {
    const workoutId = this.selectedWorkoutId();
    if (workoutId) {
      this.router.navigate(['/edit-workout', workoutId]);
    }
  }

  private deleteWorkout(): void {
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
