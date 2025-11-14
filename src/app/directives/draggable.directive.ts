import {
  Directive,
  Input,
  Output,
  EventEmitter,
  HostListener,
  ElementRef,
  Renderer2,
  inject,
  signal
} from '@angular/core';

export interface DragReorderEvent {
  fromId: string;
  toId: string;
}

@Directive({
  selector: '[appDraggable]',
  standalone: true
})
export class DraggableDirective {
  private _dragItemId!: string;

  @Input({ required: true })
  set dragItemId(value: string) {
    this._dragItemId = value;
    this.renderer.setAttribute(this.el.nativeElement, 'data-drag-item-id', value);
  }

  get dragItemId(): string {
    return this._dragItemId;
  }
  @Input() draggedId = signal<string | null>(null);
  @Input() dragOverId = signal<string | null>(null);
  @Output() dragReorder = new EventEmitter<DragReorderEvent>();

  private el = inject(ElementRef<HTMLElement>);
  private renderer = inject(Renderer2);
  
  private touchStartY = 0;
  private touchStartX = 0;
  private isDragging = false;
  private draggedElement: HTMLElement | null = null;

  // Desktop drag handlers
  @HostListener('dragstart', ['$event'])
  onDragStart(event: DragEvent): void {
    this.draggedId.set(this.dragItemId);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/html', this.dragItemId);
    }
    setTimeout(() => {
      this.renderer.setStyle(this.el.nativeElement, 'opacity', '0.5');
    }, 0);
  }

  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    const draggedId = this.draggedId();
    if (draggedId && draggedId !== this.dragItemId) {
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
      this.dragOverId.set(this.dragItemId);
    }
  }

  @HostListener('dragenter', ['$event'])
  onDragEnter(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    const draggedId = this.draggedId();
    if (draggedId && draggedId !== this.dragItemId) {
      this.dragOverId.set(this.dragItemId);
    }
  }

  @HostListener('dragleave', ['$event'])
  onDragLeave(event: DragEvent): void {
    event.stopPropagation();
    
    const target = event.target as HTMLElement;
    const relatedTarget = event.relatedTarget as HTMLElement;
    
    if (!target.contains(relatedTarget)) {
      if (this.dragOverId() === this.dragItemId) {
        this.dragOverId.set(null);
      }
    }
  }

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    const draggedId = this.draggedId();
    
    if (draggedId && this.dragItemId && draggedId !== this.dragItemId) {
      this.dragReorder.emit({ fromId: draggedId, toId: this.dragItemId });
    }
    
    this.draggedId.set(null);
    this.dragOverId.set(null);
  }

  @HostListener('dragend', ['$event'])
  onDragEnd(event: DragEvent): void {
    this.renderer.setStyle(this.el.nativeElement, 'opacity', '');
    this.draggedId.set(null);
    this.dragOverId.set(null);
  }

  // Touch handlers for mobile
  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    const touch = event.touches[0];
    this.touchStartY = touch.clientY;
    this.touchStartX = touch.clientX;
    this.isDragging = false;
    
    const longPressTimer = setTimeout(() => {
      if (!this.isDragging) {
        this.startTouchDrag(event);
      }
    }, 200);
    
    (event.target as any)._longPressTimer = longPressTimer;
  }

  private startTouchDrag(event: TouchEvent): void {
    this.isDragging = true;
    this.draggedId.set(this.dragItemId);
    
    this.draggedElement = this.el.nativeElement;
    
    if (this.draggedElement) {
      this.renderer.setStyle(this.draggedElement, 'opacity', '0.8');
      this.renderer.setStyle(this.draggedElement, 'transform', 'scale(1.05)');
      this.renderer.setStyle(this.draggedElement, 'zIndex', '1000');
      this.renderer.setStyle(this.draggedElement, 'transition', 'none');
      
      document.body.style.overflow = 'hidden';
    }
  }

  @HostListener('touchmove', ['$event'])
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
    this.renderer.setStyle(this.draggedElement, 'transform', `translateY(${deltaY}px) scale(1.05)`);
    
    this.renderer.setStyle(this.draggedElement, 'pointerEvents', 'none');
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    this.renderer.setStyle(this.draggedElement, 'pointerEvents', '');
    
    const cardBelow = elementBelow?.closest('[appDraggable]') as HTMLElement;
    
    this.dragOverId.set(null);
    
    if (cardBelow && cardBelow !== this.draggedElement) {
      const targetId = cardBelow.dataset['dragItemId'];
      if (targetId && targetId !== this.dragItemId) {
        this.dragOverId.set(targetId);
      }
    }
  }

  @HostListener('touchend', ['$event'])
  @HostListener('touchcancel', ['$event'])
  onTouchEnd(event: TouchEvent): void {
    const target = event.target as any;
    if (target._longPressTimer) {
      clearTimeout(target._longPressTimer);
      target._longPressTimer = null;
    }

    if (!this.isDragging) return;
    
    event.preventDefault();
    
    const draggedId = this.draggedId();
    const targetId = this.dragOverId();
    
    if (draggedId && targetId && draggedId !== targetId) {
      this.dragReorder.emit({ fromId: draggedId, toId: targetId });
      
      setTimeout(() => {
        this.draggedId.set(null);
        this.dragOverId.set(null);
      }, 0);
    }
    
    if (this.draggedElement) {
      this.renderer.setStyle(this.draggedElement, 'opacity', '');
      this.renderer.setStyle(this.draggedElement, 'transform', '');
      this.renderer.setStyle(this.draggedElement, 'zIndex', '');
      this.renderer.setStyle(this.draggedElement, 'transition', '');
      this.renderer.setStyle(this.draggedElement, 'pointerEvents', '');
    }
    
    document.body.style.overflow = '';
    
    this.isDragging = false;
    this.draggedElement = null;
    
    if (!targetId || draggedId === targetId) {
      this.draggedId.set(null);
      this.dragOverId.set(null);
    }
  }
}
