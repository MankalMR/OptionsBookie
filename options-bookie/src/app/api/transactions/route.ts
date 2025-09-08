import { NextResponse } from 'next/server';
import { dbOperations } from '@/lib/database';
import { OptionsTransaction } from '@/types/options';

// GET /api/transactions - Get all transactions
export async function GET() {
  try {
    const transactions = dbOperations.getAllTransactions();
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
    const body = await request.json();
    const transactionData = body as Omit<OptionsTransaction, 'id' | 'createdAt' | 'updatedAt'>;

    const newTransaction = dbOperations.createTransaction(transactionData);
    return NextResponse.json({ success: true, data: newTransaction });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
