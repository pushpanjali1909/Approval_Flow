import { Routes } from '@angular/router';
import { RequestListComponent } from './components/request-list/request-list.component';
import { RequestFormComponent } from './components/request-form/request-form.component';
import { RequestDetailComponent } from './components/request-detail/request-detail.component';

export const routes: Routes = [
  { path: '', redirectTo: 'requests', pathMatch: 'full' },
  { path: 'requests', component: RequestListComponent },
  { path: 'requests/create', component: RequestFormComponent },
  { path: 'requests/:id', component: RequestDetailComponent },
  { path: 'requests/:id/edit', component: RequestFormComponent },
  { path: '**', redirectTo: 'requests' }
];
