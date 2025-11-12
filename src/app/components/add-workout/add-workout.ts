import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { WorkoutService } from '../../services/workout.service';
import { Exercise } from '../../models/workout.models';
import { ConfirmationDialog } from '../confirmation-dialog/confirmation-dialog';
import { createSetTypeMenuMixin } from '../../mixins/set-type-menu.mixin';
import { DraggableDirective, DragReorderEvent } from '../../directives/draggable.directive';
import { CardMenuComponent, MenuItem } from '../card-menu/card-menu';

@Component({
  selector: 'app-add-workout',
  imports: [CommonModule, ConfirmationDialog, DraggableDirective, CardMenuComponent],
  templateUrl: './add-workout.html',
  styleUrl: './add-workout.css'
})
export class AddWorkoutComponent implements OnInit {
  private workoutService = inject(WorkoutService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  currentWorkout = this.workoutService.currentWorkout;
  showDiscardDialog = signal(false);
  selectedExerciseId = signal<string | null>(null);
  draggedExerciseId = signal<string | null>(null);

  menuItems: MenuItem[] = [
    {
      action: 'replace',
      icon: 'M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z',
      text: 'Replace Exercise'
    },
    {
      action: 'remove',
      icon: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
      text: 'Remove Exercise',
      danger: true
    }
  ];
  dragOverExerciseId = signal<string | null>(null);
  
  // Set Type Menu Mixin
  private setTypeMenuMixin = createSetTypeMenuMixin(
    this.workoutService,
    () => this.currentWorkout(),
    () => this.currentWorkout()?.id || null
  );
  
  showSetTypeMenu = this.setTypeMenuMixin.showSetTypeMenu;
  selectedSet = this.setTypeMenuMixin.selectedSet;
  openSetTypeMenu = this.setTypeMenuMixin.openSetTypeMenu.bind(this.setTypeMenuMixin);
  closeSetTypeMenu = this.setTypeMenuMixin.closeSetTypeMenu.bind(this.setTypeMenuMixin);
  setSetType = this.setTypeMenuMixin.setSetType.bind(this.setTypeMenuMixin);
  removeSet = this.setTypeMenuMixin.removeSet.bind(this.setTypeMenuMixin);
  getSetTypeDisplay = this.setTypeMenuMixin.getSetTypeDisplay.bind(this.setTypeMenuMixin);
  getSetTypeClass = this.setTypeMenuMixin.getSetTypeClass.bind(this.setTypeMenuMixin);

  ngOnInit(): void {
    // Create a new workout if none exists
    if (!this.currentWorkout()) {
      this.workoutService.createWorkout('New Workout');
    }
  }

  goBack(): void {
    const workout = this.currentWorkout();
    // Only show dialog if workout has exercises
    if (workout && workout.exercises.length > 0) {
      this.workoutService.showWorkoutInProgressDialogMethod();
      this.router.navigate(['/workouts']);
    } else {
      // No exercises, just navigate back and clean up
      if (workout) {
        this.workoutService.deleteWorkout(workout.id);
        this.workoutService.setCurrentWorkout(null);
      }
      this.router.navigate(['/workouts']);
    }
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

  handleMenuAction(exerciseId: string, action: string): void {
    this.selectedExerciseId.set(exerciseId);
    const workout = this.currentWorkout();
    
    switch (action) {
      case 'replace':
        if (exerciseId) {
          this.router.navigate(['/add-exercise'], {
            state: { 
              returnUrl: '/workout/new',
              replaceExerciseId: exerciseId
            }
          });
        }
        break;
      case 'remove':
        if (exerciseId && workout) {
          this.workoutService.removeExerciseFromWorkout(workout.id, exerciseId);
        }
        break;
    }
  }

  onExerciseReorder(event: DragReorderEvent): void {
    const workout = this.currentWorkout();
    if (workout) {
      this.workoutService.reorderExercises(workout.id, event.fromId, event.toId);
    }
  }
}
