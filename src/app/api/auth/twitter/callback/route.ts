import { NextRequest } from 'next/server';
import { redirect } from 'next/navigation';

export async function GET(req: NextRequest) {
  // NextAuth handles the callback automatically
  // This is just a fallback route
  redirect('/dashboard');
}