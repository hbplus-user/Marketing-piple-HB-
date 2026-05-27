import type { ContentRequest, User } from '../types';

export const USERS: User[] = [
  { id: 'user-1', name: 'Chetna Rao',    initials: 'CR', role: 'manager',  avatarColor: '#7C3AED' },
  { id: 'user-2', name: 'Utkarsh Mehta', initials: 'UM', role: 'employee', avatarColor: '#EC4899' },
  { id: 'user-3', name: 'Rohan Desai',   initials: 'RD', role: 'employee', avatarColor: '#F97316' },
  { id: 'user-4', name: 'Maya Iyer',     initials: 'MI', role: 'employee', avatarColor: '#14B8A6' },
  { id: 'user-5', name: 'Arjun Sharma',  initials: 'AS', role: 'founder',  avatarColor: '#3B82F6' },
];

export const MOCK_REQUESTS: ContentRequest[] = [];
