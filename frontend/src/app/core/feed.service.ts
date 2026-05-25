import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

/** Set of allowed reactions — stays in sync with the backend's ReactionType enum. */
export type ReactionType = 'LIKE' | 'LOVE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY';

export interface PostComment {
  id: number;
  postId: number;
  authorId: number;
  authorEmail: string;
  body: string;
  createdAt: string;
}

export interface FeedPost {
  id: number;
  actionId: number;
  authorId: number;
  authorEmail: string;
  body: string;
  mediaUrl: string | null;
  /** "image" | "video" | null — hint for the renderer. */
  mediaType: string | null;
  /** Lowercase keys: like, love, haha, wow, sad, angry. */
  reactionCounts: Record<string, number>;
  /** The current user's reaction, or null. */
  myReaction: string | null;
  comments: PostComment[];
  createdAt: string;
  updatedAt: string;
}

export interface PostInput {
  body?: string;
  mediaUrl?: string | null;
  mediaType?: 'image' | 'video' | null;
}

/**
 * REST client for the discussion wall. Mirrors the backend's
 * {@code PostResource} routes:
 *
 * <pre>
 *   GET    /actions/{id}/posts
 *   POST   /actions/{id}/posts
 *   DELETE /posts/{id}
 *   POST   /posts/{id}/comments
 *   DELETE /comments/{id}
 *   PUT    /posts/{id}/my-reaction { reaction: "LOVE" }
 *   DELETE /posts/{id}/my-reaction
 * </pre>
 */
@Injectable({ providedIn: 'root' })
export class FeedService {
  private http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  list(actionId: number): Observable<FeedPost[]> {
    return this.http.get<FeedPost[]>(`${this.api}/actions/${actionId}/posts`);
  }

  createPost(actionId: number, input: PostInput): Observable<FeedPost> {
    return this.http.post<FeedPost>(`${this.api}/actions/${actionId}/posts`, input);
  }

  deletePost(postId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/posts/${postId}`);
  }

  addComment(postId: number, body: string): Observable<PostComment> {
    return this.http.post<PostComment>(`${this.api}/posts/${postId}/comments`, { body });
  }

  deleteComment(commentId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/comments/${commentId}`);
  }

  setReaction(postId: number, reaction: ReactionType): Observable<void> {
    return this.http.put<void>(`${this.api}/posts/${postId}/my-reaction`, { reaction });
  }

  clearReaction(postId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/posts/${postId}/my-reaction`);
  }
}
