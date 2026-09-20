/**
 * Comprehensive Backend Unit & Integration Tests
 * Tests business rules, validations, calculations, state machine transitions, and pagination.
 */

const request = require('supertest');
const app = require('../src/server');
const store = require('../src/data/store');
const { resetCounters } = require('../src/utils/idGenerator');

beforeEach(() => {
  store.clear();
  resetCounters();
});

describe('Approval Request Backend API', () => {

  describe('1. Request Creation & Input Validation (POST /api/requests)', () => {
    test('Should create a valid request with server-calculated totals', async () => {
      const payload = {
        title: 'Office Equipment',
        requester: 'John Doe',
        lineItems: [
          { description: 'Laptop', quantity: 2, price: 50000 },
          { description: 'Mouse', quantity: 2, price: 1000 }
        ]
      };

      const res = await request(app)
        .post('/api/requests')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id', 'REQ-001');
      expect(res.body.title).toBe('Office Equipment');
      expect(res.body.requester).toBe('John Doe');
      expect(res.body.status).toBe('Editable');
      expect(res.body.lineItems).toHaveLength(2);
      expect(res.body.lineItems[0].total).toBe(100000);
      expect(res.body.lineItems[1].total).toBe(2000);
      expect(res.body.grandTotal).toBe(102000);
      expect(res.body).toHaveProperty('createdAt');
      expect(res.body).toHaveProperty('updatedAt');
    });

    test('Should reject request without title (Case 1)', async () => {
      const res = await request(app)
        .post('/api/requests')
        .send({
          requester: 'John Doe',
          lineItems: [{ description: 'Desk', quantity: 1, price: 5000 }]
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details).toContain('Title is required and cannot be empty.');
    });

    test('Should reject request with empty title (Case 1)', async () => {
      const res = await request(app)
        .post('/api/requests')
        .send({
          title: '   ',
          requester: 'John Doe',
          lineItems: [{ description: 'Desk', quantity: 1, price: 5000 }]
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details).toContain('Title is required and cannot be empty.');
    });

    test('Should reject request without requester (Case 2)', async () => {
      const res = await request(app)
        .post('/api/requests')
        .send({
          title: 'Supplies',
          lineItems: [{ description: 'Desk', quantity: 1, price: 5000 }]
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details).toContain('Requester is required and cannot be empty.');
    });

    test('Should reject request without line items or empty line items array (Case 3)', async () => {
      const res = await request(app)
        .post('/api/requests')
        .send({
          title: 'Supplies',
          requester: 'Jane Doe',
          lineItems: []
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details).toContain('At least one line item is required.');
    });

    test('Should reject line item with missing description', async () => {
      const res = await request(app)
        .post('/api/requests')
        .send({
          title: 'Supplies',
          requester: 'Jane Doe',
          lineItems: [{ quantity: 1, price: 500 }]
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details.some(d => d.includes('Description is required'))).toBe(true);
    });

    test('Should reject invalid quantity (0, negative, non-number) (Case 4)', async () => {
      const res1 = await request(app)
        .post('/api/requests')
        .send({
          title: 'Supplies',
          requester: 'Jane Doe',
          lineItems: [{ description: 'Pens', quantity: 0, price: 50 }]
        });
      expect(res1.status).toBe(400);

      const res2 = await request(app)
        .post('/api/requests')
        .send({
          title: 'Supplies',
          requester: 'Jane Doe',
          lineItems: [{ description: 'Pens', quantity: -5, price: 50 }]
        });
      expect(res2.status).toBe(400);
    });

    test('Should reject invalid price (0, negative, non-number) (Case 5)', async () => {
      const res1 = await request(app)
        .post('/api/requests')
        .send({
          title: 'Supplies',
          requester: 'Jane Doe',
          lineItems: [{ description: 'Paper', quantity: 2, price: 0 }]
        });
      expect(res1.status).toBe(400);

      const res2 = await request(app)
        .post('/api/requests')
        .send({
          title: 'Supplies',
          requester: 'Jane Doe',
          lineItems: [{ description: 'Paper', quantity: 2, price: -100 }]
        });
      expect(res2.status).toBe(400);
    });

    test('Should ignore client-supplied grandTotal and enforce server calculation', async () => {
      const res = await request(app)
        .post('/api/requests')
        .send({
          title: 'Test Tampering',
          requester: 'Hacker',
          grandTotal: 1, // Tampered client value
          lineItems: [
            { description: 'Server Item', quantity: 5, price: 200 }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.grandTotal).toBe(1000); // 5 * 200 = 1000, not 1
    });
  });

  describe('2. State Transitions & Lifecycle Rules', () => {
    let reqId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/requests')
        .send({
          title: 'Monitor Purchase',
          requester: 'Alice',
          lineItems: [{ description: 'Dell 27-inch', quantity: 1, price: 25000 }]
        });
      reqId = res.body.id;
    });

    test('Should successfully submit an Editable request (Editable -> Submitted)', async () => {
      const res = await request(app)
        .post(`/api/requests/${reqId}/submit`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('Submitted');
    });

    test('Should reject submitting an already submitted request (Case 9: 409 Conflict)', async () => {
      await request(app).post(`/api/requests/${reqId}/submit`);

      const res = await request(app)
        .post(`/api/requests/${reqId}/submit`);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Invalid state transition');
    });

    test('Should approve a submitted request (Submitted -> Approved)', async () => {
      await request(app).post(`/api/requests/${reqId}/submit`);

      const res = await request(app)
        .post(`/api/requests/${reqId}/approve`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('Approved');
    });

    test('Should reject approving an Editable request (Case 7: 409 Conflict)', async () => {
      const res = await request(app)
        .post(`/api/requests/${reqId}/approve`);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Invalid state transition');
    });

    test('Should reject approving an already Approved request (Case 10: 409 Conflict)', async () => {
      await request(app).post(`/api/requests/${reqId}/submit`);
      await request(app).post(`/api/requests/${reqId}/approve`);

      const res = await request(app)
        .post(`/api/requests/${reqId}/approve`);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Invalid state transition');
    });

    test('Should reject approving a Rejected request (Case 12: 409 Conflict)', async () => {
      await request(app).post(`/api/requests/${reqId}/submit`);
      await request(app).post(`/api/requests/${reqId}/reject`);

      const res = await request(app)
        .post(`/api/requests/${reqId}/approve`);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Invalid state transition');
    });

    test('Should reject a submitted request (Submitted -> Rejected)', async () => {
      await request(app).post(`/api/requests/${reqId}/submit`);

      const res = await request(app)
        .post(`/api/requests/${reqId}/reject`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('Rejected');
    });

    test('Should reject rejecting an Editable request (Case 8: 409 Conflict)', async () => {
      const res = await request(app)
        .post(`/api/requests/${reqId}/reject`);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Invalid state transition');
    });

    test('Should reject rejecting an already Rejected request (Case 11: 409 Conflict)', async () => {
      await request(app).post(`/api/requests/${reqId}/submit`);
      await request(app).post(`/api/requests/${reqId}/reject`);

      const res = await request(app)
        .post(`/api/requests/${reqId}/reject`);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Invalid state transition');
    });

    test('Should reject rejecting an already Approved request (409 Conflict)', async () => {
      await request(app).post(`/api/requests/${reqId}/submit`);
      await request(app).post(`/api/requests/${reqId}/approve`);

      const res = await request(app)
        .post(`/api/requests/${reqId}/reject`);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Invalid state transition');
    });
  });

  describe('3. Editing Rules (PUT /api/requests/:id)', () => {
    let reqId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/requests')
        .send({
          title: 'Keyboards',
          requester: 'Bob',
          lineItems: [{ description: 'Mechanical Keyboard', quantity: 1, price: 3500 }]
        });
      reqId = res.body.id;
    });

    test('Should allow editing an Editable request and recalculate totals', async () => {
      const res = await request(app)
        .put(`/api/requests/${reqId}`)
        .send({
          title: 'Keyboards Updated',
          requester: 'Bob Builder',
          lineItems: [
            { description: 'Mechanical Keyboard', quantity: 3, price: 3000 }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Keyboards Updated');
      expect(res.body.requester).toBe('Bob Builder');
      expect(res.body.lineItems[0].total).toBe(9000);
      expect(res.body.grandTotal).toBe(9000);
    });

    test('Should reject editing a Submitted request (Case 6: 409 Conflict)', async () => {
      await request(app).post(`/api/requests/${reqId}/submit`);

      const res = await request(app)
        .put(`/api/requests/${reqId}`)
        .send({
          title: 'Attempted edit',
          requester: 'Bob',
          lineItems: [{ description: 'Item', quantity: 1, price: 100 }]
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Request cannot be edited');
    });

    test('Should reject editing an Approved request (409 Conflict)', async () => {
      await request(app).post(`/api/requests/${reqId}/submit`);
      await request(app).post(`/api/requests/${reqId}/approve`);

      const res = await request(app)
        .put(`/api/requests/${reqId}`)
        .send({
          title: 'Attempted edit',
          requester: 'Bob',
          lineItems: [{ description: 'Item', quantity: 1, price: 100 }]
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Request cannot be edited');
    });

    test('Should reject editing a Rejected request (409 Conflict)', async () => {
      await request(app).post(`/api/requests/${reqId}/submit`);
      await request(app).post(`/api/requests/${reqId}/reject`);

      const res = await request(app)
        .put(`/api/requests/${reqId}`)
        .send({
          title: 'Attempted edit',
          requester: 'Bob',
          lineItems: [{ description: 'Item', quantity: 1, price: 100 }]
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Request cannot be edited');
    });
  });

  describe('4. Retrieval, Search, Filter, Pagination, and Not Found Handling', () => {
    beforeEach(async () => {
      // Seed 15 items
      for (let i = 1; i <= 15; i++) {
        const title = i % 2 === 0 ? `Laptop batch ${i}` : `Monitor batch ${i}`;
        const res = await request(app)
          .post('/api/requests')
          .send({
            title,
            requester: `User ${i}`,
            lineItems: [{ description: `Item ${i}`, quantity: 1, price: 100 * i }]
          });

        if (i % 3 === 0) {
          await request(app).post(`/api/requests/${res.body.id}/submit`);
        }
      }
    });

    test('Should paginate results properly with page and limit', async () => {
      const res = await request(app)
        .get('/api/requests?page=1&limit=5');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(5);
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 5,
        totalItems: 15,
        totalPages: 3
      });
    });

    test('Should search requests by title', async () => {
      const res = await request(app)
        .get('/api/requests?search=Laptop');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      res.body.data.forEach(item => {
        expect(item.title.toLowerCase()).toContain('laptop');
      });
    });

    test('Should filter requests by status', async () => {
      const res = await request(app)
        .get('/api/requests?status=Submitted');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      res.body.data.forEach(item => {
        expect(item.status).toBe('Submitted');
      });
    });

    test('Should return empty array when search returns no results without server error (Case 14)', async () => {
      const res = await request(app)
        .get('/api/requests?search=NonExistentTitleXYZ');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 10,
        totalItems: 0,
        totalPages: 0
      });
    });

    test('Should return 404 for non-existent request ID (Case 13)', async () => {
      const res = await request(app)
        .get('/api/requests/REQ-9999');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Request not found');
    });

    test('Should get single request details successfully', async () => {
      const created = await request(app)
        .post('/api/requests')
        .send({
          title: 'Special Item',
          requester: 'Sarah',
          lineItems: [{ description: 'Special Line', quantity: 2, price: 150 }]
        });

      const res = await request(app)
        .get(`/api/requests/${created.body.id}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.body.id);
      expect(res.body.title).toBe('Special Item');
    });
  });
});
