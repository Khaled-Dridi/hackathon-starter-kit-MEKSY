import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { MessageModule } from 'primeng/message';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

import { Note, NotesService } from '../../core/notes.service';

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    ButtonModule,
    CardModule,
    InputTextModule,
    TextareaModule,
    MessageModule,
    ConfirmDialogModule
  ],
  providers: [ConfirmationService],
  template: `
    <div class="notes-page">
      <h2>Notes</h2>

      @if (error()) {
        <p-message severity="error" [text]="error()!" styleClass="mb-3" />
      }

      <p-card [header]="formId() ? 'Modifier la note' : 'Nouvelle note'" styleClass="editor">
        <div class="form">
          <input pInputText placeholder="Titre" [(ngModel)]="title" />
          <textarea pTextarea rows="6" placeholder="Contenu..." [(ngModel)]="content"></textarea>
          <div class="actions">
            <p-button [label]="formId() ? 'Mettre à jour' : 'Créer'"
                      icon="pi pi-save" [loading]="saving()" (onClick)="save()" />
            @if (formId()) {
              <p-button label="Annuler" severity="secondary"
                        icon="pi pi-times" (onClick)="reset()" />
            }
          </div>
        </div>
      </p-card>

      <div class="grid">
        @for (n of notes(); track n.id) {
          <p-card [header]="n.title" styleClass="note-card">
            <p class="note-content">{{ n.content || '(vide)' }}</p>
            <small class="note-meta">Mis à jour {{ n.updatedAt | date:'short' }}</small>
            <ng-template pTemplate="footer">
              <p-button icon="pi pi-pencil" severity="secondary" size="small"
                        (onClick)="edit(n)" />
              <p-button icon="pi pi-trash" severity="danger" size="small"
                        (onClick)="confirmDelete(n)" />
            </ng-template>
          </p-card>
        }
        @if (notes().length === 0 && !loading()) {
          <p class="empty">Aucune note. Crée ta première au-dessus.</p>
        }
      </div>

      <p-confirmDialog />
    </div>
  `,
  styles: [`
    .notes-page { max-width: 1000px; margin: 1.5rem auto; padding: 0 1rem; }
    .editor { margin-bottom: 1.5rem; }
    .form { display: flex; flex-direction: column; gap: 0.75rem; }
    .actions { display: flex; gap: 0.5rem; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }
    .note-content { white-space: pre-wrap; min-height: 3rem; margin: 0; }
    .note-meta { color: #6b7280; }
    .empty { color: #6b7280; grid-column: 1 / -1; text-align: center; padding: 2rem; }
  `]
})
export class NotesComponent implements OnInit {
  readonly notes = signal<Note[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly formId = signal<number | null>(null);

  title = '';
  content = '';

  constructor(
    private service: NotesService,
    private confirm: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.service.list().subscribe({
      next: (n) => { this.notes.set(n); this.loading.set(false); },
      error: () => { this.error.set('Erreur de chargement'); this.loading.set(false); }
    });
  }

  reset(): void {
    this.formId.set(null);
    this.title = '';
    this.content = '';
  }

  edit(n: Note): void {
    this.formId.set(n.id);
    this.title = n.title;
    this.content = n.content;
  }

  save(): void {
    if (!this.title.trim()) {
      this.error.set('Le titre est obligatoire');
      return;
    }
    this.error.set(null);
    this.saving.set(true);
    const id = this.formId();
    const obs = id
      ? this.service.update(id, { title: this.title, content: this.content })
      : this.service.create({ title: this.title, content: this.content });
    obs.subscribe({
      next: () => { this.saving.set(false); this.reset(); this.refresh(); },
      error: () => { this.saving.set(false); this.error.set("Erreur d'enregistrement"); }
    });
  }

  confirmDelete(n: Note): void {
    this.confirm.confirm({
      message: `Supprimer "${n.title}" ?`,
      accept: () => {
        this.service.delete(n.id).subscribe({
          next: () => this.refresh(),
          error: () => this.error.set('Erreur de suppression')
        });
      }
    });
  }
}
