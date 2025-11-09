import { Injectable, signal, computed } from '@angular/core';
import { Workout, Exercise, Set, WorkoutTemplate, WorkoutStats } from '../models/workout.models';

@Injectable({
  providedIn: 'root'
})
export class WorkoutService {
  private readonly STORAGE_KEY = 'workout-tracker-data';
  private readonly TEMPLATES_KEY = 'workout-templates';

  // Reactive signals for state management
  private _workouts = signal<Workout[]>([]);
  private _templates = signal<WorkoutTemplate[]>([]);
  private _currentWorkout = signal<Workout | null>(null);

  // Public readonly signals
  readonly workouts = this._workouts.asReadonly();
  readonly templates = this._templates.asReadonly();
  readonly currentWorkout = this._currentWorkout.asReadonly();

  // Computed statistics
  readonly stats = computed<WorkoutStats>(() => {
    const workouts = this._workouts();
    const completed = workouts.filter(w => w.completed);
    
    const totalExercises = completed.reduce((sum, w) => sum + w.exercises.length, 0);
    const totalSets = completed.reduce((sum, w) => 
      sum + w.exercises.reduce((exerciseSum, e) => exerciseSum + e.sets.length, 0), 0
    );
    const totalWeight = completed.reduce((sum, w) =>
      sum + w.exercises.reduce((exerciseSum, e) =>
        exerciseSum + e.sets.reduce((setSum, s) => setSum + (s.weight * s.reps), 0), 0
      ), 0
    );
    const totalDuration = completed.reduce((sum, w) => sum + (w.duration || 0), 0);

    return {
      totalWorkouts: completed.length,
      totalExercises,
      totalSets,
      totalWeight,
      averageDuration: completed.length > 0 ? totalDuration / completed.length : 0
    };
  });

  constructor() {
    this.loadData();
  }

  // Workout Management
  createWorkout(name: string): Workout {
    const now = new Date();
    const workout: Workout = {
      id: this.generateId(),
      name,
      date: now,
      startTime: now,
      exercises: [],
      completed: false
    };

    const workouts = [...this._workouts(), workout];
    this._workouts.set(workouts);
    this._currentWorkout.set(workout);
    this.saveData();
    
    return workout;
  }

  createWorkoutFromTemplate(template: WorkoutTemplate): Workout {
    const workout = this.createWorkout(template.name);
    
    const exercises: Exercise[] = template.exercises.map(exerciseTemplate => ({
      id: this.generateId(),
      name: exerciseTemplate.name,
      sets: exerciseTemplate.sets.map(setTemplate => ({
        id: this.generateId(),
        reps: setTemplate.reps,
        weight: setTemplate.weight,
        completed: false
      }))
    }));

    workout.exercises = exercises;
    this.updateWorkout(workout);
    
    return workout;
  }

  updateWorkout(workout: Workout): void {
    const workouts = this._workouts().map(w => 
      w.id === workout.id ? workout : w
    );
    this._workouts.set(workouts);
    
    if (this._currentWorkout()?.id === workout.id) {
      this._currentWorkout.set(workout);
    }
    
    this.saveData();
  }

  deleteWorkout(id: string): void {
    const workouts = this._workouts().filter(w => w.id !== id);
    this._workouts.set(workouts);
    
    if (this._currentWorkout()?.id === id) {
      this._currentWorkout.set(null);
    }
    
    this.saveData();
  }

  setCurrentWorkout(workout: Workout | null): void {
    this._currentWorkout.set(workout);
  }

  completeWorkout(workoutId: string): void {
    const workouts = this._workouts().map(w => 
      w.id === workoutId 
        ? { ...w, completed: true, duration: this.calculateDuration(w) }
        : w
    );
    this._workouts.set(workouts);
    this.saveData();
  }

  // Exercise Management
  addExerciseToWorkout(workoutId: string, exerciseName: string): Exercise {
    const exercise: Exercise = {
      id: this.generateId(),
      name: exerciseName,
      sets: []
    };

    const workouts = this._workouts().map(w => 
      w.id === workoutId 
        ? { ...w, exercises: [...w.exercises, exercise] }
        : w
    );

    this._workouts.set(workouts);

    // If the current workout is the one we updated, update the signal to the new object
    const updated = workouts.find(w => w.id === workoutId) || null;
    if (updated && this._currentWorkout()?.id === workoutId) {
      this._currentWorkout.set(updated);
    }

    this.saveData();

    return exercise;
  }

  removeExerciseFromWorkout(workoutId: string, exerciseId: string): void {
    const workouts = this._workouts().map(w => 
      w.id === workoutId 
        ? { ...w, exercises: w.exercises.filter(e => e.id !== exerciseId) }
        : w
    );
    
    this._workouts.set(workouts);
    
    // Update current workout if it's the one being modified
    if (this._currentWorkout()?.id === workoutId) {
      const updatedWorkout = workouts.find(w => w.id === workoutId);
      this._currentWorkout.set(updatedWorkout || null);
    }
    
    this.saveData();
  }

  replaceExerciseInWorkout(workoutId: string, exerciseId: string, newExerciseName: string): void {
    const workouts = this._workouts().map(w => {
      if (w.id === workoutId) {
        const exercises = w.exercises.map(e => {
          if (e.id === exerciseId) {
            // Keep the same sets but change the exercise name
            return { ...e, name: newExerciseName };
          }
          return e;
        });
        return { ...w, exercises };
      }
      return w;
    });
    
    this._workouts.set(workouts);
    
    // Update current workout if it's the one being modified
    if (this._currentWorkout()?.id === workoutId) {
      const updatedWorkout = workouts.find(w => w.id === workoutId);
      this._currentWorkout.set(updatedWorkout || null);
    }
    
    this.saveData();
  }

  reorderExercises(workoutId: string, draggedExerciseId: string, targetExerciseId: string): void {
    const workouts = this._workouts().map(w => {
      if (w.id === workoutId) {
        const exercises = [...w.exercises];
        const draggedIndex = exercises.findIndex(e => e.id === draggedExerciseId);
        const targetIndex = exercises.findIndex(e => e.id === targetExerciseId);
        
        if (draggedIndex !== -1 && targetIndex !== -1) {
          // Remove the dragged exercise
          const [draggedExercise] = exercises.splice(draggedIndex, 1);
          // Insert it at the target position
          exercises.splice(targetIndex, 0, draggedExercise);
        }
        
        return { ...w, exercises };
      }
      return w;
    });
    
    this._workouts.set(workouts);
    
    // Update current workout if it's the one being modified
    if (this._currentWorkout()?.id === workoutId) {
      const updatedWorkout = workouts.find(w => w.id === workoutId);
      this._currentWorkout.set(updatedWorkout || null);
    }
    
    this.saveData();
  }

  // Set Management
  addSetToExercise(workoutId: string, exerciseId: string): Set {
    const newSet: Set = {
      id: this.generateId(),
      reps: 0,
      weight: 0,
      completed: false
    };

    const workouts = this._workouts().map(w => 
      w.id === workoutId 
        ? {
            ...w, 
            exercises: w.exercises.map(e => 
              e.id === exerciseId 
                ? { ...e, sets: [...e.sets, newSet] }
                : e
            )
          }
        : w
    );

    this._workouts.set(workouts);

    // Keep currentWorkout in sync if it matches
    const updated = workouts.find(w => w.id === workoutId) || null;
    if (updated && this._currentWorkout()?.id === workoutId) {
      this._currentWorkout.set(updated);
    }

    this.saveData();

    return newSet;
  }

  updateSet(workoutId: string, exerciseId: string, set: Set): void {
    const workouts = this._workouts().map(w => 
      w.id === workoutId 
        ? {
            ...w,
            exercises: w.exercises.map(e => 
              e.id === exerciseId
                ? { 
                    ...e, 
                    sets: e.sets.map(s => s.id === set.id ? set : s)
                  }
                : e
            )
          }
        : w
    );

    this._workouts.set(workouts);

    // Keep currentWorkout in sync if it matches
    const updated = workouts.find(w => w.id === workoutId) || null;
    if (updated && this._currentWorkout()?.id === workoutId) {
      this._currentWorkout.set(updated);
    }

    this.saveData();
  }

  removeSetFromExercise(workoutId: string, exerciseId: string, setId: string): void {
    const workouts = this._workouts().map(w => 
      w.id === workoutId 
        ? {
            ...w,
            exercises: w.exercises.map(e => 
              e.id === exerciseId
                ? { ...e, sets: e.sets.filter(s => s.id !== setId) }
                : e
            )
          }
        : w
    );
    
    this._workouts.set(workouts);
    this.saveData();
  }

  // Template Management
  saveAsTemplate(workout: Workout): WorkoutTemplate {
    const template: WorkoutTemplate = {
      id: this.generateId(),
      name: workout.name,
      exercises: workout.exercises.map(e => ({
        id: this.generateId(),
        name: e.name,
        sets: e.sets.map(s => ({
          reps: s.reps,
          weight: s.weight
        }))
      }))
    };

    const templates = [...this._templates(), template];
    this._templates.set(templates);
    this.saveTemplates();
    
    return template;
  }

  saveTemplateDirectly(template: WorkoutTemplate): void {
    const templates = [...this._templates(), template];
    this._templates.set(templates);
    this.saveTemplates();
  }

  deleteTemplate(id: string): void {
    const templates = this._templates().filter(t => t.id !== id);
    this._templates.set(templates);
    this.saveTemplates();
  }

  reorderTemplates(draggedTemplateId: string, targetTemplateId: string): void {
    const templates = [...this._templates()];
    const draggedIndex = templates.findIndex(t => t.id === draggedTemplateId);
    const targetIndex = templates.findIndex(t => t.id === targetTemplateId);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
      const [draggedTemplate] = templates.splice(draggedIndex, 1);
      templates.splice(targetIndex, 0, draggedTemplate);
    }
    
    this._templates.set(templates);
    this.saveTemplates();
  }

  // Utility Methods
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private calculateDuration(workout: Workout): number {
    const now = new Date();
    const start = new Date(workout.date);
    return Math.round((now.getTime() - start.getTime()) / (1000 * 60)); // minutes
  }

  // Data Persistence
  private saveData(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._workouts()));
    } catch (error) {
      console.error('Failed to save workout data:', error);
    }
  }

  private loadData(): void {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        const workouts = JSON.parse(data) as Workout[];
        // Convert date strings back to Date objects
        workouts.forEach(workout => {
          workout.date = new Date(workout.date);
        });
        this._workouts.set(workouts);
      }
    } catch (error) {
      console.error('Failed to load workout data:', error);
      this._workouts.set([]);
    }

    this.loadTemplates();
  }

  private saveTemplates(): void {
    try {
      localStorage.setItem(this.TEMPLATES_KEY, JSON.stringify(this._templates()));
    } catch (error) {
      console.error('Failed to save templates:', error);
    }
  }

  private loadTemplates(): void {
    try {
      const data = localStorage.getItem(this.TEMPLATES_KEY);
      if (data) {
        const templates = JSON.parse(data) as WorkoutTemplate[];
        this._templates.set(templates);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      this._templates.set([]);
    }
  }
}