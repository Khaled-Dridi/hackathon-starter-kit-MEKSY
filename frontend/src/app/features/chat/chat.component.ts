import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TextareaModule } from 'primeng/textarea';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { ChatMessage, ChatService, ChatSession } from '../../core/chat.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    ButtonModule,
    CardModule,
    TextareaModule,
    MessageModule,
    ProgressSpinnerModule
  ],
  template: `
    <div class="chat-shell">
      <aside class="sidebar">
        <p-button label="Nouvelle conversation" icon="pi pi-plus"
                  styleClass="w-full mb-3" (onClick)="newSession()" />
        <ul class="sessions">
          @for (s of sessions(); track s.id) {
            <li (click)="select(s.id)" [class.active]="s.id === currentId()">
              <span class="title">{{ s.title }}</span>
              <small>{{ s.updatedAt | date:'short' }}</small>
              <button class="delete" (click)="remove(s, $event)"
                      title="Supprimer">
                <i class="pi pi-times"></i>
              </button>
            </li>
          }
          @if (sessions().length === 0) {
            <li class="empty">Aucune conversation.</li>
          }
        </ul>
      </aside>

      <main class="conversation">
        @if (error()) {
          <p-message severity="error" [text]="error()!" styleClass="m-3" />
        }
        @if (!currentId()) {
          <div class="placeholder">
            Sélectionne ou crée une conversation pour démarrer.
          </div>
        } @else {
          <div class="messages">
            @for (m of messages(); track m.id) {
              <div class="msg" [class.user]="m.role === 'USER'"
                                [class.assistant]="m.role === 'ASSISTANT'">
                <div class="bubble">{{ m.content }}</div>
              </div>
            }
            @if (sending()) {
              <div class="msg assistant">
                <div class="bubble pending">
                  <p-progressSpinner styleClass="spinner" strokeWidth="3" />
                </div>
              </div>
            }
          </div>
          <div class="composer">
            <textarea pTextarea rows="2" placeholder="Écris ton message..."
                      [(ngModel)]="draft" (keydown.enter)="onEnter($event)"></textarea>
            <p-button icon="pi pi-send" [loading]="sending()"
                      [disabled]="!draft.trim()" (onClick)="send()" />
          </div>
        }
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; height: calc(100vh - 56px); }
    .chat-shell {
      display: grid;
      grid-template-columns: 260px 1fr;
      height: 100%;
    }
    .sidebar {
      background: #f9fafb;
      border-right: 1px solid #e5e7eb;
      padding: 1rem;
      overflow-y: auto;
    }
    .sessions { list-style: none; padding: 0; margin: 0; }
    .sessions li {
      position: relative;
      padding: 0.5rem 2rem 0.5rem 0.6rem;
      border-radius: 6px;
      cursor: pointer;
      display: flex; flex-direction: column;
    }
    .sessions li:hover { background: #eef2ff; }
    .sessions li.active { background: #e0e7ff; }
    .sessions li.empty { color: #6b7280; cursor: default; }
    .sessions li .title { font-size: 0.95rem; }
    .sessions li small { color: #6b7280; font-size: 0.75rem; }
    .delete {
      position: absolute; right: 0.4rem; top: 0.4rem;
      background: none; border: none; cursor: pointer; color: #9ca3af;
    }
    .delete:hover { color: #ef4444; }

    .conversation { display: flex; flex-direction: column; min-width: 0; }
    .placeholder { padding: 3rem; text-align: center; color: #6b7280; }
    .messages { flex: 1; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
    .msg { display: flex; }
    .msg.user { justify-content: flex-end; }
    .msg.assistant { justify-content: flex-start; }
    .bubble {
      max-width: 70%;
      padding: 0.6rem 0.9rem;
      border-radius: 12px;
      white-space: pre-wrap;
      line-height: 1.4;
    }
    .msg.user .bubble { background: #4f46e5; color: white; }
    .msg.assistant .bubble { background: #f3f4f6; color: #111827; }
    .bubble.pending { display: flex; align-items: center; }
    ::ng-deep .spinner svg { width: 24px; height: 24px; }
    .composer {
      display: flex; gap: 0.5rem; padding: 1rem;
      border-top: 1px solid #e5e7eb; background: white;
    }
    .composer textarea { flex: 1; }
  `]
})
export class ChatComponent implements OnInit {
  readonly sessions = signal<ChatSession[]>([]);
  readonly messages = signal<ChatMessage[]>([]);
  readonly currentId = signal<number | null>(null);
  readonly sending = signal(false);
  readonly error = signal<string | null>(null);
  draft = '';

  constructor(private chat: ChatService) {}

  ngOnInit(): void {
    this.refreshSessions();
  }

  refreshSessions(): void {
    this.chat.listSessions().subscribe({
      next: (s) => {
        this.sessions.set(s);
        if (s.length && this.currentId() === null) {
          this.select(s[0].id);
        }
      },
      error: () => this.error.set('Erreur de chargement des conversations')
    });
  }

  newSession(): void {
    this.chat.createSession().subscribe({
      next: (s) => {
        this.sessions.update((arr) => [s, ...arr]);
        this.select(s.id);
      },
      error: () => this.error.set('Erreur de création')
    });
  }

  select(id: number): void {
    this.currentId.set(id);
    this.messages.set([]);
    this.chat.listMessages(id).subscribe({
      next: (m) => this.messages.set(m),
      error: () => this.error.set('Erreur de chargement')
    });
  }

  send(): void {
    const id = this.currentId();
    const msg = this.draft.trim();
    if (!id || !msg) return;
    this.error.set(null);
    this.sending.set(true);
    this.messages.update((arr) => [
      ...arr,
      { id: -Date.now(), role: 'USER', content: msg, createdAt: new Date().toISOString() }
    ]);
    this.draft = '';
    this.chat.sendMessage(id, msg).subscribe({
      next: (reply) => {
        this.messages.update((arr) => [...arr, reply]);
        this.sending.set(false);
        this.touchSession(id);
      },
      error: () => {
        this.error.set('Erreur du service AI');
        this.sending.set(false);
      }
    });
  }

  onEnter(ev: Event): void {
    const e = ev as KeyboardEvent;
    if (!e.shiftKey) {
      e.preventDefault();
      this.send();
    }
  }

  remove(s: ChatSession, ev: MouseEvent): void {
    ev.stopPropagation();
    this.chat.deleteSession(s.id).subscribe({
      next: () => {
        this.sessions.update((arr) => arr.filter((x) => x.id !== s.id));
        if (this.currentId() === s.id) {
          this.currentId.set(null);
          this.messages.set([]);
        }
      },
      error: () => this.error.set('Erreur de suppression')
    });
  }

  private touchSession(id: number): void {
    this.sessions.update((arr) =>
      arr.map((s) =>
        s.id === id ? { ...s, updatedAt: new Date().toISOString() } : s
      )
    );
  }
}
