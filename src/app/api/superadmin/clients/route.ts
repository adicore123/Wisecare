import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'גישה מורשית למנהל מערכת בלבד' }, { status: 403 });
    }

    const clientsCollection = db.collection('clients');
    const usersCollection = db.collection('users');
    const tasksCollection = db.collection('tasks');

    const allClients = clientsCollection.find().map((client: any) => {
      let therapist = null;
      if (client.therapistId) {
        const t = usersCollection.findById(client.therapistId);
        if (t) {
          therapist = {
            id: t.id,
            name: t.name,
            title: t.title,
            loginCode: t.loginCode
          };
        }
      }

      const clientTasks = tasksCollection.find({ clientId: client.id });
      const completedTasks = clientTasks.filter((tsk: any) => tsk.completed).length;

      const { password, ...safeClient } = client;
      return {
        ...safeClient,
        isSelfCare: Boolean(client.isSelfCare || !client.therapistId),
        therapist,
        tasksCount: clientTasks.length,
        completedTasksCount: completedTasks
      };
    });

    return NextResponse.json(allClients);
  } catch (err: any) {
    console.error('[SuperAdmin Clients Error]', err);
    return NextResponse.json({ error: 'שגיאה בטעינת רשימת הלקוחות' }, { status: 500 });
  }
}
