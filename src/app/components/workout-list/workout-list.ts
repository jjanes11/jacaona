import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { WorkoutService } from '../../services/workout.service';
import { Workout, WorkoutTemplate } from '../../models/workout.models';
import { NavigationService } from '../../services/navigation.service';
import { DraggableDirective, DragReorderEvent } from '../../directives/draggable.directive';
import { CardMenuComponent, MenuItem } from '../card-menu/card-menu';

@Component({
  selector: 'app-workout-list',
  imports: [CommonModule, DraggableDirective, CardMenuComponent],
  templateUrl: './workout-list.html',
  styleUrl: './workout-list.css'
})
export class WorkoutListComponent {
  private router = inject(Router);
  private workoutService = inject(WorkoutService);
  private navigationService = inject(NavigationService);

  templates = this.workoutService.templates;
  showDeleteDialog = signal(false);
  showWorkoutInProgressDialog = signal(false);
  selectedTemplateId = signal<string | null>(null);
  draggedTemplateId = signal<string | null>(null);
  dragOverTemplateId = signal<string | null>(null);

  menuItems: MenuItem[] = [
    {
      action: 'edit',
      icon: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
      text: 'Edit Routine'
    },
    {
      action: 'delete',
      icon: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
      text: 'Delete Routine',
      danger: true
    }
  ];

  startNewWorkout(): void {
    const currentWorkout = this.workoutService.currentWorkout();
    // Check if there's a workout in progress
    if (currentWorkout && currentWorkout.exercises.length > 0) {
      this.showWorkoutInProgressDialog.set(true);
    } else {
      console.log('Navigating to /workout/new');
      this.router.navigate(['/workout/new']);
    }
  }

  resumeWorkout(): void {
    this.showWorkoutInProgressDialog.set(false);
    this.workoutService.hideWorkoutInProgressDialog();
    this.router.navigate(['/workout/new']);
  }

  confirmStartNewWorkout(): void {
    const currentWorkout = this.workoutService.currentWorkout();
    if (currentWorkout) {
      this.workoutService.deleteWorkout(currentWorkout.id);
      this.workoutService.setCurrentWorkout(null);
    }
    this.workoutService.hideWorkoutInProgressDialog();
    this.showWorkoutInProgressDialog.set(false);
    this.router.navigate(['/workout/new']);
  }

  cancelStartNewWorkout(): void {
    this.showWorkoutInProgressDialog.set(false);
  }

  createNewRoutine(): void {
    this.navigationService.navigateWithReturnUrl('/routine/new', '/workouts');
  }

  startRoutine(template: WorkoutTemplate): void {
    const workout = this.workoutService.createWorkoutFromTemplate(template);
    this.router.navigate(['/workout/new']);
  }

  handleMenuAction(templateId: string, action: string): void {
    this.selectedTemplateId.set(templateId);
    
    switch (action) {
      case 'edit':
        this.router.navigate(['/routine/edit', templateId]);
        break;
      case 'delete':
        this.showDeleteDialog.set(true);
        break;
    }
  }

  confirmDelete(): void {
    const templateId = this.selectedTemplateId();
    if (templateId) {
      this.workoutService.deleteTemplate(templateId);
    }
    this.showDeleteDialog.set(false);
    this.selectedTemplateId.set(null);
  }

  cancelDelete(): void {
    this.showDeleteDialog.set(false);
  }

  onTemplateReorder(event: DragReorderEvent): void {
    this.workoutService.reorderTemplates(event.fromId, event.toId);
  }
}
