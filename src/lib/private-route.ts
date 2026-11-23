import { redirect } from '@tanstack/react-router';
import { getSession } from './session';

export function requireSession() {
  if (!getSession()) throw redirect({ to: '/login', replace: true });
}