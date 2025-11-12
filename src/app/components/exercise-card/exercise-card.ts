import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Exercise } from '../../models/workout.models';
import { SetsTableComponent, SetChangeEvent, SetCompleteEvent, SetTypeClickEvent } from '../sets-table/sets-table';
import { CardMenuComponent, MenuItem } from '../card-menu/card-menu';

export type ExerciseCardMode = 'view' | 'edit';

export interface ExerciseActionEvent {
  exerciseId: string;
  type: 'menu' | 'set-change' | 'set-complete' | 'set-type-click' | 'add-set';
  data?: any;
}

@Component({
  selector: 'app-exercise-card',
  standalone: true,
  imports: [CommonModule, SetsTableComponent, CardMenuComponent],
  templateUrl: './exercise-card.html',
  styleUrl: './exercise-card.css'
})
export class ExerciseCardComponent {
  @Input({ required: true }) exercise!: Exercise;
  @Input() mode: ExerciseCardMode = 'view';
  @Input() showMenu = false;
  @Input() showAddSetButton = false;
  @Input() showCompleteColumn = false;
  @Input() menuItems: MenuItem[] = [];
  
  @Output() action = new EventEmitter<ExerciseActionEvent>();

  onMenuAction(actionType: string): void {
    this.action.emit({
      exerciseId: this.exercise.id,
      type: 'menu',
      data: actionType
    });
  }

  onSetChange(event: SetChangeEvent): void {
    this.action.emit({
      exerciseId: this.exercise.id,
      type: 'set-change',
      data: event
    });
  }

  onSetComplete(event: SetCompleteEvent): void {
    this.action.emit({
      exerciseId: this.exercise.id,
      type: 'set-complete',
      data: event
    });
  }

  onSetTypeClick(event: SetTypeClickEvent): void {
    this.action.emit({
      exerciseId: this.exercise.id,
      type: 'set-type-click',
      data: event
    });
  }

  onAddSet(): void {
    this.action.emit({
      exerciseId: this.exercise.id,
      type: 'add-set'
    });
  }
}
