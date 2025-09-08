import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { secureDb } from '@/lib/database-secure';
import { OptionsTransaction } from '@/types/options';

// GET /api/transactions - Get all transactions
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use user email from session for database operations
    const transactions = await secureDb.getTransactions(session.user.email);
    return NextResponse.json({ success: true, data: transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

// POST /api/transactions - Create a new transaction
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const transactionData = body as Omit<OptionsTransaction, 'id' | 'createdAt' | 'updatedAt'>;

    // Use user email from session for database operations
    const newTransaction = await secureDb.createTransaction(transactionData, session.user.email);
    return NextResponse.json({ success: true, data: newTransaction });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
