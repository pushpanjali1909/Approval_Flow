import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { RequestService } from '../../services/request.service';
import { ApprovalRequest, RequestStatus } from '../../models/request.model';
import { ConfirmationModalComponent } from '../confirmation-modal/confirmation-modal.component';

type ConfirmActionType = 'submit' | 'approve' | 'reject' | null;

@Component({
  selector: 'app-request-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ConfirmationModalComponent],
  templateUrl: './request-detail.component.html',
  styleUrls: ['./request-detail.component.css']
})
export class RequestDetailComponent implements OnInit {
  request: ApprovalRequest | null = null;
  requestId: string = '';

  isLoading: boolean = false;
  isActionLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  // Confirmation Modal State
  isModalOpen: boolean = false;
  modalTitle: string = '';
  modalMessage: string = '';
  modalConfirmText: string = '';
  modalConfirmClass: string = 'btn-primary';
  pendingAction: ConfirmActionType = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private requestService: RequestService
  ) {}

  ngOnInit(): void {
    this.requestId = this.route.snapshot.paramMap.get('id') || '';
    if (this.requestId) {
      this.loadRequest();
    }
  }

  loadRequest(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.requestService.getRequest(this.requestId).subscribe({
      next: req => {
        this.request = req;
        this.isLoading = false;
      },
      error: err => {
        this.errorMessage = err.message || 'Request not found.';
        this.isLoading = false;
      }
    });
  }

  // Action Triggers
  openSubmitConfirmation(): void {
    this.pendingAction = 'submit';
    this.modalTitle = 'Submit Request for Review';
    this.modalMessage = 'Are you sure you want to submit this request? Once submitted, it cannot be edited.';
    this.modalConfirmText = 'Submit Request';
    this.modalConfirmClass = 'btn-primary';
    this.isModalOpen = true;
  }

  openApproveConfirmation(): void {
    this.pendingAction = 'approve';
    this.modalTitle = 'Approve Request';
    this.modalMessage = 'Are you sure you want to approve this request?';
    this.modalConfirmText = 'Approve';
    this.modalConfirmClass = 'btn-success';
    this.isModalOpen = true;
  }

  openRejectConfirmation(): void {
    this.pendingAction = 'reject';
    this.modalTitle = 'Reject Request';
    this.modalMessage = 'Are you sure you want to reject this request?';
    this.modalConfirmText = 'Reject';
    this.modalConfirmClass = 'btn-danger';
    this.isModalOpen = true;
  }

  onModalConfirm(): void {
    if (!this.pendingAction || !this.request) return;

    this.isActionLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.pendingAction === 'submit') {
      this.requestService.submitRequest(this.request.id).subscribe({
        next: updated => {
          this.request = updated;
          this.isActionLoading = false;
          this.isModalOpen = false;
          this.pendingAction = null;
          this.successMessage = 'Request submitted successfully.';
        },
        error: err => {
          this.handleActionError(err);
        }
      });
    } else if (this.pendingAction === 'approve') {
      this.requestService.approveRequest(this.request.id).subscribe({
        next: updated => {
          this.request = updated;
          this.isActionLoading = false;
          this.isModalOpen = false;
          this.pendingAction = null;
          this.successMessage = 'Request approved successfully.';
        },
        error: err => {
          this.handleActionError(err);
        }
      });
    } else if (this.pendingAction === 'reject') {
      this.requestService.rejectRequest(this.request.id).subscribe({
        next: updated => {
          this.request = updated;
          this.isActionLoading = false;
          this.isModalOpen = false;
          this.pendingAction = null;
          this.successMessage = 'Request rejected successfully.';
        },
        error: err => {
          this.handleActionError(err);
        }
      });
    }
  }

  onModalCancel(): void {
    if (!this.isActionLoading) {
      this.isModalOpen = false;
      this.pendingAction = null;
    }
  }

  private handleActionError(err: any): void {
    this.isActionLoading = false;
    this.isModalOpen = false;
    this.pendingAction = null;
    this.errorMessage = err.message || 'Operation failed.';
    // Refresh to update state if status was out of sync
    this.loadRequest();
  }

  getStatusBadgeClass(status: RequestStatus): string {
    switch (status) {
      case 'Editable':
        return 'badge-editable';
      case 'Submitted':
        return 'badge-submitted';
      case 'Approved':
        return 'badge-approved';
      case 'Rejected':
        return 'badge-rejected';
      default:
        return 'badge-default';
    }
  }
}
