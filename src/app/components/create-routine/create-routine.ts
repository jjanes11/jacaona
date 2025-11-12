import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WorkoutService } from '../../services/workout.service';
import { Workout } from '../../models/workout.models';
import { ConfirmationDialog } from '../confirmation-dialog/confirmation-dialog';
import { NavigationService } from '../../services/navigation.service';
import { SetTypeMenuComponent } from '../set-type-menu/set-type-menu';
import { ExerciseCardComponent, ExerciseActionEvent } from '../exercise-card/exercise-card';

@Component({
  selector: 'app-create-routine',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmationDialog, SetTypeMenuComponent, ExerciseCardComponent],
  templateUrl: './create-routine.html',
  styleUrl: './create-routine.css'
})
export class CreateRoutineComponent implements OnInit {
  private router = inject(Router);
  private workoutService = inject(WorkoutService);
  private navigationService = inject(NavigationService);

  routineDraft = this.workoutService.routineDraft; // Use routineDraft instead of currentWorkout
  title: string = '';
  showCancelDialog = signal(false);
  private returnUrl = signal<string>('/workouts');
  private sourceWorkoutId: string | null = null;
  
  // Set Type Menu
  showSetTypeMenu = signal(false);
  selectedSet = signal<{ exerciseId: string; setId: string } | null>(null);

  openSetTypeMenu(exerciseId: string, setId: string, event: Event): void {
    event.stopPropagation();
    this.selectedSet.set({ exerciseId, setId });
    this.showSetTypeMenu.set(true);
  }

  closeSetTypeMenu(): void {
    this.showSetTypeMenu.set(false);
    this.selectedSet.set(null);
  }

  constructor() {
    // Get return URL and source workout ID from navigation service
    this.returnUrl.set(this.navigationService.getReturnUrl('/workouts'));
    this.sourceWorkoutId = this.navigationService.getSourceWorkoutId();
  }

  ngOnInit(): void {
    // If we have a source workout ID, create a draft from it
    if (this.sourceWorkoutId) {
      this.workoutService.createDraftFromWorkout(this.sourceWorkoutId);
      const workout = this.routineDraft();
      if (workout) {
        this.title = workout.name || '';
      }
    } else if (!this.routineDraft()) {
      // Create a draft workout to hold routine exercises
      const now = new Date();
      const draftWorkout: Workout = {
        id: this.workoutService['generateId'](),
        name: 'New Routine',
        date: now,
        startTime: now,
        exercises: [],
        completed: false
      };
      this.workoutService['_workouts'].set([...this.workoutService['_workouts'](), draftWorkout]);
      this.workoutService['_routineDraft'].set(draftWorkout);
    } else {
      // Restore title from existing workout
      this.title = this.routineDraft()?.name || '';
    }
  }

  cancel(): void {
    this.showCancelDialog.set(true);
  }

  onDiscardConfirmed(): void {
    const workout = this.routineDraft();
    if (workout) {
      this.workoutService.deleteWorkout(workout.id);
      this.workoutService.clearRoutineDraft();
    }
    this.showCancelDialog.set(false);
    this.router.navigate([this.returnUrl()]);
  }

  onDiscardCancelled(): void {
    this.showCancelDialog.set(false);
  }

  save(): void {
    const workout = this.routineDraft();
    if (workout) {
      // Create updated workout with the user's title
      const updatedWorkout = {
        ...workout,
        name: this.title.trim() || 'Untitled Routine'
      };
      
      // Update the workout first
      this.workoutService.updateWorkout(updatedWorkout);
      
      // Save as template for routines
      this.workoutService.saveAsTemplate(updatedWorkout);
      
      // Clean up draft workout
      this.workoutService.deleteWorkout(workout.id);
      this.workoutService.clearRoutineDraft();
    }
    this.router.navigate(['/workouts']);
  }

  addExercise(): void {
    // Save current title to workout before navigating
    const workout = this.routineDraft();
    if (workout && this.title.trim()) {
      const updatedWorkout = { ...workout, name: this.title.trim() };
      this.workoutService.updateWorkout(updatedWorkout);
    }
    
    // Navigate to add-exercise and return to this page after adding
    this.navigationService.navigateWithReturnUrl('/add-exercise', '/routine/new');
  }

  addSetToExercise(exerciseId: string): void {
    const workout = this.routineDraft();
    if (workout) {
      this.workoutService.addSetToExercise(workout.id, exerciseId);
    }
  }

  updateSet(exerciseId: string, setId: string, field: 'reps' | 'weight', value: number): void {
    const workout = this.routineDraft();
    if (workout) {
      const exercise = workout.exercises.find(e => e.id === exerciseId);
      const set = exercise?.sets.find(s => s.id === setId);
      if (set) {
        const updatedSet = { ...set, [field]: value };
        this.workoutService.updateSet(workout.id, exerciseId, updatedSet);
      }
    }
  }

  onExerciseAction(event: ExerciseActionEvent): void {
    switch (event.type) {
      case 'set-change':
        this.updateSet(event.exerciseId, event.data.setId, event.data.field, event.data.value);
        break;
      case 'set-type-click':
        this.openSetTypeMenu(event.exerciseId, event.data.setId, event.data.event);
        break;
      case 'add-set':
        this.addSetToExercise(event.exerciseId);
        break;
    }
  }
}
