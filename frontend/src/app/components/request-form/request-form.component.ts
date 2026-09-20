import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RequestService } from '../../services/request.service';
import { ApprovalRequest, LineItem, CreateRequestDto, UpdateRequestDto } from '../../models/request.model';

interface FormLineItem {
  id?: string;
  description: string;
  quantity: number | null;
  price: number | null;
}

@Component({
  selector: 'app-request-form',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './request-form.component.html',
  styleUrls: ['./request-form.component.css']
})
export class RequestFormComponent implements OnInit {
  isEditMode: boolean = false;
  requestId: string | null = null;
  existingRequest: ApprovalRequest | null = null;

  title: string = '';
  requester: string = '';
  lineItems: FormLineItem[] = [
    { description: '', quantity: 1, price: null }
  ];

  isLoading: boolean = false;
  isSaving: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  formSubmitted: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private requestService: RequestService
  ) {}

  ngOnInit(): void {
    this.requestId = this.route.snapshot.paramMap.get('id');
    if (this.requestId) {
      this.isEditMode = true;
      this.loadRequest(this.requestId);
    }
  }

  loadRequest(id: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.requestService.getRequest(id).subscribe({
      next: req => {
        this.existingRequest = req;
        this.isLoading = false;

        // Enforce business rule: Only Editable requests can be edited
        if (req.status !== 'Editable') {
          this.errorMessage = `Cannot edit request '${req.id}' because its current status is '${req.status}'. Only Editable requests can be modified.`;
          return;
        }

        this.title = req.title;
        this.requester = req.requester;
        this.lineItems = req.lineItems.map(item => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          price: item.price
        }));
      },
      error: err => {
        this.isLoading = false;
        this.errorMessage = err.message || 'Failed to load request.';
      }
    });
  }

  addLineItem(): void {
    this.lineItems.push({
      description: '',
      quantity: 1,
      price: null
    });
  }

  removeLineItem(index: number): void {
    if (this.lineItems.length > 1) {
      this.lineItems.splice(index, 1);
    }
  }

  getLineTotal(item: FormLineItem): number {
    const q = Number(item.quantity);
    const p = Number(item.price);
    if (!q || !p || isNaN(q) || isNaN(p) || q <= 0 || p <= 0) {
      return 0;
    }
    return Number((q * p).toFixed(2));
  }

  get grandTotal(): number {
    const sum = this.lineItems.reduce((acc, item) => acc + this.getLineTotal(item), 0);
    return Number(sum.toFixed(2));
  }

  get isFormValid(): boolean {
    if (!this.title.trim()) return false;
    if (!this.requester.trim()) return false;
    if (!this.lineItems || this.lineItems.length === 0) return false;

    for (const item of this.lineItems) {
      if (!item.description || !item.description.trim()) return false;
      const q = Number(item.quantity);
      const p = Number(item.price);
      if (isNaN(q) || q <= 0) return false;
      if (isNaN(p) || p <= 0) return false;
    }

    return true;
  }

  onSubmit(): void {
    this.formSubmitted = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.isFormValid || this.isSaving) {
      return;
    }

    this.isSaving = true;

    if (this.isEditMode && this.requestId) {
      const payload: UpdateRequestDto = {
        title: this.title.trim(),
        requester: this.requester.trim(),
        lineItems: this.lineItems.map(item => ({
          id: item.id,
          description: item.description.trim(),
          quantity: Number(item.quantity),
          price: Number(item.price)
        }))
      };

      this.requestService.updateRequest(this.requestId, payload).subscribe({
        next: updated => {
          this.isSaving = false;
          this.successMessage = 'Request updated successfully.';
          setTimeout(() => {
            this.router.navigate(['/requests', updated.id]);
          }, 800);
        },
        error: err => {
          this.isSaving = false;
          this.errorMessage = err.message || 'Failed to update request.';
        }
      });
    } else {
      const payload: CreateRequestDto = {
        title: this.title.trim(),
        requester: this.requester.trim(),
        lineItems: this.lineItems.map(item => ({
          description: item.description.trim(),
          quantity: Number(item.quantity),
          price: Number(item.price)
        }))
      };

      this.requestService.createRequest(payload).subscribe({
        next: created => {
          this.isSaving = false;
          this.successMessage = 'Request created successfully.';
          setTimeout(() => {
            this.router.navigate(['/requests', created.id]);
          }, 800);
        },
        error: err => {
          this.isSaving = false;
          this.errorMessage = err.message || 'Failed to create request.';
        }
      });
    }
  }
}
