import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'גישה מורשית למנהל מערכת בלבד' }, { status: 403 });
    }

    await db.ensureLoaded();
    const users = db.collection('users');
    const clients = db.collection('clients');
    const tasks = db.collection('tasks');

    const totalTherapists = users.find({ role: 'therapist' }).length;
    const activeTherapists = users.find({ role: 'therapist', active: true }).length;
    const totalClients = clients.find().length;
    const allTasks = tasks.find();
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter((t: any) => t.completed).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return NextResponse.json({
      totalTherapists,
      activeTherapists,
      totalClients,
      totalTasks,
      completedTasks,
      completionRate
    });
  } catch (error: any) {
    console.error('[SuperAdmin Stats Error]', error);
    return NextResponse.json({ error: 'שגיאה בשליפת סטטיסטיקות מערכת' }, { status: 500 });
  }
}
