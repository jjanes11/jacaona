import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { WorkoutService } from '../../services/workout.service';
import { Workout, Exercise, Set } from '../../models/workout.models';
import { NavigationService } from '../../services/navigation.service';
import { SetTypeMenuComponent } from '../set-type-menu/set-type-menu';
import { ExerciseCardComponent, ExerciseActionEvent } from '../exercise-card/exercise-card';

@Component({
  selector: 'app-edit-workout',
  imports: [CommonModule, FormsModule, SetTypeMenuComponent, ExerciseCardComponent],
  templateUrl: './edit-workout.html',
  styleUrl: './edit-workout.css',
})
export class EditWorkoutComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private workoutService = inject(WorkoutService);
  private navigationService = inject(NavigationService);

  // Convert route params to signal
  private workoutId = toSignal(
    this.route.params.pipe(map(params => params['id']))
  );

  // Local workout being edited (writable signal)
  workout = signal<Workout | null>(null);
  workoutTitle = signal('');
  workoutDescription = signal('');
  
  // Set Type Menu
  showSetTypeMenu = signal(false);
  selectedSet = signal<{ exerciseId: string; setId: string } | null>(null);

  constructor() {
    // Effect that loads workout when ID changes
    effect(() => {
      const id = this.workoutId();
      if (!id) {
        this.router.navigate(['/home']);
        return;
      }

      const foundWorkout = this.workoutService.workouts().find(w => w.id === id);
      if (!foundWorkout) {
        this.router.navigate(['/home']);
        return;
      }

      // Update local signals
      this.workout.set(foundWorkout);
      this.workoutTitle.set(foundWorkout.name);
      this.workoutDescription.set(foundWorkout.notes || '');

      // Clear currentWorkout if it's set to this workout (from add-exercise navigation)
      const currentWorkout = this.workoutService.currentWorkout();
      if (currentWorkout?.id === id) {
        this.workoutService.setCurrentWorkout(null);
      }
    });
  }
  
  openSetTypeMenu(exerciseId: string, setId: string, event: Event): void {
    event.stopPropagation();
    this.selectedSet.set({ exerciseId, setId });
    this.showSetTypeMenu.set(true);
  }

  closeSetTypeMenu(): void {
    this.showSetTypeMenu.set(false);
    this.selectedSet.set(null);
  }

  // Computed workout stats
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

  workoutDateTime = computed(() => {
    const w = this.workout();
    if (!w?.startTime) return '';
    
    const date = new Date(w.startTime);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  });

  cancel(): void {
    const workout = this.workout();
    if (workout) {
      this.router.navigate(['/workout', workout.id]);
    } else {
      this.router.navigate(['/home']);
    }
  }

  saveWorkout(): void {
    const workout = this.workout();
    if (!workout) return;

    // Update workout with new values
    const updatedWorkout: Workout = {
      ...workout,
      name: this.workoutTitle().trim() || 'Untitled Workout',
      notes: this.workoutDescription().trim()
    };

    this.workoutService.updateWorkout(updatedWorkout);
    this.workout.set(updatedWorkout); // Update local signal
    this.router.navigate(['/workout', workout.id]);
  }

  updateSet(exercise: Exercise, set: Set, field: 'weight' | 'reps', value: number): void {
    const workout = this.workout();
    if (!workout) return;

    const updatedSet = { ...set, [field]: value };
    this.workoutService.updateSet(workout.id, exercise.id, updatedSet);
    
    // Refresh local workout
    const refreshedWorkout = this.workoutService.workouts().find(w => w.id === workout.id);
    if (refreshedWorkout) {
      this.workout.set(refreshedWorkout);
    }
  }

  addSet(exercise: Exercise): void {
    const workout = this.workout();
    if (!workout) return;

    this.workoutService.addSetToExercise(workout.id, exercise.id);
    
    // Refresh local workout
    const refreshedWorkout = this.workoutService.workouts().find(w => w.id === workout.id);
    if (refreshedWorkout) {
      this.workout.set(refreshedWorkout);
    }
  }

  addExercise(): void {
    const workout = this.workout();
    if (!workout) return;
    
    // Temporarily set as currentWorkout so add-exercise can add to it
    this.workoutService.setCurrentWorkout(workout);
    
    this.navigationService.navigateWithReturnUrl('/add-exercise', `/edit-workout/${workout.id}`);
  }

  onExerciseAction(event: ExerciseActionEvent): void {
    const workout = this.workout();
    if (!workout) return;

    const exercise = workout.exercises.find(e => e.id === event.exerciseId);
    if (!exercise) return;

    switch (event.type) {
      case 'set-change':
        const set = exercise.sets.find(s => s.id === event.data.setId);
        if (set) {
          this.updateSet(exercise, set, event.data.field, event.data.value);
        }
        break;
      case 'set-type-click':
        this.openSetTypeMenu(event.exerciseId, event.data.setId, event.data.event);
        break;
      case 'add-set':
        this.addSet(exercise);
        break;
    }
  }
}
