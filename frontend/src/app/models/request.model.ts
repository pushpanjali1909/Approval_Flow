export type RequestStatus = 'Editable' | 'Submitted' | 'Approved' | 'Rejected';

export interface LineItem {
  id?: string;
  description: string;
  quantity: number;
  price: number;
  total?: number;
}

export interface ApprovalRequest {
  id: string;
  title: string;
  requester: string;
  lineItems: LineItem[];
  grandTotal: number;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
}

export interface CreateRequestDto {
  title: string;
  requester: string;
  lineItems: {
    description: string;
    quantity: number;
    price: number;
  }[];
}

export interface UpdateRequestDto {
  title: string;
  requester: string;
  lineItems: {
    id?: string;
    description: string;
    quantity: number;
    price: number;
  }[];
}
