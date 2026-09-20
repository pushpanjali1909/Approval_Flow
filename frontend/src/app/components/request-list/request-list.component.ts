import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RequestService } from '../../services/request.service';
import { ApprovalRequest, PaginationMetadata, RequestStatus } from '../../models/request.model';

@Component({
  selector: 'app-request-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './request-list.component.html',
  styleUrls: ['./request-list.component.css']
})
export class RequestListComponent implements OnInit {
  requests: ApprovalRequest[] = [];
  pagination: PaginationMetadata = {
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 0
  };

  searchTerm: string = '';
  selectedStatus: string = 'All';
  isLoading: boolean = false;
  errorMessage: string = '';

  readonly statusOptions: string[] = ['All', 'Editable', 'Submitted', 'Approved', 'Rejected'];

  constructor(private requestService: RequestService) {}

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(page: number = this.pagination.page): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.requestService
      .getRequests(this.searchTerm, this.selectedStatus, page, this.pagination.limit)
      .subscribe({
        next: response => {
          this.requests = response.data;
          this.pagination = response.pagination;
          this.isLoading = false;
        },
        error: err => {
          this.errorMessage = err.message || 'Failed to load requests.';
          this.isLoading = false;
        }
      });
  }

  onSearchChange(): void {
    this.pagination.page = 1;
    this.loadRequests(1);
  }

  onStatusChange(): void {
    this.pagination.page = 1;
    this.loadRequests(1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.pagination.totalPages && page !== this.pagination.page) {
      this.loadRequests(page);
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.pagination.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  get startIndex(): number {
    if (this.pagination.totalItems === 0) return 0;
    return (this.pagination.page - 1) * this.pagination.limit + 1;
  }

  get endIndex(): number {
    const end = this.pagination.page * this.pagination.limit;
    return Math.min(end, this.pagination.totalItems);
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
