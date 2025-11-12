import { Component, Input, Output, EventEmitter, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Set } from '../../models/workout.models';
import { getSetTypeDisplay, getSetTypeClass } from '../../utils/set-type.utils';

export type SetsTableMode = 'view' | 'edit';

export interface SetChangeEvent {
  setId: string;
  field: 'weight' | 'reps';
  value: number;
}

export interface SetCompleteEvent {
  setId: string;
  completed: boolean;
}

export interface SetTypeClickEvent {
  setId: string;
  event: Event;
}

@Component({
  selector: 'app-sets-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sets-table.html',
  styleUrl: './sets-table.css'
})
export class SetsTableComponent {
  @Input({ required: true }) sets!: Set[];
  @Input() mode: SetsTableMode = 'view';
  @Input() showCompleteColumn = false;
  
  @Output() setChange = new EventEmitter<SetChangeEvent>();
  @Output() setComplete = new EventEmitter<SetCompleteEvent>();
  @Output() setTypeClick = new EventEmitter<SetTypeClickEvent>();

  getSetTypeDisplay = getSetTypeDisplay;
  getSetTypeClass = getSetTypeClass;

  onWeightChange(setId: string, event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value) || 0;
    this.setChange.emit({ setId, field: 'weight', value });
  }

  onRepsChange(setId: string, event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value) || 0;
    this.setChange.emit({ setId, field: 'reps', value });
  }

  onSetTypeClick(setId: string, event: Event): void {
    if (this.mode === 'edit') {
      event.stopPropagation();
        this.setTypeClick.emit({ setId, event });
    }
  }

  onToggleComplete(setId: string): void {
    const set = this.sets.find(s => s.id === setId);
    if (set) {
      this.setComplete.emit({ setId, completed: !set.completed });
    }
  }
}
