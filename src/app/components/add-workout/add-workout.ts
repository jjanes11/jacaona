import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { WorkoutService } from '../../services/workout.service';
import { Exercise } from '../../models/workout.models';
import { ConfirmationDialog } from '../confirmation-dialog/confirmation-dialog';

@Component({
  selector: 'app-add-workout',
  imports: [CommonModule, ConfirmationDialog],
  templateUrl: './add-workout.html',
  styleUrl: './add-workout.css'
})
export class AddWorkoutComponent implements OnInit {
  private workoutService = inject(WorkoutService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  currentWorkout = this.workoutService.currentWorkout;
  showDiscardDialog = signal(false);
  showMenu = signal(false);
  selectedExerciseId = signal<string | null>(null);

  ngOnInit(): void {
    // Create a new workout if none exists
    if (!this.currentWorkout()) {
      this.workoutService.createWorkout('New Workout');
    }
  }

  goBack(): void {
    this.router.navigate(['/workouts']);
  }

  finishWorkout(): void {
    const workout = this.currentWorkout();
    if (workout && workout.exercises.length > 0) {
      // Navigate to save workout page if there are exercises
      this.router.navigate(['/save-workout']);
    } else {
      // If no exercises, just go back
      this.goBack();
    }
  }

  addExercise(): void {
    this.router.navigate(['/add-exercise']);
  }

  discardWorkout(): void {
    this.showDiscardDialog.set(true);
  }

  onDiscardConfirmed(): void {
    const workout = this.currentWorkout();
    if (workout) {
      // Delete the current workout and clear current workout
      this.workoutService.deleteWorkout(workout.id);
      this.workoutService.setCurrentWorkout(null);
    }
    this.showDiscardDialog.set(false);
    this.goBack();
  }

  onDiscardCancelled(): void {
    this.showDiscardDialog.set(false);
  }

  addSetToExercise(exerciseId: string): void {
    const workout = this.currentWorkout();
    if (workout) {
      this.workoutService.addSetToExercise(workout.id, exerciseId);
    }
  }

  updateSet(exerciseId: string, setId: string, field: 'reps' | 'weight', value: number): void {
    const workout = this.currentWorkout();
    if (workout) {
      const exercise = workout.exercises.find(e => e.id === exerciseId);
      const set = exercise?.sets.find(s => s.id === setId);
      if (set) {
        const updatedSet = { ...set, [field]: value };
        this.workoutService.updateSet(workout.id, exerciseId, updatedSet);
      }
    }
  }

  toggleSetComplete(exerciseId: string, setId: string): void {
    const workout = this.currentWorkout();
    if (workout) {
      const exercise = workout.exercises.find(e => e.id === exerciseId);
      const set = exercise?.sets.find(s => s.id === setId);
      if (set) {
        const updatedSet = { ...set, completed: !set.completed };
        this.workoutService.updateSet(workout.id, exerciseId, updatedSet);
      }
    }
  }

  openMenu(exerciseId: string, event: Event): void {
    event.stopPropagation();
    this.selectedExerciseId.set(exerciseId);
    this.showMenu.set(true);
  }

  closeMenu(): void {
    this.showMenu.set(false);
    this.selectedExerciseId.set(null);
  }

  reorderExercises(): void {
    this.closeMenu();
    // TODO: Implement reorder functionality
    console.log('Reorder exercises');
  }

  replaceExercise(): void {
    const exerciseId = this.selectedExerciseId();
    this.closeMenu();
    
    if (exerciseId) {
      this.router.navigate(['/add-exercise'], {
        state: { 
          returnUrl: '/workout/new',
          replaceExerciseId: exerciseId
        }
      });
    }
  }

  removeExercise(): void {
    const exerciseId = this.selectedExerciseId();
    const workout = this.currentWorkout();
    if (exerciseId && workout) {
      this.workoutService.removeExerciseFromWorkout(workout.id, exerciseId);
    }
    this.closeMenu();
  }
}
