import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { secureDb } from '@/lib/database-secure';
import { OptionsTransaction } from '@/types/options';
import { logger } from "@/lib/logger";
import { validateTransactionData } from '@/utils/validation';

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

    if (!Array.isArray(body)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body, expected array' },
        { status: 400 }
      );
    }

    // Validate all transactions
    for (const tx of body) {
      const validation = validateTransactionData(tx);
      if (!validation.isValid) {
        return NextResponse.json(
          { success: false, error: 'Invalid transaction data in batch', details: validation.errors },
          { status: 400 }
        );
      }
    }

    // Insert transactions
    const newTransactions = [];
    for (const txData of body) {
      const newTransaction = await secureDb.createTransaction(txData, session.user.email);
      newTransactions.push(newTransaction);
    }

    return NextResponse.json({ success: true, data: newTransactions });
  } catch (error) {
    logger.error({ error }, 'Error creating batch transactions:');
    return NextResponse.json(
      { success: false, error: 'Failed to create batch transactions' },
      { status: 500 }
    );
  }
}
