import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { WorkoutService } from '../../services/workout.service';
import { WorkoutTemplate, ExerciseTemplate } from '../../models/workout.models';
import { NavigationService } from '../../services/navigation.service';
import { SetTypeMenuComponent } from '../set-type-menu/set-type-menu';
import { ExerciseCardComponent, ExerciseActionEvent } from '../exercise-card/exercise-card';

@Component({
  selector: 'app-edit-routine',
  standalone: true,
  imports: [CommonModule, FormsModule, SetTypeMenuComponent, ExerciseCardComponent],
  templateUrl: './edit-routine.html',
  styleUrl: './edit-routine.css'
})
export class EditRoutineComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private workoutService = inject(WorkoutService);
  private navigationService = inject(NavigationService);

  // Convert route params to signal
  private templateId = toSignal(
    this.route.params.pipe(map(params => params['id']))
  );

  template = signal<WorkoutTemplate | null>(null);
  currentWorkout = this.workoutService.currentWorkout;
  title: string = '';
  
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
    // Effect that loads template when ID changes
    effect(() => {
      const id = this.templateId();
      if (!id) {
        this.router.navigate(['/workouts']);
        return;
      }

      const foundTemplate = this.workoutService.templates().find(t => t.id === id);
      
      if (!foundTemplate) {
        this.router.navigate(['/workouts']);
        return;
      }

      this.template.set(foundTemplate);
      
      // Check if we already have a draft workout (returning from add-exercise)
      const existingDraft = this.workoutService.currentWorkout();
      
      if (existingDraft) {
        // Restore from existing draft
        this.title = existingDraft.name;
      } else {
        // First time loading, create new draft from template
        this.title = foundTemplate.name;
        
        const draftWorkout = this.workoutService.createWorkoutFromTemplate(foundTemplate);
        this.workoutService.setCurrentWorkout(draftWorkout);
      }
    });
  }

  cancel(): void {
    // Clean up draft workout
    const workout = this.currentWorkout();
    if (workout) {
      this.workoutService.deleteWorkout(workout.id);
      this.workoutService.setCurrentWorkout(null);
    }
    this.router.navigate(['/workouts']);
  }

  update(): void {
    const template = this.template();
    const workout = this.currentWorkout();
    if (template && workout) {
      // Update the workout with the current title
      workout.name = this.title.trim() || 'Untitled Routine';
      this.workoutService.updateWorkout(workout);
      
      // Delete old template
      this.workoutService.deleteTemplate(template.id);
      
      // Save the draft workout as the new template
      this.workoutService.saveAsTemplate(workout);
      
      // Clean up draft workout
      this.workoutService.deleteWorkout(workout.id);
      this.workoutService.setCurrentWorkout(null);
    }
    this.router.navigate(['/workouts']);
  }

  updateSet(exerciseIndex: number, setIndex: number, field: 'reps' | 'weight', value: number): void {
    const workout = this.currentWorkout();
    if (workout) {
      const exercise = workout.exercises[exerciseIndex];
      const set = exercise?.sets[setIndex];
      if (set) {
        const updatedSet = { ...set, [field]: value };
        this.workoutService.updateSet(workout.id, exercise.id, updatedSet);
      }
    }
  }

  addSet(exerciseIndex: number): void {
    const workout = this.currentWorkout();
    if (workout) {
      const exercise = workout.exercises[exerciseIndex];
      if (exercise) {
        this.workoutService.addSetToExercise(workout.id, exercise.id);
      }
    }
  }

  addExercise(): void {
    // Save current title to workout before navigating
    const workout = this.currentWorkout();
    if (workout && this.title.trim()) {
      const updatedWorkout = { ...workout, name: this.title.trim() };
      this.workoutService.updateWorkout(updatedWorkout);
    }
    
    this.navigationService.navigateWithReturnUrl('/add-exercise', '/routine/edit/' + this.template()?.id);
  }

  onExerciseAction(event: ExerciseActionEvent): void {
    const workout = this.currentWorkout();
    if (!workout) return;

    // Find exercise index
    const exerciseIndex = workout.exercises.findIndex(e => e.id === event.exerciseId);
    if (exerciseIndex === -1) return;

    switch (event.type) {
      case 'set-change':
        const setIndex = workout.exercises[exerciseIndex].sets.findIndex(s => s.id === event.data.setId);
        if (setIndex !== -1) {
          this.updateSet(exerciseIndex, setIndex, event.data.field, event.data.value);
        }
        break;
      case 'set-type-click':
        this.openSetTypeMenu(event.exerciseId, event.data.setId, event.data.event);
        break;
      case 'add-set':
        this.addSet(exerciseIndex);
        break;
    }
  }
}
