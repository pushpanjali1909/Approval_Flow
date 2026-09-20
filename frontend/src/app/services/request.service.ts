import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  ApprovalRequest,
  PaginatedResponse,
  CreateRequestDto,
  UpdateRequestDto
} from '../models/request.model';

@Injectable({
  providedIn: 'root'
})
export class RequestService {
  private readonly baseUrl = `${environment.apiUrl}/requests`;

  constructor(private http: HttpClient) {}

  /**
   * Fetch paginated list of approval requests with search and status filters.
   */
  getRequests(
    search?: string,
    status?: string,
    page: number = 1,
    limit: number = 10
  ): Observable<PaginatedResponse<ApprovalRequest>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (search && search.trim().length > 0) {
      params = params.set('search', search.trim());
    }

    if (status && status !== 'All') {
      params = params.set('status', status.trim());
    }

    return this.http.get<PaginatedResponse<ApprovalRequest>>(this.baseUrl, { params }).pipe(
      catchError(err => this.handleError(err, 'Failed to load requests.'))
    );
  }

  /**
   * Fetch single request by ID.
   */
  getRequest(id: string): Observable<ApprovalRequest> {
    return this.http.get<ApprovalRequest>(`${this.baseUrl}/${id}`).pipe(
      catchError(err => this.handleError(err, 'Request not found.'))
    );
  }

  /**
   * Create new approval request.
   */
  createRequest(payload: CreateRequestDto): Observable<ApprovalRequest> {
    return this.http.post<ApprovalRequest>(this.baseUrl, payload).pipe(
      catchError(err => this.handleError(err, 'Failed to create request.'))
    );
  }

  /**
   * Update editable approval request.
   */
  updateRequest(id: string, payload: UpdateRequestDto): Observable<ApprovalRequest> {
    return this.http.put<ApprovalRequest>(`${this.baseUrl}/${id}`, payload).pipe(
      catchError(err => this.handleError(err, 'Failed to update request.'))
    );
  }

  /**
   * Transition Editable -> Submitted
   */
  submitRequest(id: string): Observable<ApprovalRequest> {
    return this.http.post<ApprovalRequest>(`${this.baseUrl}/${id}/submit`, {}).pipe(
      catchError(err => this.handleError(err, 'Request could not be submitted.'))
    );
  }

  /**
   * Transition Submitted -> Approved
   */
  approveRequest(id: string): Observable<ApprovalRequest> {
    return this.http.post<ApprovalRequest>(`${this.baseUrl}/${id}/approve`, {}).pipe(
      catchError(err => this.handleError(err, 'Request could not be approved.'))
    );
  }

  /**
   * Transition Submitted -> Rejected
   */
  rejectRequest(id: string): Observable<ApprovalRequest> {
    return this.http.post<ApprovalRequest>(`${this.baseUrl}/${id}/reject`, {}).pipe(
      catchError(err => this.handleError(err, 'Request could not be rejected.'))
    );
  }

  /**
   * Centralized HTTP error handler mapping status codes to user-friendly messages.
   */
  private handleError(error: HttpErrorResponse, defaultMessage: string): Observable<never> {
    let userMessage = defaultMessage;

    if (error.status === 409) {
      userMessage = 'This action is no longer valid because the request status has changed.';
    } else if (error.status === 404) {
      userMessage = 'Request not found.';
    } else if (error.status === 400) {
      if (error.error?.details && Array.isArray(error.error.details)) {
        userMessage = error.error.details.join(' ');
      } else if (error.error?.message) {
        userMessage = error.error.message;
      } else {
        userMessage = 'Please provide valid request data.';
      }
    } else if (error.status === 0) {
      userMessage = 'Unable to connect to backend server. Please check if the server is running.';
    } else if (error.status >= 500) {
      userMessage = 'A server error occurred. Please try again later.';
    }

    return throwError(() => new Error(userMessage));
  }
}
