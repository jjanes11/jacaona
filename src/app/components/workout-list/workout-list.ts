import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { WorkoutService } from '../../services/workout.service';
import { Workout, WorkoutTemplate } from '../../models/workout.models';

@Component({
  selector: 'app-workout-list',
  imports: [CommonModule],
  templateUrl: './workout-list.html',
  styleUrl: './workout-list.css'
})
export class WorkoutListComponent {
  private router = inject(Router);
  private workoutService = inject(WorkoutService);

  templates = this.workoutService.templates;
  showMenu = signal(false);
  showDeleteDialog = signal(false);
  selectedTemplateId = signal<string | null>(null);
  draggedTemplateId = signal<string | null>(null);
  dragOverTemplateId = signal<string | null>(null);
  
  // Touch drag state
  private touchStartY = 0;
  private touchStartX = 0;
  private isDragging = false;
  private draggedElement: HTMLElement | null = null;
  private placeholder: HTMLElement | null = null;

  startNewWorkout(): void {
    console.log('Navigating to /workout/new');
    this.router.navigate(['/workout/new']);
  }

  createNewRoutine(): void {
    this.router.navigate(['/routine/new']);
  }

  startRoutine(template: WorkoutTemplate): void {
    const workout = this.workoutService.createWorkoutFromTemplate(template);
    this.router.navigate(['/workout/new']);
  }

  openMenu(templateId: string, event: Event): void {
    event.stopPropagation();
    this.selectedTemplateId.set(templateId);
    this.showMenu.set(true);
  }

  closeMenu(): void {
    this.showMenu.set(false);
  }

  editRoutine(): void {
    const templateId = this.selectedTemplateId();
    if (templateId) {
      this.closeMenu();
      this.router.navigate(['/routine/edit', templateId]);
    }
  }

  deleteRoutine(): void {
    this.closeMenu();
    this.showDeleteDialog.set(true);
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

  // Drag and Drop handlers for desktop
  onDragStart(templateId: string, event: DragEvent): void {
    this.draggedTemplateId.set(templateId);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/html', templateId);
    }
    setTimeout(() => {
      const draggedCard = event.target as HTMLElement;
      draggedCard.style.opacity = '0.5';
    }, 0);
  }

  onDragOver(templateId: string, event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    const draggedId = this.draggedTemplateId();
    if (draggedId && draggedId !== templateId) {
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
      this.dragOverTemplateId.set(templateId);
    }
  }

  onDragEnter(templateId: string, event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    const draggedId = this.draggedTemplateId();
    if (draggedId && draggedId !== templateId) {
      this.dragOverTemplateId.set(templateId);
    }
  }

  onDragLeave(templateId: string, event: DragEvent): void {
    event.stopPropagation();
    
    const target = event.target as HTMLElement;
    const relatedTarget = event.relatedTarget as HTMLElement;
    
    if (!target.contains(relatedTarget)) {
      if (this.dragOverTemplateId() === templateId) {
        this.dragOverTemplateId.set(null);
      }
    }
  }

  onDrop(targetTemplateId: string, event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    const draggedId = this.draggedTemplateId();
    
    if (draggedId && targetTemplateId && draggedId !== targetTemplateId) {
      this.workoutService.reorderTemplates(draggedId, targetTemplateId);
    }
    
    this.draggedTemplateId.set(null);
    this.dragOverTemplateId.set(null);
  }

  onDragEnd(event: DragEvent): void {
    const draggedCard = event.target as HTMLElement;
    draggedCard.style.opacity = '';
    this.draggedTemplateId.set(null);
    this.dragOverTemplateId.set(null);
  }

  // Touch handlers for mobile
  onTouchStart(templateId: string, event: TouchEvent): void {
    const touch = event.touches[0];
    this.touchStartY = touch.clientY;
    this.touchStartX = touch.clientX;
    this.isDragging = false;
    
    const longPressTimer = setTimeout(() => {
      if (!this.isDragging) {
        this.startTouchDrag(templateId, event);
      }
    }, 200);
    
    (event.target as any)._longPressTimer = longPressTimer;
  }

  private startTouchDrag(templateId: string, event: TouchEvent): void {
    this.isDragging = true;
    this.draggedTemplateId.set(templateId);
    
    const target = event.target as HTMLElement;
    this.draggedElement = target.closest('.jacaona-routine-template-card') as HTMLElement;
    
    if (this.draggedElement) {
      this.draggedElement.style.opacity = '0.8';
      this.draggedElement.style.transform = 'scale(1.05)';
      this.draggedElement.style.zIndex = '1000';
      this.draggedElement.style.transition = 'none';
      
      document.body.style.overflow = 'hidden';
    }
  }

  onTouchMove(event: TouchEvent): void {
    const target = event.target as any;
    if (target._longPressTimer && !this.isDragging) {
      const touch = event.touches[0];
      const moveDistance = Math.sqrt(
        Math.pow(touch.clientX - this.touchStartX, 2) +
        Math.pow(touch.clientY - this.touchStartY, 2)
      );
      
      if (moveDistance > 10) {
        clearTimeout(target._longPressTimer);
        target._longPressTimer = null;
      }
      return;
    }

    if (!this.isDragging || !this.draggedElement) return;
    
    event.preventDefault();
    const touch = event.touches[0];
    
    const deltaY = touch.clientY - this.touchStartY;
    this.draggedElement.style.transform = `translateY(${deltaY}px) scale(1.05)`;
    
    this.draggedElement.style.pointerEvents = 'none';
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    this.draggedElement.style.pointerEvents = '';
    
    const cardBelow = elementBelow?.closest('.jacaona-routine-template-card') as HTMLElement;
    
    this.dragOverTemplateId.set(null);
    
    if (cardBelow && cardBelow !== this.draggedElement) {
      const targetId = this.getTemplateIdFromElement(cardBelow);
      if (targetId && targetId !== this.draggedTemplateId()) {
        this.dragOverTemplateId.set(targetId);
      }
    }
  }

  onTouchEnd(event: TouchEvent): void {
    const target = event.target as any;
    if (target._longPressTimer) {
      clearTimeout(target._longPressTimer);
      target._longPressTimer = null;
    }

    if (!this.isDragging) return;
    
    event.preventDefault();
    
    const draggedId = this.draggedTemplateId();
    const targetId = this.dragOverTemplateId();
    
    if (draggedId && targetId && draggedId !== targetId) {
      this.workoutService.reorderTemplates(draggedId, targetId);
      
      setTimeout(() => {
        this.draggedTemplateId.set(null);
        this.dragOverTemplateId.set(null);
      }, 0);
    }
    
    if (this.draggedElement) {
      this.draggedElement.style.opacity = '';
      this.draggedElement.style.transform = '';
      this.draggedElement.style.zIndex = '';
      this.draggedElement.style.transition = '';
      this.draggedElement.style.pointerEvents = '';
    }
    
    if (this.placeholder && this.placeholder.parentElement) {
      this.placeholder.parentElement.removeChild(this.placeholder);
    }
    
    document.body.style.overflow = '';
    
    this.isDragging = false;
    this.draggedElement = null;
    this.placeholder = null;
    
    if (!targetId || draggedId === targetId) {
      this.draggedTemplateId.set(null);
      this.dragOverTemplateId.set(null);
    }
  }

  private getTemplateIdFromElement(element: HTMLElement): string | null {
    const container = element.closest('.jacaona-saved-routines');
    if (!container) return null;
    
    const cards = Array.from(container.querySelectorAll('.jacaona-routine-template-card'));
    const index = cards.indexOf(element);
    
    if (index === -1) return null;
    
    const allTemplates = this.templates();
    return allTemplates[index]?.id || null;
  }
}
